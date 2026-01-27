#ifndef CONFIG_H
#define CONFIG_H

// --- Hardware Pin Definitions (ESP32 DevKit V1) ---   
#define PIN_RELAY_MAIN    25  // Active HIGH (Charge Cutoff)
#define PIN_RELAY_FAN     26  // Active HIGH (Cooling System)
#define PIN_BUTTON_IN     27  // Momentary Switch (Internal Pullup)
#define PIN_BUTTON_LED    14  // Status Light (PWM/Breathing)
#define PIN_SENSOR_ACS    35  // ACS712 Analog Output
#define PIN_RS485_DE      4   // RS485 Driver Enable
#define PIN_RS485_RX      16  // RS485 RX
#define PIN_RS485_TX      17  // RS485 TX

// --- Solar Controller (EPEVER) ---
#define MODBUS_SLAVE_ID     1
#define RS485_BAUDRATE      115200

// --- ACS712 Current Sensor Calibration ---
// Based on user measurements:
// Zero Point: 1.496V (Voltage when 0A)
// Sensitivity: 0.122 V/A (Adjusted for 3.3V logic)
#define ACS_ZERO_VOLTAGE    1.496f 
#define ACS_SENSITIVITY     0.122f 

// --- System Parameters ---
#define ADC_VREF            3.3f   // ESP32 ADC Reference Voltage
#define ADC_RESOLUTION      4095.0f // 12-bit ADC
#define SAFETY_CURRENT_LIMIT 3.0f   // Amps (Trigger Fan if > 3.0A)

// --- WiFi Configuration ---
// IMPORTANT: ESP32 must connect to the SAME network as your PC (172.20.10.x)
#define WIFI_SSID           "test1"      // Change to your WiFi name
#define WIFI_PASSWORD       "rylszzzz"   // Change to your WiFi password

// --- Server Configuration ---
// For local development: use your PC's local IP (run 'ipconfig' to find it)
// For production: use your Vercel deployment URL
#define API_BASE_URL        "http://172.20.10.3:3000"  // Your PC's WLAN IP
#define STATION_ID          1                            // Database station ID (integer)
#define IOT_API_KEY         "smartcharge-neo-secret-key-2024"  // Must match .env.local IOT_API_KEY

// --- MQTT Configuration (for Home Assistant) ---
#define MQTT_SERVER         "172.20.10.3"       // Your PC's WLAN IP (same as API)
#define MQTT_PORT           1883
#define MQTT_CLIENT_ID      "smartcharge-station1"
#define MQTT_TOPIC_STATE    "smartcharge/station1/state"
#define MQTT_TOPIC_CMD      "smartcharge/station1/set"
#define MQTT_TOPIC_AVAIL    "smartcharge/station1/availability"

// --- Feature Toggles ---
// Set to 1 to enable, 0 to disable
#define ENABLE_WIFI       1 // Enable WiFi and Network Telemetry
#define ENABLE_MQTT       1 // Enable MQTT for Home Assistant integration
#define ENABLE_RELAYS     1 // Enable Main and Fan Relays actuation
#define ENABLE_SENSORS    0 // Enable Current Sensor readings
#define ENABLE_BUTTON     0 // Enable User Button input
#define ENABLE_LED        0 // Enable Status LED breathing/indication
#define ENABLE_SOLAR      0 // Enable EPEVER Solar Controller (Modbus)

// --- Task Timing (Milliseconds) ---
#define HARDWARE_LOOP_DELAY 20   // 50Hz for smooth LED & responsive button
#define NETWORK_LOOP_DELAY  5000 // 5s Telemetry interval

#endif // CONFIG_H
