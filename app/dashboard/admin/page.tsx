"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { NavHeader } from "@/components/nav-header"
import { StatsCard } from "@/components/stats-card"
import { EmployeeTable } from "@/components/employee-table"
import { EditBalanceDialog } from "@/components/edit-balance-dialog"
import { AddEmployeeDialog } from "@/components/add-employee-dialog"
import { EditEmployeeDialog } from "@/components/edit-employee-dialog"
import { DisciplinaryRecordsDialog } from "@/components/disciplinary-records-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getAllEmployees,
  getAllLeaveRequests,
  getAllLeaveBalances,
  updateLeaveBalance,
  getLeaveTypes,
  updateLeaveType,
  type Employee,
  type LeaveRequestWithEmployee,
  type LeaveBalanceWithEmployee,
  type LeaveType,
} from "@/lib/supabase/leave-service"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Users, CheckCircle2, Clock, TrendingUp, Edit, Search, ChevronDown, ChevronRight, UserIcon, UserPlus, Trash2, CalendarDays, Plus, Building2, GraduationCap, X, Settings2, GitBranch, FileCheck, ArrowRight } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  getPublicHolidays,
  addPublicHoliday,
  deletePublicHoliday,
  type PublicHoliday,
} from "@/lib/supabase/holiday-service"
import { DEMO_EMPLOYEES } from "@/lib/demo-data"
import { getOrgConfig, saveOrgConfig, type OrgConfig } from "@/lib/org-config"
import { apiFetch } from "@/lib/api-fetch"

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [allRequests, setAllRequests] = useState<LeaveRequestWithEmployee[]>([])
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceWithEmployee[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [editingBalance, setEditingBalance] = useState<LeaveBalanceWithEmployee | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set())
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [disciplinaryEmployee, setDisciplinaryEmployee] = useState<Employee | null>(null)

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [savingLeaveTypeId, setSavingLeaveTypeId] = useState<string | null>(null)

  const [orgConfig, setOrgConfig] = useState<OrgConfig>({ departments: [], grades: [] })
  const [newDeptName, setNewDeptName] = useState("")
  const [newGradeValue, setNewGradeValue] = useState("")

  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([])
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear())
  const [newHolidayName, setNewHolidayName] = useState("")
  const [newHolidayDate, setNewHolidayDate] = useState("")
  const [isAddingHoliday, setIsAddingHoliday] = useState(false)
  const [isDeletingHoliday, setIsDeletingHoliday] = useState<string | null>(null)
  const [isRunningAccrual, setIsRunningAccrual] = useState(false)
  const [accrualResult, setAccrualResult] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoadingData(true)
    try {
      const dbReady = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))
      if (!dbReady) {
        setEmployees(DEMO_EMPLOYEES)
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
    } catch {
      setEmployees([])
      setAllRequests([])
      setLeaveBalances([])
    } finally {
      setIsLoadingData(false)
    }
  }, [])

  const fetchHolidays = useCallback(async () => {
    const data = await getPublicHolidays(holidayYear)
    setPublicHolidays(data)
  }, [holidayYear])

  const handleAddHoliday = async () => {
    if (!newHolidayName.trim() || !newHolidayDate) return
    setIsAddingHoliday(true)
    const result = await addPublicHoliday(newHolidayName.trim(), newHolidayDate)
    if (result.success) {
      setNewHolidayName("")
      setNewHolidayDate("")
      await fetchHolidays()
    } else {
      alert(`Failed to add holiday: ${result.error}`)
    }
    setIsAddingHoliday(false)
  }

  const handleDeleteHoliday = async (id: string) => {
    setIsDeletingHoliday(id)
    const result = await deletePublicHoliday(id)
    if (result.success) {
      await fetchHolidays()
    } else {
      alert(`Failed to delete holiday: ${result.error}`)
    }
    setIsDeletingHoliday(null)
  }

  const handleRunAccrual = async () => {
    setIsRunningAccrual(true)
    setAccrualResult(null)
    try {
      const res = await fetch('/api/cron/monthly-accrual', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setAccrualResult(`Done — ${data.processed} employee(s) accrued +1.25 days, ${data.skipped} skipped (already ran this month or at cap).`)
        await fetchData()
      } else {
        setAccrualResult(`Error: ${data.error}`)
      }
    } catch {
      setAccrualResult('Unexpected error running accrual.')
    }
    setIsRunningAccrual(false)
  }

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }

    if (!isLoading && user && !["hr_manager", "system_admin"].includes(user.role)) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && ["hr_manager", "system_admin"].includes(user.role)) {
      fetchData()
      fetchHolidays()
      setOrgConfig(getOrgConfig())
      getLeaveTypes().then(setLeaveTypes)
    }
  }, [user, fetchData, fetchHolidays])

  useEffect(() => {
    if (user && ["hr_manager", "system_admin"].includes(user.role)) {
      fetchHolidays()
    }
  }, [holidayYear, user, fetchHolidays])

  const handleAddDepartment = () => {
    const name = newDeptName.trim()
    if (!name || orgConfig.departments.map(d => d.toLowerCase()).includes(name.toLowerCase())) return
    const updated: OrgConfig = { ...orgConfig, departments: [...orgConfig.departments, name].sort() }
    setOrgConfig(updated)
    saveOrgConfig(updated)
    setNewDeptName("")
  }

  const handleRemoveDepartment = (dept: string) => {
    const updated: OrgConfig = { ...orgConfig, departments: orgConfig.departments.filter(d => d !== dept) }
    setOrgConfig(updated)
    saveOrgConfig(updated)
  }

  const handleAddGrade = () => {
    const val = parseInt(newGradeValue)
    if (isNaN(val) || val < 1 || val > 99 || orgConfig.grades.includes(val)) return
    const updated: OrgConfig = { ...orgConfig, grades: [...orgConfig.grades, val].sort((a, b) => a - b) }
    setOrgConfig(updated)
    saveOrgConfig(updated)
    setNewGradeValue("")
  }

  const handleRemoveGrade = (grade: number) => {
    const updated: OrgConfig = { ...orgConfig, grades: orgConfig.grades.filter(g => g !== grade) }
    setOrgConfig(updated)
    saveOrgConfig(updated)
  }

  const handleUpdateLeaveType = async (id: string, config: { requiresManagerApproval?: boolean; requiresDocument?: boolean; defaultDays?: number }) => {
    setSavingLeaveTypeId(id)
    // Optimistic update
    setLeaveTypes(prev => prev.map(lt => lt.id === id ? {
      ...lt,
      ...(config.requiresManagerApproval !== undefined && { requiresManagerApproval: config.requiresManagerApproval }),
      ...(config.requiresDocument !== undefined && { requiresDocument: config.requiresDocument }),
      ...(config.defaultDays !== undefined && { defaultDays: config.defaultDays }),
    } : lt))
    const result = await updateLeaveType(id, config)
    if (!result.success) {
      // Revert on error
      getLeaveTypes().then(setLeaveTypes)
      alert(`Failed to update: ${result.error}`)
    }
    setSavingLeaveTypeId(null)
  }

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee)
  }

  const handleDisableEmployee = (employee: Employee, reactivate: boolean) => {
    const dbReady = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))
    if (dbReady) {
      // TODO: call /api/admin/toggle-employee-active when DB is connected
    }
    // Toggle isActive in local state (persists until page refresh in demo mode)
    setEmployees(prev =>
      prev.map(e => e.id === employee.id ? { ...e, isActive: reactivate ? true : false } : e)
    )
  }

  const handleDeleteEmployee = async () => {
    if (!deletingEmployee) return

    setIsDeleting(true)
    try {
      const response = await apiFetch("/api/admin/delete-user", {
        method: "DELETE",
        body: JSON.stringify({ userId: deletingEmployee.id }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await fetchData()
        setDeletingEmployee(null)
      } else {
        alert(`Failed to delete employee: ${data.error || "Unknown error"}`)
      }
    } catch (err) {
      alert("An unexpected error occurred while deleting")
    }
    setIsDeleting(false)
  }

  const handleSaveBalance = async (balanceId: string, newTotalDays: number) => {
    setIsSaving(true)
    const result = await updateLeaveBalance(balanceId, newTotalDays)

    if (result.success) {
      await fetchData()
      setEditingBalance(null)
    } else {
      alert(`Failed to update balance: ${result.error}`)
    }
    setIsSaving(false)
  }

  // Filter out current user from employees list
  const filteredEmployees = employees.filter((e) => e.id !== user?.id)

  const totalEmployees = filteredEmployees.length
  const pendingRequests = allRequests.filter((r) => r.status === "pending").length
  const approvedRequests = allRequests.filter((r) => r.status === "approved").length

  const totalLeaveDays = leaveBalances.reduce((acc, b) => acc + b.usedDays, 0)
  const avgLeaveDays = totalLeaveDays / Math.max(totalEmployees, 1)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-100 text-emerald-800 border-emerald-300"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300"
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-300"
      default:
        return "bg-slate-100 text-slate-800 border-slate-300"
    }
  }

  // Group balances by employee
  const balancesByEmployee = leaveBalances.reduce((acc, balance) => {
    const employeeId = balance.employee.id
    if (!acc[employeeId]) {
      acc[employeeId] = {
        employee: balance.employee,
        balances: [],
      }
    }
    acc[employeeId].balances.push(balance)
    return acc
  }, {} as Record<string, { employee: Employee; balances: LeaveBalanceWithEmployee[] }>)

  // Filter grouped balances by search query
  const filteredEmployeeBalances = Object.values(balancesByEmployee).filter((group) => {
    const fullName = `${group.employee.firstName} ${group.employee.lastName}`.toLowerCase()
    const query = searchQuery.toLowerCase()
    return (
      fullName.includes(query) ||
      (group.employee.employeeNumber?.toLowerCase() || "").includes(query) ||
      group.balances.some((b) => b.leaveTypeName.toLowerCase().includes(query))
    )
  })

  const toggleEmployee = (employeeId: string) => {
    setExpandedEmployees((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId)
      } else {
        newSet.add(employeeId)
      }
      return newSet
    })
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Overview of all employees, leave requests, and compliance metrics
          </p>
        </div>

        {isLoadingData ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">Loading data...</CardContent>
          </Card>
        ) : (
          <>
            {/* Statistics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <StatsCard title="Total Employees" value={totalEmployees} icon={Users} description="Active workforce" />
              <StatsCard
                title="Pending Requests"
                value={pendingRequests}
                icon={Clock}
                description="Awaiting manager review"
              />
              <StatsCard title="Approved Requests" value={approvedRequests} icon={CheckCircle2} description="This year" />
              <StatsCard
                title="Avg. Leave Used"
                value={`${avgLeaveDays.toFixed(1)} days`}
                icon={TrendingUp}
                description="Per employee"
              />
            </div>

            <Tabs defaultValue="employees" className="space-y-6">
              <TabsList>
                <TabsTrigger value="employees">Employees ({totalEmployees})</TabsTrigger>
                <TabsTrigger value="balances">Leave Balances</TabsTrigger>
                <TabsTrigger value="requests">All Requests ({allRequests.length})</TabsTrigger>
                <TabsTrigger value="holidays">Public Holidays</TabsTrigger>
                <TabsTrigger value="organisation">
                  <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                  Organisation
                </TabsTrigger>
                <TabsTrigger value="workflow">
                  <GitBranch className="w-3.5 h-3.5 mr-1.5" />
                  Workflow
                </TabsTrigger>
                <TabsTrigger value="compliance">BCEA Compliance</TabsTrigger>
              </TabsList>

              {/* Employees Tab */}
              <TabsContent value="employees">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Employee Directory</CardTitle>
                    <Button onClick={() => setIsAddEmployeeOpen(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Employee
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <EmployeeTable
                      employees={filteredEmployees}
                      onEditEmployee={handleEditEmployee}
                      onDeleteEmployee={(employee) => setDeletingEmployee(employee)}
                      onDisciplinaryClick={(employee) => setDisciplinaryEmployee(employee)}
                      onDisableEmployee={handleDisableEmployee}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Leave Balances Tab */}
              <TabsContent value="balances">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Manage Leave Balances</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRunAccrual}
                        disabled={isRunningAccrual}
                      >
                        {isRunningAccrual ? "Running..." : "Run Monthly Accrual"}
                      </Button>
                    </div>
                    {accrualResult && (
                      <p className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded-md">
                        {accrualResult}
                      </p>
                    )}
                    <div className="mt-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by employee name or number..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredEmployeeBalances.map((group) => {
                        const isExpanded = expandedEmployees.has(group.employee.id)
                        const totalUsed = group.balances.reduce((sum, b) => sum + b.usedDays, 0)
                        const totalAvailable = group.balances.reduce((sum, b) => sum + b.availableDays, 0)

                        return (
                          <Collapsible
                            key={group.employee.id}
                            open={isExpanded}
                            onOpenChange={() => toggleEmployee(group.employee.id)}
                          >
                            <div className="border rounded-lg">
                              <CollapsibleTrigger asChild>
                                <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                      <UserIcon className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="text-left">
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold">
                                          {group.employee.firstName} {group.employee.lastName}
                                        </p>
                                        {group.employee.employeeNumber && (
                                          <Badge variant="outline" className="text-xs">
                                            {group.employee.employeeNumber}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {group.balances.length} leave types • {totalUsed} days used • {totalAvailable} days available
                                      </p>
                                    </div>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="border-t px-4 pb-4 space-y-2">
                                  {group.balances.map((balance) => (
                                    <div
                                      key={balance.id}
                                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mt-2"
                                    >
                                      <div className="flex-1">
                                        <p className="font-medium">{balance.leaveTypeName}</p>
                                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                                          <span>Total: {balance.totalDays} days</span>
                                          <span>Used: {balance.usedDays} days</span>
                                          <span className="text-primary font-medium">
                                            Available: {balance.availableDays} days
                                          </span>
                                        </div>
                                      </div>
                                      <Button variant="outline" size="sm" onClick={() => setEditingBalance(balance)}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        )
                      })}
                      {filteredEmployeeBalances.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No employees found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* All Requests Tab */}
              <TabsContent value="requests">
                <Card>
                  <CardHeader>
                    <CardTitle>All Leave Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {allRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">
                                {request.employee.firstName} {request.employee.lastName}
                              </p>
                              <Badge className={getStatusColor(request.status)} variant="outline">
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">{request.leaveTypeName}</span> -{" "}
                              {format(new Date(request.startDate), "MMM dd")} to{" "}
                              {format(new Date(request.endDate), "MMM dd, yyyy")} ({request.daysRequested} days)
                            </p>
                            {request.reason && <p className="text-sm text-muted-foreground">Reason: {request.reason}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(request.createdAt), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                      ))}
                      {allRequests.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No leave requests found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Public Holidays Tab */}
              <TabsContent value="holidays">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5" />
                        Public Holidays
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHolidayYear(y => y - 1)}
                        >
                          &lsaquo; {holidayYear - 1}
                        </Button>
                        <span className="text-sm font-semibold px-2">{holidayYear}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHolidayYear(y => y + 1)}
                        >
                          {holidayYear + 1} &rsaquo;
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add new holiday */}
                    <div className="flex gap-3 p-4 border rounded-lg bg-muted/30">
                      <Input
                        placeholder="Holiday name (e.g. New Year's Day)"
                        value={newHolidayName}
                        onChange={e => setNewHolidayName(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="date"
                        value={newHolidayDate}
                        onChange={e => setNewHolidayDate(e.target.value)}
                        className="w-44"
                      />
                      <Button
                        onClick={handleAddHoliday}
                        disabled={isAddingHoliday || !newHolidayName.trim() || !newHolidayDate}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {isAddingHoliday ? "Adding..." : "Add"}
                      </Button>
                    </div>

                    {/* Holiday list */}
                    {publicHolidays.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No public holidays found for {holidayYear}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {publicHolidays.map(holiday => (
                          <div
                            key={holiday.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-center min-w-[56px] bg-primary/10 rounded-md p-2">
                                <p className="text-xs text-muted-foreground uppercase font-medium">
                                  {format(new Date(holiday.date + 'T00:00:00'), 'MMM')}
                                </p>
                                <p className="text-lg font-bold leading-none">
                                  {format(new Date(holiday.date + 'T00:00:00'), 'd')}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium">{holiday.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(holiday.date + 'T00:00:00'), 'EEEE, d MMMM yyyy')}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteHoliday(holiday.id)}
                              disabled={isDeletingHoliday === holiday.id}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Organisation Tab */}
              <TabsContent value="organisation" className="space-y-6">
                <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                  <Settings2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Changes apply immediately to all Add/Edit Employee forms. Currently stored locally —
                    once the database is connected, this configuration will persist for all users automatically.
                  </span>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* ── Departments ── */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="w-4 h-4" />
                        Departments
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Add new */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="New department name"
                          value={newDeptName}
                          onChange={e => setNewDeptName(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleAddDepartment()}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={handleAddDepartment}
                          disabled={!newDeptName.trim()}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>

                      {/* List */}
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {orgConfig.departments.map(dept => (
                          <div
                            key={dept}
                            className="flex items-center justify-between px-3 py-2 rounded-md border bg-muted/30 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span>{dept}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveDepartment(dept)}
                              className="text-muted-foreground hover:text-red-500 transition-colors p-0.5 rounded"
                              title="Remove department"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {orgConfig.departments.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No departments configured</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {orgConfig.departments.length} department{orgConfig.departments.length !== 1 ? "s" : ""}
                      </p>
                    </CardContent>
                  </Card>

                  {/* ── Grades ── */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <GraduationCap className="w-4 h-4" />
                        Employee Grades
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Add new */}
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          placeholder="Grade number (e.g. 7)"
                          value={newGradeValue}
                          onChange={e => setNewGradeValue(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleAddGrade()}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={handleAddGrade}
                          disabled={!newGradeValue.trim()}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>

                      {/* List */}
                      <div className="grid grid-cols-3 gap-2">
                        {orgConfig.grades.map(grade => (
                          <div
                            key={grade}
                            className="flex items-center justify-between px-3 py-2 rounded-md border bg-muted/30 text-sm"
                          >
                            <span className="font-medium">Grade {grade}</span>
                            <button
                              onClick={() => handleRemoveGrade(grade)}
                              className="text-muted-foreground hover:text-red-500 transition-colors p-0.5 rounded ml-2"
                              title="Remove grade"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {orgConfig.grades.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4 col-span-3">No grades configured</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {orgConfig.grades.length} grade level{orgConfig.grades.length !== 1 ? "s" : ""}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Workflow Routing Tab */}
              <TabsContent value="workflow" className="space-y-6">
                <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                  <GitBranch className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Configure the approval path for each leave type. Changes take effect on new submissions immediately.
                  </span>
                </div>

                {leaveTypes.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No leave types found. Run migration 020 in Supabase first.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {leaveTypes.map(lt => (
                      <Card key={lt.id} className={savingLeaveTypeId === lt.id ? "opacity-60 pointer-events-none" : ""}>
                        <CardContent className="pt-5 pb-5 space-y-4">
                          {/* Header */}
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-10 rounded-full shrink-0"
                              style={{ backgroundColor: lt.color ?? "#94a3b8" }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{lt.name}</p>
                              <p className="text-xs text-muted-foreground">{lt.defaultDays} days default allocation</p>
                            </div>
                            {!lt.isActive && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                            )}
                          </div>

                          {/* Approval path visual */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                            <span className="font-medium text-foreground">Employee</span>
                            <ArrowRight className="w-3 h-3" />
                            {lt.requiresManagerApproval ? (
                              <>
                                <span className="font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Manager</span>
                                <ArrowRight className="w-3 h-3" />
                              </>
                            ) : null}
                            <span className="font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">HR / Admin</span>
                          </div>

                          <div className="space-y-3 border-t pt-3">
                            {/* Requires manager approval toggle */}
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium cursor-pointer" htmlFor={`mgr-${lt.id}`}>
                                  Requires Manager Approval
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {lt.requiresManagerApproval
                                    ? "Two-stage: manager → HR"
                                    : "One-stage: direct to HR"}
                                </p>
                              </div>
                              <Switch
                                id={`mgr-${lt.id}`}
                                checked={lt.requiresManagerApproval}
                                onCheckedChange={checked => handleUpdateLeaveType(lt.id, { requiresManagerApproval: checked })}
                              />
                            </div>

                            {/* Requires document toggle */}
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium cursor-pointer" htmlFor={`doc-${lt.id}`}>
                                  Supporting Document Required
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {lt.requiresDocument
                                    ? "Employees must attach a document"
                                    : "Document upload is optional"}
                                </p>
                              </div>
                              <Switch
                                id={`doc-${lt.id}`}
                                checked={lt.requiresDocument}
                                onCheckedChange={checked => handleUpdateLeaveType(lt.id, { requiresDocument: checked })}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Compliance Tab */}
              <TabsContent value="compliance">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>BCEA Compliance Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <h4 className="font-semibold text-emerald-900 mb-2">Annual Leave Compliance</h4>
                        <p className="text-sm text-emerald-800">
                          BCEA minimum is 15 days per year (1 day per 17 days worked). Employees accrue 1.25 days
                          per month up to a maximum of 15 days. Managers and admins receive 21 days upfront.
                        </p>
                        <div className="mt-2">
                          <Badge className="bg-emerald-600 text-white">Compliant</Badge>
                        </div>
                      </div>

                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <h4 className="font-semibold text-emerald-900 mb-2">Sick Leave Compliance</h4>
                        <p className="text-sm text-emerald-800">
                          Employees are entitled to 30 days paid sick leave per 3-year cycle (1 day per 26 days worked in
                          the first 6 months). Current allocation: 10 days per year.
                        </p>
                        <div className="mt-2">
                          <Badge className="bg-emerald-600 text-white">Compliant</Badge>
                        </div>
                      </div>

                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <h4 className="font-semibold text-emerald-900 mb-2">Family Responsibility Leave</h4>
                        <p className="text-sm text-emerald-800">
                          Employees are entitled to 3 days paid family responsibility leave per year (after 4 months of
                          employment). Current allocation: 3 days per employee.
                        </p>
                        <div className="mt-2">
                          <Badge className="bg-emerald-600 text-white">Compliant</Badge>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">Maternity Leave</h4>
                        <p className="text-sm text-blue-800">
                          Employees are entitled to 4 consecutive months of unpaid maternity leave. No salary is required
                          during this period, but the job must be kept open.
                        </p>
                        <div className="mt-2">
                          <Badge className="bg-blue-600 text-white">Available</Badge>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">Parental Leave</h4>
                        <p className="text-sm text-blue-800">
                          Parents are entitled to 10 consecutive days of parental leave. If the employee has been in service
                          for 12+ months, this is paid leave.
                        </p>
                        <div className="mt-2">
                          <Badge className="bg-blue-600 text-white">Available</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Reference: BCEA Leave Entitlements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 border-b">
                          <span className="font-medium">Annual Leave:</span>
                          <span>15 days/year (1.25 days/month accrual)</span>
                        </div>
                        <div className="flex justify-between p-2 border-b">
                          <span className="font-medium">Sick Leave:</span>
                          <span>30 days per 3-year cycle</span>
                        </div>
                        <div className="flex justify-between p-2 border-b">
                          <span className="font-medium">Family Responsibility:</span>
                          <span>3 days/year</span>
                        </div>
                        <div className="flex justify-between p-2 border-b">
                          <span className="font-medium">Maternity Leave:</span>
                          <span>4 months (unpaid)</span>
                        </div>
                        <div className="flex justify-between p-2">
                          <span className="font-medium">Parental Leave:</span>
                          <span>10 days (paid if 12+ months service)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      {editingBalance && (
        <EditBalanceDialog
          balance={editingBalance}
          isOpen={!!editingBalance}
          onClose={() => setEditingBalance(null)}
          onSave={handleSaveBalance}
          isSaving={isSaving}
        />
      )}

      <AddEmployeeDialog
        isOpen={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
        onSuccess={fetchData}
      />

      <EditEmployeeDialog
        employee={editingEmployee}
        isOpen={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onSuccess={fetchData}
      />

      <DisciplinaryRecordsDialog
        employee={disciplinaryEmployee}
        isOpen={!!disciplinaryEmployee}
        onClose={() => setDisciplinaryEmployee(null)}
      />

      {/* Delete Confirmation Dialog */}
      {deletingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Employee</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingEmployee.firstName} {deletingEmployee.lastName}
              </span>
              ? This action cannot be undone and will also remove all their leave requests and balances.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeletingEmployee(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteEmployee} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
