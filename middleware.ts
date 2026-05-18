import { type NextRequest, NextResponse } from 'next/server'

const publicRoutes = ['/']

const roleRoutes: Record<string, string[]> = {
  '/dashboard/admin': ['admin', 'ceo'],
  '/dashboard/approvals': ['manager', 'admin', 'ceo'],
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const sessionCookie = request.cookies.get('demo-session')

  if (publicRoutes.includes(pathname)) {
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/dashboard')) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    try {
      const data = JSON.parse(decodeURIComponent(sessionCookie.value))
      const role = data.role
      for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
        if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
    } catch {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
