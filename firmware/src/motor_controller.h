// AutoRoller — control del motor paso a paso
// Encapsula FastAccelStepper, finales de carrera, calibración y persistencia
// de posición. Pensado para ejecutarse en una tarea propia (Core 1) y exponer
// un API de "objetivo" desde la red.

#pragma once

#include <Arduino.h>

#include "storage.h"

namespace motor {

enum class State : uint8_t {
    IDLE,
    MOVING_UP,
    MOVING_DOWN,
    HOMING,
    CALIBRATING,
    FAULT,
};

void begin(const storage::Settings& s);

// Mover a porcentaje 0..100 (0 = totalmente arriba, 100 = totalmente abajo).
void moveToPercent(uint8_t percent);

// Mover a una posición concreta en pasos.
void moveToSteps(int32_t steps);

// Subir / bajar de forma libre (sin objetivo concreto).
void jogUp();
void jogDown();

// Detener inmediatamente.
void stop();

// Lanza la rutina de calibración: busca endstop superior (= 0) y luego
// inferior (= max).
void calibrate();

// Marca la posición actual como 0 (homing manual).
void setHere(int32_t value);

// Estado actual.
State    state();
int32_t  position();
int32_t  maxPosition();
uint8_t  positionPercent();
bool     isCalibrated();

// Loop interno: llamar cada N ms desde la tarea de motor (ya lo hace
// `motorTask`). Si llamas a `motor::tick()` desde `loop()` también funciona.
void tick();

// Tarea para FreeRTOS (se arranca desde main.cpp).
void task(void* arg);

}  // namespace motor
