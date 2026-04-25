#!/usr/bin/env python3
"""
provision.py — Provisión masiva de nodos AutoRoller.

Cuando tienes 3-4 nodos y quieres configurarles WiFi y MQTT a la vez sin entrar
al portal de cada uno, conecta tu portátil a la red `AutoRoller-XXXX` (una a
una) y ejecuta este script con los datos.

Uso:
    provision.py --ssid MiWifi --password Secreta \
                 --hostname autoroller-salon \
                 --mqtt-host 192.168.1.10 --mqtt-port 1883 \
                 --mqtt-base autoroller

El script habla con el portal en 192.168.4.1.
"""

from __future__ import annotations

import argparse
import json
import sys

try:
    import requests
except ImportError:
    sys.stderr.write("Instala dependencias: pip install requests\n")
    sys.exit(1)

PORTAL_IP = "192.168.4.1"


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--ssid", required=True)
    p.add_argument("--password", default="")
    p.add_argument("--hostname", required=True)
    p.add_argument("--mqtt-host")
    p.add_argument("--mqtt-port", type=int, default=1883)
    p.add_argument("--mqtt-user", default="")
    p.add_argument("--mqtt-password", default="")
    p.add_argument("--mqtt-base", default="autoroller")
    args = p.parse_args()

    cfg = {
        "wifi_ssid": args.ssid,
        "wifi_password": args.password,
        "hostname": args.hostname,
    }
    if args.mqtt_host:
        cfg.update({
            "mqtt_enabled": True,
            "mqtt_host": args.mqtt_host,
            "mqtt_port": args.mqtt_port,
            "mqtt_user": args.mqtt_user,
            "mqtt_password": args.mqtt_password,
            "mqtt_base_topic": args.mqtt_base,
        })

    url = f"http://{PORTAL_IP}/api/config"
    print(f"POST {url}")
    print(json.dumps(cfg, indent=2, ensure_ascii=False))
    r = requests.post(url, json=cfg, timeout=5)
    print("Respuesta:", r.status_code, r.text)
    if r.ok:
        print("Reiniciando dispositivo...")
        try:
            requests.post(f"http://{PORTAL_IP}/api/reboot", timeout=2)
        except requests.RequestException:
            pass
        print("Listo. Reconéctate a tu WiFi habitual.")
    return 0 if r.ok else 1


if __name__ == "__main__":
    sys.exit(main())
