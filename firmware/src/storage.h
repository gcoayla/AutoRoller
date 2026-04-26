// AutoRoller — almacenamiento persistente (NVS)
// Encapsula Preferences para que el resto del código no tenga que conocer
// claves ni tipos.

#pragma once

#include <Arduino.h>

namespace storage {

struct ScheduleEntry {
    bool    enabled    = false;
    uint8_t hour       = 0;       // 0..23
    uint8_t minute     = 0;       // 0..59
    uint8_t days_mask  = 0x7F;    // bit 0=Lun, 1=Mar, ... 6=Dom (0x7F = todos)
    uint8_t target_pct = 0;       // 0..100
};

// Posición favorita guardada en el dispositivo. Hasta 6 por nodo.
struct FavoritePreset {
    bool    enabled    = false;
    uint8_t target_pct = 0;       // 0..100 (se clampea con limit_open/close)
    char    name[16]   = {0};     // 15 + nul
};

constexpr size_t FAVORITES_COUNT = 6;

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
    uint32_t max_speed_hz     = 2400;     // suave por defecto (chain-puller)
    uint32_t accel_hz_per_s   = 3000;
    int32_t  max_position     = 12000;    // pasos; el usuario calibra
    int32_t  current_position = 0;

    // Mecanismo. 0 = chain_puller (no invasivo), 1 = in_tube (invasivo).
    uint8_t  mechanism_type   = 0;

    // Calibración. Sin endstops por defecto: el chain-puller no los usa.
    bool     calibrated       = false;
    bool     use_endstops     = false;

    // Límites de seguridad de recorrido (en % del recorrido calibrado).
    // 0% = totalmente arriba, 100% = totalmente abajo.
    // Por defecto sin restricción (0..100).
    uint8_t  limit_open       = 0;
    uint8_t  limit_close      = 100;

    // BLE
    bool     ble_enabled      = true;     // se puede apagar desde la web
    uint8_t  ble_policy       = 0;        // 0=always 1=until_wifi 2=5min 3=off
    uint32_t ble_passkey      = 0;        // 0 = sin PIN

    // Seguridad HTTP
    String   api_token;                   // vacío = sin auth (compat)

    // NTP / zona horaria
    bool     ntp_enabled      = true;
    String   ntp_server       = "pool.ntp.org";
    String   timezone         = "CET-1CEST,M3.5.0/2,M10.5.0/3";

    // Programador
    ScheduleEntry schedules[8];

    // Favoritas por dispositivo
    FavoritePreset favorites[FAVORITES_COUNT];
};

void begin();
Settings load();
void save(const Settings& s);
void savePosition(int32_t position);
void saveSchedules(const Settings& s);
void saveFavorites(const Settings& s);
void factoryReset();

}  // namespace storage
