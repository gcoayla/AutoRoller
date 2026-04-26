# Piezas a imprimir en 3D

AutoRoller usa el **mecanismo de tirador de cadena de bolitas**: un módulo
que cuelga al lado de tu cortina, contiene un motor + rueda dentada, y al
girar tira de la cadena del estor para subirlo o bajarlo. **No desmontas
nada de tu cortina.**

Este documento describe **qué imprimir**, **con qué parámetros** y **cómo
encajan las piezas**. Los archivos `.stl` y `.scad` (paramétricos) van en
[`3d-models/`](../3d-models/README.md).

> **Filosofía**: para todo lo que existe como diseño abierto consolidado en
> Printables / Thingiverse, lo enlazamos en lugar de reinventar. Lo único
> realmente custom es la rueda dentada de cadena (que va parametrizada en
> OpenSCAD para poder cambiar pitch y dientes con dos variables).

## Vista general del montaje

```
       ┌────────────────────────┐
       │  Bracket de fijación   │ ←── adhesivo VHB / tornillos al marco
       │   (mounting_bracket)   │
       └─────────┬──────────────┘
                 │ enganche tipo "L"
       ┌─────────┴──────────────┐
       │   Carcasa principal    │ ←── chain_driver_body
       │  ┌──────────────────┐  │
       │  │  ESP32 + driver  │  │
       │  │  + buck + boton  │  │
       │  └──────────────────┘  │
       │  ┌──────────────────┐  │
       │  │   NEMA 17 corto  │  │
       │  └────────┬─────────┘  │
       │           │ eje 5 mm   │
       │     ┌─────┴─────┐      │
       │     │ Rueda     │      │ ←── bead_wheel_4.5mm  (o _6mm)
       │     │ dentada   │      │
       │     └─────┬─────┘      │
       │           │            │
       │   ┌───────┴───────┐    │
       │   │  guía de      │    │ ←── chain_driver_cover
       │   │  cadena       │    │
       │   └───────────────┘    │
       └─────────┬──────────────┘
                 │
              cadena de bolitas del estor
              (en bucle, cuelga del techo y vuelve)
                 │
                 ▼
```

## Material y parámetros recomendados

- **Material**: PETG (resiste mejor el calor cerca de la ventana en verano).
  PLA sirve si la ventana no recibe sol directo intenso.
- **Altura de capa**: 0.2 mm.
- **Perímetros**: 4.
- **Relleno**: 30 % giroide. La rueda dentada al 50 %.
- **Soporte**: solo en piezas marcadas con [SOPORTE].

## Lista de piezas

### 1. Carcasa principal (`chain_driver_body.stl`)

Aloja todo: motor, electrónica, rueda dentada y guías de la cadena. Tiene
una abertura por delante por donde entra la cadena de bolitas.

- Medidas exteriores aproximadas: **75 × 50 × 80 mm** (alto × ancho × fondo).
- Compartimento superior para ESP32 DevKit (60 × 30 × 15 mm).
- Hueco para el motor NEMA 17 (42 × 42 × 23 mm) en la parte inferior, con
  los 4 agujeros M3 del patrón estándar.
- Hueco para el driver TMC2208 sobre placa puente.
- Espacio para Buck Mini-360 (junto al ESP32).
- Conector barril 5.5/2.1 mm en el lateral.
- Hueco de 12 mm para los dos botones físicos en la parte superior.
- Ranura para el LED WS2812.
- Slot frontal abierto: ~25 mm de altura para que pase la cadena entrante y
  saliente, dejando espacio para la rueda.
- Insertos roscados M3 con calor en 4 esquinas (para la tapa).

[SOPORTE] sí — el slot interior donde se aloja la rueda crea voladizos.

### 2. Tapa frontal (`chain_driver_cover.stl`)

Cierra el frente, mantiene la cadena en la rueda y guía la entrada/salida.

- Atornilla a la carcasa principal con 4 tornillos M3×8.
- Lleva integradas dos **guías de cadena** (una arriba, otra abajo): unos
  carriles que evitan que la cadena se salga de la rueda dentada cuando se
  tensa.
- Ventana frontal (rectangular o redonda) para que se vea el LED de estado.

### 3. Rueda dentada de cadena (`bead_wheel_*.scad`)

La pieza **clave** del mecanismo. Va al eje del motor con un prisionero M3.

Versiones recomendadas:

| Archivo                 | Bolita | Pitch | Dientes | Ø pitch |
| ----------------------- | ------ | ----- | ------- | ------- |
| `bead_wheel_4.5mm.scad` | 4.5 mm | 6 mm  | 12      | ~22.9 mm |
| `bead_wheel_6mm.scad`   | 6 mm   | 9 mm  | 12      | ~34.4 mm |

