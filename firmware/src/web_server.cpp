#include "web_server.h"

#include <algorithm>

#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <AsyncJson.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <Update.h>
#include <WiFi.h>

#include "ble_provisioning.h"
#include "config.h"
#include "motor_controller.h"
#include "settings_lock.h"
#include "time_sync.h"
#include "wifi_manager.h"

namespace web {

static AsyncWebServer     server(AUTOROLLER_HTTP_PORT);
static AsyncWebSocket     ws("/ws");
static storage::Settings* s_settings = nullptr;
static uint32_t           s_lastPushMs = 0;
static int32_t            s_lastPushPos = INT32_MIN;

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

static String stateJson() {
    JsonDocument doc;
    doc["device"]      = s_settings->hostname;
    doc["fw"]          = AUTOROLLER_FIRMWARE_VERSION;
    doc["state"]       = stateName(motor::state());
    doc["position"]    = motor::position();
    doc["max"]         = motor::maxPosition();
    doc["percent"]     = motor::positionPercent();
    doc["calibrated"]  = motor::isCalibrated();
    doc["wifi_ssid"]   = netcfg::currentSSID();
    doc["wifi_ip"]     = netcfg::currentIP();
    doc["wifi_rssi"]   = WiFi.RSSI();
    doc["mqtt_on"]     = s_settings->mqtt_enabled;
    doc["ble_on"]      = bleprov::isInitialized();
    doc["ble_conn"]    = bleprov::isConnected();
    doc["time"]        = timesync::isSynced() ? timesync::currentLocalDateTime() : String("");
    doc["uptime_s"]    = (uint32_t)(millis() / 1000);
    String out;
    serializeJson(doc, out);
    return out;
}

void pushState() {
    if (ws.count() == 0) return;
    ws.textAll(stateJson());
}

static void onWsEvent(AsyncWebSocket* /*server*/, AsyncWebSocketClient* client,
                      AwsEventType type, void* /*arg*/, uint8_t* /*data*/,
                      size_t /*len*/) {
    if (type == WS_EVT_CONNECT) {
        client->text(stateJson());
    }
}

// ---- handlers REST ---------------------------------------------------------

static void handleStatus(AsyncWebServerRequest* req) {
    req->send(200, "application/json", stateJson());
}

static void handleOpen(AsyncWebServerRequest* req) {
    AUTH_GUARD(req);
    motor::moveToPercent(0);
    req->send(200, "application/json", "{\"ok\":true}");
}

static void handleClose(AsyncWebServerRequest* req) {
    AUTH_GUARD(req);
    motor::moveToPercent(100);
    req->send(200, "application/json", "{\"ok\":true}");
}

static void handleStop(AsyncWebServerRequest* req) {
    AUTH_GUARD(req);
    motor::stop();
    req->send(200, "application/json", "{\"ok\":true}");
}

static void handleSetPercent(AsyncWebServerRequest* req) {
    AUTH_GUARD(req);
    if (!req->hasParam("value")) {
        req->send(400, "application/json", "{\"error\":\"missing value\"}");
        return;
    }
    int v = req->getParam("value")->value().toInt();
    if (v < 0) v = 0;
    if (v > 100) v = 100;
    motor::moveToPercent((uint8_t)v);
    req->send(200, "application/json", "{\"ok\":true}");
}

static void handleCalibrate(AsyncWebServerRequest* req) {
    AUTH_GUARD(req);
    motor::calibrate();
    req->send(200, "application/json", "{\"ok\":true,\"calibrating\":true}");
}

static void handleSetHere(AsyncWebServerRequest* req) {
    AUTH_GUARD(req);
    int32_t v = 0;
    if (req->hasParam("value")) v = req->getParam("value")->value().toInt();
    motor::setHere(v);
    req->send(200, "application/json", "{\"ok\":true}");
}

static void handleConfigGet(AsyncWebServerRequest* req) {
    JsonDocument doc;
    doc["hostname"]         = s_settings->hostname;
    doc["wifi_ssid"]        = s_settings->wifi_ssid;
    doc["mqtt_enabled"]     = s_settings->mqtt_enabled;
    doc["mqtt_host"]        = s_settings->mqtt_host;
    doc["mqtt_port"]        = s_settings->mqtt_port;
    doc["mqtt_user"]        = s_settings->mqtt_user;
    doc["mqtt_base_topic"]  = s_settings->mqtt_base_topic;
    doc["invert_direction"] = s_settings->invert_direction;
    doc["max_speed_hz"]     = s_settings->max_speed_hz;
    doc["accel_hz_per_s"]   = s_settings->accel_hz_per_s;
    doc["use_endstops"]     = s_settings->use_endstops;
    doc["ble_enabled"]      = s_settings->ble_enabled;
    doc["ble_policy"]       = s_settings->ble_policy;
    doc["ble_passkey"]      = s_settings->ble_passkey;
    doc["ntp_enabled"]      = s_settings->ntp_enabled;
    doc["ntp_server"]       = s_settings->ntp_server;
    doc["timezone"]         = s_settings->timezone;
    String out; serializeJson(doc, out);
    req->send(200, "application/json", out);
}

static void handleScheduleGet(AsyncWebServerRequest* req) {
    JsonDocument doc;
    JsonArray arr = doc["schedules"].to<JsonArray>();
    for (size_t i = 0; i < SCHEDULER_MAX_ENTRIES; ++i) {
        JsonObject e = arr.add<JsonObject>();
        e["i"]          = (int)i;
        e["enabled"]    = s_settings->schedules[i].enabled;
        e["hour"]       = s_settings->schedules[i].hour;
        e["minute"]     = s_settings->schedules[i].minute;
        e["days_mask"]  = s_settings->schedules[i].days_mask;
        e["target_pct"] = s_settings->schedules[i].target_pct;
    }
    doc["time"] = timesync::isSynced() ? timesync::currentLocalDateTime() : String("");
    String out; serializeJson(doc, out);
    req->send(200, "application/json", out);
}

static void handleSchedulePost(AsyncWebServerRequest* req, JsonVariant& body) {
    AUTH_GUARD(req);
    SettingsLock l;
    auto obj = body.as<JsonObject>();
    int i = obj["i"] | -1;
    if (i < 0 || i >= (int)SCHEDULER_MAX_ENTRIES) {
        req->send(400, "application/json", "{\"error\":\"índice fuera de rango\"}");
        return;
    }
    auto& e = s_settings->schedules[i];
    if (obj["enabled"].is<bool>())   e.enabled    = obj["enabled"].as<bool>();
    if (obj["hour"].is<int>())       e.hour       = obj["hour"].as<int>();
    if (obj["minute"].is<int>())     e.minute     = obj["minute"].as<int>();
    if (obj["days_mask"].is<int>())  e.days_mask  = obj["days_mask"].as<int>();
    if (obj["target_pct"].is<int>()) e.target_pct = obj["target_pct"].as<int>();
    storage::saveSchedules(*s_settings);
    req->send(200, "application/json", "{\"ok\":true}");
}

static void handleScheduleDelete(AsyncWebServerRequest* req) {
    AUTH_GUARD(req);
    if (!req->hasParam("i")) {
        req->send(400, "application/json", "{\"error\":\"falta i\"}"); return;
    }
    int i = req->getParam("i")->value().toInt();
    if (i < 0 || i >= (int)SCHEDULER_MAX_ENTRIES) {
        req->send(400, "application/json", "{\"error\":\"índice fuera de rango\"}"); return;
    }
    {
        SettingsLock l;
        s_settings->schedules[i] = storage::ScheduleEntry{};
        storage::saveSchedules(*s_settings);
    }
    req->send(200, "application/json", "{\"ok\":true}");
}

static void handleBlePost(AsyncWebServerRequest* req, JsonVariant& body) {
    AUTH_GUARD(req);
    auto obj = body.as<JsonObject>();
    String action = obj["action"] | "";
    if (action == "on")           bleprov::start();
    else if (action == "off")     bleprov::stop();
    else { req->send(400, "application/json", "{\"error\":\"action: on|off\"}"); return; }
    req->send(200, "application/json", "{\"ok\":true}");
}

// Escaneo no bloqueante: si hay un escaneo en curso, devolvemos 202 y el
// cliente reintenta. Si ya tenemos resultados, los servimos.
static void handleScan(AsyncWebServerRequest* req) {
    int n = WiFi.scanComplete();
    if (n == WIFI_SCAN_RUNNING) {
        req->send(202, "application/json", "{\"running\":true}");
        return;
    }
    if (n == WIFI_SCAN_FAILED || n < 0) {
        // Lanzamos uno asíncrono y avisamos al cliente.
        WiFi.scanNetworks(/*async*/ true, /*hidden*/ true);
        req->send(202, "application/json", "{\"running\":true}");
        return;
    }

    JsonDocument doc;
    JsonArray arr = doc["networks"].to<JsonArray>();
    int max = n > 16 ? 16 : n;
    for (int i = 0; i < max; ++i) {
        JsonObject net = arr.add<JsonObject>();
        net["ssid"]    = WiFi.SSID(i);
        net["rssi"]    = WiFi.RSSI(i);
        net["channel"] = WiFi.channel(i);
        net["open"]    = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN);
    }
    WiFi.scanDelete();
    String out; serializeJson(doc, out);
    req->send(200, "application/json", out);
}

