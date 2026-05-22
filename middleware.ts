import { type NextRequest, NextResponse } from "next/server"

// More specific routes must come first — middleware matches the longest prefix
const roleRoutes: Record<string, string[]> = {
  "/dashboard/admin/reports": ["system_admin", "hr_manager", "executive"],
  "/dashboard/admin":         ["system_admin", "hr_manager"],
  "/dashboard/approvals":     ["line_manager", "hr_manager", "system_admin"],
  "/dashboard/team":          ["line_manager"],
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // nexus-role is set client-side by auth.tsx after login (7-day max-age, SameSite=Lax).
  // Unlike Supabase's session cookies (which arrive via server redirect Set-Cookie headers
  // and are dropped by the VS Code webview), this cookie is set via document.cookie and
  // survives reliably. We use it as the auth signal for routing.
  const role = request.cookies.get("nexus-role")?.value

  // Root — redirect authenticated users straight to dashboard
  if (pathname === "/") {
    if (role) return NextResponse.redirect(new URL("/dashboard", request.url))
    return NextResponse.next()
  }

  // All dashboard routes require a valid session (role cookie present)
  if (pathname.startsWith("/dashboard")) {
    if (!role) return NextResponse.redirect(new URL("/", request.url))

    // RBAC: check role against route-specific allow-list
    let matchedRoute = ""
    let matchedRoles: string[] = []
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route) && route.length > matchedRoute.length) {
        matchedRoute = route
        matchedRoles = allowedRoles
      }
    }
    if (matchedRoute && !matchedRoles.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
