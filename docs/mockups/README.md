# Mockups de la app móvil

SVGs estáticos a tamaño teléfono (390 × 844, equivalente iPhone 12) que
recrean las pantallas principales de la app `mobile/`. Útiles para:

- Hacerse una idea visual antes de compilar la app.
- Validar la estética sin tener Android Studio / device.
- Documentar releases (cualquier visor Markdown los renderiza).

> **No son screenshots reales** — son reconstrucciones a mano siguiendo el
> tema de Tailwind (`mobile/tailwind.config.js`) y los componentes de
> `mobile/src/components/`. Si rediseñas la app, recuerda actualizarlos.

## Galería

| Pantalla                                         | Descripción                                                  |
| ------------------------------------------------ | ------------------------------------------------------------ |
| [01-home.svg](01-home.svg)                       | Home con 3 dispositivos, control de grupo y FAB              |
| [02-add-bluetooth.svg](02-add-bluetooth.svg)     | "Añadir → Bluetooth" durante un escaneo activo               |
| [03-ble-wizard-wifi.svg](03-ble-wizard-wifi.svg) | Paso 2 del wizard BLE: selección de WiFi                     |
| [04-device-control.svg](04-device-control.svg)   | Detalle de un nodo, pestaña "Control"                        |
| [05-device-schedules.svg](05-device-schedules.svg) | Pestaña "Programador" con 3 reglas semanales               |
| [06-device-advanced.svg](06-device-advanced.svg) | Pestaña "Avanzado" con calibración + política BLE            |

## Ver una pantalla

Abrir el SVG en cualquier navegador (`open 01-home.svg` en macOS, doble click
en otros sistemas) o exportar a PNG con:

```bash
# requiere Inkscape o ImageMagick
inkscape 01-home.svg --export-type=png --export-dpi=192
# o
magick 01-home.svg -density 192 01-home.png
```

## Paleta usada

Coincide con `mobile/tailwind.config.js`:

| Variable    | Hex / RGBA                | Uso                              |
| ----------- | ------------------------- | -------------------------------- |
| `bg`        | `#050811`                 | Fondo                             |
| `bg2`       | `#0A1124`                 | Fondo intermedio del gradient     |
| `card`      | `#16213A`                 | Tarjetas (con borde cyan tenue)   |
| `border`    | `rgba(78,161,255,0.18)`   | Borde general (`#1E2D54` sólido)  |
| `primary`   | `#4EA1FF`                 | Azul principal, CTAs              |
| `accent`    | `#B14EFF`                 | Magenta secundario                |
| `success`   | `#4EFFB1`                 | Verde de OK / reposo              |
| `warn`      | `#FFB04E`                 | Naranja parar / alerta            |
| `danger`    | `#FF4E78`                 | Rojo eliminar / reset             |
| `fg`        | `#E6ECF5`                 | Texto principal                   |
| `muted`     | `#7B89A6`                 | Texto secundario                  |
