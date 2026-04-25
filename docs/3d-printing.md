# Piezas a imprimir en 3D

Este documento describe **qué** imprimir, con **qué parámetros** y **por qué**.
Los modelos `.stl` y `.step` están descritos a nivel funcional para que puedas
fabricarlos con cualquier programa CAD (FreeCAD, Fusion 360, OnShape) o tirar
de modelos abiertos de Printables / Thingiverse cuando exista una solución
estándar.

> **Filosofía**: cada pieza tiene un boceto y unas medidas; no hace falta
> reinventar la rueda. Donde existe un diseño abierto consolidado, lo
> referenciamos.

## Material y parámetros recomendados

- **Material**: PETG (resiste mejor el calor cerca de una ventana en verano).
  PLA sirve si la ventana no recibe sol directo intenso.
- **Altura de capa**: 0.2 mm.
- **Perímetros**: 4 (las piezas mecánicas necesitan rigidez).
- **Relleno**: 30 % giroide.
- **Temperatura**: la de tu rollo (PETG ~235 °C / cama 80 °C).
- **Soporte**: solo en piezas marcadas con [SOPORTE].

## Lista de piezas

### 1. Carcasa de la electrónica (`enclosure_top.stl` + `enclosure_bottom.stl`)

Caja en dos mitades para alojar:

- ESP32-WROOM-32 DevKit v1 (30 pines, 56 × 28 mm).
- Driver TMC2208 sobre placa puente o protoboard.
- Buck Mini-360.
- Conector barril 5.5/2.1 mm para la fuente.
- Conector tipo XT30 o JST-XH para el motor.
- Hueco para 2 botones de 12 mm en la tapa.
- Ranura lateral para el LED WS2812.
- Espacio para porta-fusible 5×20 mm.

Medidas exteriores: **90 × 65 × 30 mm**, esquinas redondeadas r=3 mm.

Detalles:

- Insertos roscados M3 con calor (4 esquinas) → tornillería M3×8.
- Rejilla de ventilación en la cara lateral del driver.
- Pasacables con goma o gomilla para la salida de cables del motor.

[SOPORTE] solo si haces voladizo en la rejilla de ventilación (>45°).

### 2. Soporte del motor (`motor_bracket.stl`)

Brida en L para fijar el motor NEMA 17 a la pared / marco de la ventana.

- Patrón de tornillos NEMA 17 (31 mm cuadrado, agujero central de 22 mm).
- Cuatro agujeros de fijación a pared en la base, M4.
- Refuerzo triangular para evitar flexión bajo carga.
- Altura ajustable mediante ranuras (slots) de 12 mm.

Existen modelos abiertos consolidados:

- [Universal NEMA 17 mount (Printables)](https://www.printables.com/) — busca
  "NEMA 17 wall mount" si no quieres modelarlo.

### 3. Acople / coupler eje-tubo (`coupler_5mm_to_25mm.stl`)

Adapta el eje del motor (5 mm) al tubo de la cortina enrollable (∅ típico
25, 28 o 32 mm). Fabrica una versión por diámetro.

- Mitad superior con eje de 5 mm + prisionero M3.
- Mitad inferior con cilindro hueco a la medida del tubo, con dientes
  longitudinales para morder por dentro.
- Ambas mitades unidas con dos tornillos M3.

> **Tip**: imprime en **PETG con 50 % de relleno**. El acople es la pieza que
> más sufre.

### 4. Polea / engranaje opcional (`gt2_pulley_holder.stl`)

Si en lugar de acoplar directo prefieres correa GT2:

- Polea GT2 20 dientes 5 mm en el motor (se compra, no se imprime).
- **Tambor GT2 imprimible** del lado del tubo, ∅ a medida.
- Tensor con rodamiento 608ZZ.

### 5. Soporte para finales de carrera (`endstop_bracket.stl`)

Pieza pequeña que sujeta dos microswitches KW11-3Z con tornillería M2.5,
alineados con los topes mecánicos de la cortina.

- Slots en lugar de agujeros para ajustar la posición a posteriori.
- Ranuras para pasar y guiar el cable.

### 6. Pasacables / canaleta (`cable_clip.stl`, `cable_channel.stl`)

Clips presionables para sujetar el cable a lo largo del marco. No
imprescindible, pero hace que la instalación parezca limpia.

### 7. Estación inalámbrica de mesa (futuro asistente de voz, opcional)

Carcasa de mesa para integrar en el futuro:

- ESP32-S3 con micrófono I²S (INMP441) y altavoz pequeño.
- Anillo de 12 NeoPixels para feedback visual.
- Pulsador de "wake" mecánico.

Se documentará a fondo en [`docs/voice-assistant.md`](voice-assistant.md).

## Cálculo del par necesario para tu cortina

Para no quedarte corto:

```
Par necesario (Nm) ≈ (peso de la cortina en kg) × 9.81 × (radio del tubo en m) / 2
```

Ejemplo: estor de 1.5 kg con tubo de 25 mm de diámetro (radio 0.0125 m):

```
Par ≈ 1.5 × 9.81 × 0.0125 / 2 ≈ 0.092 Nm = 9.2 Ncm
```

Un NEMA 17 estándar entrega 40-50 Ncm, así que sobra ~5×. Si vas justo (cortina
pesada o cortina con fricción alta), añade reducción 5:1 con engranajes
imprimibles o usa motor más largo.

## Tornillería resumida

| Tornillo  | Cantidad | Uso                                |
| --------- | -------- | ---------------------------------- |
| M3 × 8    | 12       | Tapa de la caja                    |
| M3 × 12   | 4        | Acople motor-tubo                  |
| M3 × 25   | 4        | Sujeción del NEMA 17 al soporte    |
| M4 × 30   | 4        | Soporte motor a pared              |
| M2.5 × 8  | 4        | Microswitches                      |
| Insertos M3 con calor | 8 | Caja                            |

Si no tienes insertos roscados, modifica el modelo para tuerca incrustada.
