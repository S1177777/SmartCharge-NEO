#ifndef NETWORK_H
#define NETWORK_H

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "Config.h"

class SmartNetwork {
  private:
    const char* _ssid;
    const char* _password;
    String _apiUrl;
    String _stationId;
    
  public:
    SmartNetwork(const char* ssid, const char* pass, String url, String id) 
      : _ssid(ssid), _password(pass), _apiUrl(url), _stationId(id) {}

    void begin() {
      // Connect to WiFi
      WiFi.begin(_ssid, _password);
      // Details handled in the loop to avoid blocking blocking hardware loop,
      // but initial begin is fine.
    }
    
    bool isConnected() {
        return WiFi.status() == WL_CONNECTED;
    }

    void sendTelemetry(float current, float voltage, String status) {
      if (!isConnected()) return;

      HTTPClient http;
      http.begin(_apiUrl);
      http.addHeader("Content-Type", "application/json");

      // Create JSON Payload
      // Example: { "stationId": "...", "current": 1.23, "voltage": 12.0, "status": "CHARGING" }
      JsonDocument doc;
      doc["stationId"] = _stationId;
      doc["current"]   = current;
      doc["voltage"]   = voltage; // We might not measure voltage directly yet, but interface asks for it
      doc["status"]    = status;

      String jsonString;
      serializeJson(doc, jsonString);

      // POST
      int httpResponseCode = http.POST(jsonString);
      
      if (httpResponseCode > 0) {
        String response = http.getString();
        // Here we could parse response if needed
        // Serial.println(response); 
      }
      
      http.end();
    }

    // Logic to parse potential "command" from a GET or response
    // For now, let's assume the server might return a command in the POST response 
    // or we might need a separate GET polling.
    // The prompt says "Server Response handling: Parse JSON to extract "command"".
    // So we should modify sendTelemetry to return the command.
    
    String sendTelemetryAndGetCommand(float current, float voltage, String status) {
      if (!isConnected()) return "NONE";

      HTTPClient http;
      http.begin(_apiUrl);
      http.addHeader("Content-Type", "application/json");

      JsonDocument doc;
      doc["stationId"] = _stationId;
      doc["current"]   = current;
      doc["voltage"]   = voltage;
      doc["status"]    = status;

      String jsonString;
      serializeJson(doc, jsonString);

      int httpResponseCode = http.POST(jsonString);
      String command = "NONE";

      if (httpResponseCode > 0) {
        String response = http.getString();
        // Parse response: { "command": "START" } or { "command": "STOP" }
        JsonDocument resDoc;
        DeserializationError error = deserializeJson(resDoc, response);
        
        if (!error) {
            if (resDoc.containsKey("command")) {
                const char* cmd = resDoc["command"];
                command = String(cmd);
            }
        }
      }
      
      http.end();
      return command;
    }
};

#endif // NETWORK_H
