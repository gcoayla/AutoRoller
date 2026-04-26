# Solución de problemas

Síntomas más comunes y cómo resolverlos. Si tu problema no está aquí, abre un
issue en el repo con: log serie completo, foto del cableado y versión de
firmware (`/api/status`).

## La cadena patina en la rueda dentada

- **Holgura excesiva**: en `3d-models/bead_wheel.scad` baja `clearance` de
  0.25 a 0.15, reexporta y reimprime.
- **Cadena del tipo equivocado**: si tu cadena es de 6 mm pero la rueda fue
  exportada para 4.5 mm, las bolitas no encajan en los huecos. Mide la
  bolita con calibre y reexporta con la `bead_d` correcta.
- **Tapa mal cerrada**: la `chain_driver_cover.stl` mantiene la cadena
  pegada a la rueda. Si está suelta, la cadena se sale en cuanto hay
  tensión.

## La cadena se atasca / no avanza

- **`clearance` demasiado pequeño**: súbelo a 0.35 mm.
- **Garganta entre dientes (`groove_w`) demasiado estrecha**: súbela a
  1.8 mm para que el cordón pase entre bolitas.
- **Cadena enrollada al revés**: la cadena debe entrar por arriba y salir
  por abajo (o al revés), pero NO cruzar dentro de la rueda.

## La cortina sube/baja al revés

- En la pestaña Ajustes del nodo, activa "Invertir dirección".
- Equivalente: `POST /api/config {"invert_direction": true}`.

## La posición se desincroniza con el tiempo

Pasa cuando la cadena patina ocasionalmente (bolitas gastadas, rueda con
ajuste justo). Soluciones:

- **Recalibra desde la app** cada vez que notes el desfase: pestaña
  Avanzado → "Marcar 0 aquí" / "Marcar máx aquí" en los topes mecánicos.
- **Define límites de seguridad** (Ajustes → Límites de recorrido) para
  que las llamadas a `set 0` y `set 100` queden por dentro de los topes
  reales y no fuercen la rueda.
- **Reduce `max_speed_hz`** desde la app o `config.h`. A menos velocidad
  la rueda agarra mejor.

## El motor llega al tope y hace "click click"

Es el **comportamiento normal** cuando la cadena llega al final de su
recorrido y la rueda gira en vacío. Para que pare automáticamente al
detectarlo, dos opciones:

- **Conecta DIAG** del TMC2208 v3.0 a GPIO 34 (StallGuard). El firmware
  detecta el atasco y para el motor.
- **Calibra y usa límites**: si tienes calibrado y aplicas un margen
  conservador (5 % arriba, 95 % abajo), nunca llegas al tope físico.

## El módulo se cae del marco

- **Pega la VHB sobre superficie limpia**: alcohol isopropílico, sin
  polvo. Espera 1 hora antes de cargarlo.
- **Si el marco es texturizado** (gotelé, papel pintado), la VHB no se
  agarra: usa la variante atornillable `mounting_bracket_screw.stl`.
- **Peso excesivo**: si has imprimido la carcasa con relleno alto y un
  motor más grande, considera tornillos.

## El nodo no aparece en mi WiFi

1. ¿Está alimentado? El LED de estado debe estar encendido.
2. Acércate al móvil y busca la red `AutoRoller-XXXX`. Si aparece, no había
   credenciales guardadas → entra al portal.
3. Si la red doméstica es **5 GHz only**, el ESP32 no la verá. Activa una SSID
   2.4 GHz en tu router.
4. Si el ESP32 no arranca y reinicia en bucle (`Brownout detector triggered`):
   tu fuente USB no da corriente suficiente, prueba con la fuente definitiva
   de 12 V conectada por el buck.

## El motor vibra pero no gira

- **Driver mal cableado**: revisa que `STEP`, `DIR`, `EN` y los GND lógico y
  de potencia estén bien. Las dos GND deben unirse en un punto.
- **Vref demasiado bajo**: sube el potenciómetro del TMC2208 0.05 V y prueba.
- **Bobinas mal pareadas**: con un multímetro identifica las dos bobinas
  (continuidad). Cada par debe ir a `1A/1B` y `2A/2B`. Si las cruzas, el
  motor solo vibra.

## El motor gira al revés

- Activa "Invertir dirección" en la configuración (`/api/config`,
  `invert_direction: true`).
- Alternativa: intercambia físicamente uno de los dos hilos de **una** bobina
  (no los dos).

## La cortina sube cuando bajo y viceversa

Lo mismo: invierte la dirección desde la web.

## Endstops que no dejan moverse

- Es porque están en estado activo desde el arranque (cortina ya sobre el
  microswitch).
- Solución temporal: desactiva "Usar finales de carrera" desde la web, mueve
  la cortina fuera del switch, vuelve a activarlos.
- Asegúrate de la lógica: por defecto son **activos en bajo** (NC al GND).
  Si los compraste como NA cambia `ENDSTOP_ACTIVE_LOW` en `config.h`.

## El nodo se queda atascado en `calibrating`

- El motor no llega al endstop (cable suelto, switch defectuoso).
- Pulsa "Parar" en la UI o `POST /api/stop` y revisa el cableado.
- Si sospechas del firmware, conecta el monitor serie a 115200 baudios.

## Pierde la posición tras un corte de luz

- El firmware guarda la posición cada 2 s en NVS. En el peor caso pierdes los
  últimos 2 s de movimiento. La recalibración es opcional.
- Si nunca se calibró (no hay `max`), deberías hacerlo al menos una vez.

## MQTT no se conecta

1. Verifica con `mosquitto_pub` desde otro equipo que el broker responde.
2. Revisa user/password (algunos brokers son MUY sensibles a espacios).
3. Confirma que la red WiFi del ESP32 alcanza al broker (subred, firewalls).
4. Mira el log serie: muestra el código de error de PubSubClient
   (`-2` = no llega al servidor, `5` = credenciales).

## OTA falla a mitad

- El ESP32 se reiniciará en su versión anterior. Vuelve a intentar.
- Si el firewall corta el puerto 3232, usa la subida HTTP por `/api/ota`.

## Ruido excesivo del motor

- Asegúrate de usar **TMC2208**, no A4988 (muy ruidoso).
- En el TMC2208 verifica que el jumper de modo está en `STEP/DIR` y que MS1
  y MS2 están en `HIGH` (1/16 microstep).
- Sube `accel_hz_per_s` con cuidado: una aceleración demasiado baja produce
  un zumbido al arrancar.

## El portal cautivo no aparece

- En iOS suele aparecer solo. En Android a veces no: abre manualmente
  `http://192.168.4.1` en el navegador.
- Si tu móvil tiene "WiFi inteligente" o similar, lo desactivas
  temporalmente: a veces ignora redes sin Internet.

## Reset duro

- Long-press de los dos botones físicos: solo borra WiFi.
- `POST /api/factory-reset` o desde el panel: borra TODO.
- Como último recurso, conecta por serie y manda `prefs.clear()` desde el
  monitor (solo en builds de debug) — o reflashea con `pio run -t erase`.
