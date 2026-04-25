// AutoRoller — configuración global
// Cambia aquí los pines o valores por defecto. Casi todo se puede sobreescribir
// en runtime desde el portal web; estos son únicamente los defaults de fábrica.

#pragma once

#include <Arduino.h>

// =============================================================================
//  Identidad del dispositivo
// =============================================================================
#define AUTOROLLER_DEFAULT_HOSTNAME_PREFIX  "autoroller"
#define AUTOROLLER_AP_PASSWORD              ""        // vacío = abierta
#define AUTOROLLER_HTTP_PORT                80
#define AUTOROLLER_OTA_PORT                 3232

// =============================================================================
//  Pines
//  (ajusta aquí si has cableado distinto)
// =============================================================================
#if defined(AUTOROLLER_BOARD_C3)
  // ESP32-C3 SuperMini — menos pines, otro mapeo
  #define PIN_STEP            4
  #define PIN_DIR             5
  #define PIN_EN              6
  #define PIN_MS1             -1  // sin uso
  #define PIN_MS2             -1
  #define PIN_ENDSTOP_TOP     7
  #define PIN_ENDSTOP_BOTTOM  8
  #define PIN_BUTTON_UP       9
  #define PIN_BUTTON_DOWN    10
  #define PIN_LED_STATUS      3
  #define PIN_I2C_SDA         1
  #define PIN_I2C_SCL         0
#else
  // ESP32-WROOM-32 DevKit v1 (default) y ESP32-S3
  #define PIN_STEP           26
  #define PIN_DIR            27
  #define PIN_EN             14
  #define PIN_MS1            25
  #define PIN_MS2            33
  #define PIN_ENDSTOP_TOP    34   // input-only
  #define PIN_ENDSTOP_BOTTOM 35   // input-only
  #define PIN_BUTTON_UP      18
  #define PIN_BUTTON_DOWN    19
  #define PIN_LED_STATUS     23
  #define PIN_I2C_SDA        21
  #define PIN_I2C_SCL        22
#endif

// =============================================================================
//  Lógica de I/O
// =============================================================================
#define ENDSTOP_ACTIVE_LOW   1   // 1 = pulsado conduce a GND (lo más común)
#define BUTTON_ACTIVE_LOW    1
#define EN_ACTIVE_LOW        1   // TMC2208 → EN se activa en LOW

// =============================================================================
//  Motor
// =============================================================================
#define DEFAULT_STEPS_PER_REV       200
#define DEFAULT_MICROSTEPS          16
#define DEFAULT_MAX_SPEED_HZ        3200    // pasos/s
#define DEFAULT_ACCEL_HZ_PER_S      4000
#define DEFAULT_HOMING_SPEED_HZ     800
#define DEFAULT_INVERT_DIRECTION    false

// Recorrido máximo en pasos (antes de calibrar). Se sustituye al calibrar.
#define DEFAULT_MAX_POSITION_STEPS  20000

// =============================================================================
//  LED de estado (WS2812)
// =============================================================================
#define LED_COUNT  1   // pon 8 ó 12 si usas un anillo

// =============================================================================
//  Anti-rebote botones (ms)
// =============================================================================
#define BUTTON_DEBOUNCE_MS         30
#define BUTTON_LONGPRESS_MS        800

// =============================================================================
//  MQTT — defaults (vacío = deshabilitado)
// =============================================================================
#define MQTT_DEFAULT_PORT          1883
#define MQTT_DEFAULT_BASE_TOPIC    "autoroller"
#define MQTT_KEEPALIVE_S           30
#define MQTT_RECONNECT_MS          5000

// =============================================================================
//  Almacenamiento NVS
// =============================================================================
#define NVS_NAMESPACE              "autoroller"

// =============================================================================
//  Bluetooth Low Energy (BLE) — provisionamiento y control
// =============================================================================
// Prefijo del nombre BLE; al final se le añade -XXXX (de la MAC).
#define BLE_NAME_PREFIX            "AutoRoller"

// UUIDs del servicio y características (128-bit, custom).
#define BLE_SVC_UUID               "5a6f7e10-1a0e-4b0f-bd54-aaaa00000001"
#define BLE_CHR_REQUEST_UUID       "5a6f7e10-1a0e-4b0f-bd54-aaaa00000002"
#define BLE_CHR_RESPONSE_UUID      "5a6f7e10-1a0e-4b0f-bd54-aaaa00000003"
#define BLE_CHR_STATUS_UUID        "5a6f7e10-1a0e-4b0f-bd54-aaaa00000004"

// Política por defecto:
//   0 = always   (BLE siempre encendido, recomendado para control de respaldo)
//   1 = until_wifi (apaga BLE en cuanto WiFi conecta por primera vez)
//   2 = 5min     (apaga BLE 5 min después del arranque)
//   3 = off      (BLE deshabilitado salvo activación manual)
#define BLE_DEFAULT_POLICY         0

// Tiempo de la política "5min" en milisegundos.
#define BLE_TIMED_OFF_MS           (5 * 60 * 1000UL)

// Si pones 1, exige passkey de 6 dígitos al emparejar (mostramos 0 por
// defecto y el usuario lo cambia desde la web; si lo deja en 0, va sin PIN).
#define BLE_USE_PASSKEY            0

// =============================================================================
//  NTP / hora
// =============================================================================
#define NTP_DEFAULT_SERVER         "pool.ntp.org"
// Cadena POSIX para España peninsular. Cámbiala a tu zona si vives en otra.
#define NTP_DEFAULT_TZ             "CET-1CEST,M3.5.0/2,M10.5.0/3"

// =============================================================================
//  Programador horario (schedules)
// =============================================================================
#define SCHEDULER_MAX_ENTRIES      8

// =============================================================================
//  Tareas FreeRTOS
// =============================================================================
#define MOTOR_TASK_CORE            1
#define MOTOR_TASK_STACK           4096
#define MOTOR_TASK_PRIO            5

#define NETWORK_TASK_CORE          0
#define NETWORK_TASK_STACK         8192
#define NETWORK_TASK_PRIO          3
