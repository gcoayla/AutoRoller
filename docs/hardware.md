# Selección de hardware

Esta es la lista de componentes para un nodo AutoRoller que mueva una cortina
mediante **tirador de cadena de bolitas** (mecanismo no invasivo).
El motor cuelga al lado de tu cortina, una rueda dentada agarra la cadena, y
al girar el motor sube/baja la cortina como si tirases tú de la cadena.

> Es el mismo principio que el **SwitchBot Curtain 3**, **Aqara Roller Shade
> Driver E1** o **Soma Smart Shades** comerciales. Aquí lo hacemos abierto y
> casero.

## Resumen ejecutivo

| Función                | Recomendado                             | Alternativas                        |
| ---------------------- | --------------------------------------- | ----------------------------------- |
| Microcontrolador       | **ESP32-WROOM-32 DevKit v1 (30 pines)** | ESP32-S3, ESP32-C3 SuperMini        |
| Motor                  | **NEMA 17 corto (1.0 A · 23-34 mm)**    | 28BYJ-48 con reductora interna      |
| Driver                 | **TMC2208 silencioso**                  | A4988 (ruidoso), ULN2003 (28BYJ-48) |
| Fuente                 | **12 V / 1 A barril 5.5 mm**            | 5 V/2A si motor 28BYJ-48            |
| Conversor lógica       | Buck Mini-360                           | AMS1117                             |
| Sujeción al marco      | **Adhesivo 3M VHB** + ganchos imprimibles | Tornillería al marco              |
| Botón manual           | Pulsador 12 mm                          | —                                   |
| LED de estado          | LED WS2812 (NeoPixel) ó 3 mm difuso     | —                                   |
| Cableado               | Dupont para señal, AWG18 para potencia  | —                                   |

> **Coste aproximado por nodo**: 12-20 €. Es **más barato** que la opción
> intra-tubo porque el motor es más pequeño (la cadena exige mucho menos par
> que rotar el tubo entero).

## Por qué este mecanismo es mejor para empezar

- **No invasivo**: no desmontas nada de tu cortina. Si te mudas, lo descuelgas
  sin marcas (con adhesivo VHB sobre paredes lisas).
- **Universal**: cualquier estor con cadena de bolitas (la mayoría de los
  modernos en España) funciona, sin importar la marca.
- **Reversible**: puedes seguir tirando de la cadena con la mano cuando
  quieras. La rueda dentada no traba el movimiento manual.
- **Par sobrado**: la cadena necesita típicamente 5-15 N de tracción. Un NEMA
  17 corto entrega 30-40 Ncm, equivalente a >50 N en una rueda de 15 mm de
  radio. Sobra ×3-5.

## Las dos cadenas estándar

Antes de comprar, mira la cadena de tu estor con un calibre o regla:

| Tipo                | Bolita | Pitch (entre centros) | Predominio                              |
| ------------------- | ------ | --------------------- | --------------------------------------- |
| **Cadena #10**      | 4.5 mm | 6 mm                  | El más común en estores europeos modernos |
| **Cadena #6**       | 6 mm   | 9 mm                  | Estores comerciales / grandes            |
| Cadena fina         | 3 mm   | 4 mm                  | Microestores                             |

> En el repo viene un modelo 3D de rueda dentada para 4.5 mm y otro para 6 mm.
> Si tienes la rara cadena de 3 mm, modifica el OpenSCAD y reexporta.

## Sobre el motor

### Por qué NEMA 17 (y por qué corto)

- **Par sobrado** para la cadena (30-40 Ncm). Mucho más del necesario.
- **Bipolar 4 hilos**, el driver TMC2208 lo gobierna con STEP/DIR.
- Lo elegimos **corto (23 mm o 34 mm)** porque la carcasa que lo aloja queda
  más pequeña y discreta. No necesitas las versiones de 40-60 mm.
- Eje 5 mm estándar — el agujero central de la rueda dentada está hecho a
  esa medida.

### Alternativa más compacta: 28BYJ-48

- **Reductora interna 64:1** de fábrica → ya viene con par alto y velocidad
  baja.
- Funciona con driver **ULN2003** (placa que viene casi siempre con el
  motor) y a 5 V.
- **Más barato** (~3 € motor+driver) y más pequeño que el NEMA 17.
- **Contras**: no soporta StallGuard (no detecta cuándo llega al tope), es
  un poco más ruidoso que un TMC2208 silenciado, y el firmware actual está
  pensado para STEP/DIR — añadir soporte 28BYJ-48 requiere adaptación.

