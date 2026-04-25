// AutoRoller — sincronización horaria por NTP + zona horaria POSIX.
// Sin esto el programador no sirve.

#pragma once

#include <Arduino.h>

#include "storage.h"

namespace timesync {

void   begin(const storage::Settings& settings);
void   loop();
bool   isSynced();
String currentLocalTime();   // "HH:MM:SS"
String currentLocalDateTime(); // "YYYY-MM-DD HH:MM:SS"

}  // namespace timesync
