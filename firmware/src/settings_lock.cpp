#include "settings_lock.h"

SemaphoreHandle_t g_settings_mutex = nullptr;

void initSettingsLock() {
    if (!g_settings_mutex) g_settings_mutex = xSemaphoreCreateRecursiveMutex();
}
