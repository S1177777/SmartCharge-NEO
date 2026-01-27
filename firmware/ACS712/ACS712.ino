const int acsPin = 35;          // 连接到 ESP32 Pin 35
const float vRef = 3.3;         // ESP32 的电压是 3.3V
const float adcResolution = 4095.0; // ESP32 的 ADC 是 12位 (0-4095)

// --- 关键参数修改 ---
// 1. 中位电压: 你测量的 1.6V (零电流时的电压)
const float midValue = 1.496; 

// 2. 灵敏度: ACS712-5A 在 3.3V 下大约是 0.122 V/A (122mV/A)
// 如果读数偏小，尝试改回 0.185；如果读数偏大，用 0.122
const float sensitivity = 0.122; 

const int numSamples = 100;     // 采样次数，取平均值用

void setup() {
  Serial.begin(115200); // ESP32 建议用 115200
  
  // 重要：Pin 35 是纯输入引脚，没有内部上拉电阻，直接用 INPUT
  // 不要用 INPUT_PULLUP，会干扰模拟信号！
  pinMode(acsPin, INPUT); 
  
  Serial.println("Starting DC current measurement...");
}

void loop() {
  float totalVoltage = 0.0;

  // 1. 采样与滤波 (取平均值)
  for (int i = 0; i < numSamples; i++) {
    int rawADC = analogRead(acsPin);
    
    // 将 0-4095 转换成 0-3.3V
    float sampleVoltage = rawADC * (vRef / adcResolution);
    totalVoltage += sampleVoltage;
    delay(1); // 给 ADC 一点缓冲时间
  }

  // 计算平均电压
  float avgVoltage = totalVoltage / numSamples;

  // 2. 计算直流电流 (DC Current)
  // 公式: (测量电压 - 中点电压) / 灵敏度
  // 使用 abs() 取绝对值，因为充电电流方向可能导致负数，我们只看大小
  float current = (avgVoltage - midValue) / sensitivity;

  // 3. 去除底噪 (归零处理)
  // 如果电流很小 (比如小于 0.05A)，直接显示 0，防止数字乱跳
  // if (abs(current) < 0.05) {
  //   current = 0.0;
  // }

  current = abs(current);

  // 4. 打印结果
  Serial.print("Voltage: ");
  Serial.print(avgVoltage, 3);
  Serial.print(" V | Current: ");
  Serial.print(current, 3);
  Serial.println(" A");

  delay(500); 
}