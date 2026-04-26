# Cableado y montaje

Guía paso a paso para montar un nodo AutoRoller desde cero. Tiempo estimado:
**60-90 minutos** la primera vez, **20 minutos** las siguientes.

## Esquema general

```
                     ┌──────────────────┐
                     │  Fuente 12 V/1A  │
                     └────────┬─────────┘
                              │ 12 V
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼────────┐ ┌────▼────┐  ┌───────▼───────┐
    │  Buck 12 V → 5 V │ │ TMC2208 │  │ Porta-fusible │
    └─────────┬────────┘ │  VMOT   │  │     1.5 A     │
              │ 5 V      └────┬────┘  └───────┬───────┘
    ┌─────────▼────────┐      │  4 hilos      │
    │   ESP32 (VIN)    │      └─────► Motor ◄─┘
    │                  │ 3.3V              │
    │ STEP ───────────► STEP                │ eje 5 mm
    │ DIR  ───────────► DIR             ┌───▼────┐
    │ EN   ───────────► EN              │ Rueda  │
    │ MS1  ───────────► MS1             │ dentada│
    │ MS2  ───────────► MS2             └───┬────┘
    │ GPIO34 ◄──── DIAG (StallGuard, opc.)  │
    │ GPIO18 ◄──── Botón ↑                  │
    │ GPIO19 ◄──── Botón ↓             cadena de
    │ GPIO23 ────► WS2812 LED          bolitas del estor
    └──────────────────┘
```

Sin finales de carrera externos: la cadena tiene topes mecánicos propios.
Si tu TMC2208 v3.0 expone el pin `DIAG`, conéctalo a GPIO 34 para que el
firmware detecte el atasco del motor al final de la cadena.

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
4. Compila y sube (todos los comandos `pio` se ejecutan desde `firmware/`):
   ```bash
   cd firmware
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

## Paso 5 — Montaje físico (no invasivo)

> **No tienes que tocar tu cortina.** Solo cuelgas el módulo al lado y
> enrollas la cadena de bolitas en la rueda.

1. **Identifica el lado de la cadena**. Mira tu estor: la cadena cuelga por
   uno de los lados (normalmente el derecho), formando un bucle continuo
   (sube por delante y baja por detrás, o al revés). El módulo va pegado
   al marco / pared **a la altura donde la cadena queda recta**.
2. **Pega o atornilla el bracket**:
   - **Con VHB** (más rápido, reversible): limpia bien el marco con alcohol
     isopropílico, pega `mounting_bracket_vhb.stl` y haz presión 30 s.
     **Espera 1 hora antes de cargarlo.**
   - **Con tornillos**: usa `mounting_bracket_screw.stl` con 2 tornillos
     M4×25 al marco.
3. **Coloca la rueda dentada en el eje del motor** y aprieta el prisionero
   M3 al ras del flat (si tu motor es de eje liso, primero pon el
   `shaft_adapter` impreso).
4. **Atornilla el motor a la carcasa principal** (`chain_driver_body.stl`)
   con 4 tornillos M3×25 desde el patrón NEMA 17.
5. **Coloca la electrónica** dentro de la carcasa: ESP32, driver, buck,
   conector barril, botones y LED. Cablea según el esquema del paso 1.
6. **Engancha la carcasa al bracket** (encaje tipo "L"). Comprueba que
   queda firme.
7. **Enrolla la cadena de bolitas** alrededor de la rueda dentada:
   - Abre la `chain_driver_cover.stl`.
   - Coloca la cadena entre las dos guías (superior e inferior) de modo
     que las bolitas encajen en los huecos de la rueda.
   - Cierra la tapa con los 4 tornillos M3×8.
8. **Conecta la fuente** y verifica que enciende.

## Paso 6 — Calibración del recorrido

Como **no hay finales de carrera externos**, AutoRoller usa calibración
manual o por StallGuard.

### Calibración manual desde la app (recomendada)

1. Abre la app móvil → tu nodo → pestaña **Control**.
2. Pulsa **"▲ Subir"** y déjalo correr hasta que la cadena llegue al tope
   (el motor empezará a hacer ruido de "click click" porque la cadena no
   avanza más).
3. Pulsa **"■ Parar"** inmediatamente.
4. Ve a **Avanzado → Calibración → "Marcar 0 aquí"**.
5. Repite bajando: pulsa **"▼ Bajar"** hasta que la cadena llegue al tope
   inferior, **"■ Parar"**, y **"Marcar máximo aquí"**.

La calibración se guarda en NVS y sobrevive a reinicios.

### Calibración por StallGuard (opcional)

Si tu TMC2208 v3.0 tiene el pin DIAG conectado a GPIO 34, puedes pulsar
**"Calibrar"** en la app y el firmware detectará automáticamente los
topes por el atasco del motor. Es como la calibración con endstops pero
sin necesidad de instalarlos.

### Pon límites de seguridad

Una vez calibrado, **define un margen** en la pestaña Ajustes → Límites
de recorrido. Por ejemplo `tope_abierto = 5 %` y `tope_cerrado = 95 %`
asegura que nunca llegues al tope mecánico de la cadena, lo que evita
ruido y desgaste de la rueda.

## Paso 7 — Verificación

- Sube/baja desde la interfaz web y desde la app.
- Pulsa los botones físicos (override manual).
- **Tira manualmente de la cadena** con la mano: tiene que moverse
  libremente (la rueda dentada NO debe trabarla). Si traba, ajusta la
  tapa o reduce `clearance` en la rueda y reimprime.
- Suscríbete al topic MQTT `autoroller/<name>/state` y verifica que
  publica cambios.
- Apaga el nodo a mitad de recorrido y vuelve a encender: la posición
  debe conservarse.

Si todo va bien, **ya puedes integrarlo con tu asistente o automatizaciones**
(ver [`docs/api.md`](api.md) y [`docs/voice-assistant.md`](voice-assistant.md)).
