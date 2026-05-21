"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { NavHeader } from "@/components/nav-header"
import { LeaveBalanceCard } from "@/components/leave-balance-card"
import { LeaveRequestList } from "@/components/leave-request-list"
import { LeaveRequestDetailDialog } from "@/components/leave-request-detail-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Users, Shield, BarChart3, TrendingUp } from "lucide-react"
import {
  getLeaveBalances,
  getLeaveRequests,
  type LeaveBalance,
  type LeaveRequest,
} from "@/lib/supabase/leave-service"

const DEMO_BALANCES: LeaveBalance[] = [
  { id: "demo-1", userId: "", leaveTypeId: "demo-annual",    leaveTypeName: "Annual Leave",          totalDays: 15,  usedDays: 0, availableDays: 15,  year: new Date().getFullYear(), color: null },
  { id: "demo-2", userId: "", leaveTypeId: "demo-sick",      leaveTypeName: "Sick Leave",            totalDays: 10,  usedDays: 0, availableDays: 10,  year: new Date().getFullYear(), color: null },
  { id: "demo-3", userId: "", leaveTypeId: "demo-family",    leaveTypeName: "Family Responsibility", totalDays: 3,   usedDays: 0, availableDays: 3,   year: new Date().getFullYear(), color: null },
  { id: "demo-4", userId: "", leaveTypeId: "demo-maternity", leaveTypeName: "Maternity Leave",       totalDays: 120, usedDays: 0, availableDays: 120, year: new Date().getFullYear(), color: null },
  { id: "demo-5", userId: "", leaveTypeId: "demo-parental",  leaveTypeName: "Parental Leave",        totalDays: 10,  usedDays: 0, availableDays: 10,  year: new Date().getFullYear(), color: null },
]

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    async function loadData() {
      if (!user) return

      setIsLoadingData(true)

      const dbReady = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))
      if (!dbReady) {
        setLeaveBalances(DEMO_BALANCES)
        setIsLoadingData(false)
        return
      }

      try {
        const [balances, requests] = await Promise.all([
          getLeaveBalances(user.id),
          getLeaveRequests(user.id),
        ])
        setLeaveBalances(balances.length > 0 ? balances : DEMO_BALANCES)
        setLeaveRequests(requests)
      } catch (err) {
        setLeaveBalances(DEMO_BALANCES)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [user])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user.firstName}!</h2>
            <p className="text-muted-foreground mt-1">Manage your leave requests and view your balance</p>
          </div>
          <Button size="lg" onClick={() => router.push("/dashboard/request")}>
            <Plus className="w-5 h-5 mr-2" />
            Request Leave
          </Button>
        </div>

        <div className="space-y-8">
          {/* Leave Balances */}
          <section>
            <h3 className="text-xl font-semibold mb-4">Your Leave Balance ({new Date().getFullYear()})</h3>
            {isLoadingData ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : leaveBalances.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {leaveBalances.map((balance) => (
                  <LeaveBalanceCard key={balance.id} balance={balance} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No leave balances found. Contact your administrator to set up your leave allocations.</p>
              </div>
            )}
          </section>

          {/* Leave Request History */}
          <section>
            {isLoadingData ? (
              <div className="h-64 bg-muted animate-pulse rounded-lg" />
            ) : (
              <LeaveRequestList
                requests={leaveRequests}
                onRequestClick={setSelectedRequest}
              />
            )}
          </section>

          {/* Line Manager — team quick access */}
          {user.role === "line_manager" && (
            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Leave
                  </CardTitle>
                  <CardDescription>Review and action your team's leave requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" onClick={() => router.push("/dashboard/approvals")}>
                    <Users className="w-4 h-4 mr-2" />
                    Go to Team Approvals
                  </Button>
                </CardContent>
              </Card>
            </section>
          )}

          {/* HR Manager / System Admin — admin quick access */}
          {(user.role === "hr_manager" || user.role === "system_admin") && (
            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Administration
                  </CardTitle>
                  <CardDescription>Manage employees, leave balances, and system configuration</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <Button variant="outline" onClick={() => router.push("/dashboard/admin")}>
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/dashboard/admin/reports")}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Reports
                  </Button>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Executive — org-wide read-only overview */}
          {user.role === "executive" && (
            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Organisation Overview
                  </CardTitle>
                  <CardDescription>Read-only view of org-wide leave activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3 mb-4">
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold text-muted-foreground">—</p>
                      <p className="text-sm text-muted-foreground mt-1">On Leave Today</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold text-muted-foreground">—</p>
                      <p className="text-sm text-muted-foreground mt-1">Pending Approvals</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold text-muted-foreground">—</p>
                      <p className="text-sm text-muted-foreground mt-1">Approved This Month</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Live data available once the database is connected
                  </p>
                  <Button variant="outline" onClick={() => router.push("/dashboard/admin/reports")}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Full Reports
                  </Button>
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      </main>

      <LeaveRequestDetailDialog
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onUpdated={async () => {
          setSelectedRequest(null)
          if (user) {
            const [balances, requests] = await Promise.all([
              getLeaveBalances(user.id),
              getLeaveRequests(user.id),
            ])
            setLeaveBalances(balances)
            setLeaveRequests(requests)
          }
        }}
      />
    </div>
  )
}
