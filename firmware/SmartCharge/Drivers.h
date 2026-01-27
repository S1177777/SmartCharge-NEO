#ifndef DRIVERS_H
#define DRIVERS_H

#include <Arduino.h>
#include "Config.h"

// --- Relay Driver ---
class RelayDriver {
  private:
    int _pin;
    bool _state;
  
  public:
    RelayDriver(int pin) : _pin(pin), _state(false) {}

    void begin() {
      pinMode(_pin, OUTPUT);
      digitalWrite(_pin, LOW); // Default OFF
    }

    void on() {
      _state = true;
      digitalWrite(_pin, HIGH);
    }

    void off() {
      _state = false;
      digitalWrite(_pin, LOW);
    }

    bool getState() { return _state; }
};

// --- Button Driver ---
class ButtonDriver {
  private:
    int _pin;
    unsigned long _lastDebounceTime;
    const unsigned long _debounceDelay = 50;
    int _lastButtonState;
    int _buttonState;
    bool _pressed;

  public:
    ButtonDriver(int pin) : _pin(pin) {
      _lastButtonState = HIGH; // Input Pullup defaults HIGH
      _buttonState = HIGH;
      _pressed = false;
    }

    void begin() {
      pinMode(_pin, INPUT_PULLUP);
    }

    void update() {
      int reading = digitalRead(_pin);

      if (reading != _lastButtonState) {
        _lastDebounceTime = millis();
      }

      if ((millis() - _lastDebounceTime) > _debounceDelay) {
        if (reading != _buttonState) {
          _buttonState = reading;
          if (_buttonState == LOW) { // Active LOW
            _pressed = true; 
          }
        }
      }
      _lastButtonState = reading;
    }

    bool wasPressed() {
      if (_pressed) {
        _pressed = false;
        return true;
      }
      return false;
    }
};

// --- LED Driver ---
class LedDriver {
  private:
    int _pin;
    int _brightness;
    int _fadeAmount;

  public:
    LedDriver(int pin) : _pin(pin) {
      _brightness = 0;
      _fadeAmount = 5;
    }

    void begin() {
      pinMode(_pin, OUTPUT);
    }

    void breathe() {
      analogWrite(_pin, _brightness);

      _brightness = _brightness + _fadeAmount;
      if (_brightness <= 0 || _brightness >= 255) {
        _fadeAmount = -_fadeAmount;
      }
      // Constrain
      if (_brightness < 0) _brightness = 0;
      if (_brightness > 255) _brightness = 255;
    }
    
    void on() {
        analogWrite(_pin, 255);
    }
    
    void off() {
        analogWrite(_pin, 0);
    }
};

// --- Current Sensor Driver ---
class CurrentSensorDriver {
  private:
    int _pin;
    float _midValue;
    float _sensitivity;
    float _currentVal;
    
  public:
    CurrentSensorDriver(int pin, float midVal, float sens) 
      : _pin(pin), _midValue(midVal), _sensitivity(sens), _currentVal(0.0) {}

    void begin() {
      pinMode(_pin, INPUT);
    }

    float read() {
      float totalVoltage = 0.0;
      int samples = 50; 
      
      for(int i=0; i<samples; i++) {
         int raw = analogRead(_pin);
         totalVoltage += raw * (ADC_VREF / ADC_RESOLUTION);
      }
      
      float avgVoltage = totalVoltage / samples;
      
      float current = (avgVoltage - _midValue) / _sensitivity;
      
      if (abs(current) < 0.05) current = 0.0;
      
      _currentVal = abs(current);
      return _currentVal;
    }
    
    float getLastReading() {
        return _currentVal;
    }
};

#if ENABLE_SOLAR
#include <ModbusMaster.h>

// --- Global Callbacks for Modbus (Must be outside class or static) ---
// We can't easily use member functions for ModbusMaster callbacks
void preTransmission() {
  digitalWrite(PIN_RS485_DE, HIGH);
}
void postTransmission() {
  digitalWrite(PIN_RS485_DE, LOW);
}

// --- Solar Driver (EPEVER Modbus) ---
class SolarDriver {
  private:
    ModbusMaster _node;
    float _pvVoltage;
    float _pvCurrent;
    float _pvPower;
    float _battVoltage;
    float _battCurrent;
    
  public:
    SolarDriver() {
        _pvVoltage = 0; _pvCurrent = 0; _pvPower = 0;
        _battVoltage = 0; _battCurrent = 0;
    }

    void begin() {
      // 1. Init RS485 Control Pin
      pinMode(PIN_RS485_DE, OUTPUT);
      digitalWrite(PIN_RS485_DE, LOW);

      // 2. Init Serial2
      Serial2.begin(RS485_BAUDRATE, SERIAL_8N1, PIN_RS485_RX, PIN_RS485_TX);

      // 3. Init Modbus
      _node.begin(MODBUS_SLAVE_ID, Serial2);
      _node.preTransmission(preTransmission);
      _node.postTransmission(postTransmission);
    }

    void readData() {
       uint8_t result = _node.readInputRegisters(0x3100, 6);
       
       if (result == _node.ku8MBSuccess) {
           _pvVoltage = _node.getResponseBuffer(0) / 100.0f;
           _pvCurrent = _node.getResponseBuffer(1) / 100.0f;
           // Power is 32-bit (Low | High<<16)
           uint32_t powerRaw = (_node.getResponseBuffer(2) | (_node.getResponseBuffer(3) << 16));
           _pvPower   = powerRaw / 100.0f;
           
           _battVoltage = _node.getResponseBuffer(4) / 100.0f;
           _battCurrent = _node.getResponseBuffer(5) / 100.0f;
       }
    }
    
    float getPvVoltage() { return _pvVoltage; }
    float getPvCurrent() { return _pvCurrent; }
    float getPvPower()   { return _pvPower; }
    float getBattVoltage() { return _battVoltage; }
    float getBattCurrent() { return _battCurrent; }
};
#else
// Dummy SolarDriver if disabled, to avoid breaking SolarManager compilation
class SolarDriver {
  public:
    void begin() {}
    void readData() {}
    float getPvVoltage() { return 0.0f; }
    float getPvCurrent() { return 0.0f; }
    float getPvPower() { return 0.0f; }
    float getBattVoltage() { return 0.0f; }
    float getBattCurrent() { return 0.0f; }
};
#endif

#endif // DRIVERS_H
