// AutoRoller — BLE GATT para provisionamiento y control
//
// Expone un servicio BLE con tres características:
//   - REQUEST  (write):     el cliente escribe un JSON con la operación
//   - RESPONSE (notify):    respuesta JSON a la última request, en chunks
//   - STATUS   (read+notify): JSON con estado actual; se notifica en cambios
//
// Operaciones (clave "op" del JSON):
//   info, scan_wifi, set_wifi, set_mqtt, set_hostname, set_motor,
//   set_time, get_config, get_schedules, set_schedule, del_schedule,
//   control, calibrate, reboot, factory_reset, ble_off
//
// Pensado para ser compatible con la app companion (Web Bluetooth) y con
// `scripts/ble_provision.py`.

#pragma once

#include <Arduino.h>

#include "storage.h"

namespace bleprov {

void begin(storage::Settings& settings);
void loop();
void stop();
void start();             // re-arranca BLE si estaba apagado
void notifyStatusChange();

bool isInitialized();
bool isAdvertising();
bool isConnected();

}  // namespace bleprov
