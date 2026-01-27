// GET /api/stations/[id]/telemetry - 获取充电桩的遥测数据

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteParams = { params: Promise<{ id: string }> }

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

    // 检查站点是否存在
    const station = await prisma.chargingStation.findUnique({
      where: { id: stationId },
    })

    if (!station) {
      return NextResponse.json(
        { success: false, error: 'Station not found' },
        { status: 404 }
      )
    }

    // 获取最新的遥测数据
    const latestTelemetry = await prisma.telemetryData.findFirst({
      where: { stationId },
      orderBy: { timestamp: 'desc' },
    })

    // 获取最近 24 小时的历史数据 (每小时一个点)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const historicalData = await prisma.telemetryData.findMany({
      where: {
        stationId,
        timestamp: { gte: twentyFourHoursAgo },
      },
      orderBy: { timestamp: 'asc' },
      take: 100, // 限制数据点数量
    })

    // 如果没有真实数据，返回模拟数据
    if (!latestTelemetry) {
      const simulatedData = {
        voltage: 230 + Math.random() * 5,
        current: station.status === 'OCCUPIED' ? 20 + Math.random() * 15 : 0,
        power: station.status === 'OCCUPIED' ? station.maxPower * (0.7 + Math.random() * 0.3) : 0,
        temperature: 35 + Math.random() * 15,
        timestamp: new Date().toISOString(),
      }

      return NextResponse.json({
        success: true,
        data: {
          current: simulatedData,
          history: [],
          isSimulated: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        current: {
          voltage: latestTelemetry.voltage,
          current: latestTelemetry.current,
          power: latestTelemetry.power,
          temperature: latestTelemetry.temperature,
          timestamp: latestTelemetry.timestamp.toISOString(),
        },
        history: historicalData.map(d => ({
          voltage: d.voltage,
          current: d.current,
          power: d.power,
          temperature: d.temperature,
          timestamp: d.timestamp.toISOString(),
        })),
        isSimulated: false,
      },
    })
  } catch (error) {
    console.error('Error fetching telemetry:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch telemetry data' },
      { status: 500 }
    )
  }
}
