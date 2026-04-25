# Assets

Esta carpeta contiene los recursos gráficos de la app. Tienes que añadir tres
imágenes antes del primer build:

| Archivo               | Tamaño recomendado | Para                                      |
| --------------------- | ------------------ | ----------------------------------------- |
| `icon.png`            | 1024×1024          | Icono iOS / store                         |
| `adaptive-icon.png`   | 1024×1024 (relleno con margen) | Icono adaptativo Android       |
| `splash.png`          | 1242×2436          | Pantalla de carga                         |

Sugerencia rápida (mientras no tienes diseño):

```bash
# desde la raíz del repo, generar PNGs sólidos azules
npx @expo/configure-splash-screen --image='#050811'
```

O simplemente coloca cualquier PNG de las dimensiones indicadas. El fondo
debe ser `#050811` para que case con el tema de la app.

## Si no quieres añadir nada todavía

Edita `app.json` y comenta `splash`, `icon` y `android.adaptiveIcon`:
Expo usará un splash blanco por defecto. La app seguirá compilando.
