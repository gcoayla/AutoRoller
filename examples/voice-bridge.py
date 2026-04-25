#!/usr/bin/env python3
"""
voice-bridge.py — Esqueleto de puente STT → intents → MQTT.

Esta es la "tubería" que un día conectará tu asistente de voz casero con los
nodos AutoRoller. Aún no captura audio: aceptamos texto por línea de comandos
para tener la pieza en su sitio y validar el flujo.

Uso:
    python3 voice-bridge.py "sube la cortina del salón"
    python3 voice-bridge.py "baja la cortina al 30 por ciento"
    python3 voice-bridge.py "para la cortina"

Cuando enchufes Whisper, sustituye `read_text()` por la transcripción del audio
del satélite ESP32 y deja todo el resto igual.

Requiere: paho-mqtt
    pip install paho-mqtt
"""

from __future__ import annotations

import re
import sys

try:
    import paho.mqtt.client as mqtt
except ImportError:
    sys.stderr.write("Instala dependencias: pip install paho-mqtt\n")
    sys.exit(1)


# ---- configuración ---------------------------------------------------------
BROKER       = "192.168.1.10"
PORT         = 1883
BASE_TOPIC   = "autoroller"
DEFAULT_ROOM = "salon"

# vocabulario reconocido (room → hostname del nodo en MQTT)
ROOMS = {
    "salón": "salon",
    "salon": "salon",
    "cocina": "cocina",
    "dormitorio": "dormitorio",
    "habitación": "habitacion",
    "habitacion": "habitacion",
}

NUMBERS_ES = {
    "diez": 10, "veinte": 20, "treinta": 30, "cuarenta": 40, "cincuenta": 50,
    "sesenta": 60, "setenta": 70, "ochenta": 80, "noventa": 90, "cien": 100,
}


# ---- intents ---------------------------------------------------------------
def parse(text: str) -> tuple[str, str | None, str]:
    """Devuelve (cmd, payload, room)."""
    text = text.lower().strip()

    room = DEFAULT_ROOM
    for k, v in ROOMS.items():
        if k in text:
            room = v
            break

    # "al N %", "al N por ciento" — solo si va precedido de "al" o termina en %.
    m = re.search(r"\bal\s+(\d{1,3})(?:\s*%|\s*por\s*ciento)?\b", text)
    if not m:
        m = re.search(r"(\d{1,3})\s*%", text)
    if m:
        v = max(0, min(100, int(m.group(1))))
        return ("set", str(v), room)

    # Variantes con número escrito ("al cincuenta por ciento").
    for word, val in NUMBERS_ES.items():
        if re.search(rf"\bal\s+{word}\s+por\s+ciento\b", text):
            return ("set", str(val), room)

    if any(k in text for k in ("sube", "subir", "abre", "abrir", "arriba")):
        return ("open", "", room)
    if any(k in text for k in ("baja", "bajar", "cierra", "cerrar", "abajo")):
        return ("close", "", room)
    if any(k in text for k in ("para", "parar", "detén", "deten", "stop")):
        return ("stop", "", room)
    if "calibra" in text:
        return ("calibrate", "", room)

    return ("noop", None, room)


# ---- main ------------------------------------------------------------------
def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2

    text = " ".join(sys.argv[1:])
    cmd, payload, room = parse(text)
    if cmd == "noop":
        print(f"No reconozco la orden: {text!r}")
        return 1

    topic = f"{BASE_TOPIC}/{room}/cmd/{cmd}"
    print(f"[bridge] {text!r} → {topic} {payload!r}")

    client = mqtt.Client()
    client.connect(BROKER, PORT, 30)
    client.publish(topic, payload or "")
    client.disconnect()
    return 0


if __name__ == "__main__":
    sys.exit(main())
