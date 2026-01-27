// GET /api/stats - 获取仪表盘统计数据

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const range = searchParams.get('range') || '30d' // 7d, 30d, ytd

    // 计算日期范围
    const now = new Date()
    let startDate: Date
    if (range === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (range === 'ytd') {
      startDate = new Date(now.getFullYear(), 0, 1)
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // 并行查询所有统计数据
    const [
      stationStats,
      sessionStats,
      reservationStats,
      sessionsInRange,
      previousPeriodSessions,
    ] = await Promise.all([
      // 站点状态统计
      prisma.chargingStation.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      // 充电会话统计 (可选按用户筛选)
      prisma.chargingSession.aggregate({
        where: userId ? { userId } : undefined,
        _sum: {
          energyDelivered: true,
          cost: true,
        },
        _count: true,
      }),

      // 预约统计
      prisma.reservation.groupBy({
        by: ['status'],
        where: userId ? { userId } : undefined,
        _count: { status: true },
      }),

      // 当前时间范围内的会话统计
      prisma.chargingSession.findMany({
        where: {
          ...(userId ? { userId } : {}),
          startTime: { gte: startDate },
        },
        select: {
          startTime: true,
          endTime: true,
          energyDelivered: true,
          cost: true,
        },
      }),

      // 上一时间段的会话统计 (用于计算趋势)
      prisma.chargingSession.aggregate({
        where: {
          ...(userId ? { userId } : {}),
          startTime: {
            gte: new Date(startDate.getTime() - (now.getTime() - startDate.getTime())),
            lt: startDate,
          },
        },
        _sum: {
          energyDelivered: true,
          cost: true,
        },
        _count: true,
      }),
    ])

    // 处理站点状态
    const stationStatusMap: Record<string, number> = {}
    stationStats.forEach((stat) => {
      stationStatusMap[stat.status] = stat._count.status
    })

    // 处理预约状态
    const reservationStatusMap: Record<string, number> = {}
    reservationStats.forEach((stat) => {
      reservationStatusMap[stat.status] = stat._count.status
    })

    // 获取最近的充电会话 (用于图表)
    const recentSessions = await prisma.chargingSession.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { startTime: 'desc' },
      take: 10,
      include: {
        station: {
          select: {
            name: true,
            address: true,
          },
        },
      },
    })

    // 获取活跃预约 (当前时间在预约时间范围内，或即将开始的预约)
    const activeReservations = await prisma.reservation.findMany({
      where: {
        ...(userId ? { userId } : {}),
        status: { in: ['PENDING', 'ACTIVE'] },
        endTime: { gte: now },
      },
      orderBy: { startTime: 'asc' },
      take: 5,
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
      },
    })

    // 计算当前周期的总收入和能源
    const currentRevenue = sessionsInRange.reduce((sum, s) => sum + (s.cost || 0), 0)
    const currentEnergy = sessionsInRange.reduce((sum, s) => sum + (s.energyDelivered || 0), 0)
    const previousRevenue = previousPeriodSessions._sum.cost || 0
    const previousEnergy = previousPeriodSessions._sum.energyDelivered || 0

    // 计算趋势百分比
    const revenueTrend = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
      : currentRevenue > 0 ? '+100.0' : '0.0'
    const energyTrend = previousEnergy > 0
      ? ((currentEnergy - previousEnergy) / previousEnergy * 100).toFixed(1)
      : currentEnergy > 0 ? '+100.0' : '0.0'

    // 计算平均充电时间
    const completedSessions = sessionsInRange.filter(s => s.endTime)
    const avgChargeTimeMinutes = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => {
          const duration = s.endTime
            ? (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000
            : 0
          return sum + duration
        }, 0) / completedSessions.length
      : 0

    // 计算网络正常运行时间 (基于站点故障状态)
    const totalStations = Object.values(stationStatusMap).reduce((a, b) => a + b, 0)
    const faultStations = stationStatusMap['FAULT'] || 0
    const uptime = totalStations > 0
      ? ((totalStations - faultStations) / totalStations * 100).toFixed(1)
      : '100.0'

    // 估算 CO2 节省 (每 kWh 约节省 0.4kg CO2)
    const co2Saved = (currentEnergy * 0.4 / 1000).toFixed(1) // 转换为吨

    // 按日期分组能源消耗数据 (用于图表)
    const energyByDate = sessionsInRange.reduce((acc, session) => {
      const date = new Date(session.startTime).toLocaleDateString('en-US', { weekday: 'short' })
      acc[date] = (acc[date] || 0) + (session.energyDelivered || 0)
      return acc
    }, {} as Record<string, number>)

    const energyConsumptionData = Object.entries(energyByDate).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }))

    return NextResponse.json({
      success: true,
      data: {
        // 站点统计
        stations: {
          total: totalStations,
          available: stationStatusMap['AVAILABLE'] || 0,
          occupied: stationStatusMap['OCCUPIED'] || 0,
          reserved: stationStatusMap['RESERVED'] || 0,
          maintenance: stationStatusMap['MAINTENANCE'] || 0,
          fault: stationStatusMap['FAULT'] || 0,
        },

        // 充电统计
        charging: {
          totalSessions: sessionStats._count,
          totalEnergy: sessionStats._sum.energyDelivered || 0,
          totalCost: sessionStats._sum.cost || 0,
        },

        // 预约统计
        reservations: {
          pending: reservationStatusMap['PENDING'] || 0,
          active: reservationStatusMap['ACTIVE'] || 0,
          completed: reservationStatusMap['COMPLETED'] || 0,
          cancelled: reservationStatusMap['CANCELLED'] || 0,
        },

        // 活跃预约详情
        activeReservations,

        // 最近充电会话
        recentSessions,

        // Analytics 页面需要的额外数据
        analytics: {
          revenue: currentRevenue,
          revenueTrend: `${Number(revenueTrend) >= 0 ? '+' : ''}${revenueTrend}%`,
          avgChargeTime: avgChargeTimeMinutes,
          uptime: `${uptime}%`,
          co2Saved: `${co2Saved} Tons`,
          energyConsumptionData,
          range,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
