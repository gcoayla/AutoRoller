// AutoRoller — programador horario.
// Cada minuto comprueba si alguna entrada coincide con HH:MM y, si el día
// de la semana está en la máscara, dispara `motor::moveToPercent(target)`.

#pragma once

#include "storage.h"

namespace scheduler {

void begin(storage::Settings& settings);
void loop();

}  // namespace scheduler
