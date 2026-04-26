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

Lista de modelos verificados en abril 2026, todos descargables sin pago.
**No los inventamos** — son enlaces directos. Antes de imprimir, abre el
modelo y mira los comentarios y remixes; suele haber alguien que ya ha
resuelto el ajuste para una cadena distinta o un motor más corto.

### 🏆 Recomendación principal — *Minimalistic Motorized Roller Blinds*

> **El que mejor encaja con AutoRoller.**
> Por **Lush**, agosto 2023 · 329 likes · 919 descargas en Printables.

[**Minimalistic Motorized Roller Blinds — NEMA 17 stepper motor gear and mount**](https://www.printables.com/model/465889-minimalistic-motorized-roller-blinds-nema-17-stepp)

- Motor: **NEMA 17 1.2 A · 0.42 Nm** (idéntico al BOM nuestro).
- Driver: **TMC2209** (compatible pin a pin con TMC2208).
- Cadena: **4.5 mm bolita / 6.1 mm pitch** — la más común en estores
  europeos, igual que el preset por defecto de nuestro `bead_wheel.scad`.
- Trae **archivo Fusion 360 (.f3d)** editable para adaptar a otras
  cadenas si tu pitch es distinto.
- StallGuard configurado para detectar el atasco al final del recorrido
  (el firmware nuestro lo aprovecha si conectas DIAG a GPIO 34).

**Por qué este**: es el único de la lista que usa NEMA 17 + TMC, exactamente
lo que pide nuestro firmware. Imprimes la carcasa y el bracket, montas la
electrónica de AutoRoller dentro y listo.

> Si tu cadena es de **6 mm** en vez de 4.5 mm, mejor usa nuestra rueda
> `bead_wheel.scad` reexportada con `bead_d=6 pitch=9` y solo descarga la
> carcasa de Lush (tendrás que hacer el hueco un poco mayor).

---

### 🥈 Alternativa todo-en-uno — *SmartBlinds Pro*

> Más nuevo, más pulido, pero usa motor distinto.
> Por **fluetke**, 2025 · 31 likes · 204 descargas · marcado como
> *"polished beta"*.

[**SmartBlinds Pro — automate your roller blinds**](https://www.printables.com/model/1529757-smartblinds-pro-automate-your-roller-blinds)

- Motor: **28BYJ-48** (5 V con reductora interna).
- Micro: **Wemos LOLIN C3 Mini (ESP32-C3)**.
- No invasivo, se monta junto a la cadena.
- Firmware propio con interfaz web + **MQTT integrado** + alternativa
  ESPHome.
- **Hardware y software 100 % open-source** (PCB en GitHub).

**Cuándo elegirlo**: si prefieres un motor más pequeño y silencioso (28BYJ-48
en vez de NEMA 17). **Aviso**: nuestro firmware actual está pensado para
STEP/DIR (TMC2208), no para 28BYJ-48 con ULN2003. Si vas por aquí, tendrás
que adaptar el motor controller. La alternativa es usar el firmware del
propio SmartBlinds Pro.

---

### 🛠 Solo rueda dentada / repuesto — *AM43 Variable Drive Pulleys*

[**AM43 Blind Motor — variable drive pulleys for beaded chain roller blinds**](https://www.printables.com/model/492121-am43-blind-motor-variable-drive-pulleys-for-beaded)

- **Solo las poleas** (varias variantes: estándar, alta carga, diámetros
  pequeños y grandes).
- Pensadas originalmente para el motor comercial **AM43**, pero el patrón
  de bolitas y el agujero del eje son adaptables.
- Útil como **plan B** si nuestro `bead_wheel.scad` no cuaja: descarga las
  variantes y comprueba cuál encaja con tu cadena específica.

---

### Otras alternativas viables (sin probar a fondo)

Las dejo aquí por si necesitas variedad:

- [**Automatic Smart Roller Blinds Mod**](https://www.printables.com/model/1107892-automatic-smart-roller-blinds-mod)
  — by Finn. NEMA 17 + ESPHome. Buena opción si prefieres ESPHome al
  firmware nuestro.
- [**Smart IKEA Roller Blinds**](https://www.printables.com/model/291966-smart-ikea-roller-blinds)
  — by bmyonatan. ESP32 + Home Assistant. Específico para estores IKEA.
- [**Motor on a roller blind**](https://www.thingiverse.com/thing:2392856)
  — by nidayand (Thingiverse). El "abuelo" de la familia, muchísimos
  remixes y variante ESPHome activa.
- [**Motorized Roller Blinds (Leroy Merlin version)**](https://www.thingiverse.com/thing:4093205)
  — by Erop. Optimizado para estores **Leroy Merlin** (común en España).
  Puede ser ideal si compraste tu estor allí.
- [**Big Smart Motorized Roller Blind**](https://www.thingiverse.com/thing:5575324)
  — by Nikolaj_. NEMA 17 24 V + Tasmota + HomeKit. Para estores muy
  grandes/pesados.

### Para más opciones, búsqueda directa

- [Tag `rollerblind` en Printables](https://www.printables.com/tag/rollerblind)
- [Tag `blind` en Printables](https://www.printables.com/tag/blind)
- [Tag `Roller blinds` en Thingiverse](https://www.thingiverse.com/tag:roller_blinds)

## Cómo elegir entre ellos

```
┌─────────────────────────────────────────────────────┐
│  ¿Tienes ya el motor NEMA 17 + TMC2208 del BOM?     │
│  ¿Cadena 4.5 mm bolita / 6 mm pitch?                │
│                       │                             │
│            ┌──────────┴──────────┐                  │
│           SÍ                    NO                  │
│            │                     │                  │
│            ▼                     ▼                  │
│   "Minimalistic …"      ¿Cadena distinta?           │
│   (Lush) ✅             ┌────────┴────────┐         │
│                        SÍ                NO         │
│                         │                 │         │
│                         ▼                 ▼         │
│                Carcasa de Lush    "SmartBlinds Pro" │
│                + nuestro          (motor 28BYJ-48)  │
│                bead_wheel.scad    necesita firmware │
│                ajustado           propio o adaptar  │
└─────────────────────────────────────────────────────┘
```

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
