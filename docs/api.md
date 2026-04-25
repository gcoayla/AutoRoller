# API REST, WebSocket, MQTT y BLE

Cada nodo AutoRoller expone cuatro formas de control:

1. **HTTP REST** (síncrono, sencillo desde cualquier cliente).
2. **WebSocket** (`/ws`, eventos en tiempo real para la UI).
3. **MQTT** (asíncrono, ideal para integraciones home-automation y voz).
4. **BLE GATT** (configuración inicial y respaldo cuando no hay WiFi —
   ver [`docs/ble-provisioning.md`](ble-provisioning.md)).

Todos comparten el mismo modelo de estado.

## Modelo de estado

Cada nodo publica un objeto JSON como este:

```json
{
  "device":     "autoroller-salon",
  "fw":         "1.0.0",
  "state":      "idle",
  "position":   12450,
  "max":        20000,
  "percent":    62,
  "calibrated": true,
  "wifi_ssid":  "MiWifi",
  "wifi_ip":    "192.168.1.42",
  "mqtt_on":    true
}
```

Estados posibles (`state`):

| Valor          | Significado                                  |
| -------------- | -------------------------------------------- |
| `idle`         | Reposo, motor parado                         |
| `moving_up`    | Subiendo (hacia 0 %)                         |
| `moving_down`  | Bajando (hacia 100 %)                        |
| `homing`       | Buscando home tras arranque                  |
| `calibrating`  | Rutina de calibración en curso               |
| `fault`        | Error (driver, endstop atascado, etc.)       |

## Autenticación (opcional)

Si el campo `api_token` está vacío en la configuración del nodo, **no hay
auth** y todos los endpoints son accesibles desde la LAN. Es el modo por
defecto y mantiene compatibilidad con instalaciones existentes.

Cuando configuras un `api_token` (desde `/api/config`, BLE o la app móvil),
los endpoints **que cambian estado** exigen que se identifique con uno de:

- Header `Authorization: Bearer <token>`
- Header `X-AutoRoller-Token: <token>`
- Query   `?token=<token>` (último recurso para clientes simples)

Sin token válido, devuelven `401 Unauthorized` con
`WWW-Authenticate: Bearer realm="autoroller"`.

Endpoints que **no** requieren token aunque esté configurado: `GET /api/status`,
`GET /api/config`, `GET /api/scan`, `GET /api/schedules`, WebSocket `/ws` y los
estáticos. La razón es que la UI tiene que renderizar antes de pedir el token,
y el estado en sí no expone nada sensible.

## REST

Base: `http://<hostname>.local/` o `http://<ip>/`.

| Método | Ruta                | Acción                                       |
| ------ | ------------------- | -------------------------------------------- |
| GET    | `/api/status`       | Devuelve el JSON de estado                   |
| GET    | `/api/config`       | Devuelve la configuración actual             |
| POST   | `/api/config`       | Actualiza configuración (body JSON)          |
| GET    | `/api/scan`         | Escanea redes WiFi visibles                  |
| GET    | `/api/schedules`    | Lista las 8 entradas del programador         |
| POST   | `/api/schedules`    | Edita una entrada (body con `i, hour, ...`)  |
| DELETE | `/api/schedules?i=N`| Borra la entrada N                           |
| POST   | `/api/ble`          | `{"action":"on" \| "off"}`                   |
| POST   | `/api/open`         | Sube totalmente (= 0 %)                      |
| POST   | `/api/close`        | Baja totalmente (= 100 %)                    |
| POST   | `/api/stop`         | Detiene el movimiento                        |
| POST   | `/api/set?value=N`  | Mueve a porcentaje N (0..100)                |
| POST   | `/api/calibrate`    | Inicia calibración con endstops              |
| POST   | `/api/set-here?value=N` | Marca la posición actual como N pasos    |
| POST   | `/api/forget-wifi`  | Borra credenciales WiFi y abre portal        |
| POST   | `/api/factory-reset`| Borra toda la configuración + reinicia       |
| POST   | `/api/reboot`       | Reinicia el dispositivo                      |
| POST   | `/api/ota`          | Subida directa de un `.bin` (multipart)      |

### Ejemplos

