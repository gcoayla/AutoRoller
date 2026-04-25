#!/usr/bin/env python3
"""
control.py — CLI mínima para mandar comandos a un nodo AutoRoller.

Uso:
    control.py <host> open
    control.py <host> close
    control.py <host> stop
    control.py <host> set <0..100>
    control.py <host> status
    control.py <host> calibrate

Donde <host> puede ser una IP, un FQDN o un hostname mDNS (`autoroller-salon.local`).
"""

from __future__ import annotations

import json
import sys

try:
    import requests
except ImportError:
    sys.stderr.write("Instala dependencias: pip install requests\n")
    sys.exit(1)


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print(__doc__)
        return 2

    host = argv[1].rstrip("/")
    cmd = argv[2]
    base = host if host.startswith("http") else f"http://{host}"

    try:
        if cmd == "status":
            r = requests.get(f"{base}/api/status", timeout=3)
            print(json.dumps(r.json(), indent=2, ensure_ascii=False))
        elif cmd in ("open", "close", "stop", "calibrate"):
            r = requests.post(f"{base}/api/{cmd}", timeout=3)
            print(r.text)
        elif cmd == "set" and len(argv) >= 4:
            v = int(argv[3])
            r = requests.post(f"{base}/api/set?value={v}", timeout=3)
            print(r.text)
        else:
            print(__doc__)
            return 2
    except requests.RequestException as e:
        print(f"Error de red: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
