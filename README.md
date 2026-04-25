# AutoRoller

Sistema casero de motorización inalámbrica para cortinas y persianas, basado en
ESP32 y motores paso a paso. Cada nodo se conecta por WiFi, expone una API REST
y MQTT, sirve una interfaz web embebida, y se puede controlar desde el
navegador, desde scripts o, en el futuro, desde un asistente de voz propio.

El objetivo es disponer de un dispositivo:

- **Barato**: ~15-25 € por punto de control.
- **Imprimible**: todas las piezas mecánicas se fabrican con una impresora 3D
  doméstica (FDM, PLA/PETG).
- **Autónomo**: cada nodo se configura por sí solo (portal cautivo) y guarda
  posición incluso tras un corte de luz.
- **Abierto**: protocolo HTTP simple + MQTT estándar, sin servicios en la nube.

## Estructura del repositorio

| Carpeta            | Contenido                                                       |
| ------------------ | --------------------------------------------------------------- |
| `docs/`            | Toda la documentación: hardware, montaje, API, asistente de voz |
| `firmware/`        | Proyecto PlatformIO con el firmware del ESP32                   |
| `firmware/data/`   | Interfaz web servida desde LittleFS                             |
| `3d-models/`       | Especificación de las piezas a imprimir                         |
| `scripts/`         | Utilidades en Python (descubrimiento, control por consola)      |
| `examples/`        | Ejemplos de integración (Home Assistant, Node-RED, voz)         |

## Documentación

1. [Selección de hardware](docs/hardware.md) — qué comprar y por qué.
2. [Piezas a imprimir en 3D](docs/3d-printing.md) — qué fabricar.
3. [Cableado y montaje](docs/installation.md) — cómo conectarlo todo.
4. [Firmware y configuración](docs/configuration.md) — flashear y dar de alta.
5. [API REST y MQTT](docs/api.md) — referencia completa para integrar.
6. [Asistente de voz](docs/voice-assistant.md) — cómo encajará el asistente.
7. [Solución de problemas](docs/troubleshooting.md) — fallos típicos.

## Resumen del flujo

```
┌──────────────────┐   WiFi   ┌──────────────────┐   STEP/DIR  ┌──────────┐
│  Asistente / app │ ───────▶ │   ESP32 (nodo)   │ ──────────▶ │  Driver  │ ──▶ Motor ──▶ Cortina
│  navegador / CLI │ ◀─────── │  HTTP + MQTT     │ ◀── ENDSTOP │  TMC2208 │
└──────────────────┘  estado  └──────────────────┘             └──────────┘
```

## Roadmap

- [x] Firmware ESP32 con servidor web, REST, MQTT, OTA y portal de configuración.
- [x] Soporte de motor paso a paso (NEMA 17 + TMC2208) con calibración.
- [x] Interfaz web embebida.
- [x] Documentación de hardware y piezas 3D.
- [ ] Asistente de voz casero (wake word + STT local + intents → MQTT).
- [ ] Sensor de luz / temperatura para automatizaciones por contexto.
- [ ] Versión con motor DC + encoder para cortinas más pesadas.

## Licencia

MIT. Úsalo, modifícalo y comparte mejoras.
