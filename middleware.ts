import { type NextRequest, NextResponse } from 'next/server'

const publicRoutes = ['/']

// More specific routes must be listed first — middleware matches the longest prefix
const roleRoutes: Record<string, string[]> = {
  '/dashboard/admin/reports': ['system_admin', 'hr_manager', 'executive'],
  '/dashboard/admin':         ['system_admin', 'hr_manager'],
  '/dashboard/approvals':     ['line_manager', 'hr_manager', 'system_admin'],
  '/dashboard/team':          ['line_manager'],
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

      // Find the most specific (longest) matching route prefix
      let matchedRoute = ''
      let matchedRoles: string[] = []
      for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
        if (pathname.startsWith(route) && route.length > matchedRoute.length) {
          matchedRoute = route
          matchedRoles = allowedRoles
        }
      }
      if (matchedRoute && !matchedRoles.includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
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
