#include <ModbusMaster.h>

// === 引脚定义 ===
// 这里的定义对应 ESP32 的 Serial2
#define MAX485_DE      4    // 驱动使能引脚 (DE 和 RE 连在一起接到这个脚)
#define RX_PIN         16   // 连接到 RS485 模块的 RO
#define TX_PIN         17   // 连接到 RS485 模块的 DI

// === EPEVER Modbus 定义 ===
// EPEVER 默认波特率通常是 115200 (LS-B系列)
// 如果读不到数据，请尝试改成 9600
#define EPEVER_BAUDRATE 115200 

ModbusMaster node;

// === RS485 流控回调函数 ===
// MAX485 是半双工的，发送前要把 DE 拉高，发送完拉低
void preTransmission()
{
  digitalWrite(MAX485_DE, HIGH);
}

void postTransmission()
{
  digitalWrite(MAX485_DE, LOW);
}

void setup()
{
  // 1. 初始化电脑调试串口
  Serial.begin(115200);
  while (!Serial) {
    ; // 等待串口连接
  }
  Serial.println("EPEVER Solar Monitor Starting...");

  // 2. 初始化 RS485 控制引脚
  pinMode(MAX485_DE, OUTPUT);
  digitalWrite(MAX485_DE, LOW); // 默认接收模式

  // 3. 初始化 ESP32 的 RS485 串口 (Serial2)
  Serial2.begin(EPEVER_BAUDRATE, SERIAL_8N1, RX_PIN, TX_PIN);

  // 4. 配置 Modbus 节点
  // EPEVER 默认 ID 通常是 1
  node.begin(1, Serial2);
  
  // 5. 绑定回调函数 (自动处理收发切换)
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);
}

void loop()
{
  uint8_t result;

  // === 读取实时数据 ===
  // EPEVER 的实时数据通常从寄存器 0x3100 开始
  // 我们读取 6 个寄存器 (0x3100 到 0x3105)
  // 0x3100: PV 输入电压
  // 0x3101: PV 输入电流
  // 0x3102: PV 输入功率 (低位)
  // 0x3103: PV 输入功率 (高位)
  // 0x3104: 电池电压
  // 0x3105: 电池充电电流
  
  // 0x04 是 "Read Input Registers" 功能码
  result = node.readInputRegisters(0x3100, 6);

  if (result == node.ku8MBSuccess)
  {
    Serial.println("--------------------------------");
    
    // --- 太阳能板 (PV) 数据 ---
    // 原始数据通常放大了 100 倍，所以要除以 100.0
    float pvVoltage = node.getResponseBuffer(0) / 100.0;
    float pvCurrent = node.getResponseBuffer(1) / 100.0;
    
    // 功率是两个寄存器组合 (32位)，这里简化读取低位 (通常够用)
    // 准确做法是 (高位 << 16) | 低位
    float pvPower = (node.getResponseBuffer(2) | (node.getResponseBuffer(3) << 16)) / 100.0;

    Serial.print("PV Voltage:   ");
    Serial.print(pvVoltage);
    Serial.println(" V");

    Serial.print("PV Current:   ");
    Serial.print(pvCurrent);
    Serial.println(" A");
    
    Serial.print("PV Power:     ");
    Serial.print(pvPower);
    Serial.println(" W");

    // --- 蓄电池 (Battery) 数据 ---
    float battVoltage = node.getResponseBuffer(4) / 100.0;
    float battCurrent = node.getResponseBuffer(5) / 100.0;

    Serial.print("Batt Voltage: ");
    Serial.print(battVoltage);
    Serial.println(" V");

    Serial.print("Charge Amp:   ");
    Serial.print(battCurrent);
    Serial.println(" A");
  }
  else 
  {
    // 如果读取失败，打印错误代码
    // E2 = 超时 (检查接线 A/B 是否接反)
    Serial.print("Error reading Modbus. Error code: 0x");
    Serial.println(result, HEX);
    Serial.println("Tips: Check wiring (A/B swap?), Baudrate, or Power.");
  }

  delay(2000); // 每2秒读取一次
}