static void handleConfigPost(AsyncWebServerRequest* req, JsonVariant& body) {
    AUTH_GUARD(req);
    SettingsLock l;
    auto obj = body.as<JsonObject>();
    if (obj["hostname"].is<const char*>())          s_settings->hostname        = obj["hostname"].as<String>();
    if (obj["wifi_ssid"].is<const char*>())         s_settings->wifi_ssid       = obj["wifi_ssid"].as<String>();
    if (obj["wifi_password"].is<const char*>())     s_settings->wifi_password   = obj["wifi_password"].as<String>();
    if (obj["mqtt_enabled"].is<bool>())             s_settings->mqtt_enabled    = obj["mqtt_enabled"].as<bool>();
    if (obj["mqtt_host"].is<const char*>())         s_settings->mqtt_host       = obj["mqtt_host"].as<String>();
    if (obj["mqtt_port"].is<int>())                 s_settings->mqtt_port       = obj["mqtt_port"].as<int>();
    if (obj["mqtt_user"].is<const char*>())         s_settings->mqtt_user       = obj["mqtt_user"].as<String>();
    if (obj["mqtt_password"].is<const char*>())     s_settings->mqtt_password   = obj["mqtt_password"].as<String>();
    if (obj["mqtt_base_topic"].is<const char*>())   s_settings->mqtt_base_topic = obj["mqtt_base_topic"].as<String>();
    if (obj["invert_direction"].is<bool>())         s_settings->invert_direction = obj["invert_direction"].as<bool>();
    if (obj["max_speed_hz"].is<int>())              s_settings->max_speed_hz    = std::min(50000, std::max(100, obj["max_speed_hz"].as<int>()));
    if (obj["accel_hz_per_s"].is<int>())            s_settings->accel_hz_per_s  = std::min(100000, std::max(100, obj["accel_hz_per_s"].as<int>()));
    if (obj["use_endstops"].is<bool>())             s_settings->use_endstops    = obj["use_endstops"].as<bool>();
    if (obj["ble_enabled"].is<bool>())              s_settings->ble_enabled     = obj["ble_enabled"].as<bool>();
    if (obj["ble_policy"].is<int>())                s_settings->ble_policy      = obj["ble_policy"].as<int>();
    if (obj["ble_passkey"].is<int>())               s_settings->ble_passkey     = obj["ble_passkey"].as<unsigned int>();
    if (obj["ntp_enabled"].is<bool>())              s_settings->ntp_enabled     = obj["ntp_enabled"].as<bool>();
    if (obj["ntp_server"].is<const char*>())        s_settings->ntp_server      = obj["ntp_server"].as<String>();
    if (obj["timezone"].is<const char*>())          s_settings->timezone        = obj["timezone"].as<String>();
    if (obj["api_token"].is<const char*>())         s_settings->api_token       = obj["api_token"].as<String>();
    storage::save(*s_settings);
    req->send(200, "application/json", "{\"ok\":true}");
}

