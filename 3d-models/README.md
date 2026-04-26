# Modelos 3D

Esta carpeta aloja los archivos `.stl`, `.scad` paramétricos y enlaces a
modelos abiertos para construir el módulo AutoRoller (tirador de cadena
de bolitas).

## Filosofía: usar lo que ya existe

Hay docenas de clones imprimibles de **SwitchBot Curtain** y **Aqara
Roller Shade Driver** en Printables y Thingiverse. La mayoría sirven con
ajustes mínimos. Los enlazamos abajo. **Lo único realmente custom** que
escribimos en el repo es la **rueda dentada** (que va parametrizada en
OpenSCAD para poder cambiar pitch y dientes con dos variables).

## Modelos abiertos recomendados

> Antes de descargar, mira los comentarios y el remix más popular —
> normalmente alguien ya ha resuelto el ajuste para tu motor o tu cadena.

### Carcasa + bracket (lo más parecido a SwitchBot)

Busca en [Printables](https://www.printables.com/) por:

- **"Bead chain motor housing ESP32"** — algunos ya vienen con hueco para
  TMC2208 incluido.
- **"DIY SwitchBot Curtain"** — la familia clásica.
- **"Smart blinds bead chain"** — variantes para distintos motores.

Lo que tienes que confirmar antes de descargar:

| Confirma                              | Por qué                                  |
| ------------------------------------- | ---------------------------------------- |
| Motor: NEMA 17 corto (23-34 mm)       | El hueco lo da la huella                 |
| Eje: 5 mm liso (no D-cut)             | Si es D-cut, imprime también `shaft_adapter` |
| Cadena: 4.5 mm bolita / 6 mm pitch    | Para alinear con tu rueda dentada        |
| Tipo de fijación: VHB o tornillo      | Hay variantes para cada uno              |

**Modelos referenciados que sirven directamente** (al cierre de v1.4):

- *Aqara Roller Shade Driver E1 clone* (Printables) — funciona con NEMA 17
  corto y rueda imprimible separada. Cambia la rueda por la nuestra.
- *SwitchBot Curtain Replica* (Thingiverse) — caja amplia, fácil de
  adaptar si tu cadena es 4.5 mm.

> No enlazamos URLs concretas porque cambian, pero las palabras clave de
> arriba devuelven >50 resultados en cualquier momento.

### NEMA 17 mounts genéricos

Si quieres modelar la carcasa tú y solo necesitas la huella del motor:
busca **"NEMA 17 mounting plate"** — todas tienen el patrón estándar
(31 mm cuadrado, agujero central de 22 mm, 4 × M3).

### Adaptador eje D-cut a 5 mm cilíndrico

Si tu motor tiene flat:

- Busca **"D-shaft to round adapter 5mm"** o modela uno (5 líneas en OpenSCAD).

## Esquema de carpetas (cuando subas tus STLs)

```
3d-models/
├── bead_wheel.scad             ← rueda paramétrica (PRIMARIO, en este repo)
├── bead_wheel_4.5mm.stl        ← exportado para cadena #10
├── bead_wheel_6mm.stl          ← exportado para cadena #6
├── chain_driver_body.stl       ← descargado de Printables y adaptado
├── chain_driver_body.step
├── chain_driver_cover.stl
├── chain_driver_cover.step
├── mounting_bracket_vhb.stl    ← bracket adhesivo VHB
├── mounting_bracket_screw.stl  ← bracket atornillable
├── shaft_adapter_d_to_5mm.stl  ← solo si tu motor es D-cut
└── cable_clip.stl              ← opcional
```

> Mantén siempre el **`.step`** junto al `.stl` cuando esté disponible
> para que la pieza sea editable por terceros.

## La rueda dentada: OpenSCAD paramétrico

La pieza más crítica del montaje. El archivo
[`bead_wheel.scad`](bead_wheel.scad) está parametrizado: cambia las dos
variables del principio para tu cadena y reexporta a STL.

### Cómo exportar

```bash
# Cadena #10 (4.5 mm bolita / 6 mm pitch) — preset por defecto del .scad
openscad -o bead_wheel_4.5mm.stl bead_wheel.scad

# Cadena #6 (6 mm bolita / 9 mm pitch)
openscad -o bead_wheel_6mm.stl \
    -D 'bead_d=6.0' -D 'pitch=9.0' \
    bead_wheel.scad
```

### Ajuste fino (lo que hay que probar)

La cadena debe **entrar en los huecos sin esfuerzo y salir igual** al rodar
la rueda. Las dos variables que más impactan:

- `clearance` → si la cadena se atasca, súbela a 0.35 mm. Si patina, bájala
  a 0.15.
- `groove_w` → si el cordón roza, súbela a 1.8 mm. Si la cadena salta de
  hueco, bájala a 1.4.

Imprimir la rueda en **PETG con 50 % de relleno y 4 perímetros radiales**.

## Cómo validar el ajuste sin montar todo

Antes de imprimir la carcasa entera, puedes validar la rueda con un
test sencillo:

1. Imprime solo la rueda.
2. Sostenla con la mano y enrolla la cadena de tu estor a su alrededor.
3. Gira la rueda con dos dedos. La cadena debe avanzar limpia, sin saltar
   ni atascarse.
4. Si todo va bien, imprime el resto de la carcasa.

Esto ahorra horas de impresión si la rueda no está afinada.

## Recursos

- **OpenSCAD**: https://openscad.org (free, multiplataforma).
- **PrusaSlicer / Cura / OrcaSlicer**: cualquiera vale para imprimir los STL.
- **Printables**: https://www.printables.com — la fuente principal de
  carcasas abiertas para este tipo de mecanismo.
