#ifndef SERVICES_H
#define SERVICES_H

#if ENABLE_WIFI
  #include <WiFi.h>
  #include <HTTPClient.h>
  #include <ArduinoJson.h>
#endif
#include "Config.h"
#include "Managers.h"

// --- IoT Service ---
// Responsibilities: WiFi Connection, Telemetry, Remote Commands
class IoTService {
  private:
    const char* _ssid;
    const char* _password;
    String _apiBaseUrl;
    int _stationId;
    const char* _apiKey;
    PowerManager* _powerManager;
    SolarManager* _solarManager;

    // Build the full API endpoint URL
    String buildApiUrl() {
      return _apiBaseUrl + "/api/iot/stations/" + String(_stationId);
    }

  public:
    IoTService(const char* ssid, const char* pass, const char* baseUrl, int stationId, const char* apiKey, PowerManager* pm, SolarManager* sm)
      : _ssid(ssid), _password(pass), _apiBaseUrl(baseUrl), _stationId(stationId), _apiKey(apiKey), _powerManager(pm), _solarManager(sm) {}

    void begin() {
      #if ENABLE_WIFI
        WiFi.mode(WIFI_STA);
        WiFi.begin(_ssid, _password);
        Serial.print("Connecting to WiFi");

        // Wait for connection with timeout
        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 20) {
          delay(500);
          Serial.print(".");
          attempts++;
        }

        if (WiFi.status() == WL_CONNECTED) {
          Serial.println("\nWiFi connected!");
          Serial.print("IP address: ");
          Serial.println(WiFi.localIP());
          Serial.print("API endpoint: ");
          Serial.println(buildApiUrl());
        } else {
          Serial.println("\nWiFi connection failed!");
        }
      #endif
    }

    bool isConnected() {
        #if ENABLE_WIFI
          return WiFi.status() == WL_CONNECTED;
        #else
          return false;
        #endif
    }

    void update() {
       #if ENABLE_WIFI
        // 1. Maintain Connection
        if (!isConnected()) {
            Serial.println("WiFi disconnected, reconnecting...");
            WiFi.reconnect();
            return; // Don't try to send if reconnecting
        }

        // 2. Collect Data from Managers
        float current = _powerManager->getCurrent();
        String status = _powerManager->getStatusString();
        float pvPower = _solarManager->getPvPower();
        float battVoltage = _solarManager->getBattVoltage();

        // 3. Send & Receive
        String cmd = sendTelemetryAndGetCommand(current, battVoltage * 10.0f, status, pvPower, battVoltage);

        // 4. Act on Commands
        if (cmd == "START") {
            Serial.println("Received START command from server");
            _powerManager->setChargingRequest(true);
        } else if (cmd == "STOP") {
            Serial.println("Received STOP command from server");
            _powerManager->setChargingRequest(false);
        }
       #endif
    }

    String sendTelemetryAndGetCommand(float current, float voltage, String status, float pvPower, float battVoltage) {
      #if ENABLE_WIFI
      if (!isConnected()) return "NONE";

      HTTPClient http;
      String url = buildApiUrl();
      http.begin(url);

      // Set headers - Content-Type and API Key for authentication
      http.addHeader("Content-Type", "application/json");
      http.addHeader("x-api-key", _apiKey);

      // Build JSON payload matching backend schema
      // Backend expects: voltage, current, power, temperature, status, deviceId
      JsonDocument doc;
      doc["voltage"]     = voltage;                    // V (scaled from battery voltage)
      doc["current"]     = current;                    // A
      doc["power"]       = (voltage * current) / 1000.0f; // kW
      doc["pvPower"]     = pvPower;                    // W (solar power)
      doc["battVoltage"] = battVoltage;                // V (battery voltage)
      doc["deviceId"]    = "esp32-station-" + String(_stationId);

      // Map status string to backend enum values
      // Backend expects: AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE, FAULT
      if (status == "IDLE") {
        doc["status"] = "AVAILABLE";
      } else if (status == "CHARGING") {
        doc["status"] = "OCCUPIED";
      } else if (status == "FAULT") {
        doc["status"] = "FAULT";
      }
      // If status doesn't match, let the backend infer from sensor data

      String jsonString;
      serializeJson(doc, jsonString);

      Serial.print("Sending telemetry to: ");
      Serial.println(url);
      Serial.print("Payload: ");
      Serial.println(jsonString);

      int httpResponseCode = http.POST(jsonString);
      String command = "NONE";

      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.print("Response (");
        Serial.print(httpResponseCode);
        Serial.print("): ");
        Serial.println(response);

        // Parse response for command
        JsonDocument resDoc;
        DeserializationError error = deserializeJson(resDoc, response);

        if (!error) {
            // Check for command in response
            if (resDoc.containsKey("command")) {
                const char* cmd = resDoc["command"];
                command = String(cmd);
            }
            // Also check nested in data object
            if (resDoc["data"].containsKey("command")) {
                const char* cmd = resDoc["data"]["command"];
                command = String(cmd);
            }
        }
      } else {
        Serial.print("HTTP Error: ");
        Serial.println(httpResponseCode);
      }

      http.end();
      return command;
      #else
      return "NONE";
      #endif
    }
};

#endif // SERVICES_H
