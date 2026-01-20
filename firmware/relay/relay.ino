// Define the pin connected to the relay module
// 在 ESP32 DevKit 上，这就是 D25 引脚
const int relayPin = 25; 

void setup() {
  // 初始化串口，方便调试（可选）
  Serial.begin(115200);
  
  // Set the relay pin as an output
  pinMode(relayPin, OUTPUT);

  // 初始状态：先设为 LOW。
  // 注意：如果是低电平触发的继电器，这里 LOW 会导致开机直接吸合。
  // 如果是低电平触发，建议初始化改为 digitalWrite(relayPin, HIGH);
  digitalWrite(relayPin, LOW); 
  Serial.println("System Started");
}

void loop() {
  // 1. 尝试开启
  Serial.println("Relay ON (HIGH)");
  digitalWrite(relayPin, HIGH);
  delay(5000); // 等待 5 秒

  // 2. 尝试关闭
  Serial.println("Relay OFF (LOW)");
  digitalWrite(relayPin, LOW);
  delay(5000); // 等待 5 秒
}