#include "scheduler.h"

#include <Arduino.h>
#include <time.h>

#include "config.h"
#include "motor_controller.h"
#include "time_sync.h"

namespace scheduler {

static storage::Settings* s_settings = nullptr;

// Marca por regla del último disparo (Unix). Evita duplicados durante el
// retroceso horario de DST de otoño y posibles drifts del reloj.
static time_t s_lastFired[SCHEDULER_MAX_ENTRIES] = { 0 };

// No volvemos a disparar la misma regla en menos de 23 h.
static const time_t MIN_INTERVAL_S = 23L * 3600L;

void begin(storage::Settings& settings) {
    s_settings = &settings;
}

void loop() {
    if (!s_settings) return;
    if (!timesync::isSynced()) return;

    time_t now = time(nullptr);
    struct tm tm;
    localtime_r(&now, &tm);

    // tm_wday: 0=Dom..6=Sab → mapeo a 0=Lun..6=Dom (mismo formato que la web).
    uint8_t dayBit = (tm.tm_wday == 0) ? 6 : (tm.tm_wday - 1);

    for (size_t i = 0; i < SCHEDULER_MAX_ENTRIES; ++i) {
        const auto& e = s_settings->schedules[i];
        if (!e.enabled) continue;
        if (e.hour   != tm.tm_hour)  continue;
        if (e.minute != tm.tm_min)   continue;
        if (!(e.days_mask & (1u << dayBit))) continue;
        // Anti-doble-disparo (DST otoño hace que la hora local repita 02:00-02:59).
        if (s_lastFired[i] != 0 && (now - s_lastFired[i]) < MIN_INTERVAL_S) continue;

        s_lastFired[i] = now;
        Serial.printf("[SCHED] disparando #%d → %u%%\n", (int)i, e.target_pct);
        motor::moveToPercent(e.target_pct);
    }
}

}  // namespace scheduler
