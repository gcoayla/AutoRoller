# Provisionamiento por Bluetooth Low Energy (BLE)

A partir de v1.1, cada nodo AutoRoller arranca con un **servicio BLE GATT**
permanente para configuración y control. Esto te permite:

- Configurar **WiFi sin pasar por el portal cautivo** (un solo paso desde el
  móvil/PC, escogiendo la red de una lista).
- **Cambiar credenciales** sin tener que acercarte al nodo a pulsar botones.
- **Controlar la cortina** aunque se haya caído el WiFi del router (BLE no
  depende de tu red).
- **Provisionar varios nodos en serie** con un script (bleak / Web
  Bluetooth).

## Cómo está expuesto

El nodo anuncia un servicio BLE con UUID
`5a6f7e10-1a0e-4b0f-bd54-aaaa00000001` y nombre `AutoRoller-XXXX` (los 4
últimos hex de la MAC).

| Característica | UUID                                  | Propiedades       | Uso                                                |
| -------------- | ------------------------------------- | ----------------- | -------------------------------------------------- |
| `REQUEST`      | `5a6f7e10-…00000002`                  | Write (sin resp.) | Cliente → nodo. JSON con la operación.             |
| `RESPONSE`     | `5a6f7e10-…00000003`                  | Read + Notify     | Nodo → cliente. JSON, fragmentado y cerrado en `\n`. |
| `STATUS`       | `5a6f7e10-…00000004`                  | Read + Notify     | Estado periódico (cada cambio o cada segundo).      |

## Política de encendido

Configurable desde la web (`/api/config` → `ble_policy`) o por BLE
(`set_motor` no, sino `get_config` y luego `set_*`). Valores:

| Valor | Comportamiento                                                   |
| ----- | ---------------------------------------------------------------- |
| `0`   | **Always**: BLE encendido siempre. (Recomendado, alimentado red) |
| `1`   | **Until WiFi**: se apaga al primer `WL_CONNECTED`.               |
| `2`   | **5 min**: se apaga 5 minutos tras el arranque.                  |
| `3`   | **Off**: BLE deshabilitado. Activable a mano.                    |

Para **reactivar** BLE manualmente cuando esté apagado:

- **Long-press** del botón "subir" (~1 s) en el nodo.
- O `POST /api/ble {"action":"on"}` desde la web.
- O reiniciando si la política es `0` (always).

## Seguridad

- Por defecto, **Just Works** (cifrado sin autenticación). Adecuado para una
  primera puesta en marcha rápida.
- Si quieres **passkey de 6 dígitos** (PIN), pon `ble_passkey` a un número
  entre 100000 y 999999 desde la web (`/api/config`). El móvil/PC pedirá ese
  PIN al emparejar.
- El passkey se guarda en NVS y persiste tras reinicios.
- Para evitar emparejamiento permanente, llama a `factory_reset` (borra
  bondings) o desactiva la radio (`ble_off`).

## Flujo recomendado para la primera vez

### Opción A — Móvil Android o PC con Chrome/Edge

1. Abre `companion/index.html` en el navegador (Chrome/Edge).
2. Pulsa **"Conectar nodo"**, selecciona el `AutoRoller-XXXX`.
3. **"Buscar redes"** → selecciona tu WiFi → escribe contraseña → guarda.
4. (Opcional) configura MQTT y NTP.
5. **"Apagar BLE"** o déjalo encendido como vía de respaldo.

Detalles en [`companion/README.md`](../companion/README.md).

### Opción B — Línea de comandos con `bleak`

```bash
pip install bleak

# Listar nodos cercanos
python3 scripts/ble_provision.py scan

# Provisionar todo
python3 scripts/ble_provision.py provision \
    --name AutoRoller-a1b2 \
    --hostname autoroller-salon \
    --ssid MiWifi --password Secreta \
    --mqtt-host 192.168.1.10 \
    --tz 'CET-1CEST,M3.5.0/2,M10.5.0/3'

# Comando puntual
python3 scripts/ble_provision.py cmd --name AutoRoller-a1b2 \
    '{"op":"control","action":"set","value":50}'
```

### Opción C — App tipo "nRF Connect"

[nRF Connect](https://www.nordicsemi.com/Products/Development-tools/nRF-Connect-for-mobile)
(iOS/Android) te permite conectarte al nodo y escribir manualmente JSON en la
característica REQUEST. Útil para depurar.

## Catálogo de operaciones (via REQUEST)

Todas las operaciones se envían como JSON UTF-8 en la char REQUEST y la
respuesta llega por la char RESPONSE en uno o varios chunks (la suma termina
en `\n`).

| `op`              | Campos requeridos                     | Respuesta clave              |
| ----------------- | ------------------------------------- | ---------------------------- |
| `info`            | —                                     | `device, fw, mac, wifi_ip`   |
| `scan_wifi`       | —                                     | `networks[]`                 |
| `set_wifi`        | `ssid, password`                      | `ok`                         |
| `set_mqtt`        | `enabled, host, port, ...`            | `ok`                         |
| `set_hostname`    | `hostname`                            | `ok`                         |
| `set_motor`       | `invert_direction, max_speed_hz, ...` | `ok`                         |
| `set_time`        | `enabled, server, timezone`           | `ok`                         |
| `get_config`      | —                                     | dump de toda la configuración|
| `get_schedules`   | —                                     | `schedules[]`                |
| `set_schedule`    | `i, enabled, hour, minute, days_mask, target_pct` | `ok`             |
| `del_schedule`    | `i`                                   | `ok`                         |
| `control`         | `action: open|close|stop|set, value?` | `ok`                         |
| `calibrate`       | —                                     | `ok`                         |
| `reboot`          | —                                     | `ok`                         |
| `factory_reset`   | —                                     | `ok` (reinicia)              |
| `ble_off`         | —                                     | `ok` (apaga BLE tras enviar) |

`days_mask` es bitmask: bit 0=Lun, 1=Mar, 2=Mié, 3=Jue, 4=Vie, 5=Sáb, 6=Dom.
`0x7F` = todos los días.

## Tamaño de mensajes y MTU

- El firmware solicita MTU **517 bytes** al conectar.
- Si el cliente o el sistema operativo limita el MTU, las respuestas se
  envían como múltiples notificaciones de hasta `MTU-3` bytes y el cliente
  reensambla concatenando hasta encontrar `\n`.
- `bleak` y Web Bluetooth en Chrome moderno negocian MTU sin esfuerzo.

## ¿Por qué BLE y no Bluetooth Classic?

- BLE está soportado en **todos** los ESP32 (incluido C3 y H2).
- Es el único Bluetooth disponible en iOS sin perfiles certificados.
- Bajo consumo (irrelevante con alimentación de red, pero buena práctica).
- Modelo de servicios/características muy bien estandarizado y soportado por
  Web Bluetooth.

## Diagnóstico

| Síntoma                                      | Causa probable                                       |
| -------------------------------------------- | ---------------------------------------------------- |
| No aparece el nodo en el escáner BLE         | Política `off` o `until_wifi` ya disparada           |
| Aparece pero no conecta                      | Otro cliente ya está conectado (BLE = 1 a la vez)    |
| Conecta pero no responde                     | Passkey incorrecto, comprueba `ble_passkey`          |
| Respuesta truncada                           | MTU muy bajo, el cliente no reensambla; usa Chrome   |
| No anuncia tras `factory_reset`              | Política se reseteó a default (0=always); reinicia   |