> Para la primera versión, **vamos con NEMA 17 + TMC2208** porque es el
> camino más estable con el firmware actual.

### Driver: TMC2208 (frente al A4988)

- **Silencioso**: usa StealthChop, no se oyen los pasos. Importante en un
  dormitorio.
- **StallGuard** (opcional, en variantes v3.0 con pin DIAG accesible): puede
  detectar cuando el motor se atasca contra el tope físico de la cadena,
  sin necesidad de finales de carrera. Lo aprovecharemos como detección de
  "tope alcanzado".
- **Compatible pin a pin con A4988**, así que cualquier guía vale.
- 3.3 V de lógica → conexión directa al ESP32.

### Fuente

- **12 V / 1 A** es suficiente para mover la cadena con holgura.
- Si te molestan los 12 V, puedes ir a **5 V / 2 A** y configurar el
  TMC2208 para baja corriente, pero pierdes margen.

## Pinout recomendado (ESP32-WROOM-32 DevKit v1)

| Función                    | Pin ESP32 | Notas                                              |
| -------------------------- | --------- | -------------------------------------------------- |
| STEP                       | GPIO 26   |                                                    |
| DIR                        | GPIO 27   |                                                    |
| ENABLE                     | GPIO 14   | Activo en bajo                                     |
| Microstep MS1              | GPIO 25   |                                                    |
| Microstep MS2              | GPIO 33   |                                                    |
| StallGuard DIAG (opcional) | GPIO 34   | Detección de tope sin endstop físico               |
| Botón manual subir         | GPIO 18   | `INPUT_PULLUP`                                     |
| Botón manual bajar         | GPIO 19   |                                                    |
| LED estado WS2812          | GPIO 23   |                                                    |
| I²C SDA (futuro sensor)    | GPIO 21   |                                                    |
| I²C SCL                    | GPIO 22   |                                                    |

> Sin **finales de carrera externos**. Los topes son los propios de la
> cadena del estor (cuando el motor llega al final, no puede seguir
> tirando). Si tu TMC2208 v3.0 expone DIAG, conéctalo a GPIO 34 para
> detección de stall por hardware.

## Lista de la compra (BOM)

Para 1 cortina (~15 €):

- 1× ESP32-WROOM-32 DevKit v1 (30 pines)
- 1× Motor NEMA 17 corto, 1.0 A, **23-34 mm de largo**
- 1× Driver TMC2208 v3.0 con disipador
- 1× Fuente 12 V / 1 A con conector barril 5.5/2.1 mm
- 1× Conversor buck Mini-360
- 1× Pulsador momentáneo 12 mm (subir)
- 1× Pulsador momentáneo 12 mm (bajar)
- 1× LED WS2812
- 1× Tira de pines hembra Dupont 2.54 mm
- Cable AWG18 para el motor, AWG24 para señal
- Tornillería M3 (~10 tornillos de 8-12 mm)
- Insertos roscados M3 con calor (4 unidades) — opcional, recomendado

**Y específico del montaje en cadena**:

- **Adhesivo 3M VHB doble cara 4 cm × 10 cm** (o tornillería al marco)
- 1× Carcasa principal impresa (`chain_driver_body.stl` + `cover.stl`)
- 1× Rueda dentada impresa para tu tipo de cadena (4.5 mm o 6 mm)
- 1× Bracket de fijación impreso

## Selección rápida según el tipo de cortina

| Tipo de cortina (cadena de bolitas)        | Motor          | Driver  | Notas                               |
| ------------------------------------------ | -------------- | ------- | ----------------------------------- |
| Estor enrollable ligero (≤ 2 kg)           | NEMA 17 23 mm  | TMC2208 | Lo más común                        |
| Estor más pesado (≤ 4 kg) o blackout       | NEMA 17 34 mm  | TMC2208 | Subir Vref a ~0.9 V                 |
| Persiana veneciana con cadena              | NEMA 17 23 mm  | TMC2208 | La cadena es más fina, ojo al pitch |
| Persiana vertical con cadena de mando      | NEMA 17 23 mm  | TMC2208 | Igual                               |
| Estor sin cadena (muelle, recogida directa)| Hacer la opción intra-tubo invasiva — fuera del alcance de este flujo |

## Seguridad eléctrica

- Fuente con **certificación CE/UL** y conector aislado.
- No conectes/desconectes el motor del driver con la fuente encendida (se
  puede destruir el driver).
- **Fusible de 1.5 A en la línea de 12 V** (el porta-fusible cabe dentro de
  la carcasa imprimible).
- Si manejas 220 V, hazlo en una caja certificada, nunca en la carcasa
  imprimible.
