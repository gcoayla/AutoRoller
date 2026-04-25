#include "ble_provisioning.h"

#include <ArduinoJson.h>
#include <NimBLEDevice.h>
#include <WiFi.h>

#include "config.h"
#include "motor_controller.h"
#include "wifi_manager.h"

namespace bleprov {

static storage::Settings*  s_settings    = nullptr;
static NimBLEServer*       s_server      = nullptr;
static NimBLECharacteristic* s_chrReq    = nullptr;
static NimBLECharacteristic* s_chrResp   = nullptr;
static NimBLECharacteristic* s_chrStat   = nullptr;
static bool                s_initialized = false;
static bool                s_connected   = false;
static uint32_t            s_startedMs   = 0;
static uint32_t            s_lastStatusMs = 0;
static int32_t             s_lastStatusPos = INT32_MIN;

// MTU efectivo después de negociación (ATT MTU - 3 bytes de cabecera).
static uint16_t            s_payloadMTU  = 20;

// ---------------------------------------------------------------------------
// Reenvío de respuestas en chunks por la característica RESPONSE.
// El cliente reensambla por bytes hasta encontrar un '\n' final.
// ---------------------------------------------------------------------------
static void writeResponse(const String& json) {
    if (!s_chrResp) return;
    String body = json;
    body += '\n';  // marcador de fin
    const char* data = body.c_str();
    size_t      len  = body.length();
    size_t      off  = 0;
    while (off < len) {
        size_t n = std::min<size_t>(s_payloadMTU, len - off);
        s_chrResp->setValue((uint8_t*)data + off, n);
        s_chrResp->notify();
        off += n;
        delay(8);  // evita saturar la cola interna de NimBLE
    }
}

// ---------------------------------------------------------------------------
// Status JSON corto (el grande va por WS o REST). Se llama tanto en lectura
// como en notificación periódica.
// ---------------------------------------------------------------------------
static const char* stateName(motor::State s) {
    switch (s) {
        case motor::State::IDLE:        return "idle";
        case motor::State::MOVING_UP:   return "moving_up";
        case motor::State::MOVING_DOWN: return "moving_down";
        case motor::State::HOMING:      return "homing";
        case motor::State::CALIBRATING: return "calibrating";
        case motor::State::FAULT:       return "fault";
    }
    return "unknown";
}

static String statusJson() {
    JsonDocument doc;
    doc["device"]      = s_settings->hostname;
    doc["fw"]          = AUTOROLLER_FIRMWARE_VERSION;
    doc["state"]       = stateName(motor::state());
    doc["percent"]     = motor::positionPercent();
    doc["calibrated"]  = motor::isCalibrated();
    doc["wifi_ssid"]   = WiFi.SSID();
    doc["wifi_ip"]     = WiFi.localIP().toString();
    doc["wifi_rssi"]   = WiFi.RSSI();
    String out; serializeJson(doc, out);
    return out;
}

// ---------------------------------------------------------------------------
// Servidor: callbacks
// ---------------------------------------------------------------------------
class ServerCB : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer*, ble_gap_conn_desc* desc) override {
        s_connected = true;
        s_payloadMTU = NimBLEDevice::getMTU() - 3;
        if (s_payloadMTU < 20) s_payloadMTU = 20;
        Serial.printf("[BLE] cliente conectado, MTU efectivo=%u\n", s_payloadMTU);
    }
    void onDisconnect(NimBLEServer* srv) override {
        s_connected = false;
        Serial.println("[BLE] cliente desconectado");
        srv->startAdvertising();
    }
    void onMTUChange(uint16_t mtu, ble_gap_conn_desc*) override {
        s_payloadMTU = mtu - 3;
        if (s_payloadMTU < 20) s_payloadMTU = 20;
    }
};

// ---------------------------------------------------------------------------
// Operaciones JSON
// ---------------------------------------------------------------------------
static void opInfo(JsonDocument& resp) {
    resp["op"]         = "info";
    resp["device"]     = s_settings->hostname;
    resp["fw"]         = AUTOROLLER_FIRMWARE_VERSION;
    resp["mac"]        = WiFi.macAddress();
    resp["wifi_ip"]    = WiFi.localIP().toString();
    resp["wifi_ssid"]  = WiFi.SSID();
    resp["wifi_rssi"]  = WiFi.RSSI();
    resp["calibrated"] = motor::isCalibrated();
    resp["percent"]    = motor::positionPercent();
}

