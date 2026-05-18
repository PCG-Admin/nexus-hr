"use client"

import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import { LogOut, Calendar, Users, Shield, BarChart3 } from "lucide-react"
import Image from "next/image"
import { NotificationBell } from "@/components/notification-bell"

export function NavHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  const isManager = user?.role === "manager" || user?.role === "admin" || user?.role === "ceo"
  const isAdmin = user?.role === "admin" || user?.role === "ceo"
  const isOnApprovals = pathname?.includes("/approvals")
  const isOnAdmin = pathname?.includes("/admin") && !pathname?.includes("/admin/reports")
  const isOnReports = pathname?.includes("/admin/reports")

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/XLNEXUSLOGO.png"
              alt="Nexus HR Logo"
              width={200}
              height={80}
              className="object-contain h-20 w-auto -my-4"
            />
            <div>
              <h1 className="text-xl font-semibold">Leave Platform</h1>
              <p className="text-sm text-muted-foreground">BCEA Compliant</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isManager && <NotificationBell />}
            <div className="text-right">
              <p className="text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {(isManager || isAdmin) && (
          <div className="mt-4 flex gap-2">
            <Button
              variant={!isOnApprovals && !isOnAdmin && !isOnReports ? "default" : "ghost"}
              size="sm"
              onClick={() => router.push("/dashboard")}
            >
              <Calendar className="w-4 h-4 mr-2" />
              My Leave
            </Button>
            <Button
              variant={isOnApprovals ? "default" : "ghost"}
              size="sm"
              onClick={() => router.push("/dashboard/approvals")}
            >
              <Users className="w-4 h-4 mr-2" />
              Team Approvals
            </Button>
            {isAdmin && (
              <>
                <Button
                  variant={isOnAdmin ? "default" : "ghost"}
                  size="sm"
                  onClick={() => router.push("/dashboard/admin")}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
                <Button
                  variant={isOnReports ? "default" : "ghost"}
                  size="sm"
                  onClick={() => router.push("/dashboard/admin/reports")}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Reports
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
