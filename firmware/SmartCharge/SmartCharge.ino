#include "Config.h"
#include "Drivers.h"
#include "Managers.h"
#include "Services.h"
#include "MQTTService.h"

// --- 1. Drivers Layer ---
RelayDriver boxRelay(PIN_RELAY_MAIN);
RelayDriver fanRelay(PIN_RELAY_FAN);
ButtonDriver button(PIN_BUTTON_IN);
LedDriver statusLed(PIN_BUTTON_LED);
CurrentSensorDriver acs(PIN_SENSOR_ACS, ACS_ZERO_VOLTAGE, ACS_SENSITIVITY);
SolarDriver solarDriver;

// --- 2. Managers Layer ---
// Inject Drivers into Managers
PowerManager powerManager(&boxRelay, &fanRelay, &acs);
InterfaceManager interfaceManager(&button, &statusLed, &powerManager);
SolarManager solarManager(&solarDriver);

// --- 3. Services Layer ---
// Inject Managers into Services
IoTService iotService(WIFI_SSID, WIFI_PASSWORD, API_BASE_URL, STATION_ID, IOT_API_KEY, &powerManager, &solarManager);
#if ENABLE_MQTT
  MQTTService mqttService(&powerManager, &solarManager);
#endif

// --- FreeRTOS Task Handles ---
TaskHandle_t TaskHardwareHandle;
TaskHandle_t TaskNetworkHandle;

// --- Task Definitions ---
void TaskHardware(void *pvParameters);
void TaskNetwork(void *pvParameters);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- SmartCharge NEO Booting ---");
  
  // Initialize Layers
  // Managers will initialize their own drivers if needed, or we explicitly do it here?
  // Our Managers.h calls driver->begin().
  
  powerManager.begin();
  interfaceManager.begin();
  solarManager.begin();
  iotService.begin();
  #if ENABLE_MQTT
    mqttService.begin();
  #endif

  // --- Boot Self-Test ---
  #if ENABLE_RELAYS
    Serial.println("Self-Test: Main Relay ON (2s)...");
    boxRelay.on();
    delay(2000);
    boxRelay.off();
    Serial.println("Self-Test: Main Relay OFF");
  #endif

  // Create Tasks
  xTaskCreatePinnedToCore(
    TaskHardware,   "HardwareLoop",   4096,   NULL,   2,   &TaskHardwareHandle,   1
  );

  #if ENABLE_WIFI
    xTaskCreatePinnedToCore(
      TaskNetwork,    "NetworkLoop",    8192,   NULL,   1,   &TaskNetworkHandle,    0
    );
  #endif
  
  Serial.println("System Started via FreeRTOS (Layered Architecture)");
}

void loop() {
  vTaskDelete(NULL); 
}

// --- Task A: Hardware Loop (20ms, Core 1) ---
// Handles Managers Updates
void TaskHardware(void *pvParameters) {
  for(;;) {
    // Update Managers
    interfaceManager.update(); // Handle Button & LED
    powerManager.update();     // Handle Relays & Sensor
    solarManager.update();     // Handle Modbus Reading (Check every 2s internally)

    vTaskDelay(pdMS_TO_TICKS(HARDWARE_LOOP_DELAY)); 
  }
}

// --- Task B: Network Loop (5000ms, Core 0) ---
// Handles Services Updates
void TaskNetwork(void *pvParameters) {
  for(;;) {
    // Update Services
    iotService.update(); // Handle WiFi & HTTP Telemetry
    #if ENABLE_MQTT
      mqttService.update(); // Handle MQTT for Home Assistant
    #endif

    vTaskDelay(pdMS_TO_TICKS(NETWORK_LOOP_DELAY));
  }
}
