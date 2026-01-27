// POST /api/auth/login - 简化版用户登录 (根据 email 查找/创建用户)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = loginSchema.parse(body)

    // 查找用户，如果不存在则创建
    let user = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (!user) {
      // 自动创建新用户 (简化版注册)
      const emailName = validated.email.split('@')[0]
      const formattedName = emailName
        .split(/[._-]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ')

      user = await prisma.user.create({
        data: {
          email: validated.email,
          name: formattedName,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}
