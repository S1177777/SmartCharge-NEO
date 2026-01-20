// GET /api/reservations - 获取预约列表
// POST /api/reservations - 创建新预约

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET: 获取预约列表 (支持按用户和充电桩筛选)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const stationId = searchParams.get('stationId')
    const status = searchParams.get('status')

    const where: {
      userId?: string
      stationId?: number
      status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
    } = {}

    if (userId) where.userId = userId
    if (stationId) where.stationId = parseInt(stationId, 10)
    if (status) where.status = status as 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        station: {
          select: {
            id: true,
            name: true,
            address: true,
            powerType: true,
            maxPower: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: reservations,
      count: reservations.length,
    })
  } catch (error) {
    console.error('Error fetching reservations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reservations' },
      { status: 500 }
    )
  }
}

// 创建预约的验证 schema
const createReservationSchema = z.object({
  userId: z.string().min(1),
  stationId: z.number().int().positive(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'End time must be after start time',
})

// POST: 创建新预约
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createReservationSchema.parse(body)

    const startTime = new Date(validated.startTime)
    const endTime = new Date(validated.endTime)

    // 检查充电桩是否存在
    const station = await prisma.chargingStation.findUnique({
      where: { id: validated.stationId },
    })

    if (!station) {
      return NextResponse.json(
        { success: false, error: 'Station not found' },
        { status: 404 }
      )
    }

    // 检查充电桩状态是否可用
    if (station.status === 'MAINTENANCE' || station.status === 'FAULT') {
      return NextResponse.json(
        { success: false, error: 'Station is not available for reservation' },
        { status: 400 }
      )
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: validated.userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // 检查时间冲突
    const conflictingReservation = await prisma.reservation.findFirst({
      where: {
        stationId: validated.stationId,
        status: { in: ['PENDING', 'ACTIVE'] },
        OR: [
          // 新预约的开始时间在已有预约的时间范围内
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          // 新预约的结束时间在已有预约的时间范围内
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          // 新预约完全包含已有预约
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
    })

    if (conflictingReservation) {
      return NextResponse.json(
        { success: false, error: 'Time slot is already reserved' },
        { status: 409 }
      )
    }

    // 创建预约
    const reservation = await prisma.reservation.create({
      data: {
        userId: validated.userId,
        stationId: validated.stationId,
        startTime,
        endTime,
        status: 'PENDING',
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

    return NextResponse.json(
      { success: true, data: reservation },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating reservation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create reservation' },
      { status: 500 }
    )
  }
}
