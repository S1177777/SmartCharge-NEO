// GET /api/reservations/[id] - 获取预约详情
// PATCH /api/reservations/[id] - 更新预约状态
// DELETE /api/reservations/[id] - 取消预约

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReservationStatus } from '@prisma/client'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

// GET: 获取预约详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const reservation = await prisma.reservation.findUnique({
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

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'Reservation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: reservation })
  } catch (error) {
    console.error('Error fetching reservation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reservation' },
      { status: 500 }
    )
  }
}

// 更新预约状态的验证 schema
const updateReservationSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
})

// PATCH: 更新预约状态
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const validated = updateReservationSchema.parse(body)

    // 检查预约是否存在
    const existing = await prisma.reservation.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // 已完成或已取消的预约不能修改
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Cannot modify completed or cancelled reservation' },
        { status: 400 }
      )
    }

    const updateData: {
      status?: ReservationStatus
      startTime?: Date
      endTime?: Date
    } = {}

    if (validated.status) updateData.status = validated.status
    if (validated.startTime) updateData.startTime = new Date(validated.startTime)
    if (validated.endTime) updateData.endTime = new Date(validated.endTime)

    const reservation = await prisma.reservation.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ success: true, data: reservation })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating reservation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update reservation' },
      { status: 500 }
    )
  }
}

// DELETE: 取消预约
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 检查预约是否存在
    const existing = await prisma.reservation.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // 已完成的预约不能取消
    if (existing.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel completed reservation' },
        { status: 400 }
      )
    }

    // 将预约状态更新为已取消 (而不是物理删除)
    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: reservation,
    })
  } catch (error) {
    console.error('Error cancelling reservation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cancel reservation' },
      { status: 500 }
    )
  }
}
