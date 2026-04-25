# Firmware y configuración

## Compilar y flashear

### Con PlatformIO (recomendado)

```bash
cd firmware
pio run -e esp32dev               # compilar
pio run -e esp32dev -t upload     # flashear firmware
pio run -e esp32dev -t uploadfs   # subir interfaz web (LittleFS)
pio device monitor -b 115200      # consola
```

Para otras placas:

```bash
pio run -e esp32s3 -t upload      # ESP32-S3
pio run -e esp32c3 -t upload      # ESP32-C3
```

### Con Arduino IDE

1. Instala [soporte ESP32](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html).
2. Selecciona placa "ESP32 Dev Module".
3. Instala las librerías (Tools → Library Manager):
   - FastAccelStepper
   - ArduinoJson
   - PubSubClient
   - ESP Async WebServer + AsyncTCP
   - FastLED
4. Sube el `.ino` con todos los `.cpp` en la misma carpeta.
5. Sube los archivos de `firmware/data/` a LittleFS con la herramienta
   [arduino-littlefs-upload](https://github.com/earlephilhower/arduino-littlefs-upload).

## Primer arranque (resumen)

1. Conecta a la red WiFi `AutoRoller-XXXX` (sin contraseña por defecto).
2. Abre el navegador, debería aparecer el portal cautivo (si no, ve a
   `http://192.168.4.1`).
3. Configura SSID, contraseña y nombre del dispositivo. Opcional: MQTT.
4. Reinicio automático: el nodo se conecta y publica `mDNS`. Accede a
   `http://<hostname>.local`.

## Variables que se pueden cambiar en runtime

Todo lo de [`firmware/src/config.h`](../firmware/src/config.h) puede tocarse en
caliente desde la web (`/api/config`). Lo único que requiere reflasheo es:

- Mapeo de pines (cuando recableas).
- Tipo de placa (ESP32 / S3 / C3).
- Lógica activa-baja de finales de carrera o botones (si has soldado al revés).

## Reset y recuperación

| Escenario                                       | Acción                                                         |
| ----------------------------------------------- | -------------------------------------------------------------- |
| Olvidé el SSID                                  | Long-press simultáneo de los dos botones físicos (~1 s)        |
| Olvidé el SSID y no tengo botones               | `POST /api/forget-wifi` desde la red local si aún responde     |
| Borrar TODO (config + posición)                 | `POST /api/factory-reset` o `prefs.clear()` por serie          |
| Cortina sale del recorrido por error            | `POST /api/stop`, luego pulsa **"Marcar 0 aquí"** en la UI     |
| Endstops no detectan                            | Desactiva "Usar finales de carrera" en config y usa `set-here` |

## Estructura del firmware

```
firmware/
├── platformio.ini
├── data/                ← LittleFS (interfaz web embebida)
│   ├── index.html
│   ├── style.css
│   └── script.js
└── src/
    ├── main.cpp         ← arranque, tareas FreeRTOS
    ├── config.h         ← pines y defaults
    ├── storage.{h,cpp}  ← NVS (Preferences)
    ├── motor_controller ← FastAccelStepper + endstops + calibración
    ├── wifi_manager     ← WiFi STA + portal cautivo + mDNS
    ├── web_server       ← AsyncWebServer + WebSocket + OTA HTTP
    ├── mqtt_client      ← PubSubClient + LWT + autocfg
    └── buttons          ← anti-rebote + LED WS2812 de estado
```

## Decisiones de diseño

- **FastAccelStepper en vez de AccelStepper**: usa el periférico RMT del ESP32
  para generar pulsos STEP sin saturar la CPU.
- **AsyncWebServer**: no bloquea, perfecto para servir la UI mientras el motor
  se mueve.
- **LittleFS**: más robusto que SPIFFS y es estándar en ESP32 desde 2024.
- **PubSubClient**: mínimo, fiable. Para QoS > 0 usaríamos AsyncMqttClient,
  pero para AutoRoller no compensa.
- **Una tarea de motor en Core 1, red en Core 0**: garantiza que un cliente
  HTTP saturando el sistema no afecte al timing del motor.
- **WebSocket para la UI**: 1 socket, eventos push, sin polling.
- **Configuración por JSON en `/api/config`**: el mismo endpoint vale para
  scripts de aprovisionamiento masivo (ver `scripts/provision.py`).
