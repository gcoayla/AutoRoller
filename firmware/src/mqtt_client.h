// AutoRoller — cliente MQTT (opcional)
//
// Topics:
//   <base>/<hostname>/cmd/set       (payload: 0..100)
//   <base>/<hostname>/cmd/open      (cualquier payload)
//   <base>/<hostname>/cmd/close
//   <base>/<hostname>/cmd/stop
//   <base>/<hostname>/cmd/calibrate
//   <base>/<hostname>/state         (publica JSON con estado)
//   <base>/<hostname>/availability  (online / offline, retain + LWT)

#pragma once

#include <Arduino.h>

#include "storage.h"

namespace mqtt {

void begin(storage::Settings& settings);
void loop();
void publishState();

bool isEnabled();
bool isConnected();

}  // namespace mqtt