static void opScanWifi(JsonDocument& resp) {
    int n = WiFi.scanNetworks(false /*async*/, true /*hidden*/);
    if (n < 0) n = 0;
    resp["op"] = "scan_wifi";
    JsonArray arr = resp["networks"].to<JsonArray>();
    int max = n > 16 ? 16 : n;
    for (int i = 0; i < max; ++i) {
        JsonObject net = arr.add<JsonObject>();
        net["ssid"]     = WiFi.SSID(i);
        net["rssi"]     = WiFi.RSSI(i);
        net["channel"]  = WiFi.channel(i);
        net["open"]     = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN);
    }
    WiFi.scanDelete();
}

static void opSetWifi(JsonDocument& req, JsonDocument& resp) {
    String ssid = req["ssid"] | "";
    String pass = req["password"] | "";
    if (ssid.length() == 0) {
        resp["ok"] = false;
        resp["error"] = "ssid requerido";
        return;
    }
    s_settings->wifi_ssid     = ssid;
    s_settings->wifi_password = pass;
    storage::save(*s_settings);
    resp["op"] = "set_wifi";
    resp["ok"] = true;
    resp["msg"] = "Credenciales guardadas, intentando conectar";

    // Pedimos a wifi_manager que intente conectar inmediatamente.
    netcfg::reconfigureFromSettings(*s_settings);
}

static void opSetMqtt(JsonDocument& req, JsonDocument& resp) {
    if (req["enabled"].is<bool>())  s_settings->mqtt_enabled    = req["enabled"].as<bool>();
    if (req["host"].is<const char*>()) s_settings->mqtt_host    = req["host"].as<String>();
    if (req["port"].is<int>())      s_settings->mqtt_port       = req["port"].as<int>();
    if (req["user"].is<const char*>()) s_settings->mqtt_user    = req["user"].as<String>();
    if (req["password"].is<const char*>()) s_settings->mqtt_password = req["password"].as<String>();
    if (req["base_topic"].is<const char*>()) s_settings->mqtt_base_topic = req["base_topic"].as<String>();
    storage::save(*s_settings);
    resp["op"] = "set_mqtt";
    resp["ok"] = true;
    resp["msg"] = "Reinicia para que el cambio tenga efecto";
}

static void opSetHostname(JsonDocument& req, JsonDocument& resp) {
    String h = req["hostname"] | "";
    if (h.length() == 0 || h.length() > 32) {
        resp["ok"] = false; resp["error"] = "hostname inválido"; return;
    }
    s_settings->hostname = h;
    storage::save(*s_settings);
    resp["op"] = "set_hostname"; resp["ok"] = true;
}

static void opSetMotor(JsonDocument& req, JsonDocument& resp) {
    if (req["invert_direction"].is<bool>())  s_settings->invert_direction = req["invert_direction"].as<bool>();
    if (req["max_speed_hz"].is<int>())       s_settings->max_speed_hz     = req["max_speed_hz"].as<int>();
    if (req["accel_hz_per_s"].is<int>())     s_settings->accel_hz_per_s   = req["accel_hz_per_s"].as<int>();
    if (req["use_endstops"].is<bool>())      s_settings->use_endstops     = req["use_endstops"].as<bool>();
    storage::save(*s_settings);
    resp["op"] = "set_motor"; resp["ok"] = true;
}

static void opSetTime(JsonDocument& req, JsonDocument& resp) {
    if (req["enabled"].is<bool>())             s_settings->ntp_enabled = req["enabled"].as<bool>();
    if (req["server"].is<const char*>())       s_settings->ntp_server  = req["server"].as<String>();
    if (req["timezone"].is<const char*>())     s_settings->timezone    = req["timezone"].as<String>();
    storage::save(*s_settings);
    resp["op"] = "set_time"; resp["ok"] = true;
}

static void opGetConfig(JsonDocument& resp) {
    resp["op"]              = "get_config";
    resp["hostname"]        = s_settings->hostname;
    resp["wifi_ssid"]       = s_settings->wifi_ssid;
    resp["mqtt_enabled"]    = s_settings->mqtt_enabled;
    resp["mqtt_host"]       = s_settings->mqtt_host;
    resp["mqtt_port"]       = s_settings->mqtt_port;
    resp["mqtt_base_topic"] = s_settings->mqtt_base_topic;
    resp["invert_direction"]= s_settings->invert_direction;
    resp["max_speed_hz"]    = s_settings->max_speed_hz;
    resp["accel_hz_per_s"]  = s_settings->accel_hz_per_s;
    resp["use_endstops"]    = s_settings->use_endstops;
    resp["ntp_enabled"]     = s_settings->ntp_enabled;
    resp["ntp_server"]      = s_settings->ntp_server;
    resp["timezone"]        = s_settings->timezone;
    resp["ble_policy"]      = s_settings->ble_policy;
}

