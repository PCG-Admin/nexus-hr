"use client"

import { useAuth } from "@/lib/auth"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback, Suspense } from "react"
import { NavHeader } from "@/components/nav-header"
import { ApprovalRequestCard } from "@/components/approval-request-card"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  getAllLeaveRequests,
  approveLeaveRequest,
  managerApproveLeaveRequest,
  rejectLeaveRequest,
  type LeaveRequestWithEmployee,
} from "@/lib/supabase/leave-service"
import { AdminEditLeaveDialog } from "@/components/admin-edit-leave-dialog"
import { LeaveRequestDetailDialog } from "@/components/leave-request-detail-dialog"
import { TeamCalendar } from "@/components/team-calendar"
import { CheckCircle2, FileText, ExternalLink, Pencil, CalendarDays, Eye } from "lucide-react"
import { format } from "date-fns"
import { DEMO_LEAVE_REQUESTS } from "@/lib/demo-data"

function RequestDeepLink({
  allRequests,
  onOpen,
}: {
  allRequests: LeaveRequestWithEmployee[]
  onOpen: (r: LeaveRequestWithEmployee) => void
}) {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const requestId = searchParams.get('request')
    if (!requestId || allRequests.length === 0) return
    const match = allRequests.find(r => r.id === requestId)
    if (match) {
      onOpen(match)
      router.replace('/dashboard/approvals', { scroll: false } as any)
    }
  }, [searchParams, allRequests, onOpen, router])

  return null
}