// ----------------------------------------------------------------------------
//  Auth simple por token. Si `api_token` está vacío, todo abierto (compat).
//  Si está fijado, exigimos uno de:
//     - Header  Authorization: Bearer <token>
//     - Header  X-AutoRoller-Token: <token>
//     - Query   ?token=<token>            (último recurso para clientes simples)
//  Sólo protegemos endpoints que cambian estado; /api/status y la UI estática
//  siguen libres (no exponen secretos y la UI necesita pedirte el token).
// ----------------------------------------------------------------------------
static bool requestHasToken(AsyncWebServerRequest* req) {
    const String& tok = s_settings->api_token;
    if (tok.length() == 0) return true;        // sin token configurado = libre
    if (req->hasHeader("Authorization")) {
        String h = req->header("Authorization");
        if (h.startsWith("Bearer ") && h.substring(7) == tok) return true;
    }
    if (req->hasHeader("X-AutoRoller-Token") &&
        req->header("X-AutoRoller-Token") == tok) {
        return true;
    }
    if (req->hasParam("token") && req->getParam("token")->value() == tok) {
        return true;
    }
    return false;
}

static bool authReject(AsyncWebServerRequest* req) {
    if (requestHasToken(req)) return false;
    auto* resp = req->beginResponse(401, "application/json", "{\"error\":\"unauthorized\"}");
    resp->addHeader("WWW-Authenticate", "Bearer realm=\"autoroller\"");
    req->send(resp);
    return true;
}

