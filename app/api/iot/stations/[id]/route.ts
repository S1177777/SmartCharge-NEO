// POST /api/iot/stations/[id] - ESP32 发送传感器数据
// 此端点专门用于 IoT 设备，需要 API 密钥验证

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { StationStatus } from '@prisma/client'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

// IoT 数据验证 schema
const iotDataSchema = z.object({
  // 传感器数据
  voltage: z.number().min(0).max(500).optional(),      // 电压 V
  current: z.number().min(-10).max(200).optional(),    // 电流 A (允许负值用于校准)
  power: z.number().min(-10).max(100).optional(),      // 功率 kW
  temperature: z.number().min(-40).max(100).optional(), // 温度 °C

  // 太阳能数据 (来自 ESP32 EPEVER 控制器)
  pvPower: z.number().min(0).max(10000).optional(),    // 光伏功率 W
  battVoltage: z.number().min(0).max(60).optional(),   // 电池电压 V

  // 可选：直接更新状态
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'FAULT']).optional(),

  // 设备标识 (用于验证)
  deviceId: z.string().optional(),
})

// 验证 API 密钥
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const validKey = process.env.IOT_API_KEY

  // 如果未配置 IOT_API_KEY，开发环境下允许通过
  if (!validKey && process.env.NODE_ENV === 'development') {
    return true
  }

  return apiKey === validKey
}

// 根据传感器数据自动推断充电桩状态
function inferStatus(data: { current?: number; voltage?: number; power?: number }): StationStatus | null {
  // 如果电流 > 1A，认为正在充电
  if (data.current && data.current > 1) {
    return 'OCCUPIED'
  }
  // 如果有电压但无电流，认为空闲
  if (data.voltage && data.voltage > 100 && (!data.current || data.current < 0.5)) {
    return 'AVAILABLE'
  }
  // 如果电压过低，可能故障
  if (data.voltage && data.voltage < 100) {
    return 'FAULT'
  }
  return null
}

// POST: 接收 ESP32 发送的数据
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证 API 密钥
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid API key' },
        { status: 401 }
      )
    }

    const { id } = await params
    const stationId = parseInt(id, 10)

    if (isNaN(stationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid station ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validated = iotDataSchema.parse(body)

    // 检查充电桩是否存在
    const station = await prisma.chargingStation.findUnique({
      where: { id: stationId },
    })

    if (!station) {
      return NextResponse.json(
        { success: false, error: 'Station not found' },
        { status: 404 }
      )
    }

    // 可选：验证设备 ID
    if (validated.deviceId && station.deviceId !== validated.deviceId) {
      return NextResponse.json(
        { success: false, error: 'Device ID mismatch' },
        { status: 403 }
      )
    }

    // 保存遥测数据 (包括太阳能数据)
    const telemetry = await prisma.telemetryData.create({
      data: {
        stationId,
        voltage: validated.voltage,
        current: validated.current,
        power: validated.power,
        temperature: validated.temperature,
        pvPower: validated.pvPower,
        battVoltage: validated.battVoltage,
      },
    })

    // 更新充电桩状态和最后心跳时间
    const newStatus = validated.status || inferStatus(validated)
    const updateData: { lastPing: Date; status?: StationStatus } = {
      lastPing: new Date(),
    }
    if (newStatus) {
      updateData.status = newStatus
    }

    const updatedStation = await prisma.chargingStation.update({
      where: { id: stationId },
      data: updateData,
    })

    // 查找待处理的命令
    const pendingCommand = await prisma.deviceCommand.findFirst({
      where: {
        stationId,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'asc', // 先进先出
      },
    })

    // 如果有待处理命令，标记为已发送
    let command = 'NONE'
    if (pendingCommand) {
      await prisma.deviceCommand.update({
        where: { id: pendingCommand.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      })
      command = pendingCommand.command
    }

    return NextResponse.json({
      success: true,
      command, // ESP32 期望的命令字段 (顶层)
      data: {
        telemetry,
        station: {
          id: updatedStation.id,
          status: updatedStation.status,
          lastPing: updatedStation.lastPing,
        },
        command, // 也放在 data 中以保持一致性
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error processing IoT data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process IoT data' },
      { status: 500 }
    )
  }
}

// GET: 获取设备配置 (ESP32 启动时调用)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const stationId = parseInt(id, 10)

    if (isNaN(stationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid station ID' },
        { status: 400 }
      )
    }

    const station = await prisma.chargingStation.findUnique({
      where: { id: stationId },
      select: {
        id: true,
        name: true,
        deviceId: true,
        maxPower: true,
        powerType: true,
      },
    })

    if (!station) {
      return NextResponse.json(
        { success: false, error: 'Station not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...station,
        reportInterval: 5000, // 上报间隔 (ms)
        serverTime: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching station config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch config' },
      { status: 500 }
    )
  }
}
