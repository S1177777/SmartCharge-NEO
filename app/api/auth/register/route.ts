// POST /api/auth/register - 用户注册

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = registerSchema.parse(body)

    // 检查 email 是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      )
    }

    // 创建新用户
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        name: validated.name,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    )
  }
}
