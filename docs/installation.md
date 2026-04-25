# Cableado y montaje

Guía paso a paso para montar un nodo AutoRoller desde cero. Tiempo estimado:
**60-90 minutos** la primera vez, **20 minutos** las siguientes.

## Esquema general

```
                     ┌──────────────────┐
                     │  Fuente 12 V/2A  │
                     └────────┬─────────┘
                              │ 12 V
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼────────┐ ┌────▼────┐  ┌───────▼───────┐
    │  Buck 12 V → 5 V │ │ TMC2208 │  │ Porta-fusible │
    └─────────┬────────┘ │  VMOT   │  │      2A       │
              │ 5 V      └────┬────┘  └───────┬───────┘
    ┌─────────▼────────┐      │  4 hilos      │
    │   ESP32 (VIN)    │      └─────► Motor ◄─┘
    │                  │ 3.3V
    │ STEP ───────────► STEP
    │ DIR  ───────────► DIR
    │ EN   ───────────► EN
    │ MS1  ───────────► MS1
    │ MS2  ───────────► MS2
    │ GPIO34 ◄──── Endstop sup.
    │ GPIO35 ◄──── Endstop inf.
    │ GPIO18 ◄──── Botón ↑
    │ GPIO19 ◄──── Botón ↓
    │ GPIO23 ────► WS2812 LED
    └──────────────────┘
```

## Lista de comprobación previa

