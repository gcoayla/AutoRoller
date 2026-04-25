#include "web_server.h"

#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <AsyncJson.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <Update.h>

#include "config.h"
#include "motor_controller.h"
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
    doc["mqtt_on"]     = s_settings->mqtt_enabled;
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
    motor::moveToPercent(0);
    req->send(200, "application/json", "{\"ok\":true}");
}

static void handleClose(AsyncWebServerRequest* req) {
    motor::moveToPercent(100);
    req->send(200, "application/json", "{\"ok\":true}");
}

static void handleStop(AsyncWebServerRequest* req) {
    motor::stop();
    req->send(200, "application/json", "{\"ok\":true}");
}

static void handleSetPercent(AsyncWebServerRequest* req) {
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
    motor::calibrate();
    req->send(200, "application/json", "{\"ok\":true,\"calibrating\":true}");
}

static void handleSetHere(AsyncWebServerRequest* req) {
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
    String out; serializeJson(doc, out);
    req->send(200, "application/json", out);
}

static void handleConfigPost(AsyncWebServerRequest* req, JsonVariant& body) {
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
    if (obj["max_speed_hz"].is<int>())              s_settings->max_speed_hz    = obj["max_speed_hz"].as<int>();
    if (obj["accel_hz_per_s"].is<int>())            s_settings->accel_hz_per_s  = obj["accel_hz_per_s"].as<int>();
    if (obj["use_endstops"].is<bool>())             s_settings->use_endstops    = obj["use_endstops"].as<bool>();
    storage::save(*s_settings);
    req->send(200, "application/json", "{\"ok\":true}");
}

static void handleReboot(AsyncWebServerRequest* req) {
    req->send(200, "application/json", "{\"ok\":true,\"rebooting\":true}");
    delay(200);
    ESP.restart();
}

static void handleForgetWifi(AsyncWebServerRequest* req) {
    s_settings->wifi_ssid = "";
    s_settings->wifi_password = "";
    storage::save(*s_settings);
    req->send(200, "application/json", "{\"ok\":true,\"portal\":true}");
    delay(200);
    netcfg::forcePortal();
}

static void handleFactoryReset(AsyncWebServerRequest* req) {
    storage::factoryReset();
    req->send(200, "application/json", "{\"ok\":true,\"rebooting\":true}");
    delay(200);
    ESP.restart();
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

    auto* configPost = new AsyncCallbackJsonWebHandler(
        "/api/config",
        [](AsyncWebServerRequest* req, JsonVariant& json) {
            handleConfigPost(req, json);
        });
    server.addHandler(configPost);

    // ---- atajo legacy: /up /down /stop ?p=
    server.on("/up",   HTTP_GET, [](AsyncWebServerRequest* r) { motor::moveToPercent(0);   r->send(200, "text/plain", "ok"); });
    server.on("/down", HTTP_GET, [](AsyncWebServerRequest* r) { motor::moveToPercent(100); r->send(200, "text/plain", "ok"); });
    server.on("/stop", HTTP_GET, [](AsyncWebServerRequest* r) { motor::stop();             r->send(200, "text/plain", "ok"); });

    // ---- OTA por HTTP (subida directa de .bin)
    server.on("/api/ota", HTTP_POST,
        [](AsyncWebServerRequest* req) {
            bool ok = !Update.hasError();
            req->send(ok ? 200 : 500, "application/json",
                      ok ? "{\"ok\":true,\"rebooting\":true}" : "{\"ok\":false}");
            if (ok) { delay(200); ESP.restart(); }
        },
        [](AsyncWebServerRequest* /*req*/, String /*filename*/, size_t index,
           uint8_t* data, size_t len, bool final) {
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