static void opGetSchedules(JsonDocument& resp) {
    resp["op"] = "get_schedules";
    JsonArray arr = resp["schedules"].to<JsonArray>();
    for (size_t i = 0; i < SCHEDULER_MAX_ENTRIES; ++i) {
        JsonObject e = arr.add<JsonObject>();
        e["i"]           = (int)i;
        e["enabled"]     = s_settings->schedules[i].enabled;
        e["hour"]        = s_settings->schedules[i].hour;
        e["minute"]      = s_settings->schedules[i].minute;
        e["days_mask"]   = s_settings->schedules[i].days_mask;
        e["target_pct"]  = s_settings->schedules[i].target_pct;
    }
}

static void opSetSchedule(JsonDocument& req, JsonDocument& resp) {
    int i = req["i"] | -1;
    if (i < 0 || i >= (int)SCHEDULER_MAX_ENTRIES) {
        resp["ok"] = false; resp["error"] = "índice fuera de rango"; return;
    }
    auto& e = s_settings->schedules[i];
    e.enabled    = req["enabled"]    | e.enabled;
    e.hour       = req["hour"]       | e.hour;
    e.minute     = req["minute"]     | e.minute;
    e.days_mask  = req["days_mask"]  | e.days_mask;
    e.target_pct = req["target_pct"] | e.target_pct;
    storage::saveSchedules(*s_settings);
    resp["op"] = "set_schedule"; resp["ok"] = true;
}

static void opDelSchedule(JsonDocument& req, JsonDocument& resp) {
    int i = req["i"] | -1;
    if (i < 0 || i >= (int)SCHEDULER_MAX_ENTRIES) {
        resp["ok"] = false; resp["error"] = "índice fuera de rango"; return;
    }
    s_settings->schedules[i] = storage::ScheduleEntry{};
    storage::saveSchedules(*s_settings);
    resp["op"] = "del_schedule"; resp["ok"] = true;
}

static void opControl(JsonDocument& req, JsonDocument& resp) {
    String action = req["action"] | "";
    if      (action == "open")  motor::moveToPercent(0);
    else if (action == "close") motor::moveToPercent(100);
    else if (action == "stop")  motor::stop();
    else if (action == "set") {
        int v = req["value"] | 0;
        if (v < 0) v = 0; if (v > 100) v = 100;
        motor::moveToPercent((uint8_t)v);
    } else {
        resp["ok"] = false; resp["error"] = "acción desconocida"; return;
    }
    resp["op"] = "control"; resp["ok"] = true;
}

static void opCalibrate(JsonDocument& resp) {
    motor::calibrate();
    resp["op"] = "calibrate"; resp["ok"] = true;
}

static void opReboot(JsonDocument& resp) {
    resp["op"] = "reboot"; resp["ok"] = true; resp["rebooting"] = true;
    // dejamos un margen para que la respuesta salga
    // antes de reiniciar
}

static void opFactoryReset(JsonDocument& resp) {
    storage::factoryReset();
    resp["op"] = "factory_reset"; resp["ok"] = true; resp["rebooting"] = true;
}

static void opBleOff(JsonDocument& resp) {
    resp["op"] = "ble_off"; resp["ok"] = true;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------
class RequestCB : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* c) override {
        std::string val = c->getValue();
        JsonDocument req;
        DeserializationError e = deserializeJson(req, val);
        JsonDocument resp;
        if (e) {
            resp["ok"] = false; resp["error"] = "json inválido";
        } else {
            String op = req["op"] | "";
            bool   doReboot = false;
            bool   doBleOff = false;
            resp["ok"] = true;
            if      (op == "info")          opInfo(resp);
            else if (op == "scan_wifi")     opScanWifi(resp);
            else if (op == "set_wifi")      opSetWifi(req, resp);
            else if (op == "set_mqtt")      opSetMqtt(req, resp);
            else if (op == "set_hostname")  opSetHostname(req, resp);
            else if (op == "set_motor")     opSetMotor(req, resp);
            else if (op == "set_time")      opSetTime(req, resp);
            else if (op == "get_config")    opGetConfig(resp);
            else if (op == "get_schedules") opGetSchedules(resp);
            else if (op == "set_schedule")  opSetSchedule(req, resp);
            else if (op == "del_schedule")  opDelSchedule(req, resp);
            else if (op == "control")       opControl(req, resp);
            else if (op == "calibrate")     opCalibrate(resp);
            else if (op == "reboot")        { opReboot(resp); doReboot = true; }
            else if (op == "factory_reset") { opFactoryReset(resp); doReboot = true; }
            else if (op == "ble_off")       { opBleOff(resp); doBleOff = true; }
            else {
                resp["ok"] = false; resp["error"] = "op desconocida";
            }

            String out; serializeJson(resp, out);
            writeResponse(out);

            if (doReboot) { delay(400); ESP.restart(); }
            if (doBleOff) { delay(200); bleprov::stop(); }
            return;
        }
        String out; serializeJson(resp, out);
        writeResponse(out);
    }
};

