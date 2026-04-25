# AutoRoller

Sistema casero de motorización inalámbrica para cortinas y persianas, basado en
ESP32 y motores paso a paso. Cada nodo se conecta por WiFi, expone una API REST
y MQTT, sirve una interfaz web embebida, y se puede controlar desde el
navegador, desde scripts o, en el futuro, desde un asistente de voz propio.

El objetivo es disponer de un dispositivo:

- **Barato**: ~15-25 € por punto de control.
- **Imprimible**: todas las piezas mecánicas se fabrican con una impresora 3D
  doméstica (FDM, PLA/PETG).
- **Autónomo**: cada nodo se configura por sí solo (BLE GATT o portal
  cautivo WiFi) y guarda posición incluso tras un corte de luz.
- **Abierto**: protocolo HTTP simple + MQTT estándar + BLE GATT, sin
  servicios en la nube.
- **Programable**: incluye programador horario interno (NTP + cron-like) sin
  necesidad de un servidor externo.

## Estructura del repositorio

| Carpeta            | Contenido                                                       |
| ------------------ | --------------------------------------------------------------- |
| `docs/`            | Toda la documentación: hardware, montaje, API, BLE, asistente   |
| `firmware/`        | Proyecto PlatformIO con el firmware del ESP32                   |
| `firmware/data/`   | Interfaz web servida desde LittleFS                             |
| `3d-models/`       | Especificación de las piezas a imprimir                         |
| `mobile/`          | App móvil React Native (Expo + NativeWind v5 + Zustand)         |
| `companion/`       | App standalone Web Bluetooth para el primer arranque            |
| `scripts/`         | Utilidades Python: descubrimiento, control, BLE provisioning    |
| `examples/`        | Ejemplos de integración (Home Assistant, Node-RED, voz)         |

## Documentación

1. [Selección de hardware](docs/hardware.md) — qué comprar y por qué.
2. [Piezas a imprimir en 3D](docs/3d-printing.md) — qué fabricar.
3. [Cableado y montaje](docs/installation.md) — cómo conectarlo todo.
4. [Firmware y configuración](docs/configuration.md) — flashear y dar de alta.
5. [Provisionamiento por BLE](docs/ble-provisioning.md) — config inicial sin WiFi.
6. [API REST, WebSocket y MQTT](docs/api.md) — referencia completa para integrar.
7. [Asistente de voz](docs/voice-assistant.md) — cómo encajará el asistente.
8. [Solución de problemas](docs/troubleshooting.md) — fallos típicos.

## Resumen del flujo

```
                    ┌─────────────────────────────┐
                    │   ESP32 (nodo AutoRoller)   │
                    │                             │
  WiFi ───HTTP────▶ │  AsyncWebServer + WS        │ ──STEP/DIR──▶ TMC2208 ──▶ Motor ──▶ Cortina
                    │  Portal cautivo + mDNS      │
       ──MQTT────▶  │  PubSubClient (LWT, retain) │ ◀─Endstops──
                    │                             │
  BLE   ──GATT────▶ │  NimBLE (provisión+control) │ ◀─Botones───
                    │                             │
                    │  NTP + scheduler interno    │
                    └─────────────────────────────┘
```

Tres formas de hablar con el nodo:

1. **HTTP / WebSocket** desde su panel web embebido o cualquier cliente.
2. **MQTT** para integrar con Home Assistant, Node-RED o tu asistente de voz.
3. **BLE GATT** para configuración inicial y control de respaldo cuando no
   hay WiFi.

## Roadmap

- [x] Firmware ESP32 con servidor web, REST, MQTT, OTA y portal de configuración.
- [x] Soporte de motor paso a paso (NEMA 17 + TMC2208) con calibración.
- [x] Interfaz web embebida.
- [x] Documentación de hardware y piezas 3D.
- [x] Provisionamiento por **BLE GATT** + companion app Web Bluetooth.
- [x] Sincronización **NTP** y programador horario interno (8 reglas semanales).
- [x] **App móvil** React Native (Expo) para Android con multi-dispositivo.
- [ ] Asistente de voz casero (wake word + STT local + intents → MQTT).
- [ ] Sensor de luz / temperatura para automatizaciones por contexto.
- [ ] Versión con motor DC + encoder para cortinas más pesadas.

## Licencia

MIT. Úsalo, modifícalo y comparte mejoras.
