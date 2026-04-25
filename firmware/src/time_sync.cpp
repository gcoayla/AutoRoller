#include "time_sync.h"

#include <WiFi.h>
#include <time.h>

namespace timesync {

static bool   s_started     = false;
static bool   s_synced      = false;
static String s_tz;
static String s_server;
static bool   s_enabled     = true;
static uint32_t s_lastCheck = 0;

void begin(const storage::Settings& settings) {
    s_enabled = settings.ntp_enabled;
    s_server  = settings.ntp_server;
    s_tz      = settings.timezone;
}

bool isSynced() { return s_synced; }

static void doSync() {
    if (!s_enabled) return;
    if (s_started) return;
    Serial.printf("[NTP] sincronizando con %s · TZ=%s\n",
                  s_server.c_str(), s_tz.c_str());
    configTzTime(s_tz.c_str(), s_server.c_str());
    s_started = true;
}

void loop() {
    if (!s_enabled) return;
    if (WiFi.status() != WL_CONNECTED) {
        s_started = false;  // reintentaremos al reconectar
        return;
    }
    if (!s_started) doSync();
    if (!s_synced && (millis() - s_lastCheck > 1000)) {
        s_lastCheck = millis();
        time_t now = time(nullptr);
        if (now > 1700000000) {  // hay año razonable
            s_synced = true;
            Serial.printf("[NTP] hora sincronizada: %s\n",
                          currentLocalDateTime().c_str());
        }
    }
}

String currentLocalTime() {
    time_t now = time(nullptr);
    struct tm tm;
    localtime_r(&now, &tm);
    char buf[16];
    snprintf(buf, sizeof(buf), "%02d:%02d:%02d", tm.tm_hour, tm.tm_min, tm.tm_sec);
    return String(buf);
}

String currentLocalDateTime() {
    time_t now = time(nullptr);
    struct tm tm;
    localtime_r(&now, &tm);
    char buf[24];
    snprintf(buf, sizeof(buf), "%04d-%02d-%02d %02d:%02d:%02d",
             tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday,
             tm.tm_hour, tm.tm_min, tm.tm_sec);
    return String(buf);
}

}  // namespace timesync
