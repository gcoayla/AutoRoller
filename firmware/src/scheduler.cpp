#include "scheduler.h"

#include <Arduino.h>
#include <time.h>

#include "config.h"
#include "motor_controller.h"
#include "time_sync.h"

namespace scheduler {

static storage::Settings* s_settings = nullptr;
static int                s_lastTriggeredMinute = -1;  // evita re-disparo en el mismo min

void begin(storage::Settings& settings) {
    s_settings = &settings;
}

void loop() {
    if (!s_settings) return;
    if (!timesync::isSynced()) return;

    time_t now = time(nullptr);
    struct tm tm;
    localtime_r(&now, &tm);

    int currentMinuteOfDay = tm.tm_hour * 60 + tm.tm_min;
    if (currentMinuteOfDay == s_lastTriggeredMinute) return;
    s_lastTriggeredMinute = currentMinuteOfDay;

    // tm_wday: 0=Dom, 1=Lun, ..., 6=Sab → mapeo a nuestro 0=Lun..6=Dom
    uint8_t dayBit = (tm.tm_wday == 0) ? 6 : (tm.tm_wday - 1);

    for (size_t i = 0; i < SCHEDULER_MAX_ENTRIES; ++i) {
        const auto& e = s_settings->schedules[i];
        if (!e.enabled) continue;
        if (e.hour != tm.tm_hour) continue;
        if (e.minute != tm.tm_min) continue;
        if (!(e.days_mask & (1u << dayBit))) continue;

        Serial.printf("[SCHED] disparando #%d → %u%%\n", (int)i, e.target_pct);
        motor::moveToPercent(e.target_pct);
    }
}

}  // namespace scheduler
