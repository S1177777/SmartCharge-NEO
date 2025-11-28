# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**SmartCharge NEO** 是一个智能电动汽车充电桩管理系统,结合了 IoT 硬件和 Web 应用程序。这是索邦大学工程课程的项目。

### 核心功能
- **实时监控**: 通过 IoT 传感器检测充电桩状态(空闲/占用/故障)
- **用户应用**: 交互式地图显示充电桩位置和实时可用性,支持远程预约
- **智能电网**: AI 驱动的负载均衡算法,优化能源分配,避免电网过载

## 技术架构

### Modern Data Stack (现代数据栈)
本项目采用 **Serverless 无服务器架构**,无需管理底层服务器维护,只需关注代码逻辑。对于小型团队,这是开发效率最高的选择。

### 技术栈详解

#### 1. Next.js 14 (The Brain & The Face)
**角色**: 全能框架 - 同时担任前端和后端

- **Frontend (UI 层)**:
  - 使用 App Router 构建用户界面
  - React 组件渲染登录页面、地图界面、预约按钮等
  - 全程 TypeScript 保证类型安全

- **Backend (API Routes)**:
  - `app/api/` 目录下的代码运行在服务器端
  - 处理 ESP32 的 HTTP 请求
  - 与 Neon 数据库通信
  - 实现业务逻辑和身份验证

**部署**: Vercel (自动 CI/CD,git push 即部署)

#### 2. Neon (The Memory)
**角色**: Serverless PostgreSQL 数据库

**优势**:
- **自动休眠**: 无请求时自动休眠,有请求时毫秒级唤醒 (节省成本)
- **分离计算与存储**: 可以像 Git 分支一样瞬间复制数据库用于测试
- **无需运维**: 不需要购买和维护专用服务器
- **按需扩展**: 流量增加时自动扩容

**存储内容**: 用户账户、充电桩状态、预约记录、充电历史、传感器数据

#### 3. Prisma (The Translator)
**角色**: ORM (对象关系映射) - 数据库工具

**解决的问题**: 让 TypeScript 代码和 SQL 数据库无缝对话

**不用 Prisma**:
```typescript
// 容易出错的手写 SQL
const result = await db.query("SELECT * FROM stations WHERE status = 'available'")
```

**使用 Prisma**:
```typescript
// 类型安全,自动补全
const stations = await prisma.chargingStation.findMany({
  where: { status: 'AVAILABLE' }
})
```

**关键特性**:
- Schema 定义在 `prisma/schema.prisma` 文件中
- 自动生成 TypeScript 类型
- 智能代码补全 (敲 `station.` 自动提示所有字段)
- 迁移管理 (`prisma migrate`)

#### 4. ESP32 (The Sensor)
**角色**: IoT 微控制器

**功能**:
- 读取电流/电压传感器数据
- 控制 LED 状态指示灯
- 通过 HTTP POST 发送数据到 Next.js API

#### 5. Tailwind CSS (The Stylist)
**角色**: 实用优先的 CSS 框架

**优势**: 快速构建响应式界面,无需写自定义 CSS

### 完整数据流示例

**场景**: 用户打开 App 查看充电桩

1. **用户浏览器** → 请求 `https://yourapp.vercel.app`
2. **Vercel** → Next.js 渲染首页,返回 HTML
3. **前端 React** → 调用 `fetch('/api/stations')`
4. **Next.js API** → 执行 `prisma.chargingStation.findMany()`
5. **Neon 数据库** → 返回充电桩列表 `[{id: 1, status: 'AVAILABLE'}, ...]`
6. **API 返回 JSON** → 前端收到数据
7. **地图界面** → 显示绿色图标 (空闲) 或红色图标 (占用)

**同时,ESP32 在后台**:
```
ESP32 检测到电流 → 状态变为 "占用"
→ POST /api/iot/stations/1 { status: 'OCCUPIED' }
→ Next.js 更新数据库
→ 前端实时刷新,图标变红
```

## 开发指南

### 项目初始化 (待实现时)
```bash
# 安装依赖
npm install

# 设置环境变量
cp .env.example .env.local
# 配置 DATABASE_URL (Neon) 和其他必需的环境变量

# 运行 Prisma 迁移
npx prisma migrate dev

# 生成 Prisma Client
npx prisma generate

# 启动开发服务器
npm run dev
```

