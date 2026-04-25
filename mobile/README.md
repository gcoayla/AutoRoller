# AutoRoller — App móvil

App nativa para Android (también funciona en iOS) construida con
**React Native + Expo + Expo Router + NativeWind v5 + Zustand**.

Permite **descubrir, configurar y controlar** todos los nodos AutoRoller de tu
casa desde el móvil:

- Descubrimiento por **Bluetooth Low Energy** + wizard de provisionamiento
  inicial (incluye conexión a tu WiFi).
- Alta manual por **mDNS / IP** si el nodo ya está en la red.
- **Multi-dispositivo**: añade tantos nodos como quieras, cada uno con color
  e icono propios, y márcalos como favoritos.
- **Control individual y de grupo** (subir todo / bajar todo / parar todo).
- Visualización **animada** de la cortina con slider de posición fluido.
- **Programador horario** (8 reglas semanales por nodo) editable in-app.
- Configuración completa: WiFi, MQTT, motor (invertir, velocidad,
  aceleración, endstops), NTP, política BLE, passkey, calibración, OTA,
  reset de fábrica.
- **Tema oscuro futurista** (glassmorphism, gradientes, halos, hápticos).

## Stack

| Capa             | Librería                                |
| ---------------- | --------------------------------------- |
| Navegación       | `expo-router` (file-based, Stack)       |
| Estilos          | `nativewind` v5 preview + Tailwind 3    |
| Estado           | `zustand` (con persist + AsyncStorage)  |
| BLE              | `react-native-ble-plx` (config plugin)  |
| HTTP             | `fetch` nativo                          |
| Animaciones      | `react-native-reanimated`, `expo-blur`, `expo-linear-gradient` |
| Iconos           | `@expo/vector-icons` (Ionicons)         |
| Slider           | `@react-native-community/slider`        |
| Háptica          | `expo-haptics`                          |

## Estructura

```
mobile/
├── app/                       ← rutas (expo-router)
│   ├── _layout.tsx            ← layout raíz, ToastHost
│   ├── index.tsx              ← Home: lista de dispositivos
│   ├── add.tsx                ← Añadir (BLE / WiFi)
│   ├── ble-setup.tsx          ← Wizard BLE de 5 pasos
│   ├── settings.tsx           ← Ajustes globales de la app
│   └── device/
│       └── [id].tsx           ← Control + tabs (Control · Programador · Ajustes · Avanzado)
├── src/
│   ├── components/            ← UI reutilizable
│   ├── hooks/
│   ├── lib/                   ← http, ble, types, colors
│   └── store/                 ← devices (persist), ui (toasts)
├── assets/                    ← icons / splash (placeholder)
├── app.json                   ← Expo config + permisos Android
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── global.css
└── package.json
```

## Cómo arrancar

```bash
cd mobile
npm install         # o pnpm/yarn
npx expo prebuild   # genera carpetas android/ y ios/ (necesario para BLE)
```

Luego, **dev client** (no Expo Go — `react-native-ble-plx` no funciona en Go):

```bash
# 1) Instalar el dev-client en tu Android (cable o WiFi)
npx expo run:android

# 2) Iniciar Metro
npm start
```

> **Importante**: `react-native-ble-plx` requiere un *dev client* (binary
> nativo). Una vez instalado en tu móvil, los cambios JS son hot-reload
> normales. Solo necesitas re-ejecutar `expo run:android` si cambias plugins
> nativos o permisos.

### Build de release (APK)

```bash
npm run build:android:preview   # APK firmado de pruebas (EAS)
npm run build:android:prod      # AAB para Play Store
```

Si no quieres usar EAS:

```bash
cd android
./gradlew assembleRelease
# APK en android/app/build/outputs/apk/release/
```

## Permisos Android

Declarados en `app.json`:

- `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` (Android 12+).
- `ACCESS_FINE_LOCATION` (Android < 12, requerido para escanear BLE).
- `INTERNET`, `ACCESS_WIFI_STATE`, `ACCESS_NETWORK_STATE`.

La app pide los permisos **en runtime** la primera vez que vas a escanear
BLE; si los rechazas, mostramos un toast.

## Diseño

- **Paleta**: deep navy (`#050811`), card `rgba(20,30,50,0.55)` con borde
  cyan tenue, primario `#4EA1FF`, acento `#B14EFF`, alertas `#FFB04E` /
  `#FF4E78`, ok `#4EFFB1`.
- **Cards** con borde + halo decorativo de fondo (blobs).
- **Acciones rápidas** con gradiente sutil; el botón flotante "+" es un
  gradiente cyan→magenta con elevación.
- **Estado** del nodo: píldora con punto pulsante (Reanimated) y color
  según estado (idle / moving / fault / sin conexión).
- **Visualización** de la cortina: ventana con marco + persiana animada;
  cae con `withSpring` siguiendo el porcentaje real.
- **Stepper** de provisionamiento con 5 pasos numerados y tick verde
  cuando completados.
- **Programador**: cada regla se renderiza como tarjeta con tipografía
  monoespaciada para la hora y "chips" L M X J V S D para los días.

## Multi-dispositivo

- La lista vive en Zustand (`useDevices`) y se persiste en `AsyncStorage`.
- Cada nodo tiene un **color** asignado de una paleta cíclica para
  distinguirlo visualmente (cambias `device.color` para personalizarlo).
- El estado en vivo de cada nodo se sondea por HTTP cada 2.5 s
  (`useDeviceStatus`) y se conserva en memoria (no persiste).
- En el Home tienes acciones de grupo: subir/bajar/parar disparan en
  paralelo con `Promise.allSettled`.

## ¿Y los nuevos modelos de Claude / IA local? ¿Y Web?

La app está pensada para Android (objetivo principal del usuario). En iOS y
web la mayoría de la app funciona, pero:

- iOS: Bluetooth requiere un build con perfil de provisión (no Expo Go).
  Funcional, sin limitaciones de la API.
- Web: el escaneo BLE no funciona desde React Native Web. Se podría usar
  Web Bluetooth desde el navegador, ya tienes `companion/index.html` en el
  repo para esa función.

## Próximos pasos

- [ ] Onboarding (primer arranque) explicando los permisos.
- [ ] Notificaciones push cuando un nodo cae.
- [ ] Widget Android con subir/bajar para un nodo concreto.
- [ ] Soporte iOS perfilado.
