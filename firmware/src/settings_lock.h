// Mutex global para proteger storage::Settings en RAM.
// Las escrituras pueden ocurrir desde la tarea de NimBLE (Core 0), los
// handlers HTTP (Core 0) y la tarea de motor (Core 1) durante la
// calibración. Las lecturas también — String no es atómico.
//
// Uso:
//   {
//       SettingsLock l;          // bloquea hasta salir del scope
//       s_settings->wifi_ssid = "X";
//       storage::save(*s_settings);
//   }

#pragma once

#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

extern SemaphoreHandle_t g_settings_mutex;

void initSettingsLock();

class SettingsLock {
public:
    SettingsLock()  { if (g_settings_mutex) xSemaphoreTakeRecursive(g_settings_mutex, portMAX_DELAY); }
    ~SettingsLock() { if (g_settings_mutex) xSemaphoreGiveRecursive(g_settings_mutex); }
    SettingsLock(const SettingsLock&) = delete;
    SettingsLock& operator=(const SettingsLock&) = delete;
};
