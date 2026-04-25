#include "buttons.h"

#include <Arduino.h>
#include <FastLED.h>

#include "config.h"
#include "motor_controller.h"
#include "wifi_manager.h"

namespace ui {

static CRGB s_leds[LED_COUNT];

struct Btn {
    int      pin;
    bool     active_low;
    bool     last     = false;
    uint32_t lastChange = 0;
    uint32_t pressedAt  = 0;
    bool     longHandled = false;
};

static Btn s_up{PIN_BUTTON_UP,   BUTTON_ACTIVE_LOW};
static Btn s_dn{PIN_BUTTON_DOWN, BUTTON_ACTIVE_LOW};

static bool readBtn(const Btn& b) {
    if (b.pin < 0) return false;
    int v = digitalRead(b.pin);
    return b.active_low ? (v == LOW) : (v == HIGH);
}

void begin() {
    if (PIN_BUTTON_UP   >= 0) pinMode(PIN_BUTTON_UP,   BUTTON_ACTIVE_LOW ? INPUT_PULLUP : INPUT);
    if (PIN_BUTTON_DOWN >= 0) pinMode(PIN_BUTTON_DOWN, BUTTON_ACTIVE_LOW ? INPUT_PULLUP : INPUT);

    if (PIN_LED_STATUS >= 0) {
        FastLED.addLeds<WS2812B, PIN_LED_STATUS, GRB>(s_leds, LED_COUNT);
        FastLED.setBrightness(64);
        s_leds[0] = CRGB::Black;
        FastLED.show();
    }
}

static void updateLed() {
    if (PIN_LED_STATUS < 0) return;
    uint32_t t = millis();

    CRGB c = CRGB::Black;
    switch (netcfg::mode()) {
        case netcfg::Mode::PORTAL: {
            // azul parpadeante
            uint8_t b = (t / 5) & 0xFF;
            c = CRGB(0, 0, sin8(b));
            break;
        }
        case netcfg::Mode::CONNECTING: {
            // amarillo
            uint8_t b = (t / 5) & 0xFF;
            c = CRGB(sin8(b), sin8(b), 0);
            break;
        }
        case netcfg::Mode::CONNECTED: {
            // según estado del motor
            switch (motor::state()) {
                case motor::State::IDLE:        c = CRGB(0, 32, 0); break;       // verde fijo
                case motor::State::MOVING_UP:
                case motor::State::MOVING_DOWN: {
                    uint8_t b = (t / 3) & 0xFF;
                    c = CRGB(0, sin8(b), 0);                                      // verde latido
                    break;
                }
                case motor::State::CALIBRATING: c = CRGB(64, 32, 0); break;       // naranja
                case motor::State::FAULT:       c = CRGB(96, 0, 0);  break;       // rojo
                default:                        c = CRGB(0, 16, 16); break;
            }
            break;
        }
        default:
            c = CRGB(16, 0, 16);  // morado: cualquier otro
            break;
    }
    s_leds[0] = c;
    FastLED.show();
}

static void handleBtn(Btn& b, bool isUp) {
    if (b.pin < 0) return;
    bool now = readBtn(b);
    uint32_t t = millis();
    if (now != b.last && (t - b.lastChange) > BUTTON_DEBOUNCE_MS) {
        b.lastChange = t;
        b.last = now;

        if (now) {
            b.pressedAt   = t;
            b.longHandled = false;
            // pulsación corta: arrancar movimiento
            if (isUp) motor::jogUp();
            else      motor::jogDown();
        } else {
            // soltar: si fue una pulsación corta y el motor sigue moviéndose,
            // déjalo terminar; si fue larga, ya se gestionó.
            (void)0;
        }
    }
    if (now && !b.longHandled && (t - b.pressedAt) > BUTTON_LONGPRESS_MS) {
        b.longHandled = true;
        // pulsación larga simultánea de los dos = factory wifi
        if (s_up.last && s_dn.last) {
            Serial.println("[UI] Long-press en ambos botones → portal WiFi");
            netcfg::forcePortal();
        }
    }
}

void loop() {
    handleBtn(s_up, true);
    handleBtn(s_dn, false);
    updateLed();
}

}  // namespace ui
