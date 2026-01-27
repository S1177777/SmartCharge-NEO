// POST /api/ai/optimize - AI 充电优化建议 (安全代理)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const optimizeSchema = z.object({
  prompt: z.string().min(1).max(500),
  context: z.string().max(1000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = optimizeSchema.parse(body)

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      // 如果没有配置 API 密钥，返回模拟响应
      return NextResponse.json({
        success: true,
        data: {
          response: generateMockResponse(validated.prompt),
          isSimulated: true,
        },
      })
    }

    // 调用 Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are SmartCharge AI, an intelligent EV power allocation system.

Context: ${validated.context || 'No active charging session.'}
User Request: "${validated.prompt}"

Analyze the request and provide a concise, technical response (max 3 sentences) describing how you are reallocating power or optimizing the schedule. Be authoritative and helpful.`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7,
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', await geminiResponse.text())
      return NextResponse.json({
        success: true,
        data: {
          response: generateMockResponse(validated.prompt),
          isSimulated: true,
        },
      })
    }

    const geminiData = await geminiResponse.json()
    const responseText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      generateMockResponse(validated.prompt)

    return NextResponse.json({
      success: true,
      data: {
        response: responseText,
        isSimulated: false,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }
    console.error('AI optimize error:', error)
    return NextResponse.json(
      { success: false, error: 'AI service unavailable' },
      { status: 500 }
    )
  }
}

// 生成模拟响应
function generateMockResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes('cost') || lowerPrompt.includes('minimize')) {
    return 'Optimization initiated: Scheduling your charge during off-peak hours (22:00-06:00) to reduce costs by up to 40%. Power allocation adjusted to 7.4kW for optimal efficiency.'
  }

  if (lowerPrompt.includes('fast') || lowerPrompt.includes('speed')) {
    return 'Priority charging enabled: Allocating maximum available power (22kW) to your station. Estimated full charge in 45 minutes. Other non-priority sessions have been throttled.'
  }

  if (lowerPrompt.includes('eco') || lowerPrompt.includes('green')) {
    return 'Eco-mode activated: Synchronizing charge with solar generation peaks. Current grid carbon intensity is low. Your session will prioritize renewable energy sources.'
  }

  return 'Smart allocation in progress: Analyzing grid load patterns and your historical usage. Optimal charging window identified. Power distribution adjusted for maximum efficiency.'
}
