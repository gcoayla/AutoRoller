# Ejemplos de integración

| Archivo                       | Para qué                                                         |
| ----------------------------- | ---------------------------------------------------------------- |
| `home-assistant.yaml`         | Cover MQTT en Home Assistant + automatizaciones de amanecer/ocaso |
| `node-red-flow.json`          | Flujo Node-RED con dos inyectores (subir/bajar) por HTTP         |
| `voice-bridge.py`             | Esqueleto de puente STT → MQTT para tu futuro asistente de voz   |

> Importa el JSON de Node-RED desde el menú **Importar → Pegar JSON**.

> El archivo de Home Assistant suele convivir con otros: añade su contenido
> bajo el bloque `mqtt:` y `automation:` existentes en lugar de duplicar las
> claves raíz.