- [ ] Imprimidas todas las piezas de [`docs/3d-printing.md`](3d-printing.md).
- [ ] Comprados los componentes de [`docs/hardware.md`](hardware.md).
- [ ] Instalado [PlatformIO](https://platformio.org/) o, alternativamente,
      [Arduino IDE](https://www.arduino.cc/en/software) con soporte ESP32.
- [ ] Multímetro a mano para ajustar `Vref` del driver.

## Paso 1 — Ajustar el driver TMC2208

Antes de conectar el motor:

1. Soldar los pines del TMC2208.
2. Colocar el jumper de la placa puente (si la tiene) en modo `STEP/DIR`.
3. Alimentar **solo** el lado lógico (5 V de la placa puente) sin motor.
4. Con el motor **desconectado**, medir `Vref` entre el potenciómetro central
   del driver y GND. Ajustar a:

```
Vref = Imax × 1.41 × Rsense
```

- TMC2208 con `Rsense = 0.11 Ω` y motor de 1.0 A RMS → `Vref ≈ 0.78 V`.
- Para empezar suave usa `Vref ≈ 0.7 V` y sube si el motor pierde pasos.

5. Apagar, **conectar el motor** (4 hilos), apagar y solo entonces alimentar
   los 12 V. **Nunca conectes/desconectes el motor con la fuente encendida**.

## Paso 2 — Cableado en protoboard

Si vas a verificar que todo funciona antes de meterlo en la caja, monta sobre
protoboard siguiendo el pinout de [`docs/hardware.md`](hardware.md).

### Detalles importantes

- El TMC2208 lleva **dos masas**: `GND` lógico (cerca de `EN`/`STEP`) y `GND`
  de potencia (cerca de `VMOT`). **Únelas en un único punto** con la masa
  común del ESP32 y de la fuente.
- Pon un **condensador electrolítico de 100 µF / 25 V** entre `VMOT` y
  `GND_PWR` lo más cerca del driver posible.
- El cable del motor: identifica las dos bobinas con el multímetro
  (continuidad) → un par a `1A/1B`, otro par a `2A/2B`. Si la cortina sube
  cuando debería bajar, intercambia un par (no los dos).
- Los **finales de carrera**: lado común a `GND`, lado NC (normalmente cerrado)
  al pin del ESP32 con `INPUT_PULLUP`. Si no son fiables, usa `INPUT_PULLDOWN`
  y NA. El firmware permite invertir la lógica.

## Paso 3 — Primer arranque del firmware

1. Clona este repositorio y abre la carpeta `firmware/` en PlatformIO.
2. Edita `firmware/src/config.h` si has cambiado pines o quieres invertir la
   dirección.
3. Conecta el ESP32 por USB.
4. Compila y sube:
   ```bash
   pio run -e esp32dev -t upload
   pio run -e esp32dev -t uploadfs   # sube la web embebida (LittleFS)
   ```
5. Abre el monitor serie:
   ```bash
   pio device monitor -b 115200
   ```
6. La primera vez verás algo como:
   ```
   [WiFi] No SSID guardado, abriendo portal...
   [WiFi] AP: AutoRoller-XXXXXX  IP: 192.168.4.1
   ```

## Paso 4 — Configuración inicial

Tienes **dos vías** de configurar el nodo. Cualquiera vale; usa la que
prefieras.

### Vía A — Bluetooth (recomendada)

1. Abre `companion/index.html` en Chrome/Edge (en escritorio o Android).
2. Pulsa **"Conectar nodo"** y selecciona el `AutoRoller-XXXX` cercano.
3. Pulsa **"Buscar redes"**, selecciona tu WiFi, escribe la contraseña y
   guarda. (Opcional: configura MQTT y NTP en la misma sesión.)
4. El nodo se conecta a tu WiFi en cuestión de segundos.

Detalles completos en [`docs/ble-provisioning.md`](ble-provisioning.md).

> Si usas iPhone/iPad, salta a la vía B (Apple no soporta Web Bluetooth).
> También puedes usar `scripts/ble_provision.py` desde un PC con bleak.

### Vía B — Portal cautivo WiFi

1. Conecta tu móvil a la red WiFi `AutoRoller-XXXXXX` (sin contraseña por
   defecto, o `autoroller` si la has fijado en `config.h`).
2. Se abrirá automáticamente un portal cautivo. Si no se abre, entra manual a
   `http://192.168.4.1`.
3. Selecciona tu red WiFi e introduce la contraseña.
4. Opcionalmente:
   - Da un **nombre** al dispositivo (`autoroller-salon`, `autoroller-cocina`).
     Será su hostname mDNS, accesible como `http://autoroller-salon.local`.
   - Configura **broker MQTT** si quieres integrarlo con Home Assistant /
     Node-RED / asistente propio.
5. Pulsa "Guardar". El nodo se reinicia y se conecta a tu WiFi.

## Paso 5 — Calibración del recorrido

La primera vez hay que enseñar al nodo dónde están los topes:

### Modo automático (con finales de carrera)

1. Entra al panel web del nodo (`http://autoroller-XXX.local`).
2. Pulsa **"Calibrar"**.
3. El motor sube despacio hasta tocar el endstop superior → fija ese punto
   como `posición 0`.
4. Baja despacio hasta tocar el endstop inferior → fija ese punto como
   `posición máxima` (en pasos).
5. Vuelve a subir al 0. Calibración completa.

### Modo manual (sin finales de carrera)

1. Sube manualmente la cortina con los botones físicos hasta el tope arriba.
2. Pulsa **"Marcar como 0"**.
3. Baja hasta el tope abajo.
4. Pulsa **"Marcar como máximo"**.
5. Listo.

La calibración se guarda en NVS y sobrevive a reinicios.

## Paso 6 — Montaje físico

1. Atornilla el `motor_bracket.stl` al marco/pared con tornillos M4.
2. Fija el motor al soporte con M3×25.
3. Coloca el acople (`coupler.stl`) en el eje del motor con prisionero M3.
4. Encaja el tubo de la cortina en el acople. Aprieta hasta que no resbale.
5. Coloca la electrónica en su carcasa, atornilla los conectores externos.
6. Si usas finales de carrera, fíjalos con `endstop_bracket.stl` y ajusta su
   posición a los topes mecánicos reales de la cortina.
7. Pasa el cable del motor con su pasacables al lado del nodo.

## Paso 7 — Verificación

- Sube/baja desde la interfaz web.
- Sube/baja desde el botón físico (override manual).
- Suscríbete al topic MQTT `autoroller/<name>/state` y verifica que publica
  cambios.
- Apaga el nodo a mitad de recorrido y vuelve a encender: la posición debe
  conservarse.

Si todo va bien, **ya puedes integrarlo con tu asistente o automatizaciones**
(ver [`docs/api.md`](api.md) y [`docs/voice-assistant.md`](voice-assistant.md)).