Cada diente es un hueco semi-cilíndrico (ø un poco mayor que la bolita) con
una garganta entre dientes para que el cordón pase. La rueda imprime con la
cara plana hacia arriba.

> Imprime la rueda en **PETG con 50 % de relleno** y al menos 4 perímetros
> en las paredes radiales. Es la pieza que más sufre.

OpenSCAD parametrizado: ver [`3d-models/bead_wheel.scad`](../3d-models/README.md).

### 4. Bracket de fijación (`mounting_bracket.stl`)

Pieza que va pegada / atornillada al marco de la ventana. La carcasa
principal se desliza encima como un riel "tipo L" y queda enganchada por
gravedad y un pestillo.

Dos variantes recomendadas:

- **`mounting_bracket_vhb.stl`** — base plana de 60 × 40 mm pensada para
  pegar con cinta 3M VHB de 4 cm. Ideal en marcos pintados o lisos.
- **`mounting_bracket_screw.stl`** — base con 2 agujeros para tornillos
  Ø3-4 mm. Para fijación definitiva.

El bracket lleva el "macho" del enganche; la carcasa lleva la "hembra".
Esto te permite descolgar el módulo en cualquier momento sin desmontar
el bracket (ej. para reflashear o reutilizar en otra ventana).

### 5. Adaptador de eje opcional (`shaft_adapter_d_to_5mm.stl`)

Si tu NEMA 17 tiene **eje "D-cut"** (con plano), imprime este adaptador
para que la rueda no resbale. Cilindro corto con sección "D" interior y
exterior cilíndrica de 5 mm sólida que entra en la rueda.

### 6. Pasacables y clips (`cable_clip.stl`, `cable_channel.stl`)

Opcional, para guiar el cable de alimentación pegado al marco.

## ¿Imprimo o descargo?

Aquí está la matriz de decisiones, porque para algunas piezas hay diseños
abiertos buenísimos en Printables y otras es mejor modelar tú:

| Pieza                  | Diseño abierto bueno disponible | Recomendación              |
| ---------------------- | ------------------------------- | -------------------------- |
| Carcasa principal      | Muchos clones SwitchBot         | Descargar y adaptar         |
| Tapa con guía          | Igual                           | Descargar y adaptar         |
| Rueda dentada          | Pocos para 4.5/6 mm específicos | **Usar OpenSCAD del repo** |
| Bracket VHB / tornillo | Sí                              | Descargar                  |
| Adaptador eje          | Sí                              | Descargar                  |

Enlaces concretos en [`3d-models/README.md`](../3d-models/README.md).

## Tornillería resumida

| Tornillo  | Cantidad | Uso                                         |
| --------- | -------- | ------------------------------------------- |
| M3 × 8    | 4        | Tapa frontal a carcasa                      |
| M3 × 25   | 4        | NEMA 17 a carcasa                           |
| M3 × 6    | 1        | Prisionero rueda → eje motor                |
| M4 × 25   | 2        | Solo para `mounting_bracket_screw`          |
| Insertos M3 con calor | 4 | Carcasa (en las esquinas de la tapa)     |

## Cinta VHB

Si vas por la opción de pegar al marco, **3M VHB 4910** o equivalente. Una
tira de 4 × 10 cm aguanta 5-6 kg en pared lisa pintada (la unidad pesa
~250 g, así que sobra factor 20). Limpia el marco con alcohol antes de
pegar y haz presión 30 segundos.

> Si en algún momento quieres quitarla, **calienta la cinta con un secador
> 30 s** y tira despacio paralelo a la pared. Sale sin marca.

## Calibración mecánica

A diferencia del montaje intra-tubo, aquí **no hay finales de carrera
físicos**. La cadena tiene topes mecánicos propios (un nudo en cada
extremo); cuando el motor llega al final, la rueda gira en vacío o el
motor se atasca. Tres formas de calibrar la posición:

1. **Por tiempo** (recomendado para empezar): mides cuánto tarda en subir
   y bajar a velocidad estándar. La app calcula el % por interpolación.
2. **Por StallGuard** (si tu TMC2208 v3.0 expone DIAG): el driver detecta
   el atasco al llegar al tope y reporta la posición.
3. **Manualmente** desde la app: pones la cortina arriba con el slider y
   pulsas "Marcar 0 aquí"; idem para "Marcar máx aquí".

El firmware soporta los tres modos. Por defecto está activado el manual.
Detalles en [`docs/configuration.md`](configuration.md).
