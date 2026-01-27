#ifndef MQTT_SERVICE_H
#define MQTT_SERVICE_H

#if ENABLE_MQTT
  #include <WiFi.h>
  #include <PubSubClient.h>
  #include <ArduinoJson.h>
#endif
#include "Config.h"
#include "Managers.h"

// --- MQTT Service for Home Assistant ---
// Responsibilities: MQTT Connection, Publish sensor data, Subscribe to commands
class MQTTService {
  private:
    #if ENABLE_MQTT
      WiFiClient _wifiClient;
      PubSubClient _mqttClient;
    #endif
    PowerManager* _powerManager;
    SolarManager* _solarManager;

    unsigned long _lastPublish;
    const unsigned long _publishInterval = 5000; // Publish every 5 seconds

    // Static pointer for callback (PubSubClient requires static callback)
    static MQTTService* _instance;

    // Static callback wrapper
    static void staticCallback(char* topic, byte* payload, unsigned int length) {
      if (_instance) {
        _instance->handleMessage(topic, payload, length);
      }
    }

    // Handle incoming MQTT messages
    void handleMessage(char* topic, byte* payload, unsigned int length) {
      #if ENABLE_MQTT
        // Convert payload to string
        String message;
        for (unsigned int i = 0; i < length; i++) {
          message += (char)payload[i];
        }

        Serial.print("MQTT Message [");
        Serial.print(topic);
        Serial.print("]: ");
        Serial.println(message);

        // Check if it's a command topic
        if (String(topic) == MQTT_TOPIC_CMD) {
          if (message == "ON") {
            Serial.println("MQTT: Received ON command");
            _powerManager->setChargingRequest(true);
          } else if (message == "OFF") {
            Serial.println("MQTT: Received OFF command");
            _powerManager->setChargingRequest(false);
          }
        }
      #endif
    }

    // Connect to MQTT broker
    bool connectMQTT() {
      #if ENABLE_MQTT
        if (_mqttClient.connected()) return true;

        Serial.print("Connecting to MQTT broker...");

        // Connect with Last Will and Testament (LWT)
        if (_mqttClient.connect(MQTT_CLIENT_ID, NULL, NULL, MQTT_TOPIC_AVAIL, 0, true, "offline")) {
          Serial.println("connected!");

          // Publish online status
          _mqttClient.publish(MQTT_TOPIC_AVAIL, "online", true);

          // Subscribe to command topic
          _mqttClient.subscribe(MQTT_TOPIC_CMD);
          Serial.print("Subscribed to: ");
          Serial.println(MQTT_TOPIC_CMD);

          return true;
        } else {
          Serial.print("failed, rc=");
          Serial.println(_mqttClient.state());
          return false;
        }
      #else
        return false;
      #endif
    }

    // Publish sensor data to MQTT
    void publishState() {
      #if ENABLE_MQTT
        if (!_mqttClient.connected()) return;

        // Collect data from managers
        float current = _powerManager->getCurrent();
        float pvPower = _solarManager->getPvPower();
        float battVoltage = _solarManager->getBattVoltage();
        float voltage = battVoltage * 10.0f; // Scaled voltage
        float power = (voltage * current) / 1000.0f; // kW
        bool relayState = _powerManager->getChargingRequest();

        // Build JSON payload
        JsonDocument doc;
        doc["voltage"] = voltage;
        doc["current"] = current;
        doc["power"] = power;
        doc["pv_power"] = pvPower;
        doc["batt_voltage"] = battVoltage;
        doc["relay"] = relayState ? "ON" : "OFF";

        String jsonString;
        serializeJson(doc, jsonString);

        // Publish to state topic
        bool success = _mqttClient.publish(MQTT_TOPIC_STATE, jsonString.c_str());

        Serial.print("MQTT Publish: ");
        Serial.print(jsonString);
        Serial.println(success ? " [OK]" : " [FAILED]");
      #endif
    }

  public:
    MQTTService(PowerManager* pm, SolarManager* sm)
      : _powerManager(pm), _solarManager(sm) {
        #if ENABLE_MQTT
          _mqttClient.setClient(_wifiClient);
        #endif
        _lastPublish = 0;
        _instance = this;
    }

    void begin() {
      #if ENABLE_MQTT
        _mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
        _mqttClient.setCallback(staticCallback);
        _mqttClient.setBufferSize(512);
        Serial.println("MQTT Service initialized");
        Serial.print("MQTT Server: ");
        Serial.print(MQTT_SERVER);
        Serial.print(":");
        Serial.println(MQTT_PORT);
      #endif
    }

    void update() {
      #if ENABLE_MQTT
        // Check WiFi connection first
        if (WiFi.status() != WL_CONNECTED) {
          return;
        }

        // Maintain MQTT connection
        if (!_mqttClient.connected()) {
          connectMQTT();
        }

        // Process incoming messages
        _mqttClient.loop();

        // Publish state periodically
        if (millis() - _lastPublish > _publishInterval) {
          publishState();
          _lastPublish = millis();
        }
      #endif
    }

    bool isConnected() {
      #if ENABLE_MQTT
        return _mqttClient.connected();
      #else
        return false;
      #endif
    }
};

// Initialize static instance pointer
MQTTService* MQTTService::_instance = nullptr;

#endif // MQTT_SERVICE_H
