// GET /api/sessions - 获取充电会话历史
// POST /api/sessions - 创建新充电会话

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET: 获取充电会话列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const stationId = searchParams.get('stationId')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: {
      userId?: string
      stationId?: number
    } = {}

    if (userId) {
      where.userId = userId
    }
    if (stationId) {
      where.stationId = parseInt(stationId)
    }

    const sessions = await prisma.chargingSession.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: limit,
      include: {
        station: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: sessions,
      count: sessions.length,
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

// POST: 创建新充电会话
const createSessionSchema = z.object({
  userId: z.string(),
  stationId: z.number().int().positive(),
  energyDelivered: z.number().optional(),
  cost: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createSessionSchema.parse(body)

    // 检查站点是否存在
    const station = await prisma.chargingStation.findUnique({
      where: { id: validated.stationId },
    })

    if (!station) {
      return NextResponse.json(
        { success: false, error: 'Station not found' },
        { status: 404 }
      )
    }

    // 创建充电会话
    const session = await prisma.chargingSession.create({
      data: {
        userId: validated.userId,
        stationId: validated.stationId,
        energyDelivered: validated.energyDelivered,
        cost: validated.cost,
      },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    })

    // 更新站点状态为占用
    await prisma.chargingStation.update({
      where: { id: validated.stationId },
      data: { status: 'OCCUPIED' },
    })

    return NextResponse.json(
      { success: true, data: session },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error creating session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