class StatusReadCB : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* c) override {
        String j = statusJson();
        c->setValue((uint8_t*)j.c_str(), j.length());
    }
};

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
void begin(storage::Settings& settings) {
    s_settings = &settings;
    if (!settings.ble_enabled || settings.ble_policy == 3) {
        Serial.println("[BLE] deshabilitado por configuración");
        return;
    }
    start();
}

void start() {
    if (s_initialized) return;

    String name = String(BLE_NAME_PREFIX) + "-" +
                  String((uint16_t)(ESP.getEfuseMac() & 0xFFFF), HEX);
    NimBLEDevice::init(name.c_str());
    NimBLEDevice::setPower(ESP_PWR_LVL_P7);
    NimBLEDevice::setMTU(517);

    if (s_settings->ble_passkey > 0) {
        NimBLEDevice::setSecurityAuth(true, true, true);
        NimBLEDevice::setSecurityPasskey(s_settings->ble_passkey);
        NimBLEDevice::setSecurityIOCap(BLE_HS_IO_DISPLAY_ONLY);
    } else {
        NimBLEDevice::setSecurityAuth(false, false, true);
    }

    s_server = NimBLEDevice::createServer();
    s_server->setCallbacks(new ServerCB());

    NimBLEService* svc = s_server->createService(BLE_SVC_UUID);

    s_chrReq  = svc->createCharacteristic(
        BLE_CHR_REQUEST_UUID,
        NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
    s_chrReq->setCallbacks(new RequestCB());

    s_chrResp = svc->createCharacteristic(
        BLE_CHR_RESPONSE_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);

    s_chrStat = svc->createCharacteristic(
        BLE_CHR_STATUS_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    s_chrStat->setCallbacks(new StatusReadCB());
    {
        String j = statusJson();
        s_chrStat->setValue((uint8_t*)j.c_str(), j.length());
    }

    svc->start();

    NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
    adv->addServiceUUID(BLE_SVC_UUID);
    adv->setName(name.c_str());
    adv->setScanResponse(true);
    adv->setMinPreferred(0x06);
    adv->setMaxPreferred(0x12);
    adv->start();

    s_initialized = true;
    s_startedMs   = millis();
    Serial.printf("[BLE] anunciando como \"%s\"\n", name.c_str());
}

void stop() {
    if (!s_initialized) return;
    Serial.println("[BLE] apagando radio");
    NimBLEDevice::deinit(true);
    s_initialized = false;
    s_connected   = false;
    s_server      = nullptr;
    s_chrReq      = s_chrResp = s_chrStat = nullptr;
}

bool isInitialized() { return s_initialized; }
bool isAdvertising() {
    return s_initialized && NimBLEDevice::getAdvertising()->isAdvertising();
}
bool isConnected()   { return s_connected; }

void notifyStatusChange() {
    if (!s_initialized || !s_chrStat) return;
    String j = statusJson();
    s_chrStat->setValue((uint8_t*)j.c_str(), j.length());
    if (s_connected) s_chrStat->notify();
}

void loop() {
    if (!s_settings) return;

    // Política de apagado
    if (s_initialized && !s_connected) {
        switch (s_settings->ble_policy) {
            case 1: { // until_wifi
                if (WiFi.status() == WL_CONNECTED) {
                    Serial.println("[BLE] WiFi conectado, apagando BLE");
                    stop();
                }
                break;
            }
            case 2: { // 5min
                if (millis() - s_startedMs > BLE_TIMED_OFF_MS) {
                    Serial.println("[BLE] timeout 5 min, apagando BLE");
                    stop();
                }
                break;
            }
            default: break;
        }
    }

    // Push de status periódico (cada 1 s) si hay cambios
    if (s_initialized && s_connected && (millis() - s_lastStatusMs > 1000)) {
        s_lastStatusMs = millis();
        int32_t pos = motor::position();
        if (pos != s_lastStatusPos) {
            s_lastStatusPos = pos;
            notifyStatusChange();
        }
    }
}

}  // namespace bleprov
