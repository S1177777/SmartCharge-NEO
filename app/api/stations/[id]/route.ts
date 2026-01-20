// GET /api/stations/[id] - 获取单个充电桩详情
// PATCH /api/stations/[id] - 更新充电桩状态
// DELETE /api/stations/[id] - 删除充电桩

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { StationStatus, PowerType } from '@prisma/client'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

// GET: 获取充电桩详情 (包含最近的遥测数据)
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

    const station = await prisma.chargingStation.findUnique({
      where: { id: stationId },
      include: {
        // 获取最近 10 条遥测数据
        telemetryData: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
        // 获取今日预约
        reservations: {
          where: {
            startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            endTime: { lte: new Date(new Date().setHours(23, 59, 59, 999)) },
          },
          orderBy: { startTime: 'asc' },
        },
      },
    })

    if (!station) {
      return NextResponse.json(
        { success: false, error: 'Station not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: station })
  } catch (error) {
    console.error('Error fetching station:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch station' },
      { status: 500 }
    )
  }
}

// PATCH: 更新充电桩信息
const updateStationSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'FAULT']).optional(),
  powerType: z.enum(['AC_SLOW', 'AC_FAST', 'DC_FAST']).optional(),
  maxPower: z.number().positive().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().min(1).optional(),
  city: z.string().optional(),
  deviceId: z.string().optional(),
})

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const validated = updateStationSchema.parse(body)

    // 检查充电桩是否存在
    const existing = await prisma.chargingStation.findUnique({
      where: { id: stationId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Station not found' },
        { status: 404 }
      )
    }

    const station = await prisma.chargingStation.update({
      where: { id: stationId },
      data: validated,
    })

    return NextResponse.json({ success: true, data: station })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating station:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update station' },
      { status: 500 }
    )
  }
}

// DELETE: 删除充电桩
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const stationId = parseInt(id, 10)

    if (isNaN(stationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid station ID' },
        { status: 400 }
      )
    }

    // 检查是否存在
    const existing = await prisma.chargingStation.findUnique({
      where: { id: stationId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Station not found' },
        { status: 404 }
      )
    }

    await prisma.chargingStation.delete({
      where: { id: stationId },
    })

    return NextResponse.json({
      success: true,
      message: `Station ${stationId} deleted successfully`,
    })
  } catch (error) {
    console.error('Error deleting station:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete station' },
      { status: 500 }
    )
  }
}
