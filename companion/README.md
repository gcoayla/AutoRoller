# Companion app — Web Bluetooth

Página HTML autocontenida que habla con un nodo AutoRoller por **BLE GATT**
desde el navegador. Pensada para la **primera puesta en marcha**, antes de
que el dispositivo tenga WiFi.

## Cómo usarla

1. Abre `companion/index.html` directamente en **Chrome o Edge** (escritorio
   o Android).
   - `file://` es contexto seguro en Chrome para Web Bluetooth, así que
     funciona sin servidor.
   - Si tu sistema operativo bloquea Web Bluetooth en `file://`, sube la
     página a [GitHub Pages](https://pages.github.com) o sírvela con
     `python3 -m http.server` desde `localhost`.
2. Pulsa **"Conectar nodo"**. El navegador mostrará la lista de dispositivos
   BLE cercanos con nombre `AutoRoller-XXXX`.
3. Selecciónalo y autoriza la conexión.
4. Pulsa **"Buscar redes"** para que el nodo te liste las WiFi alrededor.
5. Selecciona la red, escribe la contraseña, opcionalmente cambia el
   hostname (mDNS), y pulsa **"Guardar y conectar"**.
6. Configura MQTT y NTP si te interesa.
7. Cuando termines, **"Apagar BLE"** o **"Reset fábrica"** (no recomendado).

## ¿Qué navegadores funcionan?

| Navegador           | ¿Funciona? | Notas                              |
| ------------------- | ---------- | ---------------------------------- |
| Chrome (escritorio) | ✅          | Recomendado                       |
| Edge   (escritorio) | ✅          | Mismo motor que Chrome            |
| Chrome Android      | ✅          | Activa permisos Bluetooth         |
| Safari iOS / iPadOS | ❌          | Apple no soporta Web Bluetooth     |
| Firefox             | ❌          | No soportado                      |

Si tienes iPhone/iPad, usa el script Python `scripts/ble_provision.py` desde
un PC o Mac, o el portal cautivo WiFi como alternativa.

## Hosting opcional

Si prefieres alojar la app:

```bash
# Local
python3 -m http.server -d companion 8080
# luego en Chrome: http://localhost:8080

# Pública (vía GitHub Pages)
# Settings → Pages → branch: main / dir: companion
```

> Web Bluetooth requiere **HTTPS o localhost o file://**. No funciona desde
> http://192.168.x.x.
