// AutoRoller — gestor WiFi + portal cautivo
// Si no hay credenciales guardadas, levanta un AP y un portal cautivo en
// `http://192.168.4.1`. Una vez configurado, intenta conectarse y reintenta.

#pragma once

#include <Arduino.h>

#include "storage.h"

namespace netcfg {

enum class Mode : uint8_t {
    BOOT,
    PORTAL,         // AP + portal cautivo
    CONNECTING,
    CONNECTED,
    FAILED,
};

void begin(storage::Settings& settings);
void loop();

Mode   mode();
String currentIP();
String currentSSID();
String hostname();

// Fuerza entrar al portal en el siguiente loop (botón "olvidar wifi" en la web).
void forcePortal();

}  // namespace netcfg