// Wrapper para los handlers que requieren auth.
#define AUTH_GUARD(req) do { if (authReject(req)) return; } while (0)

// Acción diferida: AsyncWebServer NO permite bloquear en handlers, así que
// disparamos una tarea de un solo uso que duerme y luego ejecuta la acción.
static void scheduleAfter(uint32_t ms, void (*fn)()) {
    struct Job { uint32_t ms; void (*fn)(); };
    Job* j = new Job{ ms, fn };
    xTaskCreate(
        [](void* arg) {
            auto* j = static_cast<Job*>(arg);
            vTaskDelay(pdMS_TO_TICKS(j->ms));
            j->fn();
            delete j;
            vTaskDelete(nullptr);
        },
        "deferred", 2048, j, 1, nullptr);
}

static void handleReboot(AsyncWebServerRequest* req) {
    AUTH_GUARD(req);
    req->send(200, "application/json", "{\"ok\":true,\"rebooting\":true}");
    scheduleAfter(200, []() { ESP.restart(); });
}

static void handleForgetWifi(AsyncWebServerRequest* req) {
    AUTH_GUARD(req);
    {
        SettingsLock l;
        s_settings->wifi_ssid = "";
        s_settings->wifi_password = "";
        storage::save(*s_settings);
    }
    req->send(200, "application/json", "{\"ok\":true,\"portal\":true}");
    scheduleAfter(200, []() { netcfg::forcePortal(); });
}

static void handleFactoryReset(AsyncWebServerRequest* req) {
    AUTH_GUARD(req);
    storage::factoryReset();
    req->send(200, "application/json", "{\"ok\":true,\"rebooting\":true}");
    scheduleAfter(200, []() { ESP.restart(); });
}

// ---- arranque --------------------------------------------------------------

