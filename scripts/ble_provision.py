#!/usr/bin/env python3
"""
ble_provision.py — Configura un nodo AutoRoller vía Bluetooth Low Energy.

Permite:
  * Listar nodos AutoRoller cercanos.
  * Pedir info del nodo, escanear WiFi, guardar credenciales, configurar MQTT,
    NTP, controlar el motor, calibrar, reiniciar y resetear de fábrica.

Requiere:
    pip install bleak

Ejemplos:
    # Listar nodos cercanos
    python3 ble_provision.py scan

    # Provisionar todo en un solo paso
    python3 ble_provision.py provision \\
        --name AutoRoller-a1b2 \\
        --hostname autoroller-salon \\
        --ssid MiWifi --password Secreta \\
        --mqtt-host 192.168.1.10

    # Sólo enviar un comando
    python3 ble_provision.py cmd --name AutoRoller-a1b2 \\
        '{"op":"control","action":"open"}'
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from typing import Optional

try:
    from bleak import BleakClient, BleakScanner
except ImportError:
    sys.stderr.write("Falta dependencia: pip install bleak\n")
    sys.exit(1)


SVC_UUID          = "5a6f7e10-1a0e-4b0f-bd54-aaaa00000001"
CHR_REQUEST_UUID  = "5a6f7e10-1a0e-4b0f-bd54-aaaa00000002"
CHR_RESPONSE_UUID = "5a6f7e10-1a0e-4b0f-bd54-aaaa00000003"
CHR_STATUS_UUID   = "5a6f7e10-1a0e-4b0f-bd54-aaaa00000004"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def discover(timeout: float = 5.0) -> list:
    print(f"Buscando dispositivos AutoRoller durante {timeout}s ...")
    devices = await BleakScanner.discover(timeout=timeout)
    found = []
    for d in devices:
        name = d.name or ""
        if name.startswith("AutoRoller"):
            found.append(d)
    return found


async def pick_device(name: Optional[str], timeout: float = 6.0):
    devices = await BleakScanner.discover(timeout=timeout)
    candidates = []
    for d in devices:
        if name and (d.name or "") != name:
            continue
        if not name and not (d.name or "").startswith("AutoRoller"):
            continue
        candidates.append(d)
    if not candidates:
        raise RuntimeError(f"No encontré ningún nodo (filter={name!r})")
    if len(candidates) > 1 and not name:
        names = ", ".join(c.name for c in candidates)
        raise RuntimeError(f"Hay varios nodos cercanos: {names}. Usa --name")
    return candidates[0]


async def request(client: BleakClient, payload: dict, timeout: float = 6.0) -> dict:
    """Envía un JSON por la char REQUEST y reensambla la respuesta por NOTIFY."""
    queue: asyncio.Queue[str] = asyncio.Queue()
    buf = bytearray()

    def handle(_, data: bytearray):
        buf.extend(data)
        # cada respuesta termina en '\n'
        while b"\n" in buf:
            idx = buf.index(b"\n")
            piece = bytes(buf[:idx]).decode("utf-8", errors="replace")
            del buf[: idx + 1]
            queue.put_nowait(piece)

    await client.start_notify(CHR_RESPONSE_UUID, handle)
    try:
        body = (json.dumps(payload, ensure_ascii=False)).encode("utf-8")
        await client.write_gatt_char(CHR_REQUEST_UUID, body, response=False)
        line = await asyncio.wait_for(queue.get(), timeout=timeout)
        return json.loads(line)
    finally:
        try:
            await client.stop_notify(CHR_RESPONSE_UUID)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Sub-comandos
# ---------------------------------------------------------------------------
async def cmd_scan(args):
    found = await discover(args.timeout)
    if not found:
        print("(ningún nodo AutoRoller cercano)")
        return 1
    for d in found:
        print(f"  {d.name}  RSSI={d.rssi:>4}  addr={d.address}")
    return 0


async def cmd_info(args):
    d = await pick_device(args.name)
    async with BleakClient(d) as c:
        r = await request(c, {"op": "info"})
        print(json.dumps(r, indent=2, ensure_ascii=False))
    return 0


async def cmd_scan_wifi(args):
    d = await pick_device(args.name)
    async with BleakClient(d) as c:
        r = await request(c, {"op": "scan_wifi"}, timeout=12)
        for net in r.get("networks", []):
            mark = " " if net.get("open") else "🔒"
            print(f"  {mark} {net['rssi']:>4}dBm  ch{net['channel']:<2}  {net['ssid']}")
    return 0


async def cmd_provision(args):
    d = await pick_device(args.name)
    async with BleakClient(d) as c:
        if args.hostname:
            print("→ hostname")
            print(await request(c, {"op": "set_hostname", "hostname": args.hostname}))
        if args.ssid:
            print("→ wifi")
            print(await request(c, {
                "op": "set_wifi", "ssid": args.ssid, "password": args.password or "",
            }))
        if args.mqtt_host:
            print("→ mqtt")
            print(await request(c, {
                "op": "set_mqtt", "enabled": True,
                "host": args.mqtt_host, "port": args.mqtt_port,
                "user": args.mqtt_user or "", "password": args.mqtt_password or "",
                "base_topic": args.mqtt_base,
            }))
        if args.tz:
            print("→ tz")
            print(await request(c, {"op": "set_time", "enabled": True,
                                    "server": args.ntp_server, "timezone": args.tz}))
        print("Provisionado.")
    return 0


async def cmd_cmd(args):
    payload = json.loads(args.payload)
    d = await pick_device(args.name)
    async with BleakClient(d) as c:
        r = await request(c, payload)
        print(json.dumps(r, indent=2, ensure_ascii=False))
    return 0


# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------
def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("scan", help="Buscar nodos cercanos")
    sp.add_argument("--timeout", type=float, default=5.0)
    sp.set_defaults(func=cmd_scan)

    sp = sub.add_parser("info", help="Pedir información a un nodo")
    sp.add_argument("--name", required=False)
    sp.set_defaults(func=cmd_info)

    sp = sub.add_parser("scan-wifi", help="Pedir al nodo que escanee WiFi")
    sp.add_argument("--name", required=False)
    sp.set_defaults(func=cmd_scan_wifi)

    sp = sub.add_parser("provision", help="Provisionar todo de una vez")
    sp.add_argument("--name", required=False)
    sp.add_argument("--hostname")
    sp.add_argument("--ssid")
    sp.add_argument("--password", default="")
    sp.add_argument("--mqtt-host")
    sp.add_argument("--mqtt-port", type=int, default=1883)
    sp.add_argument("--mqtt-user")
    sp.add_argument("--mqtt-password")
    sp.add_argument("--mqtt-base", default="autoroller")
    sp.add_argument("--ntp-server", default="pool.ntp.org")
    sp.add_argument("--tz", help="Zona POSIX, p.ej. CET-1CEST,M3.5.0/2,M10.5.0/3")
    sp.set_defaults(func=cmd_provision)

    sp = sub.add_parser("cmd", help="Enviar un JSON arbitrario")
    sp.add_argument("--name", required=False)
    sp.add_argument("payload", help='JSON, p.ej. \'{"op":"control","action":"open"}\'')
    sp.set_defaults(func=cmd_cmd)

    args = p.parse_args()
    try:
        return asyncio.run(args.func(args))
    except (RuntimeError, asyncio.TimeoutError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
