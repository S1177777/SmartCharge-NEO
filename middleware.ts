import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// CORS 配置
const ALLOWED_ORIGINS = [
  'http://localhost:3000',  // Vite 前端开发服务器
  'http://127.0.0.1:3000',
  'http://localhost:3001',  // Vite 备用端口
  'http://127.0.0.1:3001',
  'http://localhost:5173',  // Vite 默认端口
]

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin)

  // 处理预检请求 (OPTIONS)
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })

    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
    response.headers.set('Access-Control-Max-Age', '86400')

    return response
  }

  // 处理实际请求
  const response = NextResponse.next()

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')

  return response
}

// 仅对 API 路由应用 CORS
export const config = {
  matcher: '/api/:path*',
}
