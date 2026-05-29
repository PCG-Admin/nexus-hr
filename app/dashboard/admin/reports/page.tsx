"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { NavHeader } from "@/components/nav-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  getAllEmployees,
  getAllLeaveRequests,
  getAllLeaveBalances,
  type Employee,
  type LeaveRequestWithEmployee,
  type LeaveBalanceWithEmployee,
} from "@/lib/supabase/leave-service"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Download, TrendingUp, Users, Calendar, FileText, Search, Lock, ChevronRight } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts"
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns"
import { DEMO_EMPLOYEES, DEMO_LEAVE_REQUESTS } from "@/lib/demo-data"
import { writeAdminAudit } from "@/lib/supabase/admin-audit-service"

export default function ReportsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [allRequests, setAllRequests] = useState<LeaveRequestWithEmployee[]>([])
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceWithEmployee[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [balanceSearch, setBalanceSearch] = useState("")
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({})

  const fetchData = useCallback(async () => {
    setIsLoadingData(true)
    const dbReady = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))

    if (!dbReady) {
      // Wire demo data so charts render without a database
      const LEAVE_TOTALS: Record<string, number> = {
        "demo-annual":    15,
        "demo-sick":      10,
        "demo-family":     3,
        "demo-maternity": 120,
        "demo-parental":  10,
      }
      const LEAVE_NAMES: Record<string, string> = {
        "demo-annual":    "Annual Leave",
        "demo-sick":      "Sick Leave",
        "demo-family":    "Family Responsibility",
        "demo-maternity": "Maternity Leave",
        "demo-parental":  "Parental Leave",
      }
      const syntheticBalances: LeaveBalanceWithEmployee[] = DEMO_EMPLOYEES.flatMap(emp =>
        Object.entries(LEAVE_TOTALS).map(([typeId, totalDays]) => {
          const usedDays = DEMO_LEAVE_REQUESTS
            .filter(r => r.userId === emp.id && r.leaveTypeId === typeId && r.status === "approved")
            .reduce((sum, r) => sum + r.daysRequested, 0)
          return {
            id: `bal-${emp.id}-${typeId}`,
            userId: emp.id,
            leaveTypeId: typeId,
            leaveTypeName: LEAVE_NAMES[typeId],
            totalDays,
            usedDays,
            availableDays: totalDays - usedDays,
            year: 2026,
            color: null,
            employee: emp,
          }
        })
      )
      setEmployees(DEMO_EMPLOYEES)
      setAllRequests(DEMO_LEAVE_REQUESTS)
      setLeaveBalances(syntheticBalances)
      setIsLoadingData(false)
      return
    }

    const [employeesData, requestsData, balancesData] = await Promise.all([
      getAllEmployees(),
      getAllLeaveRequests(),
      getAllLeaveBalances(),
    ])
    setEmployees(employeesData)
    setAllRequests(requestsData)
    setLeaveBalances(balancesData)
    setIsLoadingData(false)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }

    if (!isLoading && user && !["hr_manager", "system_admin", "executive"].includes(user.role)) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && ["hr_manager", "system_admin", "executive"].includes(user.role)) {
      fetchData()
    }
  }, [user, fetchData])

  const isExecutive = user?.role === "executive"
  const isHR = user?.role === "hr_manager" || user?.role === "system_admin"

  // Calculate analytics data
  const totalEmployees = employees.length
  const totalRequests = allRequests.length
  const approvedRequests = allRequests.filter((r) => r.status === "approved").length
  const pendingRequests = allRequests.filter((r) => r.status === "pending").length
  const rejectedRequests = allRequests.filter((r) => r.status === "rejected").length

  const totalLeaveDaysUsed = leaveBalances.reduce((acc, b) => acc + b.usedDays, 0)
  const totalLeaveDaysAvailable = leaveBalances.reduce((acc, b) => acc + b.totalDays, 0)

  // Leave by type
  const leaveByType = allRequests.reduce(
    (acc, req) => {
      const existing = acc.find((item) => item.name === req.leaveTypeName)
      if (existing) {
        existing.value += req.daysRequested
        existing.requests += 1
      } else {
        acc.push({ name: req.leaveTypeName, value: req.daysRequested, requests: 1 })
      }
      return acc
    },
    [] as { name: string; value: number; requests: number }[],
  )

  const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

  // Leave by department
  const leaveByDepartment = employees.reduce(
    (acc, emp) => {
      const userRequests = allRequests.filter((r) => r.userId === emp.id)
      const totalDays = userRequests.reduce((sum, req) => sum + req.daysRequested, 0)

      const dept = emp.department || "Unknown"
      const existing = acc.find((item) => item.department === dept)
      if (existing) {
        existing.days += totalDays
        existing.requests += userRequests.length
      } else {
        acc.push({ department: dept, days: totalDays, requests: userRequests.length })
      }
      return acc
    },
    [] as { department: string; days: number; requests: number }[],
  )

  // Leave trends over time (last 6 months)
  const months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date(),
  })

  const leaveTrends = months.map((month) => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)

    const monthRequests = allRequests.filter((req) => {
      const reqDate = new Date(req.createdAt)
      return reqDate >= monthStart && reqDate <= monthEnd
    })

    return {
      month: format(month, "MMM yyyy"),
      requests: monthRequests.length,
      days: monthRequests.reduce((sum, req) => sum + req.daysRequested, 0),
      approved: monthRequests.filter((r) => r.status === "approved").length,
    }
  })

  // Status breakdown
  const statusData = [
    { name: "Approved", value: approvedRequests, label: "Approved" },
    { name: "Pending", value: pendingRequests, label: "Pending" },
    { name: "Rejected", value: rejectedRequests, label: "Rejected" },
  ].filter((item) => item.value > 0)

  // Export functionality
  const exportToCSV = () => {
    const headers = [
      "Employee",
      "Employee Number",
      "Leave Type",
      "Start Date",
      "End Date",
      "Days",
      "Status",
      "Reviewer Notes",
    ]

    const rows = allRequests.map((req) => {
      return [
        `${req.employee.firstName} ${req.employee.lastName}`,
        req.employee.employeeNumber || "N/A",
        req.leaveTypeName,
        req.startDate,
        req.endDate,
        req.daysRequested.toString(),
        req.status,
        req.reviewerNotes || "",
      ]
    })

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leave-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    if (user) {
      writeAdminAudit({
        actorId:     user.id,
        actorName:   `${user.firstName} ${user.lastName}`,
        action:      'report_exported',
        entityType:  'report',
        entityLabel: `Leave Report CSV — ${allRequests.length} records`,
      })
    }
  }

  const filteredBalances = leaveBalances.filter(b => {
    if (!balanceSearch) return true
    const q = balanceSearch.toLowerCase()
    const name = `${b.employee.firstName} ${b.employee.lastName}`.toLowerCase()
    return name.includes(q) || (b.employee.department ?? "").toLowerCase().includes(q) || b.leaveTypeName.toLowerCase().includes(q)
  })

  // Group by employee; compute usedDays live from approved requests (cron may be stale)
  const employeeGroups = Object.values(
    filteredBalances.reduce((acc, b) => {
      if (!acc[b.userId]) acc[b.userId] = { employee: b.employee, items: [] as LeaveBalanceWithEmployee[] }
      const realUsed = allRequests
        .filter(r => r.userId === b.userId && r.leaveTypeId === b.leaveTypeId && r.status === "approved")
        .reduce((sum, r) => sum + r.daysRequested, 0)
      acc[b.userId].items.push({ ...b, usedDays: realUsed, availableDays: b.totalDays - realUsed })
      return acc
    }, {} as Record<string, { employee: Employee; items: LeaveBalanceWithEmployee[] }>)
  )

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
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-bold tracking-tight">Leave Reports & Analytics</h2>
              {isExecutive && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                  Aggregate View
                </Badge>
              )}
              {isHR && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">
                  Full HR View
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {isExecutive
                ? "Organisation-wide aggregate insights into leave usage and trends"
                : "Comprehensive insights into leave usage, trends, and compliance"}
            </p>
          </div>
          {isHR && (
            <Button onClick={exportToCSV} disabled={isLoadingData}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {isLoadingData ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">Loading data...</CardContent>
          </Card>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalRequests}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {approvedRequests} of {totalRequests} approved
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leave Days</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalLeaveDaysUsed}</div>
                  <p className="text-xs text-muted-foreground">of {totalLeaveDaysAvailable} days allocated</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg per Employee</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(totalLeaveDaysUsed / Math.max(totalEmployees, 1)).toFixed(1)} days
                  </div>
                  <p className="text-xs text-muted-foreground">Used per person</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              {/* Leave Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Leave Trends</CardTitle>
                  <CardDescription>Monthly leave requests and days over last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      requests: {
                        label: "Requests",
                        color: "var(--chart-1)",
                      },
                      days: {
                        label: "Days",
                        color: "var(--chart-2)",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={leaveTrends}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="requests"
                          stroke="var(--chart-1)"
                          strokeWidth={2}
                          name="Requests"
                        />
                        <Line type="monotone" dataKey="days" stroke="var(--chart-2)" strokeWidth={2} name="Days" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Request Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Request Status</CardTitle>
                  <CardDescription>Distribution of leave request statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      approved: {
                        label: "Approved",
                        color: "var(--chart-1)",
                      },
                      pending: {
                        label: "Pending",
                        color: "var(--chart-2)",
                      },
                      rejected: {
                        label: "Rejected",
                        color: "var(--chart-3)",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              {/* Leave by Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Leave by Type</CardTitle>
                  <CardDescription>Total days requested per leave type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      value: {
                        label: "Days",
                        color: "var(--chart-1)",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leaveByType}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="name"
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill="var(--chart-1)" radius={[8, 8, 0, 0]} name="Days" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Leave by Department */}
              <Card>
                <CardHeader>
                  <CardTitle>Leave by Department</CardTitle>
                  <CardDescription>Total days and requests per department</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      days: {
                        label: "Days",
                        color: "var(--chart-2)",
                      },
                      requests: {
                        label: "Requests",
                        color: "var(--chart-3)",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leaveByDepartment}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="department" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="days" fill="var(--chart-2)" radius={[8, 8, 0, 0]} name="Days" />
                        <Bar dataKey="requests" fill="var(--chart-3)" radius={[8, 8, 0, 0]} name="Requests" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Leave Type Summary</CardTitle>
                <CardDescription>Breakdown of leave usage by type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaveByType.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No leave data available</p>
                  ) : (
                    leaveByType.map((type, index) => (
                      <div key={type.name} className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium">{type.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {type.value} days ({type.requests} requests)
                            </p>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${(type.value / Math.max(...leaveByType.map((t) => t.value), 1)) * 100}%`,
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Employee drill-down — HR / system_admin only */}
            {isHR && (
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle>Employee Leave Balances</CardTitle>
                      <CardDescription>Click a row to expand individual leave types</CardDescription>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search name, dept or type…"
                        value={balanceSearch}
                        onChange={e => setBalanceSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {employeeGroups.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No records found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Types</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Allocated</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Used</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Available</th>
                            <th className="px-4 py-3 w-24" />
                          </tr>
                        </thead>
                        <tbody>
                          {employeeGroups.flatMap(group => {
                            const totalAllocated = group.items.reduce((s, i) => s + i.totalDays, 0)
                            const totalUsed = group.items.reduce((s, i) => s + i.usedDays, 0)
                            const totalAvailable = totalAllocated - totalUsed
                            const pct = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0
                            const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"
                            const isExpanded = balanceSearch ? true : (expandedEmployees[group.employee.id] ?? false)

                            const summaryRow = (
                              <tr
                                key={`emp-${group.employee.id}`}
                                onClick={() => !balanceSearch && setExpandedEmployees(prev => ({ ...prev, [group.employee.id]: !prev[group.employee.id] }))}
                                className={`border-t first:border-t-0 ${!balanceSearch ? "cursor-pointer hover:bg-muted/30" : ""} transition-colors`}
                              >
                                <td className="px-4 py-3 font-medium whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {!balanceSearch && (
                                      <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                    )}
                                    {group.employee.firstName} {group.employee.lastName}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{group.employee.department ?? "—"}</td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">{group.items.length} type{group.items.length !== 1 ? "s" : ""}</td>
                                <td className="px-4 py-3 text-right">{totalAllocated}</td>
                                <td className="px-4 py-3 text-right">{totalUsed}</td>
                                <td className="px-4 py-3 text-right font-medium">
                                  <span className={totalAvailable <= 0 ? "text-red-600" : "text-emerald-700"}>{totalAvailable}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="w-full bg-muted rounded-full h-1.5">
                                    <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                  </div>
                                </td>
                              </tr>
                            )

                            const detailRows = isExpanded
                              ? group.items.map(item => {
                                  const iPct = item.totalDays > 0 ? (item.usedDays / item.totalDays) * 100 : 0
                                  const iBar = iPct >= 90 ? "bg-red-400" : iPct >= 70 ? "bg-amber-400" : "bg-emerald-400"
                                  return (
                                    <tr key={item.id} className="bg-muted/20 border-t border-muted/60">
                                      <td className="px-4 py-2 pl-12 text-xs text-muted-foreground" />
                                      <td className="px-4 py-2 text-xs text-muted-foreground" />
                                      <td className="px-4 py-2 text-xs">{item.leaveTypeName}</td>
                                      <td className="px-4 py-2 text-right text-xs text-muted-foreground">{item.totalDays}</td>
                                      <td className="px-4 py-2 text-right text-xs text-muted-foreground">{item.usedDays}</td>
                                      <td className="px-4 py-2 text-right text-xs font-medium">
                                        <span className={item.availableDays <= 0 ? "text-red-600" : "text-emerald-700"}>{item.availableDays}</span>
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="w-full bg-muted rounded-full h-1">
                                          <div className={`h-1 rounded-full ${iBar}`} style={{ width: `${Math.min(iPct, 100)}%` }} />
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })
                              : []

                            return [summaryRow, ...detailRows]
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Executive — explain what they cannot see */}
            {isExecutive && (
              <Card className="mt-6 border-blue-200 bg-blue-50/50">
                <CardContent className="flex items-start gap-3 pt-5 pb-5">
                  <Lock className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-700">
                    Individual employee leave balances and export are restricted to HR. Contact HR for a detailed breakdown.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
