#ifndef MANAGERS_H
#define MANAGERS_H

#include "Drivers.h"
#include "Config.h"

// --- Power Manager ---
// Responsibilities: Charging logic, Safety monitoring, Relay control
class PowerManager {
  private:
    RelayDriver* _mainRelay;
    RelayDriver* _fanRelay;
    CurrentSensorDriver* _sensor;
    
    // State
    bool _isChargingRequested;
    bool _isSafetyCutoff;
    float _lastCurrent;
    
  public:
    PowerManager(RelayDriver* main, RelayDriver* fan, CurrentSensorDriver* sensor) 
      : _mainRelay(main), _fanRelay(fan), _sensor(sensor) {
        _isChargingRequested = false;
        _isSafetyCutoff = false;
        _lastCurrent = 0.0f;
    }

    void begin() {
      #if ENABLE_RELAYS
        _mainRelay->begin();
        _fanRelay->begin();
      #endif
      #if ENABLE_SENSORS
        _sensor->begin();
      #endif
    }

    void update() {
      // 1. Read Sensors
      float current = 0.0f;
      #if ENABLE_SENSORS
        current = _sensor->read();
        _lastCurrent = current;
      #endif
      
      // 2. Safety Logic
      #if ENABLE_RELAYS
        if (current > SAFETY_CURRENT_LIMIT && _mainRelay->getState()) {
          _fanRelay->on();
          // Ideally we might want to cut off charging too if it's DANGEROUSLY high
          // But spec says "Limit > 3.0A triggers Fan". 
        } else {
          _fanRelay->off();
        }
      #endif

      // 3. Control Logic
      #if ENABLE_RELAYS
        if (_isChargingRequested && !_isSafetyCutoff) {
            _mainRelay->on();
        } else {
            _mainRelay->off();
            _fanRelay->off(); // Safe state
        }
      #endif
    }
    
    // API for Services/UI
    void setChargingRequest(bool state) {
        _isChargingRequested = state;
    }
    
    bool getChargingRequest() {
        return _isChargingRequested;
    }
    
    void toggleChargingRequest() {
        _isChargingRequested = !_isChargingRequested;
    }
    
    float getCurrent() {
        return _lastCurrent;
    }
    
    String getStatusString() {
        if (_isSafetyCutoff) return "FAULT";
        if (_mainRelay->getState()) return "CHARGING";
        return "AVAILABLE";
    }
};

// --- Interface Manager ---
// Responsibilities: User Input (Button), User Feedback (LED)
class InterfaceManager {
  private:
    ButtonDriver* _button;
    LedDriver* _led;
    PowerManager* _powerManager; // Needs reference to control power
    
  public:
    InterfaceManager(ButtonDriver* btn, LedDriver* led, PowerManager* pm)
      : _button(btn), _led(led), _powerManager(pm) {}
      
    void begin() {
      #if ENABLE_BUTTON
        _button->begin();
      #endif
      #if ENABLE_LED
        _led->begin();
      #endif
    }
    
    void update() {
      // 1. Input
      #if ENABLE_BUTTON
        _button->update();
        if (_button->wasPressed()) {
            _powerManager->toggleChargingRequest(); // Command the PowerManager
        }
      #endif
      
      // 2. Output (LED follows Power State)
      #if ENABLE_LED
        // We look at the ACTUAL state of the relay or the request? 
        // Let's look at the request state or actual state from PowerManager
        // "Breathing effect" usually implies "Active/Charging"
        if (_powerManager->getChargingRequest()) { 
             _led->breathe();
        } else {
             _led->off();
        }
      #endif
    }
};

// --- Solar Manager ---
// Responsibilities: Periodically read Solar Data
class SolarManager {
  private:
    SolarDriver* _driver;
    unsigned long _lastReadTime;
    const unsigned long _readInterval = 2000; // Read every 2s
    
  public:
    SolarManager(SolarDriver* driver) : _driver(driver) {
        _lastReadTime = 0;
    }
    
    void begin() {
      #if ENABLE_SOLAR
        _driver->begin();
      #endif
    }
    
    void update() {
      #if ENABLE_SOLAR
        if (millis() - _lastReadTime > _readInterval) {
            _driver->readData();
            _lastReadTime = millis();
        }
      #endif
    }
    
    float getPvPower() { 
        #if ENABLE_SOLAR
            return _driver->getPvPower(); 
        #else 
            return 0.0f;
        #endif
    }
    
    float getBattVoltage() {
        #if ENABLE_SOLAR
            return _driver->getBattVoltage();
        #else 
            return 0.0f;
        #endif
    }
};

#endif // MANAGERS_H