### 数据库操作 (Prisma 工作流)

#### 基础命令
```bash
# 可视化管理数据库 (推荐!)
npx prisma studio
# 会打开 http://localhost:5555,可以直接增删改查数据

# 创建新的迁移 (修改 schema.prisma 后)
npx prisma migrate dev --name add_charging_stations

# 仅生成 Prisma Client (不改数据库结构)
npx prisma generate

# 重置数据库到初始状态 (慎用!)
npx prisma migrate reset
```

#### Prisma 开发流程
1. **修改 schema**: 编辑 `prisma/schema.prisma`
   ```prisma
   model ChargingStation {
     id       Int      @id @default(autoincrement())
     name     String
     status   StationStatus
     location String
     createdAt DateTime @default(now())
   }
   ```

2. **创建迁移**: `npx prisma migrate dev --name add_station_model`
   - 自动生成 SQL 迁移文件
   - 应用到 Neon 数据库
   - 重新生成 TypeScript 类型

3. **使用 Prisma Client**:
   ```typescript
   import { PrismaClient } from '@prisma/client'
   const prisma = new PrismaClient()

   // 创建充电桩
   const station = await prisma.chargingStation.create({
     data: { name: 'Station A', status: 'AVAILABLE', location: 'Paris' }
   })

   // 查询所有空闲充电桩
   const available = await prisma.chargingStation.findMany({
     where: { status: 'AVAILABLE' }
   })
   ```

#### 团队协作 (多人开发)
```bash
# Amine 拉取最新代码后
git pull
npm install  # 更新依赖
npx prisma generate  # 同步数据库类型

# Nicolas 想在本地测试新 schema,不影响团队数据库
# 可以使用 Neon 的分支功能 (类似 Git 分支)
```

### 构建和部署
```bash
# 构建生产版本
npm run build

# 本地运行生产构建
npm start

# 运行 linter
npm run lint
```

## 架构设计原则

### API 设计
- **IoT 端点**: `/api/iot/stations/[id]` - 接收 ESP32 发送的充电桩状态更新
- **用户端点**: `/api/stations` - 获取充电桩列表和可用性
- **预约端点**: `/api/reservations` - 处理充电桩预约

### 数据模型 (预期的 Prisma Schema)
主要实体:
- `User`: 用户账户信息
- `ChargingStation`: 充电桩信息(位置、状态、功率)
- `Reservation`: 用户预约记录
- `ChargingSession`: 充电会话历史
- `TelemetryData`: IoT 传感器数据

### 状态管理
充电桩状态枚举:
- `AVAILABLE`: 空闲可用
- `OCCUPIED`: 正在充电
- `RESERVED`: 已被预约
- `MAINTENANCE`: 维护中
- `FAULT`: 故障

### Smart Grid 算法
负载均衡逻辑应考虑:
- 当前电网负载
- 充电桩功率需求
- 预约优先级
- 历史使用模式预测高峰时段

## 架构优势 (为什么这个技术栈能打动评委)

### 1. 工程化程度高
- 使用业界标准的**分层架构**,而非单一文件的简陋实现
- 前端/后端/数据库/IoT 各司其职,职责清晰
- 代码组织符合 Next.js App Router 最佳实践

### 2. 类型安全 (Type Safety)
- **全程 TypeScript**: 从前端到后端到数据库,类型一致
- **Prisma 自动生成类型**: 数据库 schema 变更自动同步到代码
- **减少运行时错误**: 大部分错误在编译时就能发现

示例:
```typescript
// Prisma 确保你不会拼错字段名
const station = await prisma.chargingStation.findUnique({
  where: { id: 1 }
})
// station 的类型是自动推断的,编辑器会提示 station.location, station.status 等
```

### 3. 可扩展性 (Scalability)
- **Serverless 架构**: 理论上可以从 2 个充电桩扩展到 10,000 个
- **Vercel 自动扩容**: 流量增加时自动分配更多计算资源
- **Neon 弹性存储**: 数据量增长不需要手动升级数据库
- **无需改代码**: 从演示项目到生产环境,代码无需修改

### 4. 开发效率
- **Prisma Studio**: 可视化数据库管理工具 (比写 SQL 快 10 倍)
- **Hot Reload**: 代码改动后浏览器自动刷新
- **Git Push = 部署**: Vercel 自动构建和部署,无需手动上传
- **TypeScript 智能提示**: IDE 会自动补全,减少查文档时间

