// AutoRoller — punto de entrada
//
// Arquitectura:
//   - Core 1 (PRO): tarea de motor (alta prioridad, baja latencia).
//   - Core 0 (APP): tareas de red (WiFi, BLE, HTTP, MQTT, NTP, scheduler) y UI.
// El loop de Arduino corre en Core 1 por defecto; lo usamos para la UI/LED y
// desplazamos el motor a una tarea propia con un quantum agresivo.

#include <Arduino.h>
#include <esp_task_wdt.h>

#include "ble_provisioning.h"
#include "buttons.h"
#include "config.h"
#include "motor_controller.h"
#include "mqtt_client.h"
#include "scheduler.h"
#include "settings_lock.h"
#include "storage.h"
#include "time_sync.h"
#include "web_server.h"
#include "wifi_manager.h"

// Task Watchdog: si una tarea registrada no hace `esp_task_wdt_reset()` en
// este tiempo, el chip se reinicia. Margen generoso porque la calibración
// en `motor::tick()` puede tardar varios segundos buscando endstops.
static constexpr uint32_t TWDT_TIMEOUT_S = 30;

static storage::Settings g_settings;

static void networkTask(void* /*arg*/) {
    esp_task_wdt_add(NULL);
    for (;;) {
        netcfg::loop();
        web::loop();
        mqtt::loop();
        bleprov::loop();
        timesync::loop();
        scheduler::loop();
        esp_task_wdt_reset();
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

void setup() {
    Serial.begin(115200);
    delay(50);
    Serial.printf("\n\nAutoRoller v%s · arrancando...\n", AUTOROLLER_FIRMWARE_VERSION);

    initSettingsLock();
    storage::begin();
    g_settings = storage::load();
    Serial.printf("  hostname  = %s\n", g_settings.hostname.c_str());
    Serial.printf("  mqtt      = %s\n", g_settings.mqtt_enabled ? "on" : "off");
    Serial.printf("  endstops  = %s\n", g_settings.use_endstops ? "on" : "off");
    Serial.printf("  ble       = %s (policy=%u)\n",
                  g_settings.ble_enabled ? "on" : "off", g_settings.ble_policy);
    Serial.printf("  ntp       = %s\n", g_settings.ntp_enabled ? "on" : "off");

    motor::begin(g_settings);
    netcfg::begin(g_settings);
    web::begin(g_settings);
    mqtt::begin(g_settings);
    bleprov::begin(g_settings);
    timesync::begin(g_settings);
    scheduler::begin(g_settings);
    ui::begin();

    // Watchdog: arrancarlo después de begin() para no morirnos durante init.
    esp_task_wdt_init(TWDT_TIMEOUT_S, /*panic=*/true);

    // Tarea de red en Core 0
    xTaskCreatePinnedToCore(networkTask, "net", NETWORK_TASK_STACK,
                            nullptr, NETWORK_TASK_PRIO, nullptr,
                            NETWORK_TASK_CORE);

    // Tarea de motor en Core 1
    xTaskCreatePinnedToCore(motor::task, "motor", MOTOR_TASK_STACK,
                            nullptr, MOTOR_TASK_PRIO, nullptr,
                            MOTOR_TASK_CORE);

    // Loop de Arduino también vigilado.
    esp_task_wdt_add(NULL);

    Serial.println("AutoRoller listo.");
}

void loop() {
    // Core 1, baja prioridad → UI
    ui::loop();
    esp_task_wdt_reset();
    delay(5);

    // Publicación MQTT periódica del estado (1 Hz aprox.)
    static uint32_t s_last = 0;
    if (millis() - s_last > 1000) {
        s_last = millis();
        if (mqtt::isConnected()) mqtt::publishState();
        bleprov::notifyStatusChange();
    }
}
