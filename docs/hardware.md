# Selección de hardware

Esta es la lista de componentes recomendados para un nodo AutoRoller capaz de
mover una cortina enrollable o de riel ligero. Está pensada para ser barata,
fácil de encontrar y robusta.

## Resumen ejecutivo

| Función                | Recomendado                             | Alternativas                        |
| ---------------------- | --------------------------------------- | ----------------------------------- |
| Microcontrolador       | **ESP32-WROOM-32 DevKit v1 (30 pines)** | ESP32-S3, ESP32-C3, Raspberry Pi Pico W |
| Motor                  | **NEMA 17 (1.5 A, 40 Ncm)**             | 28BYJ-48 (cortinas muy ligeras), motor DC con encoder |
| Driver                 | **TMC2208 (modo STEP/DIR)**             | A4988, DRV8825                      |
| Fuente                 | **12 V / 2 A barril 5.5 mm**            | 24 V si el motor lo soporta         |
| Conversor lógica       | **Buck Mini-360 12 V→5 V**              | Regulador AMS1117 si la corriente es baja |
| Final de carrera       | **Microswitch KW11-3Z (x2)**            | Sensor hall + imán, óptico          |
| Botón manual           | Pulsador 12 mm con anillo               | Cualquier pulsador NA               |
| LED de estado          | **LED RGB WS2812 (NeoPixel)**           | Tres LEDs discretos                 |
| Cableado               | Dupont + cable AWG18 para potencia      | —                                   |
| Caja                   | Imprimida (ver `docs/3d-printing.md`)   | —                                   |

> **Coste aproximado por nodo**: 15-25 € si compras en lotes (motor + driver +
> ESP32 + fuente). El ESP32 cuesta unos 5-7 €, el motor 8-12 €, el driver
> 2-4 €, y la fuente 5-8 €.

## Por qué ESP32 (y no otra placa)

- **WiFi 2.4 GHz integrada**, antena suficiente para cobertura doméstica.
- **Bluetooth** (lo dejamos para futuro: configuración inicial sin WiFi).
- **Doble núcleo a 240 MHz**: un núcleo gestiona el motor, el otro la red.
- **Periféricos sobrados**: 30+ GPIO, RMT (perfecto para generar pulsos STEP
  sin saturar la CPU), I²C, SPI, UART, ADC, PWM por hardware (LEDC).
- **Soporte excelente** en Arduino-ESP32 y ESP-IDF, librerías maduras
  (AccelStepper, FastAccelStepper, AsyncWebServer, PubSubClient, ArduinoOTA).
- **Almacenamiento NVS** y **LittleFS** para preferencias y archivos web.
- **Precio**: 5-7 € en una DevKit estándar.

Las alternativas (ESP8266, Pi Pico W) funcionarían pero pierden bien margen de
GPIO, bien velocidad para mover el motor sin glitches, bien madurez de
ecosistema.

### Variantes válidas del ESP32

- **ESP32-WROOM-32 DevKit v1 (30 pines)**: la más común, recomendada.
- **ESP32-S3 DevKit**: USB nativo (más cómodo flasheo y depuración) y más RAM,
  buena opción si prevés sumar pantalla o más sensores.
- **ESP32-C3 SuperMini**: pequeñísimo, 1 núcleo, suficiente para 1 motor y muy
  cómodo para integrar en la caja.

El firmware está escrito de forma genérica y compila para los tres con cambios
mínimos en `firmware/platformio.ini` (selecciona el `env` correspondiente).

## Por qué un NEMA 17 con TMC2208

### Motor: NEMA 17

- **Par sobrado** (40-50 Ncm) para cortinas enrollables hasta ~3 kg de tela.
- **Bipolar 4 hilos**, control estándar y bien documentado.
- Existe en formato 23 mm, 34 mm y 40 mm de largo: con el de 34 mm sobra para
  cortinas ligeras.
- Compatible con un sinfín de soportes y poleas GT2 imprimibles.

> Para cortinas **muy ligeras** o cortinas-velo, un **28BYJ-48** con
> ULN2003 es suficiente y consume mucho menos. Pero su par no llega a una
> cortina enrollable normal y su precisión es menor.

### Driver: TMC2208 (frente al A4988/DRV8825)

- **Silencioso**: usa StealthChop y no se oyen los pasos. Importante en un
  dormitorio o salón.
- **Microstepping 1/16 ó 1/256** según versión, para movimiento suave.
- **Protecciones**: térmica, de corriente, de cortocircuito.
- **Compatible pin a pin** con el A4988, así que cualquier guía sirve.
- Trabaja a 3.3 V de lógica → conexión directa con el ESP32 sin level shifter.

