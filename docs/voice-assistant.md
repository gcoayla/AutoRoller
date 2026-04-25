# Asistente de voz casero — hoja de ruta

> Este documento recoge la **arquitectura propuesta** para el futuro asistente
> de voz que controlará los nodos AutoRoller. **No es código todavía**; es la
> guía que vas a seguir cuando lo abordes. La idea es que cuando llegues a
> este punto, AutoRoller ya esté funcionando con MQTT/HTTP y solo haya que
> añadir la "boca y los oídos".

## Principios

- **Local-first**: nada sale de tu LAN. Sin Alexa, sin Google, sin
  dependencias en la nube.
- **Modular**: STT, intents y TTS son tres servicios desacoplados que se
  pueden reemplazar.
- **Texto plano por debajo**: el resultado final de "entender una orden" es
  publicar un mensaje MQTT. Eso ya lo entiende AutoRoller.
- **Hardware compartido**: los mismos ESP32 de los nodos de cortina se pueden
  usar como satélites de captura de audio.

## Arquitectura propuesta

```
       ┌────────────────┐  WAV/Opus  ┌──────────────────────┐
       │ ESP32 satélite │ ─────────▶ │ Servicio en tu PC /  │
       │ INMP441 + LED  │            │ Raspberry Pi / NAS   │
       │ wake word      │ ◀───── TTS │  • STT (Whisper)     │
       └────────────────┘   audio    │  • NLU (intents)     │
                                     │  • TTS (Piper)       │
                                     │  • Bridge → MQTT     │
                                     └──────────┬───────────┘
                                                │ MQTT
                                                ▼
                                ┌─────────────────────────────┐
                                │ Brokers Mosquitto + Nodos   │
                                │ AutoRoller (cortinas, etc.) │
                                └─────────────────────────────┘
```

### Componentes

| Pieza               | Recomendación                            | Notas                                    |
| ------------------- | ---------------------------------------- | ---------------------------------------- |
| Micrófono           | **INMP441** (I²S)                        | 5 €, calidad excelente, omnidireccional  |
| Altavoz             | MAX98357A + altavoz 8 Ω 1-2 W            | I²S, sin ruido                           |
| Placa satélite      | **ESP32-S3** (PSRAM, USB nativo)         | Necesaria para wake word local en MCU    |
| Wake word           | [microWakeWord](https://github.com/kahrendt/microWakeWord) o [openWakeWord](https://github.com/dscripka/openWakeWord) | Local, "Hey casa" personalizada |
| STT                 | **Whisper.cpp** (modelo `small` ó `base`) en tu PC/RPi | Suficiente para órdenes cortas          |
| NLU / intents       | **Rhasspy** o un parser regex propio     | Empieza con regex, te sobrará            |
| TTS                 | **Piper** (voces es-ES de calidad)       | Generación local en <1 s en RPi 4        |
| Mensajería          | **Mosquitto** (mismo broker que AutoRoller) | Una sola fuente de la verdad           |

### Flujo paso a paso

1. El satélite ESP32 escucha continuamente con el INMP441.
2. Detecta la wake word con un modelo TFLite Micro local (CPU < 30 %).
3. Emite el LED en azul, abre un stream de audio Opus por websocket o por
   MQTT (topic `voice/<sat>/audio`).
4. El servicio en tu PC/RPi:
   1. Pasa el audio a Whisper → texto.
   2. Pasa el texto al NLU → estructura `{intent, slots}`.
   3. Mapea el intent a un comando MQTT de AutoRoller.
   4. Sintetiza con Piper la confirmación ("Cortina del salón cerrada") y la
      devuelve al satélite.
5. AutoRoller recibe el comando MQTT y mueve la cortina.

### Mapeo de intents → MQTT (ejemplo)

```yaml
- intent: cover_set
  examples:
    - "sube la cortina del [salón|cocina|dormitorio]"
    - "baja la cortina del {room}"
    - "cierra la cortina"
    - "pon la cortina al {percent} por ciento"
  action:
    topic: "autoroller/{room|default('salon')}/cmd/{set|open|close}"
    payload: "{percent}"
```

Para empezar, basta con un parser de 30 líneas en Python que reconozca los
patrones más comunes; un NLU completo no es imprescindible.

## Mínimo viable (3 hitos)

1. **MVP1 — push-to-talk desde el móvil**:
   App o web local con un botón "hablar". Manda audio al servidor, que
   transcribe con Whisper y publica MQTT. **Ningún hardware extra**.
2. **MVP2 — satélite ESP32 con botón físico**:
   Reemplaza el botón del móvil por un ESP32 con micrófono y un pulsador.
   Aún sin wake word.
3. **MVP3 — wake word**:
   Añade microWakeWord ("Hey casa") en el ESP32. Manos libres total.

## Por qué encaja con AutoRoller

- AutoRoller ya **es controlable por MQTT** sin cambios. Cualquier asistente
  que publique en los topics correctos lo controla.
- Los topics son legibles por humanos: si algo va mal, `mosquitto_sub -t '#'`
  te dice exactamente qué se está enviando.
- El asistente puede vivir en cualquier sitio (un Pi, tu PC, una VPS local) y
  apagarse sin afectar al control físico (botones) ni al panel web.

## Recursos para arrancar

- [ESPHome voice assistant guide](https://esphome.io/components/voice_assistant.html)
  (referencia técnica de cómo lo hacen otros).
- [Rhasspy 3](https://rhasspy.readthedocs.io/) (suite local todo-en-uno).
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp).
- [Piper](https://github.com/rhasspy/piper).
- [microWakeWord](https://github.com/kahrendt/microWakeWord).

Cuando llegues a este punto, abre una rama nueva (`voice-assistant-v0`),
empieza por el MVP1 y crea `firmware-voice/` para el satélite.
