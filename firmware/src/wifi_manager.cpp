#include "wifi_manager.h"

#include <DNSServer.h>
#include <ESPmDNS.h>
#include <WiFi.h>

#include "config.h"

namespace netcfg {

static Mode               s_mode = Mode::BOOT;
static storage::Settings* s_settings = nullptr;
static DNSServer          s_dns;
static uint32_t           s_lastTryMs = 0;
static bool               s_forcePortal = false;

static String s_hostname;

static void startPortal() {
    Serial.println("[WiFi] Arrancando portal cautivo...");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(s_hostname.c_str(),
                strlen(AUTOROLLER_AP_PASSWORD) ? AUTOROLLER_AP_PASSWORD : nullptr);
    delay(100);
    s_dns.start(53, "*", WiFi.softAPIP());
    s_mode = Mode::PORTAL;
    Serial.printf("[WiFi] AP=\"%s\" IP=%s\n",
                  s_hostname.c_str(), WiFi.softAPIP().toString().c_str());
}

static void connectSTA() {
    Serial.printf("[WiFi] Conectando a SSID=\"%s\"...\n",
                  s_settings->wifi_ssid.c_str());
    WiFi.mode(WIFI_STA);
    WiFi.setHostname(s_hostname.c_str());
    WiFi.begin(s_settings->wifi_ssid.c_str(),
               s_settings->wifi_password.c_str());
    s_mode = Mode::CONNECTING;
    s_lastTryMs = millis();
}

void begin(storage::Settings& settings) {
    s_settings = &settings;
    s_hostname = settings.hostname;

    if (settings.wifi_ssid.length() == 0) {
        startPortal();
        return;
    }
    connectSTA();
}

void forcePortal() {
    s_forcePortal = true;
}

void loop() {
    if (s_forcePortal) {
        s_forcePortal = false;
        WiFi.disconnect(true, true);
        delay(200);
        startPortal();
        return;
    }

    if (s_mode == Mode::PORTAL) {
        s_dns.processNextRequest();
        return;
    }

    if (s_mode == Mode::CONNECTING) {
        if (WiFi.status() == WL_CONNECTED) {
            s_mode = Mode::CONNECTED;
            Serial.printf("[WiFi] Conectado: %s · IP=%s\n",
                          WiFi.SSID().c_str(),
                          WiFi.localIP().toString().c_str());
            if (MDNS.begin(s_hostname.c_str())) {
                MDNS.addService("http", "tcp", AUTOROLLER_HTTP_PORT);
                MDNS.addService("autoroller", "tcp", AUTOROLLER_HTTP_PORT);
                Serial.printf("[mDNS] http://%s.local/\n", s_hostname.c_str());
            }
        } else if (millis() - s_lastTryMs > 30000) {
            // 30 s y nada → fallback al portal
            Serial.println("[WiFi] Timeout. Volviendo al portal.");
            startPortal();
        }
        return;
    }

    if (s_mode == Mode::CONNECTED && WiFi.status() != WL_CONNECTED) {
        Serial.println("[WiFi] Desconectado. Reintentando...");
        connectSTA();
    }
}

Mode   mode()        { return s_mode; }
String currentIP()   {
    return s_mode == Mode::PORTAL
        ? WiFi.softAPIP().toString()
        : WiFi.localIP().toString();
}
String currentSSID() { return WiFi.SSID(); }
String hostname()    { return s_hostname; }

}  // namespace netcfg
