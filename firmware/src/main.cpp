// AutoRoller — punto de entrada
//
// Arquitectura:
//   - Core 1 (PRO): tarea de motor (alta prioridad, baja latencia).
//   - Core 0 (APP): tareas de red (WiFi, HTTP, MQTT) y UI/botones.
// El loop de Arduino corre en Core 1 por defecto; aquí lo usamos para la UI
// y desplazamos el motor a una tarea propia con un quantum agresivo.

#include <Arduino.h>

#include "buttons.h"
#include "config.h"
#include "motor_controller.h"
#include "mqtt_client.h"
#include "storage.h"
#include "web_server.h"
#include "wifi_manager.h"

static storage::Settings g_settings;

static void networkTask(void* /*arg*/) {
    for (;;) {
        netcfg::loop();
        web::loop();
        mqtt::loop();
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

void setup() {
    Serial.begin(115200);
    delay(50);
    Serial.printf("\n\nAutoRoller v%s · arrancando...\n", AUTOROLLER_FIRMWARE_VERSION);

    storage::begin();
    g_settings = storage::load();
    Serial.printf("  hostname  = %s\n", g_settings.hostname.c_str());
    Serial.printf("  mqtt      = %s\n", g_settings.mqtt_enabled ? "on" : "off");
    Serial.printf("  endstops  = %s\n", g_settings.use_endstops ? "on" : "off");

    motor::begin(g_settings);
    netcfg::begin(g_settings);
    web::begin(g_settings);
    mqtt::begin(g_settings);
    ui::begin();

    // Tarea de red en Core 0
    xTaskCreatePinnedToCore(networkTask, "net", NETWORK_TASK_STACK,
                            nullptr, NETWORK_TASK_PRIO, nullptr,
                            NETWORK_TASK_CORE);

    // Tarea de motor en Core 1
    xTaskCreatePinnedToCore(motor::task, "motor", MOTOR_TASK_STACK,
                            nullptr, MOTOR_TASK_PRIO, nullptr,
                            MOTOR_TASK_CORE);

    Serial.println("AutoRoller listo.");
}

void loop() {
    // Core 1, baja prioridad → UI
    ui::loop();
    delay(5);

    // Publicación MQTT periódica del estado (1 Hz aprox.)
    static uint32_t s_last = 0;
    if (millis() - s_last > 1000) {
        s_last = millis();
        if (mqtt::isConnected()) mqtt::publishState();
    }
}
