# Modelos 3D

Esta carpeta está pensada para alojar los archivos `.stl` y `.step` de las
piezas descritas en [`docs/3d-printing.md`](../docs/3d-printing.md).

Como punto de partida puedes usar diseños abiertos ya consolidados:

- **NEMA 17 wall mount** — busca "NEMA 17 wall mount" en
  [Printables](https://www.printables.com) o [Thingiverse](https://www.thingiverse.com).
- **Caja electrónica para ESP32 DevKit + driver** — hay decenas de remixes;
  cualquiera con compartimento ~90×65×30 mm sirve.
- **Acople 5 mm → tubo de cortina** — busca "roller blind motor coupler" /
  "shade tube adapter".

Si modelas tus propias piezas, súbelas aquí siguiendo este esquema:

```
3d-models/
├── enclosure_top.stl
├── enclosure_top.step
├── enclosure_bottom.stl
├── enclosure_bottom.step
├── motor_bracket.stl
├── motor_bracket.step
├── coupler/
│   ├── coupler_5mm_to_25mm.stl
│   ├── coupler_5mm_to_28mm.stl
│   └── coupler_5mm_to_32mm.stl
├── endstop_bracket.stl
└── cable_clip.stl
```

> Mantén siempre el **`.step`** junto al `.stl` para que la pieza sea editable
> por terceros.

## Plantilla mínima en OpenSCAD

Si prefieres OpenSCAD para no salir del repo, aquí va una base para el acople:

```scad
// coupler.scad
shaft_d   = 5;        // diámetro del eje del motor
tube_d    = 25;       // diámetro interior del tubo de la cortina
length    = 40;       // longitud total del acople
wall      = 3;        // pared
teeth     = 12;       // dientes longitudinales que muerden el tubo

module coupler() {
  difference() {
    union() {
      cylinder(h=length, d=tube_d - 0.4, $fn=64);
      // dientes
      for (i = [0:teeth-1]) {
        rotate([0, 0, i*(360/teeth)])
          translate([tube_d/2 - 0.5, -1, 0])
            cube([1.5, 2, length]);
      }
    }
    // hueco del eje
    translate([0, 0, -0.1])
      cylinder(h=length+0.2, d=shaft_d + 0.2, $fn=32);
    // prisionero M3
    translate([0, 0, length*0.7])
      rotate([90, 0, 0])
        cylinder(h=tube_d, d=3.2, $fn=24);
  }
}

coupler();
```

Modifica `tube_d` para cada diámetro de tubo y exporta a STL.
