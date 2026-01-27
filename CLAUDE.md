# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**SmartCharge NEO** 是一个智能电动汽车充电桩管理系统,结合了 IoT 硬件和 Web 应用程序。这是索邦大学工程课程的项目。

### 核心功能
- **实时监控**: 通过 IoT 传感器检测充电桩状态(空闲/占用/故障)
- **用户应用**: 交互式地图显示充电桩位置和实时可用性,支持远程预约
- **智能电网**: AI 驱动的负载均衡算法,优化能源分配,避免电网过载

## 技术架构

### 前后端分离架构
本项目采用 **前后端分离** 架构：
- **前端**: Vite + React (独立 SPA 应用)
- **后端**: Next.js API Routes (仅提供 REST API)
- **数据库**: Neon (Serverless PostgreSQL)

```
┌─────────────────┐     HTTP/REST      ┌─────────────────┐
│   Vite 前端     │ ◄─────────────────► │  Next.js API    │
│   (React SPA)   │                     │   (后端服务)     │
│   Port: 5173    │                     │   Port: 3000    │
└─────────────────┘                     └────────┬────────┘
                                                 │
                                                 │ Prisma
                                                 ▼
                                        ┌─────────────────┐
                                        │  Neon Database  │
                                        │  (PostgreSQL)   │
                                        └─────────────────┘
```

### 技术栈详解

#### 1. Vite + React (前端 UI)
**位置**: `app/smartcharge-neo/`
**角色**: 用户界面 - 单页应用 (SPA)

**技术特点**:
- Vite 构建工具 - 极速热更新
- React 18 + TypeScript
- React Router 客户端路由
- Tailwind CSS 样式
- Recharts 数据可视化
- Leaflet 地图组件

**主要页面**:
- `pages/Dashboard.tsx` - 用户仪表板
- `pages/MapView.tsx` - 充电桩地图
- `pages/StationDetails.tsx` - 充电桩详情
- `pages/Login.tsx` - 登录/注册
- `pages/Settings.tsx` - 用户设置

**状态管理**:
- `context/UserContext.tsx` - 用户认证状态
- `services/api.ts` - API 调用封装

#### 2. Next.js API Routes (后端服务)
**位置**: `app/api/`
**角色**: RESTful API 服务器

**API 端点**:
```
认证 API:
POST /api/auth/login      - 用户登录 (简化版,仅需 email)
POST /api/auth/register   - 用户注册
GET  /api/auth/me         - 获取当前用户信息

充电桩 API:
GET  /api/stations        - 获取充电桩列表
GET  /api/stations/[id]   - 获取单个充电桩详情
POST /api/stations        - 创建充电桩 (管理员)
PATCH /api/stations/[id]  - 更新充电桩状态

预约 API:
GET  /api/reservations    - 获取预约列表
POST /api/reservations    - 创建预约
PATCH /api/reservations/[id] - 更新预约状态

会话 API:
GET  /api/sessions        - 获取充电会话
POST /api/sessions        - 开始充电会话

统计 API:
GET  /api/stats           - 获取 Dashboard 统计数据

IoT API:
POST /api/iot/stations/[id] - ESP32 上报状态
GET  /api/stations/[id]/telemetry - 获取传感器遥测数据
```

#### 3. Neon (数据库)
**角色**: Serverless PostgreSQL 数据库

**优势**:
- **自动休眠**: 无请求时自动休眠,有请求时毫秒级唤醒
- **分支功能**: 像 Git 一样分支数据库用于测试
- **按需扩展**: 流量增加时自动扩容

#### 4. Prisma (ORM)
**角色**: 数据库访问层

**Schema 位置**: `prisma/schema.prisma`

**数据模型**:
- `User` - 用户账户
- `ChargingStation` - 充电桩
- `Reservation` - 预约记录
- `ChargingSession` - 充电会话
- `TelemetryData` - IoT 传感器数据

#### 5. ESP32 (IoT 设备)
**位置**: `firmware/`
**角色**: 物联网传感器

**功能**:
- 读取电流/电压传感器
- 控制继电器和 LED 指示灯
- 通过 HTTP POST 上报数据到 Next.js API

## 开发指南

