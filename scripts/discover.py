#!/usr/bin/env python3
"""
discover.py — Encuentra todos los nodos AutoRoller en la red local mediante
mDNS / Zeroconf y muestra su estado.

Requiere: zeroconf, requests
    pip install zeroconf requests

Uso:
    python3 discover.py
"""

from __future__ import annotations

import json
import sys
import time
from typing import Dict

try:
    import requests
    from zeroconf import ServiceBrowser, ServiceListener, Zeroconf
except ImportError as e:
    sys.stderr.write(
        "Falta una dependencia: " + str(e) + "\n"
        "  pip install zeroconf requests\n"
    )
    sys.exit(1)


SERVICE_TYPE = "_autoroller._tcp.local."


class Listener(ServiceListener):
    def __init__(self) -> None:
        self.found: Dict[str, dict] = {}

    def add_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        info = zc.get_service_info(type_, name)
        if not info or not info.addresses:
            return
        ip = ".".join(str(b) for b in info.addresses[0])
        host = info.server.rstrip(".")
        url = f"http://{ip}:{info.port}"
        try:
            r = requests.get(url + "/api/status", timeout=2)
            data = r.json() if r.ok else {}
        except Exception:
            data = {}
        self.found[host] = {"ip": ip, "url": url, "status": data}

    def remove_service(self, zc, type_, name): pass
    def update_service(self, zc, type_, name): pass


def main() -> int:
    zc = Zeroconf()
    listener = Listener()
    ServiceBrowser(zc, SERVICE_TYPE, listener)
    print(f"Buscando nodos en {SERVICE_TYPE} ... (Ctrl+C para salir)")
    try:
        time.sleep(4)
    finally:
        zc.close()

    if not listener.found:
        # Fallback: prueba con _http._tcp y filtra por hostname autoroller-*
        print("(sin coincidencias en _autoroller._tcp; sondeando _http._tcp)")
        zc2 = Zeroconf()
        listener2 = Listener()
        ServiceBrowser(zc2, "_http._tcp.local.", listener2)
        time.sleep(4)
        zc2.close()
        listener.found = {
            k: v for k, v in listener2.found.items() if "autoroller" in k.lower()
        }

    if not listener.found:
        print("No se encontraron nodos.")
        return 1

    for host, info in listener.found.items():
        s = info.get("status", {})
        print(f"- {host}  →  {info['ip']}")
        print(f"    estado: {s.get('state', '?'):<12}  posición: {s.get('percent', '?')}%")
        print(f"    fw:     {s.get('fw', '?'):<12}  calibrado: {s.get('calibrated', '?')}")
        print(f"    URL:    {info['url']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
