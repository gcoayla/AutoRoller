// AutoRoller — almacenamiento persistente (NVS)
// Encapsula Preferences para que el resto del código no tenga que conocer
// claves ni tipos.

#pragma once

#include <Arduino.h>

namespace storage {

struct Settings {
    // Identidad
    String hostname;

    // WiFi
    String wifi_ssid;
    String wifi_password;

    // MQTT
    bool   mqtt_enabled       = false;
    String mqtt_host;
    uint16_t mqtt_port        = 1883;
    String mqtt_user;
    String mqtt_password;
    String mqtt_base_topic    = "autoroller";

    // Motor
    bool     invert_direction = false;
    uint32_t max_speed_hz     = 3200;
    uint32_t accel_hz_per_s   = 4000;
    int32_t  max_position     = 20000;  // pasos
    int32_t  current_position = 0;

    // Calibración
    bool     calibrated       = false;
    bool     use_endstops     = true;
};

void begin();
Settings load();
void save(const Settings& s);
void savePosition(int32_t position);
void factoryReset();

}  // namespace storage
