import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// More specific routes must come first — middleware matches the longest prefix
const roleRoutes: Record<string, string[]> = {
  "/dashboard/admin/reports": ["system_admin", "hr_manager", "executive"],
  "/dashboard/admin":         ["system_admin", "hr_manager"],
  "/dashboard/approvals":     ["line_manager", "hr_manager", "system_admin"],
  "/dashboard/team":          ["line_manager"],
}

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Root — redirect authenticated users straight to dashboard
  if (pathname === "/") {
    if (user) return NextResponse.redirect(new URL("/dashboard", request.url))
    return supabaseResponse
  }

  // All dashboard routes require a valid Supabase session
  if (pathname.startsWith("/dashboard")) {
    if (!user) return NextResponse.redirect(new URL("/", request.url))

    // Role cookie is set by auth.tsx on login — used for RBAC without a DB call
    const role = request.cookies.get("nexus-role")?.value

    if (role) {
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
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
