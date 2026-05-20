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
import { Download, TrendingUp, Users, Calendar, FileText } from "lucide-react"
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

export default function ReportsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [allRequests, setAllRequests] = useState<LeaveRequestWithEmployee[]>([])
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceWithEmployee[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoadingData(true)
    const dbReady = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))
    if (!dbReady) {
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

    if (!isLoading && user && user.role !== "admin" && user.role !== "ceo") {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "ceo")) {
      fetchData()
    }
  }, [user, fetchData])

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
  }

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
            <h2 className="text-3xl font-bold tracking-tight">Leave Reports & Analytics</h2>
            <p className="text-muted-foreground mt-1">
              Comprehensive insights into leave usage, trends, and compliance
            </p>
          </div>
          <Button onClick={exportToCSV} disabled={isLoadingData}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
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
          </>
        )}
      </main>
    </div>
  )
}
