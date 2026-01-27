// GET /api/sessions/[id] - 获取单个充电会话
// PATCH /api/sessions/[id] - 结束充电会话

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET: 获取单个充电会话
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const session = await prisma.chargingSession.findUnique({
      where: { id },
      include: {
        station: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: session })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}

// PATCH: 结束充电会话
const endSessionSchema = z.object({
  energyDelivered: z.number().optional(),
  cost: z.number().optional(),
})

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const validated = endSessionSchema.parse(body)

    // 检查会话是否存在
    const existingSession = await prisma.chargingSession.findUnique({
      where: { id },
    })

    if (!existingSession) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    // 结束充电会话
    const session = await prisma.chargingSession.update({
      where: { id },
      data: {
        endTime: new Date(),
        energyDelivered: validated.energyDelivered,
        cost: validated.cost,
      },
      include: {
        station: true,
      },
    })

    // 更新站点状态为可用
    await prisma.chargingStation.update({
      where: { id: session.stationId },
      data: { status: 'AVAILABLE' },
    })

    return NextResponse.json({ success: true, data: session })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error ending session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to end session' },
      { status: 500 }
    )
  }
}
