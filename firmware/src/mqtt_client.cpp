#include "mqtt_client.h"

#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>

#include "config.h"
#include "motor_controller.h"

namespace mqtt {

static WiFiClient        s_wifi;
static PubSubClient      s_client(s_wifi);
static storage::Settings* s_settings = nullptr;
static uint32_t          s_lastTryMs = 0;
static String            s_topicCmdPrefix;
static String            s_topicState;
static String            s_topicAvailability;

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

static void onMessage(char* topic, byte* payload, unsigned int len) {
    String t(topic);
    String p; p.reserve(len);
    for (unsigned int i = 0; i < len; ++i) p += (char)payload[i];

    if (!t.startsWith(s_topicCmdPrefix)) return;
    String cmd = t.substring(s_topicCmdPrefix.length());

    if (cmd == "set") {
        int v = p.toInt();
        if (v < 0) v = 0; if (v > 100) v = 100;
        motor::moveToPercent((uint8_t)v);
    } else if (cmd == "open") {
        motor::moveToPercent(0);
    } else if (cmd == "close") {
        motor::moveToPercent(100);
    } else if (cmd == "stop") {
        motor::stop();
    } else if (cmd == "calibrate") {
        motor::calibrate();
    }
}

static String stateJson() {
    JsonDocument doc;
    doc["state"]      = stateName(motor::state());
    doc["position"]   = motor::position();
    doc["max"]        = motor::maxPosition();
    doc["percent"]    = motor::positionPercent();
    doc["calibrated"] = motor::isCalibrated();
    String out; serializeJson(doc, out);
    return out;
}

void publishState() {
    if (!s_client.connected()) return;
    s_client.publish(s_topicState.c_str(), stateJson().c_str(), true);
}

bool isEnabled()   { return s_settings && s_settings->mqtt_enabled; }
bool isConnected() { return s_client.connected(); }

static bool reconnect() {
    if (s_settings->mqtt_host.length() == 0) return false;

    String clientId = s_settings->hostname + "-" + String((uint32_t)esp_random(), HEX);
    bool ok;
    if (s_settings->mqtt_user.length()) {
        ok = s_client.connect(clientId.c_str(),
                              s_settings->mqtt_user.c_str(),
                              s_settings->mqtt_password.c_str(),
                              s_topicAvailability.c_str(), 0, true,
                              "offline");
    } else {
        ok = s_client.connect(clientId.c_str(),
                              nullptr, nullptr,
                              s_topicAvailability.c_str(), 0, true,
                              "offline");
    }
    if (ok) {
        Serial.println("[MQTT] conectado");
        s_client.subscribe((s_topicCmdPrefix + "+").c_str());
        s_client.publish(s_topicAvailability.c_str(), "online", true);
        publishState();
    } else {
        Serial.printf("[MQTT] error de conexión: %d\n", s_client.state());
    }
    return ok;
}

void begin(storage::Settings& settings) {
    s_settings = &settings;
    if (!settings.mqtt_enabled || settings.mqtt_host.length() == 0) {
        Serial.println("[MQTT] deshabilitado");
        return;
    }

    s_client.setServer(settings.mqtt_host.c_str(), settings.mqtt_port);
    s_client.setKeepAlive(MQTT_KEEPALIVE_S);
    s_client.setCallback(onMessage);
    s_client.setBufferSize(512);

    s_topicCmdPrefix    = settings.mqtt_base_topic + "/" + settings.hostname + "/cmd/";
    s_topicState        = settings.mqtt_base_topic + "/" + settings.hostname + "/state";
    s_topicAvailability = settings.mqtt_base_topic + "/" + settings.hostname + "/availability";

    Serial.printf("[MQTT] base=%s host=%s:%u\n",
                  settings.mqtt_base_topic.c_str(),
                  settings.mqtt_host.c_str(),
                  settings.mqtt_port);
}

void loop() {
    if (!isEnabled()) return;
    if (WiFi.status() != WL_CONNECTED) return;

    if (!s_client.connected()) {
        uint32_t now = millis();
        if (now - s_lastTryMs >= MQTT_RECONNECT_MS) {
            s_lastTryMs = now;
            reconnect();
        }
        return;
    }
    s_client.loop();
}

}  // namespace mqtt