### 5. 成本优化
对于学生项目:
- **Vercel**: 有免费额度,足够演示使用
- **Neon**: Free tier 提供 0.5 GB 存储 + 自动休眠
- **总成本**: 0 元即可运行完整系统 (仅需购买 ESP32 硬件)

### 6. 现代化技术栈
- 符合 2024-2025 年的行业趋势
- 证明团队关注前沿技术
- 简历上可以写: "使用 Next.js 14 App Router + Serverless PostgreSQL 构建全栈 IoT 应用"

## ESP32 集成

### 通信协议
- ESP32 使用 HTTP POST 发送状态更新到 Next.js API
- 数据格式: JSON 包含充电桩 ID、状态、电流/电压读数
- 认证: 使用 API 密钥或设备令牌

### 传感器数据
ESP32 应监控:
- 电流传感器: 检测充电活动
- 电压传感器: 监控电源质量
- LED 指示器: 提供视觉状态反馈

## 开发注意事项

### 代码规范
- **全部使用 TypeScript**: 不要写 `.js` 文件
- **使用 App Router**: 文件放在 `app/` 目录,而非 `pages/`
- **API Routes 位置**: `app/api/` 目录下
- **组件命名**: React 组件使用 PascalCase (如 `StationMap.tsx`)
- **服务端组件优先**: Next.js 默认是 Server Components,需要交互才用 `'use client'`

### 环境变量管理
在 `.env.local` 中配置 (不要提交到 Git):
```env
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require"
NEXT_PUBLIC_API_URL="https://yourapp.vercel.app"
IOT_API_KEY="your-secret-key-for-esp32"
```

**重要**:
- 以 `NEXT_PUBLIC_` 开头的变量会暴露到浏览器端
- 敏感信息 (数据库 URL, API 密钥) 不要加 `NEXT_PUBLIC_` 前缀

### TypeScript 最佳实践
```typescript
// ✅ 好的做法: 使用 Prisma 生成的类型
import { ChargingStation, StationStatus } from '@prisma/client'

async function getStation(id: number): Promise<ChargingStation | null> {
  return await prisma.chargingStation.findUnique({ where: { id } })
}

// ❌ 避免: 手动定义已有的类型
interface Station {  // Prisma 已经生成了这个类型!
  id: number
  name: string
}
```

### API 路由安全
```typescript
// app/api/iot/stations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // 验证 ESP32 的请求
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== process.env.IOT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 处理业务逻辑
  const data = await req.json()
  // ...
}
```

### 错误处理
```typescript
// ✅ 始终处理 Prisma 可能的错误
try {
  const station = await prisma.chargingStation.update({
    where: { id: stationId },
    data: { status: 'OCCUPIED' }
  })
} catch (error) {
  console.error('Failed to update station:', error)
  return NextResponse.json({ error: 'Database error' }, { status: 500 })
}
```

## 项目状态

当前项目处于初始阶段,尚未实现代码。

### 开发路线图
1. **阶段 1: 基础设施** (优先级最高)
   - 初始化 Next.js 项目 (`npx create-next-app@latest`)
   - 设置 Neon 数据库并配置 Prisma
   - 定义数据模型 (`prisma/schema.prisma`)
   - 运行第一次迁移

2. **阶段 2: 后端 API**
   - 创建充电桩 CRUD API (`/api/stations`)
   - 实现 IoT 数据接收端点 (`/api/iot/stations/[id]`)
   - 添加身份验证 (推荐使用 NextAuth.js)

3. **阶段 3: 前端界面**
   - 实现地图组件 (可使用 Leaflet 或 Google Maps API)
   - 充电桩列表页面
   - 用户仪表板

4. **阶段 4: IoT 集成**
   - 编写 ESP32 固件 (Arduino IDE 或 PlatformIO)
   - 测试传感器数据采集
   - 实现 HTTP POST 到 Next.js API

5. **阶段 5: 智能算法**
   - 负载均衡算法
   - 预约调度逻辑
   - 高峰时段预测 (可选)

## 团队

- Ren Yulin (yulin.ren@etu.sorbonne-universite.fr)
- Amine
- Nicolas
