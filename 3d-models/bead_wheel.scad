// bead_wheel.scad — Rueda dentada para cadena de bolitas.
//
// Compatible con cadenas estándar tipo #10 (4.5 mm bolita / 6 mm pitch)
// y #6 (6 mm bolita / 9 mm pitch). Para otras, ajusta `bead_d` y `pitch`.
//
// Uso desde la línea de comandos:
//
//   openscad -o bead_wheel_4.5mm.stl bead_wheel.scad
//   openscad -o bead_wheel_6mm.stl -D 'bead_d=6.0' -D 'pitch=9.0' bead_wheel.scad
//
// Imprimir en PETG, 50% relleno, 4 perímetros, 0.2 mm de capa.

// ---- Parámetros ----------------------------------------------------------
bead_d      = 4.5;   // diámetro de la bolita (mm)
pitch       = 6.0;   // distancia entre centros de bolitas (mm)
teeth       = 12;    // número de dientes
shaft_d     = 5.0;   // eje del motor (mm)
hub_h       = 8;     // alto total de la rueda (mm)
groove_w    = 1.6;   // ancho de la garganta entre bolitas (mm)
clearance   = 0.25;  // holgura del eje y de la bolita en su hueco (mm)
set_screw_d = 3.2;   // M3 prisionero radial

// ---- Cálculos ------------------------------------------------------------
pitch_d = teeth * pitch / PI;          // diámetro de paso (centros)
outer_d = pitch_d + bead_d + 2;        // un poco mayor que pitch
$fn = 80;

// ---- Cuerpo --------------------------------------------------------------
module wheel() {
    difference() {
        // disco macizo
        cylinder(h = hub_h, d = outer_d);

        // huecos de bolitas distribuidos sobre el círculo de pitch
        for (i = [0 : teeth - 1]) {
            angle = i * 360 / teeth;
            x = (pitch_d / 2) * cos(angle);
            y = (pitch_d / 2) * sin(angle);

            // bolita: media esfera embutida en la pared
            translate([x, y, hub_h / 2])
                sphere(d = bead_d + clearance);

            // garganta entre bolitas para que pase el cordón
            translate([x, y, hub_h / 2])
                rotate([90, 0, angle])
                    cylinder(h = bead_d + 2, d = groove_w, center = true);
        }

        // eje central
        translate([0, 0, -0.1])
            cylinder(h = hub_h + 0.2, d = shaft_d + clearance);

        // prisionero M3 radial al ras del centro
        translate([0, -outer_d, hub_h / 2])
            rotate([-90, 0, 0])
                cylinder(h = outer_d, d = set_screw_d);
    }
}

wheel();