### 项目结构
```
SmartCharge-NEO/
├── app/
│   ├── api/                    # Next.js API Routes (后端)
│   │   ├── auth/               # 认证 API
│   │   ├── stations/           # 充电桩 API
│   │   ├── reservations/       # 预约 API
│   │   ├── sessions/           # 会话 API
│   │   ├── stats/              # 统计 API
│   │   └── iot/                # IoT 设备 API
│   │
│   └── smartcharge-neo/        # Vite 前端 (独立项目)
│       ├── components/         # React 组件
│       ├── pages/              # 页面组件
│       ├── context/            # React Context
│       ├── services/           # API 服务
│       ├── constants.ts        # 常量定义
│       ├── types.ts            # TypeScript 类型
│       └── vite.config.ts      # Vite 配置
│
├── prisma/
│   ├── schema.prisma           # 数据库模型
│   └── seed.ts                 # 种子数据
│
├── firmware/                   # ESP32 固件代码
│   ├── SmartCharge/            # 主控制器代码
│   └── ACS712/                 # 电流传感器测试
│
├── lib/
│   └── prisma.ts               # Prisma 客户端单例
│
└── package.json                # Next.js 后端依赖
```

### 启动开发环境

**需要同时运行两个服务器！**

#### 终端 1 - 启动 Next.js 后端 (Port 3000)
```bash
cd SmartCharge-NEO
npm install
npx prisma generate
npm run dev
```

#### 终端 2 - 启动 Vite 前端 (Port 5173)
```bash
cd SmartCharge-NEO/app/smartcharge-neo
npm install
npm run dev
```

#### 访问应用
- **前端界面**: http://localhost:5173
- **后端 API**: http://localhost:3000/api/...
- **Prisma Studio**: `npx prisma studio` → http://localhost:5555

### 环境变量配置

#### 后端 `.env.local` (根目录)
```env
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require"
IOT_API_KEY="your-secret-key-for-esp32"
```

#### 前端 `.env.local` (app/smartcharge-neo/)
```env
VITE_API_URL=http://localhost:3000
GEMINI_API_KEY=your-gemini-api-key  # 用于 AI 功能
```

### 数据库操作

```bash
# 可视化管理数据库
npx prisma studio

# 创建迁移
npx prisma migrate dev --name add_feature

# 生成 Prisma Client
npx prisma generate

# 重置数据库 (慎用!)
npx prisma migrate reset

# 填充种子数据
npx prisma db seed
```

### API 调用示例

#### 前端调用 (services/api.ts)
```typescript
// 登录
const user = await loginUser('email@example.com');

// 获取充电桩列表
const stations = await fetchStations();

// 创建预约
await createReservation({
  userId: user.id,
  stationId: 1,
  startTime: '2024-01-01T10:00:00Z',
  endTime: '2024-01-01T11:00:00Z',
});
```

#### cURL 测试
```bash
# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 获取充电桩
curl http://localhost:3000/api/stations

# 创建预约
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"userId": "xxx", "stationId": 1, "startTime": "...", "endTime": "..."}'
```

## 代码规范

### 前端 (Vite/React)
- 组件使用 PascalCase: `StationCard.tsx`
- 服务/工具使用 camelCase: `api.ts`
- 使用 React Hooks 管理状态
- 使用 TypeScript 严格模式

### 后端 (Next.js API)
- API 路由使用 RESTful 风格
- 使用 Zod 验证请求数据
- 统一响应格式: `{ success: boolean, data?: T, error?: string }`
- 错误处理使用 try-catch

### 类型安全
```typescript
// 使用 Prisma 生成的类型
import { ChargingStation, User } from '@prisma/client'

// 前端 API 响应类型定义在 services/api.ts
import { BackendStation, BackendUser } from '../services/api'
```

## 项目状态

### 已完成
- ✅ 数据库模型设计 (Prisma Schema)
- ✅ 后端 API 实现 (认证、充电桩、预约、会话、统计)
- ✅ 前端 UI 实现 (Dashboard、地图、详情页、设置)
- ✅ 用户认证流程 (简化版)
- ✅ ESP32 基础固件

### 待完成
- ⏳ 完整的密码认证 (目前仅使用 email)
- ⏳ 实时 WebSocket 通信
- ⏳ Smart Grid 负载均衡算法
- ⏳ ESP32 与后端的完整集成
- ⏳ 生产环境部署

## 团队

- Ren Yulin (yulin.ren@etu.sorbonne-universite.fr)
- Amine
- Nicolas