export default function ApprovalsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [allRequests, setAllRequests] = useState<LeaveRequestWithEmployee[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [editingRequest, setEditingRequest] = useState<LeaveRequestWithEmployee | null>(null)
  const [viewingRequest, setViewingRequest] = useState<LeaveRequestWithEmployee | null>(null)

  const fetchRequests = useCallback(async () => {
    if (!user) return
    setIsLoadingRequests(true)
    try {
      const dbReady = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))
      if (!dbReady) {
        const requests = user.role === "line_manager"
          ? DEMO_LEAVE_REQUESTS.filter(r => r.employee.managerId === user.id)
          : DEMO_LEAVE_REQUESTS
        setAllRequests(requests)
        return
      }
      const requests = await getAllLeaveRequests()
      setAllRequests(requests)
    } catch {
      setAllRequests([])
    } finally {
      setIsLoadingRequests(false)
    }
  }, [user])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }

    if (!isLoading && user && !["line_manager", "hr_manager", "system_admin"].includes(user.role)) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && ["line_manager", "hr_manager", "system_admin"].includes(user.role)) {
      fetchRequests()
    }
  }, [user, fetchRequests])

  // hr_manager and system_admin are final approvers; line_manager does stage-1
  const isFinalApprover = user?.role === "hr_manager" || user?.role === "system_admin"

  // Line managers act on "pending"; final approvers act on "pending_ceo" (pending final approval)
  const actionablePending = isFinalApprover
    ? allRequests.filter((r) => r.status === "pending_ceo")
    : allRequests.filter((r) => r.status === "pending")
  const awaitingCeoRequests = allRequests.filter((r) => r.status === "pending_ceo")
  const approvedRequests = allRequests.filter((r) => r.status === "approved")
  const rejectedRequests = allRequests.filter((r) => r.status === "rejected")

  const today = new Date().toISOString().split("T")[0]
  const upcomingApproved = approvedRequests
    .filter((r) => r.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  const handleApprove = async (requestId: string, notes: string) => {
    if (!user) return

    setProcessingId(requestId)

    let result
    if (isFinalApprover) {
      // CEO final approval — pass context so employee gets notified
      const req = allRequests.find((r) => r.id === requestId)
      result = await approveLeaveRequest(requestId, user.id, notes, `${user.firstName} ${user.lastName}`, req ? {
        employeeId: req.userId,
        employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
        leaveTypeName: req.leaveTypeName,
        startDate: req.startDate,
        endDate: req.endDate,
        daysRequested: req.daysRequested,
      } : undefined)
      if (result.success) {
        await fetch("/api/cron/update-leave-balances", { method: "POST" })
      }
    } else {
      // Manager stage-1 approval — forwards to CEO
      const req = allRequests.find((r) => r.id === requestId)
      result = await managerApproveLeaveRequest(requestId, user.id, notes, req
        ? {
            employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
            managerName: `${user.firstName} ${user.lastName}`,
            leaveTypeName: req.leaveTypeName,
            startDate: req.startDate,
            endDate: req.endDate,
            daysRequested: req.daysRequested,
          }
        : undefined)
    }

    if (result.success) {
      await fetchRequests()
    } else {
      console.error("Failed to approve request:", result.error)
      alert(`Failed to approve request: ${result.error}`)
    }
    setProcessingId(null)
  }

  const handleReject = async (requestId: string, notes: string) => {
    if (!user) return

    setProcessingId(requestId)
    const req = allRequests.find((r) => r.id === requestId)
    const result = await rejectLeaveRequest(requestId, user.id, notes, `${user.firstName} ${user.lastName}`, req ? {
      employeeId: req.userId,
      employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
      leaveTypeName: req.leaveTypeName,
      startDate: req.startDate,
      endDate: req.endDate,
      daysRequested: req.daysRequested,
    } : undefined)

    if (result.success) {
      // Refresh the list
      await fetchRequests()
    } else {
      console.error("Failed to reject request:", result.error)
      alert(`Failed to reject request: ${result.error}`)
    }
    setProcessingId(null)
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
          <h2 className="text-3xl font-bold tracking-tight">Leave Approvals</h2>
          <p className="text-muted-foreground mt-1">Review and approve leave requests from your team members</p>
        </div>

        {isLoadingRequests ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">Loading requests...</CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList>
              <TabsTrigger value="pending" className="relative">
                {isFinalApprover ? "Pending My Approval" : "Pending"}
                {actionablePending.length > 0 && (
                  <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-amber-600">
                    {actionablePending.length}
                  </Badge>
                )}
              </TabsTrigger>
              {!isFinalApprover && (
                <TabsTrigger value="awaiting_ceo" className="relative">
                  Awaiting Final Approval
                  {awaitingCeoRequests.length > 0 && (
                    <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-blue-600">
                      {awaitingCeoRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="approved">Approved ({approvedRequests.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejectedRequests.length})</TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                Team Calendar
                {upcomingApproved.length > 0 && (
                  <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-emerald-600">
                    {upcomingApproved.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Actionable pending requests */}
            <TabsContent value="pending" className="space-y-4">
              {actionablePending.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No pending requests to review</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {actionablePending.map((request) => (
                    <ApprovalRequestCard
                      key={request.id}
                      request={request}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      isLoading={processingId === request.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Awaiting CEO tab — managers only, read-only */}
            {!isFinalApprover && (
              <TabsContent value="awaiting_ceo" className="space-y-4">
                {awaitingCeoRequests.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No requests awaiting final approval
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {awaitingCeoRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">
                                {request.employee.firstName} {request.employee.lastName}
                              </h4>
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300" variant="outline">
                                Awaiting Final Approval
                              </Badge>
                            </div>
                            <p className="text-sm">
                              <span className="font-medium">{request.leaveTypeName}</span> -{" "}
                              {format(new Date(request.startDate), "MMM dd")} to{" "}
                              {format(new Date(request.endDate), "MMM dd, yyyy")} ({request.daysRequested} days)
                            </p>
                            {request.reviewerNotes && (
                              <p className="text-sm text-muted-foreground">Your notes: {request.reviewerNotes}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            {/* Approved Requests */}
            <TabsContent value="approved" className="space-y-4">
              {approvedRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">No approved requests yet</CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {approvedRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">
                                {request.employee.firstName} {request.employee.lastName}
                              </h4>
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300" variant="outline">
                                Approved
                              </Badge>
                            </div>
                            <p className="text-sm">
                              <span className="font-medium">{request.leaveTypeName}</span> -{" "}
                              {format(new Date(request.startDate), "MMM dd")} to{" "}
                              {format(new Date(request.endDate), "MMM dd, yyyy")} ({request.daysRequested} days)
                            </p>
                            {request.reviewerNotes && (
                              <p className="text-sm text-muted-foreground">Notes: {request.reviewerNotes}</p>
                            )}
                            {request.documentUrl && (
                              <a
                                href={request.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                              >
                                <FileText className="w-4 h-4" />
                                View attached document
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setViewingRequest(request)}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border rounded px-2 py-1.5 hover:border-primary transition-colors"
                              title="View request details and activity history"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                            <button
                              onClick={() => setEditingRequest(request)}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border rounded px-2 py-1.5 hover:border-primary transition-colors"
                              title="Override approved leave"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Override
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Rejected Requests */}
            <TabsContent value="rejected" className="space-y-4">
              {rejectedRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">No rejected requests</CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {rejectedRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">
                                {request.employee.firstName} {request.employee.lastName}
                              </h4>
                              <Badge className="bg-red-100 text-red-800 border-red-300" variant="outline">
                                Rejected
                              </Badge>
                            </div>
                            <p className="text-sm">
                              <span className="font-medium">{request.leaveTypeName}</span> -{" "}
                              {format(new Date(request.startDate), "MMM dd")} to{" "}
                              {format(new Date(request.endDate), "MMM dd, yyyy")} ({request.daysRequested} days)
                            </p>
                            {request.reviewerNotes && (
                              <p className="text-sm text-muted-foreground">Reason: {request.reviewerNotes}</p>
                            )}
                            {request.documentUrl && (
                              <a
                                href={request.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                              >
                                <FileText className="w-4 h-4" />
                                View attached document
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <button
                            onClick={() => setViewingRequest(request)}
                            className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border rounded px-2 py-1.5 hover:border-primary transition-colors"
                            title="View request details and activity history"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            {/* Team Calendar */}
            <TabsContent value="calendar">
              <TeamCalendar requests={allRequests} onRequestClick={setViewingRequest} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <AdminEditLeaveDialog
        request={editingRequest}
        onClose={() => setEditingRequest(null)}
        onUpdated={async () => {
          setEditingRequest(null)
          await fetchRequests()
        }}
      />

      <Suspense fallback={null}>
        <RequestDeepLink allRequests={allRequests} onOpen={setViewingRequest} />
      </Suspense>

      <LeaveRequestDetailDialog
        request={viewingRequest}
        onClose={() => setViewingRequest(null)}
        onUpdated={async () => {
          setViewingRequest(null)
          await fetchRequests()
        }}
      />
    </div>
  )
}