### Fuente: 12 V / 2 A

- El TMC2208 acepta 5.5-36 V; con 12 V el motor da par cómodamente sin
  calentarse.
- 2 A son holgados para un solo motor a media corriente (~0.7-1.2 A).
- Conector barril 5.5/2.1 mm estándar para cambiarla con facilidad.

> Si tienes varios nodos cerca, considera una fuente de 12 V / 5-10 A en el
> armario y distribuir 12 V por la pared. Para empezar, una fuente por nodo
> sobra.

## Pinout recomendado (ESP32-WROOM-32 DevKit v1)

Estos son los pines que usa el firmware por defecto. Se pueden cambiar en
`firmware/src/config.h`.

| Función                  | Pin ESP32 | Notas                                              |
| ------------------------ | --------- | -------------------------------------------------- |
| STEP                     | GPIO 26   | Generado por RMT/LEDC, no usar pines strapping     |
| DIR                      | GPIO 27   |                                                    |
| ENABLE (driver `EN`)     | GPIO 14   | Activo en bajo                                     |
| Microstep MS1 (opcional) | GPIO 25   | Para fijar microstepping por hardware              |
| Microstep MS2 (opcional) | GPIO 33   |                                                    |
| Final de carrera arriba  | GPIO 34   | Solo entrada, con pull-up externo o usar GPIO 35   |
| Final de carrera abajo   | GPIO 35   | Solo entrada                                       |
| Botón manual subir       | GPIO 18   | Con `INPUT_PULLUP`                                 |
| Botón manual bajar       | GPIO 19   |                                                    |
| LED estado WS2812        | GPIO 23   | Cambiar por GPIO 8 o similar en ESP32-C3           |
| I²C SDA (futuro sensor)  | GPIO 21   | Para sensor de luz BH1750 o de temperatura SHT31   |
| I²C SCL                  | GPIO 22   |                                                    |

> Pines a evitar como salidas: **GPIO 6-11** (flash interna), **GPIO 0**
> (boot), **GPIO 2/12/15** (strapping). El firmware ya los esquiva.

## Lista de la compra (BOM)

Para 1 cortina:

- 1× ESP32-WROOM-32 DevKit v1 (30 pines)
- 1× Motor NEMA 17, 1.5 A, 34-40 mm
- 1× Driver TMC2208 v3.0 con disipador
- 1× Fuente 12 V / 2 A con conector barril
- 1× Conversor buck Mini-360 (regulado a 5 V)
- 2× Microswitch KW11-3Z con palanca
- 1× Pulsador momentáneo 12 mm (subir)
- 1× Pulsador momentáneo 12 mm (bajar)
- 1× LED WS2812 (o un anillo de 8 si quieres animaciones)
- 1× Tira de pines hembra Dupont 2.54 mm
- Cable AWG18 (potencia) y AWG24 (señal)
- Tornillería M3 (15-20 tornillos de 8-12 mm)
- Rodamientos 608ZZ (2-4) si imprimes una transmisión por correa GT2
- Correa GT2 (1-2 m) y polea GT2 20 dientes 5 mm

Para escalar a más cortinas, basta repetir el bloque ESP32+driver+motor; la
fuente se puede compartir si hay más de una en la misma habitación.

## Selección rápida según el tipo de cortina

| Tipo de cortina             | Motor        | Driver   | Notas                                  |
| --------------------------- | ------------ | -------- | -------------------------------------- |
| Estor enrollable (≤ 1.5 kg) | NEMA 17 34 mm| TMC2208  | Lo más común                           |
| Estor enrollable (≤ 3 kg)   | NEMA 17 40 mm| TMC2208  | Subir corriente Vref a ~1.0 V          |
| Cortina velo riel ligero    | 28BYJ-48     | ULN2003  | Imprimir polea pequeña                 |
| Cortina pesada / blackout   | NEMA 23 + reductora | DM542 (externo) | Fuera del alcance de este repo, requiere driver mayor |
| Persiana de cinta           | NEMA 17 + reductora 5:1 | TMC2208 | Imprimir adaptador a tambor de cinta |

## Seguridad eléctrica

- Usa siempre fuente con **certificación CE/UL** y conector aislado.
- No conectes ni desconectes el motor del driver con la fuente encendida (se
  puede destruir el driver).
- Añade un **fusible de 2 A en la línea de 12 V** (caja imprimible incluye
  hueco para porta-fusible 5×20 mm).
- Si manejas 220 V para alimentar la fuente, hazlo en una caja certificada,
  nunca en la misma carcasa imprimible.