void begin(storage::Settings& settings) {
    s_settings = &settings;

    if (!LittleFS.begin(true)) {
        Serial.println("[FS] LittleFS no se pudo montar");
    }

    ws.onEvent(onWsEvent);
    server.addHandler(&ws);

    // ---- API
    server.on("/api/status",         HTTP_GET, handleStatus);
    server.on("/api/open",           HTTP_POST, handleOpen);
    server.on("/api/close",          HTTP_POST, handleClose);
    server.on("/api/stop",           HTTP_POST, handleStop);
    server.on("/api/set",            HTTP_POST, handleSetPercent);
    server.on("/api/calibrate",      HTTP_POST, handleCalibrate);
    server.on("/api/set-here",       HTTP_POST, handleSetHere);
    server.on("/api/reboot",         HTTP_POST, handleReboot);
    server.on("/api/forget-wifi",    HTTP_POST, handleForgetWifi);
    server.on("/api/factory-reset",  HTTP_POST, handleFactoryReset);
    server.on("/api/config",         HTTP_GET,  handleConfigGet);
    server.on("/api/scan",           HTTP_GET,  handleScan);
    server.on("/api/schedules",      HTTP_GET,  handleScheduleGet);
    server.on("/api/schedules",      HTTP_DELETE, handleScheduleDelete);

    server.addHandler(new AsyncCallbackJsonWebHandler(
        "/api/config",
        [](AsyncWebServerRequest* req, JsonVariant& json) {
            handleConfigPost(req, json);
        }));
    server.addHandler(new AsyncCallbackJsonWebHandler(
        "/api/schedules",
        [](AsyncWebServerRequest* req, JsonVariant& json) {
            handleSchedulePost(req, json);
        }));
    server.addHandler(new AsyncCallbackJsonWebHandler(
        "/api/ble",
        [](AsyncWebServerRequest* req, JsonVariant& json) {
            handleBlePost(req, json);
        }));

    // ---- atajo legacy: /up /down /stop (también con auth)
    server.on("/up",   HTTP_GET, [](AsyncWebServerRequest* r) { if (authReject(r)) return; motor::moveToPercent(0);   r->send(200, "text/plain", "ok"); });
    server.on("/down", HTTP_GET, [](AsyncWebServerRequest* r) { if (authReject(r)) return; motor::moveToPercent(100); r->send(200, "text/plain", "ok"); });
    server.on("/stop", HTTP_GET, [](AsyncWebServerRequest* r) { if (authReject(r)) return; motor::stop();             r->send(200, "text/plain", "ok"); });

    // ---- OTA por HTTP (subida directa de .bin)
    server.on("/api/ota", HTTP_POST,
        [](AsyncWebServerRequest* req) {
            if (!requestHasToken(req)) {
                req->send(401, "application/json", "{\"error\":\"unauthorized\"}");
                return;
            }
            bool ok = !Update.hasError();
            req->send(ok ? 200 : 500, "application/json",
                      ok ? "{\"ok\":true,\"rebooting\":true}" : "{\"ok\":false}");
            if (ok) scheduleAfter(200, []() { ESP.restart(); });
        },
        [](AsyncWebServerRequest* req, String /*filename*/, size_t index,
           uint8_t* data, size_t len, bool final) {
            // Si no hay token válido, abortamos el Update sin escribir nada;
            // el handler de respuesta de arriba es el que envía el 401.
            if (!requestHasToken(req)) {
                if (index == 0) Update.abort();
                return;
            }
            if (index == 0) {
                Serial.println("[OTA] inicio de subida");
                if (!Update.begin(UPDATE_SIZE_UNKNOWN)) Update.printError(Serial);
            }
            if (Update.write(data, len) != len) Update.printError(Serial);
            if (final) {
                if (Update.end(true)) Serial.printf("[OTA] OK · %u bytes\n", index + len);
                else Update.printError(Serial);
            }
        });

    // ---- estáticos + portal cautivo
    server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

    // captive portal: cualquier ruta desconocida → /index.html
    server.onNotFound([](AsyncWebServerRequest* req) {
        if (netcfg::mode() == netcfg::Mode::PORTAL) {
            req->redirect("/");
        } else {
            req->send(404, "application/json", "{\"error\":\"not found\"}");
        }
    });

    server.begin();

    // OTA por ArduinoOTA (espressif), útil desde PlatformIO
    ArduinoOTA.setHostname(s_settings->hostname.c_str());
    ArduinoOTA.setPort(AUTOROLLER_OTA_PORT);
    ArduinoOTA.begin();

    Serial.printf("[HTTP] Servidor en :%d\n", AUTOROLLER_HTTP_PORT);
}

void loop() {
    ArduinoOTA.handle();

    // empuja estado por WS si hay cambios y como mucho cada 200 ms
    uint32_t now = millis();
    if (now - s_lastPushMs > 200) {
        int32_t pos = motor::position();
        if (pos != s_lastPushPos) {
            s_lastPushPos = pos;
            pushState();
        }
        s_lastPushMs = now;
    }
}

}  // namespace web
