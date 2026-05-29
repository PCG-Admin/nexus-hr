"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback, useMemo } from "react"
import { NavHeader } from "@/components/nav-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  getAllEmployees, getAllLeaveRequests, getAllLeaveBalances,
  type Employee, type LeaveRequestWithEmployee, type LeaveBalanceWithEmployee,
} from "@/lib/supabase/leave-service"
import {
  getPerformanceCycles, getCycleReviews,
  type PerformanceCycle, type PerformanceReview,
} from "@/lib/supabase/performance-service"
import {
  getAllDisciplinaryRecords, DISCIPLINARY_TYPE_LABELS,
  type DisciplinaryRecordWithEmployee, type DisciplinaryType,
} from "@/lib/supabase/disciplinary-service"
import {
  Download, TrendingUp, Users, Calendar, FileText,
  Search, Lock, ChevronRight, ShieldCheck, AlertTriangle,
} from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, Legend,
} from "recharts"
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO, isWithinInterval } from "date-fns"
import { DEMO_EMPLOYEES, DEMO_LEAVE_REQUESTS } from "@/lib/demo-data"
import { writeAdminAudit } from "@/lib/supabase/admin-audit-service"

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

export default function ReportsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // ── Leave data ──────────────────────────────────────────────────────────────
  const [employees,    setEmployees]    = useState<Employee[]>([])
  const [allRequests,  setAllRequests]  = useState<LeaveRequestWithEmployee[]>([])
  const [leaveBalances,setLeaveBalances]= useState<LeaveBalanceWithEmployee[]>([])

  // ── Performance data ────────────────────────────────────────────────────────
  const [perfCycles,  setPerfCycles]  = useState<PerformanceCycle[]>([])
  const [perfReviews, setPerfReviews] = useState<Record<string, PerformanceReview[]>>({})

  // ── Disciplinary data ───────────────────────────────────────────────────────
  const [discRecords, setDiscRecords] = useState<DisciplinaryRecordWithEmployee[]>([])

  // ── UI state ────────────────────────────────────────────────────────────────
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [balanceSearch, setBalanceSearch] = useState("")
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({})
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo,   setDateTo]   = useState("")

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoadingData(true)
    const dbReady = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))

    if (!dbReady) {
      const LEAVE_TOTALS: Record<string, number> = {
        "demo-annual": 15, "demo-sick": 10, "demo-family": 3,
        "demo-maternity": 120, "demo-parental": 10,
      }
      const LEAVE_NAMES: Record<string, string> = {
        "demo-annual": "Annual Leave", "demo-sick": "Sick Leave",
        "demo-family": "Family Responsibility", "demo-maternity": "Maternity Leave",
        "demo-parental": "Parental Leave",
      }
      const syntheticBalances: LeaveBalanceWithEmployee[] = DEMO_EMPLOYEES.flatMap(emp =>
        Object.entries(LEAVE_TOTALS).map(([typeId, totalDays]) => {
          const usedDays = DEMO_LEAVE_REQUESTS
            .filter(r => r.userId === emp.id && r.leaveTypeId === typeId && r.status === "approved")
            .reduce((sum, r) => sum + r.daysRequested, 0)
          return {
            id: `bal-${emp.id}-${typeId}`, userId: emp.id, leaveTypeId: typeId,
            leaveTypeName: LEAVE_NAMES[typeId], totalDays, usedDays,
            availableDays: totalDays - usedDays, year: 2026, color: null, employee: emp,
          }
        })
      )
      setEmployees(DEMO_EMPLOYEES)
      setAllRequests(DEMO_LEAVE_REQUESTS)
      setLeaveBalances(syntheticBalances)
      setIsLoadingData(false)
      return
    }

    const [employeesData, requestsData, balancesData, cyclesData, discData] = await Promise.all([
      getAllEmployees(),
      getAllLeaveRequests(),
      getAllLeaveBalances(),
      getPerformanceCycles(),
      getAllDisciplinaryRecords(),
    ])

    setEmployees(employeesData)
    setAllRequests(requestsData)
    setLeaveBalances(balancesData)
    setDiscRecords(discData)

    // Load reviews for all non-monthly cycles in parallel
    const reviewableCycles = cyclesData.filter(c => c.type !== 'monthly')
    const reviewsMap: Record<string, PerformanceReview[]> = {}
    await Promise.all(
      reviewableCycles.map(async c => {
        reviewsMap[c.id] = await getCycleReviews(c.id)
      })
    )
    setPerfCycles(cyclesData)
    setPerfReviews(reviewsMap)

    setIsLoadingData(false)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push("/")
    if (!isLoading && user && !["hr_manager", "system_admin", "executive"].includes(user.role)) router.push("/dashboard")
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && ["hr_manager", "system_admin", "executive"].includes(user.role)) fetchData()
  }, [user, fetchData])

  const isExecutive = user?.role === "executive"
  const isHR        = user?.role === "hr_manager" || user?.role === "system_admin"

  // ── Date-filtered requests ──────────────────────────────────────────────────
  const filteredRequests = useMemo(() => {
    if (!dateFrom && !dateTo) return allRequests
    return allRequests.filter(r => {
      const d = parseISO(r.startDate)
      if (dateFrom && d < parseISO(dateFrom)) return false
      if (dateTo   && d > parseISO(dateTo))   return false
      return true
    })
  }, [allRequests, dateFrom, dateTo])

  // ── Leave analytics ─────────────────────────────────────────────────────────
  const totalEmployees     = employees.length
  const totalRequests      = filteredRequests.length
  const approvedRequests   = filteredRequests.filter(r => r.status === "approved").length
  const pendingRequests    = filteredRequests.filter(r => r.status === "pending").length
  const rejectedRequests   = filteredRequests.filter(r => r.status === "rejected").length
  const totalLeaveDaysUsed = leaveBalances.reduce((a, b) => a + b.usedDays, 0)
  const totalLeaveDaysAvailable = leaveBalances.reduce((a, b) => a + b.totalDays, 0)

  const leaveByType = filteredRequests.reduce((acc, req) => {
    const ex = acc.find(i => i.name === req.leaveTypeName)
    if (ex) { ex.value += req.daysRequested; ex.requests++ }
    else acc.push({ name: req.leaveTypeName, value: req.daysRequested, requests: 1 })
    return acc
  }, [] as { name: string; value: number; requests: number }[])

  const leaveByDepartment = employees.reduce((acc, emp) => {
    const userReqs  = filteredRequests.filter(r => r.userId === emp.id)
    const totalDays = userReqs.reduce((s, r) => s + r.daysRequested, 0)
    const dept      = emp.department || "Unknown"
    const ex        = acc.find(i => i.department === dept)
    if (ex) { ex.days += totalDays; ex.requests += userReqs.length }
    else acc.push({ department: dept, days: totalDays, requests: userReqs.length })
    return acc
  }, [] as { department: string; days: number; requests: number }[])

  const trendMonths = useMemo(() => {
    const from = dateFrom ? parseISO(dateFrom) : subMonths(new Date(), 5)
    const to   = dateTo   ? parseISO(dateTo)   : new Date()
    try {
      return eachMonthOfInterval({ start: startOfMonth(from), end: endOfMonth(to) }).slice(-12)
    } catch { return eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() }) }
  }, [dateFrom, dateTo])

  const leaveTrends = trendMonths.map(month => {
    const s = startOfMonth(month), e = endOfMonth(month)
    const m = filteredRequests.filter(r => {
      const d = new Date(r.createdAt); return d >= s && d <= e
    })
    return {
      month: format(month, "MMM yy"),
      requests: m.length,
      days:     m.reduce((s, r) => s + r.daysRequested, 0),
      approved: m.filter(r => r.status === "approved").length,
    }
  })

  const statusData = [
    { name: "Approved", value: approvedRequests },
    { name: "Pending",  value: pendingRequests  },
    { name: "Rejected", value: rejectedRequests },
  ].filter(i => i.value > 0)

  // ── Performance analytics ───────────────────────────────────────────────────
  const perfStats = useMemo(() => {
    return perfCycles
      .filter(c => c.type !== 'monthly')
      .map(cycle => {
        const reviews = perfReviews[cycle.id] ?? []
        const total   = reviews.length
        const byStatus = {
          draft:            reviews.filter(r => r.status === 'draft').length,
          submitted:        reviews.filter(r => r.status === 'submitted').length,
          manager_reviewed: reviews.filter(r => r.status === 'manager_reviewed').length,
          hr_approved:      reviews.filter(r => r.status === 'hr_approved').length,
          gm_approved:      reviews.filter(r => r.status === 'gm_approved').length,
        }
        const completed = byStatus.hr_approved + byStatus.gm_approved
        const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0

        // Average manager ratings across all KPIs
        const allRatings = reviews.flatMap(r => r.kpis.map(k => k.managerRating).filter(Boolean) as number[])
        const avgRating  = allRatings.length > 0
          ? (allRatings.reduce((s, n) => s + n, 0) / allRatings.length).toFixed(1)
          : null

        const gateCleared = cycle.type === 'annual'
          ? byStatus.gm_approved === total && total > 0
          : completed === total && total > 0

        return { cycle, total, byStatus, completionPct, avgRating, gateCleared }
      })
  }, [perfCycles, perfReviews])

  // Completion chart data
  const perfCompletionChart = perfStats.map(s => ({
    name:       s.cycle.name.replace(' 2026', '').replace(' (', '\n('),
    total:      s.total,
    completed:  s.byStatus.hr_approved + s.byStatus.gm_approved,
    inProgress: s.byStatus.submitted + s.byStatus.manager_reviewed,
    draft:      s.byStatus.draft,
  }))

  // ── Disciplinary analytics ──────────────────────────────────────────────────
  const discFiltered = useMemo(() => {
    if (!dateFrom && !dateTo) return discRecords
    return discRecords.filter(r => {
      const d = parseISO(r.incidentDate)
      if (dateFrom && d < parseISO(dateFrom)) return false
      if (dateTo   && d > parseISO(dateTo))   return false
      return true
    })
  }, [discRecords, dateFrom, dateTo])

  const discByType = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of discFiltered) map[r.type] = (map[r.type] || 0) + 1
    return Object.entries(map).map(([type, count]) => ({
      name: DISCIPLINARY_TYPE_LABELS[type as DisciplinaryType] ?? type,
      value: count,
    })).sort((a, b) => b.value - a.value)
  }, [discFiltered])

  const discByDept = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of discFiltered) {
      const dept = r.employee.department ?? "Unknown"
      map[dept] = (map[dept] || 0) + 1
    }
    return Object.entries(map).map(([department, incidents]) => ({ department, incidents }))
      .sort((a, b) => b.incidents - a.incidents)
  }, [discFiltered])

  const discTrends = useMemo(() => {
    const months = trendMonths
    return months.map(month => {
      const s = startOfMonth(month), e = endOfMonth(month)
      const m = discFiltered.filter(r => {
        const d = parseISO(r.incidentDate); return d >= s && d <= e
      })
      return {
        month:       format(month, "MMM yy"),
        incidents:   m.length,
        finalised:   m.filter(r => r.status === 'finalised').length,
      }
    })
  }, [discFiltered, trendMonths])

  // ── Balance drill-down ──────────────────────────────────────────────────────
  const filteredBalances = leaveBalances.filter(b => {
    if (!balanceSearch) return true
    const q = balanceSearch.toLowerCase()
    const name = `${b.employee.firstName} ${b.employee.lastName}`.toLowerCase()
    return name.includes(q) || (b.employee.department ?? "").toLowerCase().includes(q) || b.leaveTypeName.toLowerCase().includes(q)
  })

  const employeeGroups = Object.values(
    filteredBalances.reduce((acc, b) => {
      if (!acc[b.userId]) acc[b.userId] = { employee: b.employee, items: [] as LeaveBalanceWithEmployee[] }
      const realUsed = allRequests
        .filter(r => r.userId === b.userId && r.leaveTypeId === b.leaveTypeId && r.status === "approved")
        .reduce((s, r) => s + r.daysRequested, 0)
      acc[b.userId].items.push({ ...b, usedDays: realUsed, availableDays: b.totalDays - realUsed })
      return acc
    }, {} as Record<string, { employee: Employee; items: LeaveBalanceWithEmployee[] }>)
  )

  // ── Export ──────────────────────────────────────────────────────────────────
  const exportToCSV = () => {
    const headers = ["Employee", "Employee Number", "Leave Type", "Start Date", "End Date", "Days", "Status", "Reviewer Notes"]
    const rows = filteredRequests.map(req => [
      `${req.employee.firstName} ${req.employee.lastName}`,
      req.employee.employeeNumber || "N/A",
      req.leaveTypeName, req.startDate, req.endDate,
      req.daysRequested.toString(), req.status, req.reviewerNotes || "",
    ])
    const csv  = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url  = window.URL.createObjectURL(blob)
    const a    = document.createElement("a"); a.href = url
    a.download = `leave-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    if (user) writeAdminAudit({
      actorId: user.id, actorName: `${user.firstName} ${user.lastName}`,
      action: 'report_exported', entityType: 'report',
      entityLabel: `Leave Report CSV — ${filteredRequests.length} records`,
    })
  }

  if (isLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <NavHeader />
      <main className="container mx-auto px-4 py-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
              {isExecutive && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">Aggregate View</Badge>}
              {isHR        && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">Full HR View</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">
              {isExecutive ? "Organisation-wide aggregate insights" : "Leave, performance, and disciplinary analytics"}
            </p>
          </div>
          {isHR && (
            <Button onClick={exportToCSV} disabled={isLoadingData}>
              <Download className="w-4 h-4 mr-2" />Export Leave CSV
            </Button>
          )}
        </div>

        {/* ── Date range filter ──────────────────────────────────────────── */}
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Filter by date range:</span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo("") }}>
                  Clear
                </Button>
              )}
              {(dateFrom || dateTo) && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Showing {filteredRequests.length} of {allRequests.length} leave requests
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoadingData ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Loading data...</CardContent></Card>
        ) : (<>

          {/* ════════════════════════════════════════════════════════════════
              SECTION 1 — LEAVE
          ════════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Leave</h3>
          </div>

          {/* Key metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRequests}</div>
                <p className="text-xs text-muted-foreground">{dateFrom || dateTo ? "In selected range" : "All time"}</p>
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
                <p className="text-xs text-muted-foreground">{approvedRequests} of {totalRequests} approved</p>
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

          {/* Charts row 1 */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Leave Trends</CardTitle>
                <CardDescription>Monthly requests and days {dateFrom || dateTo ? "in selected range" : "over last 6 months"}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ requests: { label: "Requests", color: "var(--chart-1)" }, days: { label: "Days", color: "var(--chart-2)" } }} className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={leaveTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line type="monotone" dataKey="requests" stroke="var(--chart-1)" strokeWidth={2} name="Requests" />
                      <Line type="monotone" dataKey="days"     stroke="var(--chart-2)" strokeWidth={2} name="Days" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Status</CardTitle>
                <CardDescription>Distribution of leave request statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ approved: { label: "Approved", color: "var(--chart-1)" }, pending: { label: "Pending", color: "var(--chart-2)" }, rejected: { label: "Rejected", color: "var(--chart-3)" } }} className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90} dataKey="value">
                        {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2 */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Leave by Type</CardTitle>
                <CardDescription>Total days requested per leave type</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ value: { label: "Days", color: "var(--chart-1)" } }} className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leaveByType}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" height={70} />
                      <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} name="Days" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leave by Department</CardTitle>
                <CardDescription>Total days and requests per department</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ days: { label: "Days", color: "var(--chart-2)" }, requests: { label: "Requests", color: "var(--chart-3)" } }} className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leaveByDepartment}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="department" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="days"     fill="var(--chart-2)" radius={[6, 6, 0, 0]} name="Days" />
                      <Bar dataKey="requests" fill="var(--chart-3)" radius={[6, 6, 0, 0]} name="Requests" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts row 3 — Performance Cycles + Disciplinary Trend */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Cycles</CardTitle>
                <CardDescription>Review completion status per cycle</CardDescription>
              </CardHeader>
              <CardContent>
                {perfCompletionChart.filter(c => c.total > 0).length === 0
                  ? <p className="text-center text-muted-foreground py-8">No cycles with reviews yet</p>
                  : <ChartContainer config={{
                      completed:  { label: "Completed",   color: "var(--chart-1)" },
                      inProgress: { label: "In Progress", color: "var(--chart-2)" },
                      draft:      { label: "Draft",       color: "var(--chart-3)" },
                    }} className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perfCompletionChart.filter(c => c.total > 0)} barSize={40}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="completed"  fill="var(--chart-1)" stackId="a" name="Completed" />
                          <Bar dataKey="inProgress" fill="var(--chart-2)" stackId="a" name="In Progress" />
                          <Bar dataKey="draft"      fill="var(--chart-3)" stackId="a" name="Draft" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                }
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Disciplinary Trend</CardTitle>
                <CardDescription>Monthly incident count {dateFrom || dateTo ? "in selected range" : "over last 6 months"}</CardDescription>
              </CardHeader>
              <CardContent>
                {discFiltered.length === 0
                  ? <p className="text-center text-muted-foreground py-8">No incidents in this period</p>
                  : <ChartContainer config={{
                      incidents: { label: "Incidents", color: "var(--chart-4)" },
                      finalised: { label: "Finalised", color: "var(--chart-1)" },
                    }} className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={discTrends}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Line type="monotone" dataKey="incidents" stroke="var(--chart-4)" strokeWidth={2} name="Total Incidents" />
                          <Line type="monotone" dataKey="finalised" stroke="var(--chart-1)" strokeWidth={2} name="Finalised" strokeDasharray="4 4" />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                }
              </CardContent>
            </Card>
          </div>

          {/* Leave type summary */}
          <Card className="mb-8">
            <CardHeader><CardTitle>Leave Type Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaveByType.length === 0
                  ? <p className="text-center text-muted-foreground py-8">No leave data available</p>
                  : leaveByType.map((type, i) => (
                    <div key={type.name} className="flex items-center">
                      <div className="w-4 h-4 rounded-full mr-3 shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{type.name}</p>
                          <p className="text-sm text-muted-foreground">{type.value} days ({type.requests} requests)</p>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="h-2 rounded-full" style={{
                            width: `${(type.value / Math.max(...leaveByType.map(t => t.value), 1)) * 100}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                          }} />
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>

          {/* Employee balance drill-down — HR only */}
          {isHR && (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Employee Leave Balances</CardTitle>
                    <CardDescription>Click a row to expand individual leave types</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search name, dept or type…" value={balanceSearch}
                      onChange={e => setBalanceSearch(e.target.value)} className="pl-8 h-9 text-sm" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {employeeGroups.length === 0
                  ? <p className="text-center text-muted-foreground py-8">No records found</p>
                  : (
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
                            const totalUsed      = group.items.reduce((s, i) => s + i.usedDays, 0)
                            const totalAvailable = totalAllocated - totalUsed
                            const pct            = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0
                            const barColor       = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"
                            const isExpanded     = balanceSearch ? true : (expandedEmployees[group.employee.id] ?? false)
                            return [
                              <tr key={`emp-${group.employee.id}`}
                                onClick={() => !balanceSearch && setExpandedEmployees(p => ({ ...p, [group.employee.id]: !p[group.employee.id] }))}
                                className={`border-t first:border-t-0 ${!balanceSearch ? "cursor-pointer hover:bg-muted/30" : ""} transition-colors`}>
                                <td className="px-4 py-3 font-medium whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {!balanceSearch && <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />}
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
                              </tr>,
                              ...(isExpanded ? group.items.map(item => {
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
                              }) : []),
                            ]
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </CardContent>
            </Card>
          )}

          {isExecutive && (
            <Card className="mb-8 border-blue-200 bg-blue-50/50">
              <CardContent className="flex items-start gap-3 pt-5 pb-5">
                <Lock className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700">Individual employee leave balances and export are restricted to HR. Contact HR for a detailed breakdown.</p>
              </CardContent>
            </Card>
          )}

          {/* ════════════════════════════════════════════════════════════════
              SECTION 2 — PERFORMANCE
          ════════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Performance</h3>
          </div>

          {perfStats.length === 0 ? (
            <Card className="mb-8">
              <CardContent className="py-10 text-center text-muted-foreground">No performance cycles found.</CardContent>
            </Card>
          ) : (<>
            {/* Cycle summary table */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Cycle Summary</CardTitle>
                <CardDescription>Status breakdown and incentive gate per review cycle</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cycle</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Draft</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Submitted</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">With Manager</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">HR Approved</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Completion</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Avg Rating</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Gate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfStats.map(s => (
                        <tr key={s.cycle.id} className="border-t hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            {s.cycle.name}
                            {s.cycle.isActive && <Badge variant="default" className="ml-2 text-[10px] px-1 py-0">Active</Badge>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground capitalize">{s.cycle.type}</td>
                          <td className="px-4 py-3 text-right">{s.total}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{s.byStatus.draft}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{s.byStatus.submitted}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{s.byStatus.manager_reviewed}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{s.byStatus.hr_approved + s.byStatus.gm_approved}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className={s.completionPct === 100 ? "text-emerald-600 font-medium" : ""}>{s.completionPct}%</span>
                              <div className="w-16 bg-muted rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${s.completionPct === 100 ? "bg-emerald-500" : "bg-amber-400"}`}
                                  style={{ width: `${s.completionPct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {s.avgRating ? (
                              <span className="flex items-center justify-end gap-1">
                                <span className="text-amber-500">★</span> {s.avgRating}
                              </span>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {s.total === 0
                              ? <span className="text-xs text-muted-foreground">No reviews</span>
                              : s.gateCleared
                                ? <span className="flex items-center gap-1 text-xs text-emerald-600"><ShieldCheck className="w-3 h-3" />Cleared</span>
                                : <span className="flex items-center gap-1 text-xs text-red-500"><Lock className="w-3 h-3" />Blocked</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>)}

          {/* ════════════════════════════════════════════════════════════════
              SECTION 3 — DISCIPLINARY
          ════════════════════════════════════════════════════════════════ */}
          {isHR && (<>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Disciplinary</h3>
            </div>

            {/* Key stats */}
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{discFiltered.length}</div>
                  <p className="text-xs text-muted-foreground">{discFiltered.filter(r => r.status === 'finalised').length} finalised</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Most Common Type</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-sm leading-tight pt-1">
                    {discByType[0]?.name ?? "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">{discByType[0]?.value ?? 0} incidents</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Drafts Pending Finalisation</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{discFiltered.filter(r => r.status === 'draft').length}</div>
                  <p className="text-xs text-muted-foreground">Awaiting sign-off</p>
                </CardContent>
              </Card>
            </div>

            {/* Type, Dept + Trend all in one card */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold mb-1">Incidents by Type</p>
                    <p className="text-xs text-muted-foreground mb-4">Count per incident type</p>
                    {discByType.length === 0
                      ? <p className="text-center text-muted-foreground py-8">No disciplinary records in this period</p>
                      : (
                        <ChartContainer config={{ value: { label: "Incidents", color: "var(--chart-4)" } }} className="h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={discByType} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis type="number" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis type="category" dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} width={140} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="value" fill="var(--chart-4)" radius={[0, 6, 6, 0]} name="Incidents" />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      )
                    }
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">Incidents by Department</p>
                    <p className="text-xs text-muted-foreground mb-4">Which departments have the most incidents</p>
                    {discByDept.length === 0
                      ? <p className="text-center text-muted-foreground py-8">No data</p>
                      : (
                        <ChartContainer config={{ incidents: { label: "Incidents", color: "var(--chart-5)" } }} className="h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={discByDept}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="department" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="incidents" fill="var(--chart-5)" radius={[6, 6, 0, 0]} name="Incidents" />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      )
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </>)}

        </>)}
      </main>
    </div>
  )
}
