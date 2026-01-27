#ifndef COMPONENTS_H
#define COMPONENTS_H

#include <Arduino.h>
#include "Config.h"

// --- Generic Relay Class ---
class Relay {
  private:
    int _pin;
    bool _state;
  
  public:
    Relay(int pin) : _pin(pin), _state(false) {}

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

// --- Button Class with Debounce ---
class UserButton {
  private:
    int _pin;
    unsigned long _lastDebounceTime;
    const unsigned long _debounceDelay = 50;
    int _lastButtonState;
    int _buttonState;
    bool _pressed;

  public:
    UserButton(int pin) : _pin(pin) {
      _lastButtonState = HIGH; // Input Pullup defaults HIGH
      _buttonState = HIGH;
      _pressed = false;
    }

    void begin() {
      pinMode(_pin, INPUT_PULLUP);
    }

    // Call this inside the fast loop
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

    // Returns true only once per press
    bool wasPressed() {
      if (_pressed) {
        _pressed = false;
        return true;
      }
      return false;
    }
};

// --- Status LED with PWM Envelopes ---
class StatusLED {
  private:
    int _pin;
    int _channel;
    int _brightness;
    int _fadeAmount;

  public:
    StatusLED(int pin, int channel = 0) : _pin(pin), _channel(channel) {
      _brightness = 0;
      _fadeAmount = 5;
    }

    void begin() {
      // Setup LED PWM (LEDC)
      // ESP32 Arduino Core 3.0+ uses ledcAttachChannel/ledcWrite
      // Make sure to use compatible code. Assuming Core 2.x for wider compat for now
      // Or checking if user is on 3.0 (from previous logs user is on 3.0.4)
      
      // For Core 3.0.4, specific syntax is needed, but simple analogWrite works on ESP32 too in recent versions
      // We will use standard ledcSetup for safety or analogWrite if preferred.
      // Let's use standard Core 3.x functions if possible, but strict to simplest:
      pinMode(_pin, OUTPUT);
    }

    void breathe() {
      analogWrite(_pin, _brightness); // ESP32 Core 3.0 supports analogWrite

      _brightness = _brightness + _fadeAmount;
      if (_brightness <= 0 || _brightness >= 255) {
        _fadeAmount = -_fadeAmount;
      }
      // Constrain just in case
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

// --- Current Sensor Class (ACS712) ---
class CurrentSensor {
  private:
    int _pin;
    float _midValue;
    float _sensitivity;
    float _currentVal;
    
  public:
    CurrentSensor(int pin, float midVal, float sens) 
      : _pin(pin), _midValue(midVal), _sensitivity(sens), _currentVal(0.0) {}

    void begin() {
      pinMode(_pin, INPUT); // No Pullup for ADC
    }

    // Read and Filter
    float read() {
      float totalVoltage = 0.0;
      int samples = 50; 
      
      for(int i=0; i<samples; i++) {
         int raw = analogRead(_pin);
         totalVoltage += raw * (ADC_VREF / ADC_RESOLUTION);
      }
      
      float avgVoltage = totalVoltage / samples;
      
      // Calculate Current
      float current = (avgVoltage - _midValue) / _sensitivity;
      
      // Zero clip
      if (abs(current) < 0.05) current = 0.0;
      
      _currentVal = abs(current);
      return _currentVal;
    }
    
    float getLastReading() {
        return _currentVal;
    }
};

#endif // COMPONENTS_H
