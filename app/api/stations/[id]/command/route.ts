// POST /api/stations/[id]/command - 发送命令到 ESP32 设备
// 命令会被存储在队列中，ESP32 下次上报时会收到

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

// 命令验证 schema
const commandSchema = z.object({
  command: z.enum(['START', 'STOP', 'REBOOT']),
  payload: z.string().optional(),
})

// POST: 发送命令到设备
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const stationId = parseInt(id, 10)

    if (isNaN(stationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid station ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validated = commandSchema.parse(body)

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

    // 创建待处理命令
    const deviceCommand = await prisma.deviceCommand.create({
      data: {
        stationId,
        command: validated.command,
        payload: validated.payload,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        commandId: deviceCommand.id,
        command: deviceCommand.command,
        status: deviceCommand.status,
        message: `Command "${validated.command}" queued for station ${stationId}`,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error creating command:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create command' },
      { status: 500 }
    )
  }
}

// GET: 获取设备的命令历史
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const stationId = parseInt(id, 10)

    if (isNaN(stationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid station ID' },
        { status: 400 }
      )
    }

    const commands = await prisma.deviceCommand.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      success: true,
      data: commands,
    })
  } catch (error) {
    console.error('Error fetching commands:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch commands' },
      { status: 500 }
    )
  }
}
