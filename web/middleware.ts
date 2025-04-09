import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const NECESSARY_DOMAIN = '*.sentry.io http://localhost:* http://127.0.0.1:* https://analytics.google.com googletagmanager.com *.googletagmanager.com https://www.google-analytics.com https://api.github.com'

// 统一使用的token键名
export const TOKEN_KEY = 'auth_token'

export function middleware(request: NextRequest) {
  // 调试日志
  console.log('Middleware processing path:', request.nextUrl.pathname)

  // Check if the request is for a chat page but not for the login page
  if (request.nextUrl.pathname.startsWith('/chat') && !request.nextUrl.pathname.startsWith('/chat-login')) {
    console.log('Chat page access detected, checking authentication')

    // Get the token from the cookie
    const token = request.cookies.get(TOKEN_KEY)?.value
    console.log('Token from cookie:', !!token)
    // console.log('Token from cookie token:', token);

    // 如果没有找到cookie中的token，尝试从Authorization头中获取
    const authHeader = request.headers.get('Authorization')
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
    console.log('Token from Authorization header:', !!authToken)

    // 使用cookie或header中的token
    const validToken = token || authToken

    // 检查URL参数中是否有token（用于开发测试）
    const urlToken = request.nextUrl.searchParams.get('token')
    if (urlToken && !validToken) {
      console.log('Found token in URL, allowing access')
      // 将URL参数中的token设置到cookie中
      const response = NextResponse.next()
      response.cookies.set(TOKEN_KEY, urlToken, {
        path: '/',
        maxAge: 86400,
        sameSite: 'lax',
      })
      return response
    }

    // If no token is found, redirect to the custom login page
    if (!validToken) {
      console.log('No valid token found, redirecting to login page')
      const url = request.nextUrl.clone()
      url.pathname = '/chat-login'
      // Add the original URL as a redirect parameter
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    console.log('Valid token found, allowing access to chat page')
  }

  // 如果是登录页面，不需要做任何特殊处理
  if (request.nextUrl.pathname.startsWith('/chat-login')) {
    console.log('Login page access, no redirect needed')
    return NextResponse.next()
  }

  // Continue with the CSP configuration
  const isWhiteListEnabled = !!process.env.NEXT_PUBLIC_CSP_WHITELIST && process.env.NODE_ENV === 'production'
  if (!isWhiteListEnabled)
    return NextResponse.next()

  const whiteList = `${process.env.NEXT_PUBLIC_CSP_WHITELIST} ${NECESSARY_DOMAIN}`
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = `'nonce-${nonce}'`

  const scheme_source = 'data: mediastream: blob: filesystem:'

  const cspHeader = `
    default-src 'self' ${scheme_source} ${csp} ${whiteList};
    connect-src 'self' ${scheme_source} ${csp} ${whiteList};
    script-src 'self' ${scheme_source} ${csp} ${whiteList};
    style-src 'self' 'unsafe-inline' ${csp} ${whiteList};
    img-src 'self' ${scheme_source} ${csp} ${whiteList};
    font-src 'self' ${scheme_source} ${csp} ${whiteList};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set(
    'Content-Security-Policy',
    cspHeader.replace(/\s{2,}/g, ' ').trim(),
  )

  return NextResponse.next({
    headers: requestHeaders,
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
