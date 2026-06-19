import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/orders', '/cart', '/checkout', '/restaurants']
const PUBLIC_AUTH = ['/login', '/register']
const GATEWAY = process.env.API_GATEWAY_URL ?? 'http://localhost:3000'

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  const isProtected = PROTECTED_PREFIXES.some(p => path === p || path.startsWith(p + '/'))
  const isPublicAuth = PUBLIC_AUTH.some(p => path === p || path.startsWith(p + '/'))

  const accessToken = req.cookies.get('access_token')?.value
  const refreshToken = req.cookies.get('refresh_token')?.value

  // Check if access token is actually still valid (not just present)
  function isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
      return payload.exp * 1000 < Date.now() + 10_000 // 10s buffer
    } catch { return true }
  }

  let authenticated = !!accessToken && !isTokenExpired(accessToken)

  // Access token missing or expired but refresh token present — attempt silent refresh
  if (!authenticated && refreshToken) {
    try {
      const res = await fetch(`${GATEWAY}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `refresh_token=${refreshToken}`,
        },
      })

      if (res.ok) {
        const data = (await res.json()) as { accessToken: string }

        // New refresh token comes back in Set-Cookie header, not JSON body
        const setCookie = res.headers.get('set-cookie') ?? ''
        const newRefreshToken = setCookie.match(/refresh_token=([^;]+)/)?.[1] ?? refreshToken

        const response = isPublicAuth
          ? NextResponse.redirect(new URL('/dashboard', req.nextUrl))
          : NextResponse.next()

        const cookieOpts = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax' as const,
          path: '/',
        }
        response.cookies.set('access_token', data.accessToken, { ...cookieOpts, maxAge: 15 * 60 })
        response.cookies.set('refresh_token', newRefreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 })
        return response
      }
      // Refresh rejected — clear stale refresh cookie
      const response = isProtected
        ? NextResponse.redirect(new URL(`/login?from=${encodeURIComponent(path)}`, req.nextUrl))
        : NextResponse.next()
      response.cookies.delete('refresh_token')
      return response
    } catch {
      // Gateway unreachable — let it through, page-level will handle
    }
  }

  if (isProtected && !authenticated) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', path)
    return NextResponse.redirect(url)
  }

  if (isPublicAuth && authenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
}
