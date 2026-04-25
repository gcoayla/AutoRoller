#include "storage.h"

#include <Preferences.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

#include "config.h"

namespace storage {

static Preferences         prefs;
// Recursivo: save() llama internamente a saveSchedules() que también toma
// la misma cerradura.
static SemaphoreHandle_t   s_mtx = nullptr;

struct Lock {
    Lock()  { if (s_mtx) xSemaphoreTakeRecursive(s_mtx, portMAX_DELAY); }
    ~Lock() { if (s_mtx) xSemaphoreGiveRecursive(s_mtx); }
};

void begin() {
    if (!s_mtx) s_mtx = xSemaphoreCreateRecursiveMutex();
    Lock l;
    prefs.begin(NVS_NAMESPACE, false);
}

static String defaultHostname() {
    uint64_t mac = ESP.getEfuseMac();
    char buf[40];
    snprintf(buf, sizeof(buf), "%s-%04x",
             AUTOROLLER_DEFAULT_HOSTNAME_PREFIX,
             (uint16_t)(mac & 0xFFFF));
    return String(buf);
}

Settings load() {
    Lock l;
    Settings s;
    s.hostname        = prefs.getString("hostname", defaultHostname());
    s.wifi_ssid       = prefs.getString("wifi_ssid", "");
    s.wifi_password   = prefs.getString("wifi_pass", "");

    s.mqtt_enabled    = prefs.getBool("mqtt_en", false);
    s.mqtt_host       = prefs.getString("mqtt_host", "");
    s.mqtt_port       = prefs.getUShort("mqtt_port", MQTT_DEFAULT_PORT);
    s.mqtt_user       = prefs.getString("mqtt_user", "");
    s.mqtt_password   = prefs.getString("mqtt_pass", "");
    s.mqtt_base_topic = prefs.getString("mqtt_topic", MQTT_DEFAULT_BASE_TOPIC);

    s.invert_direction = prefs.getBool("invert", DEFAULT_INVERT_DIRECTION);
    s.max_speed_hz     = prefs.getUInt("max_speed", DEFAULT_MAX_SPEED_HZ);
    s.accel_hz_per_s   = prefs.getUInt("accel", DEFAULT_ACCEL_HZ_PER_S);
    s.max_position     = prefs.getInt("max_pos", DEFAULT_MAX_POSITION_STEPS);
    s.current_position = prefs.getInt("cur_pos", 0);
    s.calibrated       = prefs.getBool("calibrated", false);
    s.use_endstops     = prefs.getBool("endstops", true);

    s.ble_enabled      = prefs.getBool("ble_en", true);
    s.ble_policy       = prefs.getUChar("ble_pol", BLE_DEFAULT_POLICY);
    s.ble_passkey      = prefs.getUInt("ble_pin", 0);
    s.api_token        = prefs.getString("api_tok", "");

    s.ntp_enabled      = prefs.getBool("ntp_en", true);
    s.ntp_server       = prefs.getString("ntp_srv", NTP_DEFAULT_SERVER);
    s.timezone         = prefs.getString("tz",      NTP_DEFAULT_TZ);

    // Schedules: payload binario plano para que sea atómico.
    size_t need = sizeof(s.schedules);
    if (prefs.getBytesLength("sched") == need) {
        prefs.getBytes("sched", &s.schedules, need);
    }
    return s;
}

void save(const Settings& s) {
    Lock l;
    prefs.putString("hostname",  s.hostname);
    prefs.putString("wifi_ssid", s.wifi_ssid);
    prefs.putString("wifi_pass", s.wifi_password);

    prefs.putBool("mqtt_en",     s.mqtt_enabled);
    prefs.putString("mqtt_host", s.mqtt_host);
    prefs.putUShort("mqtt_port", s.mqtt_port);
    prefs.putString("mqtt_user", s.mqtt_user);
    prefs.putString("mqtt_pass", s.mqtt_password);
    prefs.putString("mqtt_topic", s.mqtt_base_topic);

    prefs.putBool("invert",      s.invert_direction);
    prefs.putUInt("max_speed",   s.max_speed_hz);
    prefs.putUInt("accel",       s.accel_hz_per_s);
    prefs.putInt("max_pos",      s.max_position);
    prefs.putInt("cur_pos",      s.current_position);
    prefs.putBool("calibrated",  s.calibrated);
    prefs.putBool("endstops",    s.use_endstops);

    prefs.putBool("ble_en",      s.ble_enabled);
    prefs.putUChar("ble_pol",    s.ble_policy);
    prefs.putUInt("ble_pin",     s.ble_passkey);
    prefs.putString("api_tok",   s.api_token);

    prefs.putBool("ntp_en",      s.ntp_enabled);
    prefs.putString("ntp_srv",   s.ntp_server);
    prefs.putString("tz",        s.timezone);

    saveSchedules(s);
}

void saveSchedules(const Settings& s) {
    Lock l;
    prefs.putBytes("sched", &s.schedules, sizeof(s.schedules));
}

void savePosition(int32_t position) {
    Lock l;
    prefs.putInt("cur_pos", position);
}

void factoryReset() {
    Lock l;
    prefs.clear();
}

}  // namespace storage
