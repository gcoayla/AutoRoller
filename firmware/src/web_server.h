// AutoRoller — servidor HTTP + WebSocket + portal cautivo
//
// Sirve la interfaz web embebida desde LittleFS y expone una API REST
// documentada en `docs/api.md`.

#pragma once

#include <Arduino.h>

#include "storage.h"

namespace web {

void begin(storage::Settings& settings);
void loop();

// Empuja un evento por WebSocket a todos los clientes.
void pushState();

}  // namespace web
