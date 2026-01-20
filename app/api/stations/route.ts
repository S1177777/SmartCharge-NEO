// GET /api/stations - 获取所有充电桩列表
// POST /api/stations - 创建新充电桩 (管理员功能)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { StationStatus, PowerType } from '@prisma/client'
import { z } from 'zod'

// GET: 获取充电桩列表 (支持筛选)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 解析筛选参数
    const status = searchParams.get('status') as StationStatus | null
    const powerType = searchParams.get('powerType') as PowerType | null
    const city = searchParams.get('city')
    const search = searchParams.get('search')

    // 构建查询条件
    const where: {
      status?: StationStatus
      powerType?: PowerType
      city?: string
      OR?: Array<{ name?: { contains: string, mode: 'insensitive' }, address?: { contains: string, mode: 'insensitive' } }>
    } = {}

    if (status && Object.values(StationStatus).includes(status)) {
      where.status = status
    }
    if (powerType && Object.values(PowerType).includes(powerType)) {
      where.powerType = powerType
    }
    if (city) {
      where.city = city
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }

    const stations = await prisma.chargingStation.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        status: true,
        powerType: true,
        maxPower: true,
        latitude: true,
        longitude: true,
        address: true,
        city: true,
        deviceId: true,
        lastPing: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: stations,
      count: stations.length,
    })
  } catch (error) {
    console.error('Error fetching stations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stations' },
      { status: 500 }
    )
  }
}

// POST: 创建新充电桩 (需要验证)
const createStationSchema = z.object({
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1),
  city: z.string().default('Paris'),
  powerType: z.enum(['AC_SLOW', 'AC_FAST', 'DC_FAST']).default('AC_SLOW'),
  maxPower: z.number().positive().default(7.4),
  deviceId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createStationSchema.parse(body)

    const station = await prisma.chargingStation.create({
      data: validated,
    })

    return NextResponse.json(
      { success: true, data: station },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating station:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create station' },
      { status: 500 }
    )
  }
}
