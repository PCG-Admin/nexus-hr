"use client"

import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import { useState, useCallback } from "react"
import { LogOut, Calendar, Users, Shield, BarChart3, UserCircle, UsersRound, Clock, TrendingUp } from "lucide-react"
import Image from "next/image"
import { NotificationBell } from "@/components/notification-bell"
import { useSessionTimeout } from "@/hooks/use-session-timeout"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const ROLE_LABELS: Record<string, string> = {
  employee:     "Employee",
  line_manager: "Line Manager",
  hr_manager:   "HR Manager",
  executive:    "Executive",
  system_admin: "System Admin",
}

export function NavHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)

  const handleLogout = useCallback(async () => {
    setShowTimeoutWarning(false)
    await logout()
    router.push("/")
  }, [logout, router])

  const handleStayLoggedIn = useCallback(() => {
    setShowTimeoutWarning(false)
  }, [])

  const handleWarn = useCallback(() => {
    setShowTimeoutWarning(true)
  }, [])

  useSessionTimeout(handleWarn, handleLogout, !!user)

  const isManager      = ["line_manager", "hr_manager", "system_admin"].includes(user?.role ?? "")
  const isAdmin        = ["hr_manager", "system_admin"].includes(user?.role ?? "")
  const isExecutive    = user?.role === "executive"
  const isLineManager  = user?.role === "line_manager"
  const isOnApprovals  = pathname?.includes("/approvals")
  const isOnTeam       = pathname?.includes("/team")
  const isOnAdmin      = pathname?.includes("/admin") && !pathname?.includes("/admin/reports")
  const isOnReports    = pathname?.includes("/admin/reports")
  const isOnPerformance = pathname?.includes("/performance")

  return (
    <>
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
              <button
                onClick={() => router.push("/dashboard/profile")}
                className="text-right hover:opacity-75 transition-opacity cursor-pointer"
              >
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[user?.role ?? ""] ?? user?.role}</p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard/profile")}
                title="My Profile"
                className="text-muted-foreground hover:text-foreground"
              >
                <UserCircle className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
              <Button
                variant={!isOnApprovals && !isOnTeam && !isOnAdmin && !isOnReports && !isOnPerformance && !pathname?.includes("/profile") ? "default" : "ghost"}
                size="sm"
                onClick={() => router.push("/dashboard")}
              >
                <Calendar className="w-4 h-4 mr-2" />
                My Leave
              </Button>
              <Button
                variant={pathname?.includes("/profile") ? "default" : "ghost"}
                size="sm"
                onClick={() => router.push("/dashboard/profile")}
              >
                <UserCircle className="w-4 h-4 mr-2" />
                My Profile
              </Button>
              <Button
                variant={isOnPerformance ? "default" : "ghost"}
                size="sm"
                onClick={() => router.push("/dashboard/performance")}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Performance
              </Button>
              {isLineManager && (
                <Button
                  variant={isOnTeam ? "default" : "ghost"}
                  size="sm"
                  onClick={() => router.push("/dashboard/team")}
                >
                  <UsersRound className="w-4 h-4 mr-2" />
                  My Team
                </Button>
              )}
              {isManager && (
                <Button
                  variant={isOnApprovals ? "default" : "ghost"}
                  size="sm"
                  onClick={() => router.push("/dashboard/approvals")}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Leave Approvals
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant={isOnAdmin ? "default" : "ghost"}
                  size="sm"
                  onClick={() => router.push("/dashboard/admin")}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              {(isAdmin || isExecutive) && (
                <Button
                  variant={isOnReports ? "default" : "ghost"}
                  size="sm"
                  onClick={() => router.push("/dashboard/admin/reports")}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Reports
                </Button>
              )}
            </div>
        </div>
      </header>

      {/* Session inactivity timeout warning */}
      <Dialog open={showTimeoutWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={e => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle>Session About to Expire</DialogTitle>
                <DialogDescription className="mt-1">
                  You have been inactive for 25 minutes. For security, your session will automatically
                  end in 5 minutes. Click below to stay logged in.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Log Out Now
            </Button>
            <Button onClick={handleStayLoggedIn}>
              Stay Logged In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