```bash
# Subir
curl -X POST http://autoroller-salon.local/api/open

# Bajar al 40 %
curl -X POST 'http://autoroller-salon.local/api/set?value=40'

# Estado
curl http://autoroller-salon.local/api/status

# Activar MQTT
curl -X POST http://autoroller-salon.local/api/config \
     -H 'Content-Type: application/json' \
     -d '{"mqtt_enabled":true,"mqtt_host":"192.168.1.10","mqtt_port":1883,"mqtt_base_topic":"autoroller"}'

# Con auth: fijar un token y luego usarlo
curl -X POST http://autoroller-salon.local/api/config \
     -H 'Content-Type: application/json' \
     -d '{"api_token":"miSecreto123"}'
curl -X POST -H 'X-AutoRoller-Token: miSecreto123' \
     http://autoroller-salon.local/api/open
```

### Atajos legacy

Para clientes muy simples también funcionan:

- `GET /up`   → equivalente a `/api/open`
- `GET /down` → equivalente a `/api/close`
- `GET /stop` → equivalente a `/api/stop`

Útiles cuando el cliente no puede hacer POST (por ejemplo un mando IR
convertido a HTTP que solo emite GET).

## WebSocket

Endpoint: `ws://<host>/ws`.

- Al conectar, el servidor empuja inmediatamente el estado actual.
- Cada vez que cambia la posición o el estado, se publica un nuevo JSON.
- Frecuencia máxima: ~5 mensajes/s (suficiente para una barra de progreso
  fluida).

## MQTT

Si MQTT está habilitado, el nodo publica y se suscribe a los siguientes topics
(suponiendo `base_topic = autoroller` y `hostname = salon`):

| Topic                                | Dirección | Descripción                                  |
| ------------------------------------ | --------- | -------------------------------------------- |
| `autoroller/salon/state`             | publish   | JSON de estado, retain                       |
| `autoroller/salon/availability`      | publish   | `online` / `offline` (LWT, retain)           |
| `autoroller/salon/cmd/set`           | subscribe | Payload `0`..`100`                           |
| `autoroller/salon/cmd/open`          | subscribe | Cualquier payload                            |
| `autoroller/salon/cmd/close`         | subscribe | Cualquier payload                            |
| `autoroller/salon/cmd/stop`          | subscribe | Cualquier payload                            |
| `autoroller/salon/cmd/calibrate`     | subscribe | Cualquier payload                            |

### Ejemplo con `mosquitto_pub`

```bash
mosquitto_pub -h 192.168.1.10 -t autoroller/salon/cmd/set   -m 50
mosquitto_pub -h 192.168.1.10 -t autoroller/salon/cmd/open
mosquitto_pub -h 192.168.1.10 -t autoroller/salon/cmd/close
mosquitto_sub -h 192.168.1.10 -t 'autoroller/+/state'
```

### Home Assistant

Ejemplo de `cover` MQTT que se autodescubre (añade en `configuration.yaml` o
mediante MQTT discovery más adelante):

```yaml
mqtt:
  cover:
    - name: "Cortina salón"
      command_topic: "autoroller/salon/cmd/set"
      position_topic: "autoroller/salon/state"
      position_template: "{{ value_json.percent }}"
      set_position_topic: "autoroller/salon/cmd/set"
      set_position_template: "{{ position }}"
      payload_open: "0"
      payload_close: "100"
      payload_stop: null
      availability_topic: "autoroller/salon/availability"
      payload_available: "online"
      payload_not_available: "offline"
      qos: 0
      retain: false
      optimistic: false
      device_class: shade
```

> **Nota**: en `cover.position`, en Home Assistant el 100 es totalmente
> abierta. AutoRoller usa al revés (0 = arriba/abierta). Si prefieres alinear
> ambos, invierte el `position_template` con `{{ 100 - value_json.percent }}`
> y el `set_position_template` con `{{ 100 - position }}`.

## OTA

Hay dos vías:

- **HTTP** (recomendado para usuarios): sube un `.bin` por `POST /api/ota`.
- **ArduinoOTA** (recomendado en desarrollo desde PlatformIO):
  ```ini
  upload_protocol = espota
  upload_port     = autoroller-salon.local
  ```
