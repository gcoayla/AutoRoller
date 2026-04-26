#include "motor_controller.h"

#include <FastAccelStepper.h>
#include <esp_task_wdt.h>

#include "config.h"
#include "storage.h"

namespace motor {

static FastAccelStepperEngine engine;
static FastAccelStepper*      stepper        = nullptr;
static State                  s_state        = State::IDLE;
static storage::Settings      s_settings;
static int32_t                s_max_position = DEFAULT_MAX_POSITION_STEPS;
static volatile bool          s_calibrated   = false;
static uint32_t               s_lastSaveMs   = 0;

// ---- helpers ---------------------------------------------------------------

static bool endstopTopActive() {
    if (PIN_ENDSTOP_TOP < 0) return false;
    int v = digitalRead(PIN_ENDSTOP_TOP);
    return ENDSTOP_ACTIVE_LOW ? (v == LOW) : (v == HIGH);
}

static bool endstopBottomActive() {
    if (PIN_ENDSTOP_BOTTOM < 0) return false;
    int v = digitalRead(PIN_ENDSTOP_BOTTOM);
    return ENDSTOP_ACTIVE_LOW ? (v == LOW) : (v == HIGH);
}

static void enableDriver(bool en) {
    if (PIN_EN < 0) return;
    digitalWrite(PIN_EN, EN_ACTIVE_LOW ? (en ? LOW : HIGH) : (en ? HIGH : LOW));
}

// ---- API -------------------------------------------------------------------

void begin(const storage::Settings& s) {
    s_settings     = s;
    s_max_position = s.max_position > 0 ? s.max_position : DEFAULT_MAX_POSITION_STEPS;
    s_calibrated   = s.calibrated;

    pinMode(PIN_EN, OUTPUT);
    enableDriver(false);  // arranca deshabilitado para no calentar al motor

    // Nota: GPIO 34-39 del ESP32 son input-only y NO tienen pull-ups internos,
    // así que aquí no pedimos INPUT_PULLUP aunque ENDSTOP_ACTIVE_LOW esté
    // activado: en esos pines hay que poner una resistencia 10 kΩ a 3V3
    // externa. En GPIOs normales (≤33), si ENDSTOP_ACTIVE_LOW está activo,
    // sí pedimos pull-up interno.
    auto pickInputMode = [](int pin) -> int {
        if (!ENDSTOP_ACTIVE_LOW) return INPUT;
        if (pin >= 34 && pin <= 39) return INPUT;     // input-only, sin pull
        return INPUT_PULLUP;
    };
    if (PIN_ENDSTOP_TOP    >= 0) pinMode(PIN_ENDSTOP_TOP,    pickInputMode(PIN_ENDSTOP_TOP));
    if (PIN_ENDSTOP_BOTTOM >= 0) pinMode(PIN_ENDSTOP_BOTTOM, pickInputMode(PIN_ENDSTOP_BOTTOM));
    if (PIN_MS1 >= 0) { pinMode(PIN_MS1, OUTPUT); digitalWrite(PIN_MS1, HIGH); }
    if (PIN_MS2 >= 0) { pinMode(PIN_MS2, OUTPUT); digitalWrite(PIN_MS2, HIGH); }

    engine.init();
    stepper = engine.stepperConnectToPin(PIN_STEP);
    if (!stepper) {
        Serial.println("[MOTOR] No se pudo asignar STEP. ¿Pin compatible?");
        s_state = State::FAULT;
        return;
    }
    stepper->setDirectionPin(PIN_DIR, /*invert*/ s_settings.invert_direction);
    stepper->setEnablePin(PIN_EN, /*active_low*/ EN_ACTIVE_LOW);
    stepper->setAutoEnable(true);
    stepper->setSpeedInHz(s_settings.max_speed_hz);
    stepper->setAcceleration(s_settings.accel_hz_per_s);

    // Restauramos la posición lógica desde NVS para que la web no muestre 0.
    stepper->setCurrentPosition(s_settings.current_position);

    Serial.printf("[MOTOR] OK · pos=%d · max=%d · calib=%d\n",
                  (int)s_settings.current_position,
                  (int)s_max_position,
                  (int)s_calibrated);
}

void reloadFromSettings(const storage::Settings& s) {
    s_settings.limit_open       = s.limit_open;
    s_settings.limit_close      = s.limit_close;
    s_settings.invert_direction = s.invert_direction;
    s_settings.max_speed_hz     = s.max_speed_hz;
    s_settings.accel_hz_per_s   = s.accel_hz_per_s;
    s_settings.use_endstops     = s.use_endstops;
    if (stepper) {
        stepper->setSpeedInHz(s.max_speed_hz);
        stepper->setAcceleration(s.accel_hz_per_s);
        stepper->setDirectionPin(PIN_DIR, /*invert*/ s.invert_direction);
    }
}

void moveToSteps(int32_t steps) {
    if (!stepper) return;
    if (steps < 0) steps = 0;
    if (steps > s_max_position) steps = s_max_position;
    stepper->moveTo(steps);
    s_state = (steps > stepper->getCurrentPosition()) ? State::MOVING_DOWN : State::MOVING_UP;
}

// Aplica los límites de seguridad. Si están bien definidos
// (limit_open < limit_close, ambos en 0..100), clampea el valor a ese rango.
static uint8_t clampToLimits(uint8_t percent) {
    if (percent > 100) percent = 100;
    uint8_t lo = s_settings.limit_open;
    uint8_t hi = s_settings.limit_close;
    if (lo >= hi || hi > 100) { lo = 0; hi = 100; }   // inválido → sin límite
    if (percent < lo) percent = lo;
    if (percent > hi) percent = hi;
    return percent;
}

void moveToPercent(uint8_t percent) {
    percent = clampToLimits(percent);
    int32_t target = (int32_t)((int64_t)percent * s_max_position / 100);
    moveToSteps(target);
}

void jogUp() {
    if (!stepper) return;
    moveToPercent(0);   // = limit_open tras clamp
}

void jogDown() {
    if (!stepper) return;
    moveToPercent(100); // = limit_close tras clamp
}

void stop() {
    if (!stepper) return;
    stepper->stopMove();
    s_state = State::IDLE;
}

void setHere(int32_t value) {
    if (!stepper) return;
    stepper->setCurrentPosition(value);
    storage::savePosition(value);
}

State    state()             { return s_state; }
int32_t  position()          { return stepper ? stepper->getCurrentPosition() : 0; }
int32_t  maxPosition()       { return s_max_position; }
bool     isCalibrated()      { return s_calibrated; }

uint8_t  positionPercent() {
    if (s_max_position <= 0) return 0;
    int32_t p = position();
    if (p < 0) p = 0;
    if (p > s_max_position) p = s_max_position;
    return (uint8_t)((int64_t)p * 100 / s_max_position);
}

// ---- calibración -----------------------------------------------------------

static void calibrateBlocking() {
    if (!stepper) return;
    s_state = State::CALIBRATING;
    // AutoEnable habilita el driver cuando arranca movimiento; nada que hacer aquí.

    const uint32_t fastSpeed = s_settings.max_speed_hz;
    const uint32_t homeSpeed = DEFAULT_HOMING_SPEED_HZ;

    if (s_settings.use_endstops &&
        PIN_ENDSTOP_TOP >= 0 && PIN_ENDSTOP_BOTTOM >= 0) {

        // 1) sube (negativo) hasta endstop superior
        stepper->setSpeedInHz(homeSpeed);
        stepper->runBackward();
        while (!endstopTopActive()) {
            vTaskDelay(pdMS_TO_TICKS(2));
            esp_task_wdt_reset();
            if (s_state == State::FAULT) return;
        }
        stepper->forceStopAndNewPosition(0);

        // pequeño retroceso para soltar el endstop
        stepper->moveTo(50);
        while (stepper->isRunning()) { vTaskDelay(pdMS_TO_TICKS(2)); esp_task_wdt_reset(); }
        stepper->setCurrentPosition(0);

        // 2) baja (positivo) hasta endstop inferior
        stepper->setSpeedInHz(fastSpeed);
        stepper->runForward();
        while (!endstopBottomActive()) {
            vTaskDelay(pdMS_TO_TICKS(2));
            esp_task_wdt_reset();
            if (s_state == State::FAULT) return;
        }
        int32_t maxP = stepper->getCurrentPosition();
        stepper->forceStopAndNewPosition(maxP);

        s_max_position           = maxP;
        s_settings.max_position  = maxP;
        s_settings.calibrated    = true;
        s_settings.current_position = maxP;
        storage::save(s_settings);
        s_calibrated = true;

        // 3) vuelve a 0 (totalmente arriba)
        stepper->setSpeedInHz(fastSpeed);
        stepper->moveTo(0);
        while (stepper->isRunning()) { vTaskDelay(pdMS_TO_TICKS(5)); esp_task_wdt_reset(); }
    }

    s_state = State::IDLE;
}

void calibrate() {
    // Esta función se llama desde tarea distinta (web). Solo cambiamos estado;
    // la tarea de motor lo detecta y ejecuta.
    s_state = State::CALIBRATING;
}

// ---- bucle principal de motor ---------------------------------------------

void tick() {
    if (!stepper) return;

    // calibración pendiente
    if (s_state == State::CALIBRATING) {
        calibrateBlocking();
        return;
    }

    // protección de finales de carrera durante el movimiento normal
    if (s_settings.use_endstops) {
        if (endstopTopActive() && stepper->getCurrentPosition() <= 0) {
            stepper->forceStopAndNewPosition(0);
            s_state = State::IDLE;
        }
        if (endstopBottomActive() && stepper->getCurrentPosition() >= s_max_position) {
            stepper->forceStopAndNewPosition(s_max_position);
            s_state = State::IDLE;
        }
    }

    // refresca estado IDLE cuando termine el movimiento
    if (s_state == State::MOVING_UP || s_state == State::MOVING_DOWN) {
        if (!stepper->isRunning()) {
            s_state = State::IDLE;
        }
    }

    // guardado periódico de posición (cada 2 s si cambió)
    uint32_t now = millis();
    if (now - s_lastSaveMs > 2000) {
        s_lastSaveMs = now;
        int32_t cur = stepper->getCurrentPosition();
        if (cur != s_settings.current_position) {
            s_settings.current_position = cur;
            storage::savePosition(cur);
        }
    }
}

void task(void* arg) {
    (void)arg;
    esp_task_wdt_add(NULL);
    for (;;) {
        tick();
        esp_task_wdt_reset();
        vTaskDelay(pdMS_TO_TICKS(5));
    }
}

}  // namespace motor
