"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle, CheckCircle2, Clock, Send, Star,
  Users, ShieldCheck, TrendingUp, Lock, ChevronRight,
  Plus, ClipboardCheck, Crown,
} from "lucide-react"
import {
  getPerformanceCycles, getCycleReviews, getMyReview,
  getTeamReviews, getTeamMembers, hrApprove, submitReview,
  saveDraftKPIs, getIncentiveGateStatus, createReview,
  createMonthlyCheckin, employeeAcknowledge, gmApprove,
  type PerformanceCycle, type PerformanceReview,
  type KPIEntry, type ReviewStatus, type IncentiveGateStatus,
} from "@/lib/supabase/performance-service"
import { PerformanceReviewDialog } from "@/components/performance-review-dialog"
import { NavHeader } from "@/components/nav-header"

// ── Status metadata (all statuses) ───────────────────────────────────────────

const STATUS_META: Record<ReviewStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }> = {
  draft:            { label: "Draft",                          variant: "secondary",   icon: <Clock className="w-3 h-3" /> },
  submitted:        { label: "Submitted — Awaiting Review",    variant: "outline",     icon: <Send className="w-3 h-3" /> },
  manager_reviewed: { label: "Awaiting HR Sign-off",           variant: "outline",     icon: <Users className="w-3 h-3" /> },
  hr_approved:      { label: "HR Approved",                    variant: "default",     icon: <CheckCircle2 className="w-3 h-3" /> },
  acknowledged:     { label: "Acknowledged",                   variant: "default",     icon: <ClipboardCheck className="w-3 h-3" /> },
  gm_approved:      { label: "GM Approved — Gate Cleared",     variant: "default",     icon: <Crown className="w-3 h-3" /> },
}

// Labels for monthly check-in status
const CHECKIN_STATUS_LABELS: Partial<Record<ReviewStatus, string>> = {
  submitted:    "Sent to Employee",
  acknowledged: "Acknowledged",
  draft:        "Draft",
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.draft
  return (
    <Badge variant={m.variant} className="flex items-center gap-1 text-xs">
      {m.icon}{m.label}
    </Badge>
  )
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-muted-foreground text-xs italic">Not rated</span>
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating}/5</span>
    </span>
  )
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Cycle state
  const [cycles,          setCycles]          = useState<PerformanceCycle[]>([])
  const [selectedCycleId, setSelectedCycleId] = useState<string>("")
  const [cyclesLoading,   setCyclesLoading]   = useState(true)

  // Review data
  const [myReview,       setMyReview]       = useState<PerformanceReview | null>(null)
  const [teamReviews,    setTeamReviews]    = useState<PerformanceReview[]>([])
  const [allCycleReviews, setAllCycleReviews] = useState<PerformanceReview[]>([])
  const [teamMembers,    setTeamMembers]    = useState<Array<{ id: string; firstName: string; lastName: string; department: string | null; jobTitle: string | null }>>([])
  const [gateStatus,     setGateStatus]     = useState<IncentiveGateStatus | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState("")

  // KPI edit state
  const [editKpis,      setEditKpis]      = useState<KPIEntry[]>([])
  const [employeeNotes, setEmployeeNotes] = useState("")
  const [isSaving,      setIsSaving]      = useState(false)
  const [saveMsg,       setSaveMsg]       = useState("")

  // HR approve state
  const [hrNotes,     setHrNotes]     = useState("")
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [isApproving, setIsApproving] = useState(false)

  // GM approve state
  const [gmNotes,     setGmNotes]     = useState("")
  const [gmApprovingId, setGmApprovingId] = useState<string | null>(null)
  const [isGmApproving, setIsGmApproving] = useState(false)

  // Manager review dialog (quarterly/annual)
  const [reviewTarget, setReviewTarget] = useState<PerformanceReview | null>(null)

  // Monthly check-in creation
  const [checkinTargetId,    setCheckinTargetId]    = useState<string | null>(null)
  const [checkinNotes,       setCheckinNotes]        = useState("")
  const [isSendingCheckin,   setIsSendingCheckin]    = useState(false)
  const [checkinMsg,         setCheckinMsg]          = useState("")

  // Employee acknowledge
  const [isAcknowledging,    setIsAcknowledging]    = useState(false)

  // Create review (employee starts KPI review)
  const [isCreatingReview,   setIsCreatingReview]   = useState(false)

  const selectedCycle = cycles.find(c => c.id === selectedCycleId)
  const isMonthly     = selectedCycle?.type === "monthly"
  const isAnnual      = selectedCycle?.type === "annual"

  const isManager   = ["line_manager", "hr_manager", "system_admin"].includes(user?.role ?? "")
  const isHR        = ["hr_manager", "system_admin"].includes(user?.role ?? "")
  const isExecutive = user?.role === "executive"
  const canSeeGate  = isHR || isExecutive

  // Load cycles once on mount
  useEffect(() => {
    getPerformanceCycles().then(cs => {
      setCycles(cs)
      const active = cs.find(c => c.isActive)
      setSelectedCycleId(active?.id ?? cs[0]?.id ?? "")
      setCyclesLoading(false)
    })
  }, [])

  const load = useCallback(async () => {
    if (!user || !selectedCycleId) return
    setLoading(true)
    setError("")
    try {
      const cycleType = cycles.find(c => c.id === selectedCycleId)?.type

      const [mine, team, members, gate, allReviews] = await Promise.all([
        getMyReview(user.id, selectedCycleId),
        isManager ? getTeamReviews(user.id, selectedCycleId) : Promise.resolve([]),
        isManager ? getTeamMembers(user.id) : Promise.resolve([]),
        canSeeGate ? getIncentiveGateStatus(selectedCycleId, cycleType) : Promise.resolve(null),
        // HR needs ALL cycle reviews for sign-off, not just direct reports
        isHR ? getCycleReviews(selectedCycleId) : Promise.resolve([]),
      ])
      setMyReview(mine)
      setTeamReviews(team)
      setAllCycleReviews(allReviews)
      setTeamMembers(members)
      setGateStatus(gate)
      if (mine) {
        setEditKpis(mine.kpis.map(k => ({ ...k })))
        setEmployeeNotes(mine.employeeNotes ?? "")
      }
    } catch {
      setError("Failed to load performance data")
    } finally {
      setLoading(false)
    }
  }, [user, selectedCycleId, isManager, canSeeGate, cycles])

  useEffect(() => {
    if (!isLoading && !user) router.push("/")
  }, [isLoading, user, router])

  useEffect(() => {
    if (user && selectedCycleId) load()
  }, [load, user, selectedCycleId])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSaveDraft = async () => {
    if (!myReview) return
    setIsSaving(true); setSaveMsg("")
    const result = await saveDraftKPIs(myReview.id, editKpis, employeeNotes)
    setIsSaving(false)
    setSaveMsg(result.success ? "Draft saved." : result.error ?? "Failed to save")
    if (result.success) load()
  }

  const handleSubmit = async () => {
    if (!myReview || !user) return
    setIsSaving(true); setSaveMsg("")
    const result = await submitReview(
      myReview.id, editKpis, employeeNotes,
      { employeeId: user.id, employeeName: `${user.firstName} ${user.lastName}`, cycleName: selectedCycle?.name },
    )
    setIsSaving(false)
    setSaveMsg(result.success ? "Submitted for manager review." : result.error ?? "Failed to submit")
    if (result.success) load()
  }

  const handleCreateReview = async () => {
    if (!user || !selectedCycleId) return
    setIsCreatingReview(true)
    const created = await createReview(user.id, selectedCycleId)
    setIsCreatingReview(false)
    if (created) {
      setMyReview(created)
      setEditKpis(created.kpis.map(k => ({ ...k })))
      setEmployeeNotes("")
    } else {
      setError("Failed to start review. Please try again.")
    }
  }

  const handleHrApprove = async (review: PerformanceReview) => {
    if (!user) return
    setApprovingId(review.id); setIsApproving(true)
    const name = `${user.firstName} ${user.lastName}`
    const result = await hrApprove(
      review.id, user.id, name, hrNotes,
      { employeeId: review.employeeId, employeeName: review.employee ? `${review.employee.firstName} ${review.employee.lastName}` : review.employeeId, cycleName: review.cycleName, cycleType: review.cycleType },
    )
    setIsApproving(false); setApprovingId(null)
    if (result.success) { setHrNotes(""); load() }
  }

  const handleGmApprove = async (review: PerformanceReview) => {
    if (!user) return
    setGmApprovingId(review.id); setIsGmApproving(true)
    const name = `${user.firstName} ${user.lastName}`
    const result = await gmApprove(
      review.id, user.id, name, gmNotes,
      { employeeId: review.employeeId, employeeName: review.employee ? `${review.employee.firstName} ${review.employee.lastName}` : review.employeeId, cycleName: review.cycleName },
    )
    setIsGmApproving(false); setGmApprovingId(null)
    if (result.success) { setGmNotes(""); load() }
  }

  const handleAcknowledge = async () => {
    if (!myReview || !user) return
    setIsAcknowledging(true)
    const result = await employeeAcknowledge(
      myReview.id, user.id,
      { employeeName: `${user.firstName} ${user.lastName}`, cycleName: selectedCycle?.name },
    )
    setIsAcknowledging(false)
    if (result.success) load()
    else setError(result.error ?? "Failed to acknowledge check-in")
  }

  const handleSendCheckin = async (employeeId: string) => {
    if (!user || !selectedCycleId || !checkinNotes.trim()) return
    setIsSendingCheckin(true); setCheckinMsg("")
    const result = await createMonthlyCheckin({
      managerId:    user.id,
      managerName:  `${user.firstName} ${user.lastName}`,
      employeeId,
      cycleId:      selectedCycleId,
      checkinNotes: checkinNotes.trim(),
    })
    setIsSendingCheckin(false)
    if (result.success) {
      setCheckinTargetId(null)
      setCheckinNotes("")
      load()
    } else {
      setCheckinMsg(result.error ?? "Failed to send check-in")
    }
  }

  const updateKpiActual = (kpiId: string, actual: string) =>
    setEditKpis(prev => prev.map(k => k.id === kpiId ? { ...k, actual } : k))

  // ── Derived lists ──────────────────────────────────────────────────────────

  const reviewedMemberIds = new Set(teamReviews.map(r => r.employeeId))
  const membersWithoutCheckin = teamMembers.filter(m => !reviewedMemberIds.has(m.id))
  // HR sees all reviews in cycle (not just direct reports) for sign-off
  const awaitingHRApproval = allCycleReviews.filter(r => r.status === "manager_reviewed")
  const awaitingGMApproval = isAnnual
    ? allCycleReviews.filter(r => r.status === "hr_approved")
    : []

  // ── Loading skeletons ──────────────────────────────────────────────────────

  if (isLoading || cyclesLoading) {
    return (
      <>
        <NavHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="h-8 bg-muted animate-pulse rounded w-48 mb-6" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </>
    )
  }

  if (!user) return null

  const canEdit = myReview?.status === "draft" && !isMonthly

  return (
    <>
    <NavHeader />
    <div className="container mx-auto px-4 py-8 space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isMonthly ? "Monthly check-ins" : isAnnual ? "Annual review — GM sign-off required" : "Balanced scorecard · KPI review"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Review Cycle</Label>
          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select cycle..." />
            </SelectTrigger>
            <SelectContent>
              {cycles.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    {c.name}
                    {c.isActive && <Badge variant="default" className="text-[10px] px-1 py-0">Active</Badge>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="h-2 bg-muted rounded overflow-hidden">
          <div className="h-full bg-primary/30 animate-pulse w-full" />
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="my-review" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="my-review">
            <TrendingUp className="w-4 h-4 mr-2" />
            {isMonthly ? "My Check-in" : "My Review"}
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="team">
              <Users className="w-4 h-4 mr-2" />
              {isMonthly ? "Team Check-ins" : "Team Reviews"}
            </TabsTrigger>
          )}
          {isHR && !isMonthly && (
            <TabsTrigger value="hr-signoff">
              <ShieldCheck className="w-4 h-4 mr-2" />
              HR Sign-off
              {awaitingHRApproval.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">{awaitingHRApproval.length}</Badge>
              )}
            </TabsTrigger>
          )}
          {isAnnual && isExecutive && (
            <TabsTrigger value="gm-signoff">
              <Crown className="w-4 h-4 mr-2" />
              GM Sign-off
            </TabsTrigger>
          )}
          {canSeeGate && !isMonthly && (
            <TabsTrigger value="gate">
              <Lock className="w-4 h-4 mr-2" />Incentive Gate
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── My Review / My Check-in ────────────────────────────────── */}
        <TabsContent value="my-review" className="space-y-4">

          {/* ── MONTHLY: employee view of manager's check-in ────────── */}
          {isMonthly ? (
            !myReview ? (
              <Card>
                <CardContent className="py-12 text-center space-y-2">
                  <ClipboardCheck className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    No check-in has been submitted by your manager yet for {selectedCycle?.name}.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Badge variant={myReview.status === "acknowledged" ? "default" : "outline"} className="flex items-center gap-1 text-xs">
                    {myReview.status === "acknowledged" ? <><ClipboardCheck className="w-3 h-3" />Acknowledged</> : <><Send className="w-3 h-3" />Awaiting Your Acknowledgement</>}
                  </Badge>
                  {myReview.status === "acknowledged" && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Acknowledged {fmt(myReview.employeeAcknowledgedAt)}
                    </span>
                  )}
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">Monthly Check-in — {selectedCycle?.name}</CardTitle>
                        <CardDescription>From your manager: {myReview.managerReviewerName ?? "Your manager"}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-muted/40 border px-4 py-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {myReview.managerCheckinNotes ?? <span className="italic text-muted-foreground">No notes provided.</span>}
                      </p>
                    </div>

                    {myReview.status === "submitted" && (
                      <div className="mt-4 pt-4 border-t flex justify-end">
                        <Button
                          onClick={handleAcknowledge}
                          disabled={isAcknowledging}
                          className="gap-2"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                          {isAcknowledging ? "Acknowledging..." : "Acknowledge Check-in"}
                        </Button>
                      </div>
                    )}

                    {myReview.status === "acknowledged" && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          You acknowledged this check-in on {fmt(myReview.employeeAcknowledgedAt)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )

          ) : (
            /* ── QUARTERLY / BIANNUAL / ANNUAL: KPI review ─────────── */
            !myReview ? (
              <Card>
                <CardContent className="py-12 text-center space-y-4">
                  <TrendingUp className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">No performance review found for {selectedCycle?.name}.</p>
                  <Button
                    variant="outline"
                    onClick={handleCreateReview}
                    disabled={isCreatingReview}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {isCreatingReview ? "Starting..." : "Start My Review"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <StatusBadge status={myReview.status} />
                  {(myReview.status === "hr_approved" && !isAnnual) && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Incentive gate cleared — {fmt(myReview.hrApprovedAt)}
                    </span>
                  )}
                  {myReview.status === "hr_approved" && isAnnual && (
                    <span className="flex items-center gap-1.5 text-xs text-amber-600">
                      <Clock className="w-3.5 h-3.5" />
                      Awaiting GM sign-off
                    </span>
                  )}
                  {myReview.status === "gm_approved" && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <Crown className="w-3.5 h-3.5" />
                      GM approved — gate cleared {fmt(myReview.gmApprovedAt)}
                    </span>
                  )}
                </div>

                {/* KPI table */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Key Performance Indicators</CardTitle>
                    <CardDescription>
                      {canEdit
                        ? "Enter your actuals for each KPI, then save as draft or submit for review."
                        : "Your submitted KPIs. Manager ratings are shown once reviewed."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                        <div className="col-span-4">KPI</div>
                        <div className="col-span-2">Target</div>
                        <div className="col-span-2">My Actual</div>
                        <div className="col-span-1 text-center">Weight</div>
                        <div className="col-span-2">Manager Rating</div>
                        <div className="col-span-1">Comment</div>
                      </div>
                      <div className="border-b" />
                      {editKpis.map(kpi => (
                        <div key={kpi.id} className="grid grid-cols-12 gap-2 items-start py-2 border-b last:border-0">
                          <div className="col-span-4">
                            <p className="text-sm font-medium">{kpi.title}</p>
                            {kpi.description && <p className="text-xs text-muted-foreground">{kpi.description}</p>}
                          </div>
                          <div className="col-span-2 text-sm">{kpi.target}</div>
                          <div className="col-span-2">
                            {canEdit ? (
                              <input
                                className="w-full text-sm border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="Enter actual..."
                                value={kpi.actual ?? ""}
                                onChange={e => updateKpiActual(kpi.id, e.target.value)}
                              />
                            ) : (
                              <span className="text-sm">{kpi.actual ?? <span className="text-muted-foreground italic">—</span>}</span>
                            )}
                          </div>
                          <div className="col-span-1 text-center">
                            <Badge variant="outline" className="text-xs">{kpi.weight}%</Badge>
                          </div>
                          <div className="col-span-2"><StarRating rating={kpi.managerRating} /></div>
                          <div className="col-span-1 text-xs text-muted-foreground">{kpi.managerComment ?? "—"}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Employee notes */}
                <div className="space-y-1.5">
                  <Label>My Notes {canEdit && <span className="text-muted-foreground">(optional)</span>}</Label>
                  {canEdit ? (
                    <Textarea
                      rows={3}
                      placeholder="Add context, achievements or comments for your manager..."
                      value={employeeNotes}
                      onChange={e => setEmployeeNotes(e.target.value)}
                    />
                  ) : (
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm min-h-[60px]">
                      {myReview.employeeNotes ?? <span className="text-muted-foreground italic">No notes submitted.</span>}
                    </div>
                  )}
                </div>

                {/* Manager / HR / GM notes (read-only for employee) */}
                {myReview.managerNotes && (
                  <div className="rounded-lg border bg-blue-50/50 px-4 py-3 space-y-1">
                    <p className="text-xs font-medium text-blue-700">Manager Notes — {myReview.managerReviewerName}</p>
                    <p className="text-sm">{myReview.managerNotes}</p>
                  </div>
                )}
                {myReview.hrNotes && (
                  <div className="rounded-lg border bg-emerald-50/50 px-4 py-3 space-y-1">
                    <p className="text-xs font-medium text-emerald-700">HR Notes — {myReview.hrReviewerName}</p>
                    <p className="text-sm">{myReview.hrNotes}</p>
                  </div>
                )}
                {myReview.gmNotes && (
                  <div className="rounded-lg border bg-violet-50/50 px-4 py-3 space-y-1">
                    <p className="text-xs font-medium text-violet-700">GM Notes — {myReview.gmReviewerName}</p>
                    <p className="text-sm">{myReview.gmNotes}</p>
                  </div>
                )}

                {/* Action bar */}
                {canEdit && (
                  <div className="flex items-center justify-between pt-2">
                    <span className={`text-xs ${saveMsg.includes("Failed") ? "text-destructive" : "text-muted-foreground"}`}>
                      {saveMsg}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save Draft"}
                      </Button>
                      <Button onClick={handleSubmit} disabled={isSaving}>
                        <Send className="w-4 h-4 mr-2" />Submit for Review
                      </Button>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {(myReview.submittedAt || myReview.managerReviewedAt || myReview.hrApprovedAt || myReview.gmApprovedAt) && (
                  <div className="border rounded-lg px-4 py-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Review Timeline</p>
                    {myReview.submittedAt     && <p className="text-xs text-muted-foreground">Submitted: {fmt(myReview.submittedAt)}</p>}
                    {myReview.managerReviewedAt && <p className="text-xs text-muted-foreground">Manager reviewed by {myReview.managerReviewerName}: {fmt(myReview.managerReviewedAt)}</p>}
                    {myReview.hrApprovedAt    && <p className="text-xs text-muted-foreground">HR approved by {myReview.hrReviewerName}: {fmt(myReview.hrApprovedAt)}</p>}
                    {myReview.gmApprovedAt    && <p className="text-xs text-muted-foreground">GM approved by {myReview.gmReviewerName}: {fmt(myReview.gmApprovedAt)}</p>}
                  </div>
                )}
              </>
            )
          )}
        </TabsContent>

        {/* ── Team Reviews / Team Check-ins ──────────────────────────── */}
        {isManager && (
          <TabsContent value="team" className="space-y-4">

            {/* ── MONTHLY: create + track check-ins ───────────────── */}
            {isMonthly ? (
              <div className="space-y-6">
                {/* Members without a check-in */}
                {membersWithoutCheckin.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold">Pending Check-ins</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Team members who haven't received a check-in for {selectedCycle?.name}.</p>
                    </div>
                    <div className="border rounded-xl divide-y">
                      {membersWithoutCheckin.map(m => (
                        <div key={m.id} className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                              <p className="text-xs text-muted-foreground">{m.jobTitle ?? "—"} · {m.department ?? "—"}</p>
                            </div>
                            {checkinTargetId !== m.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => { setCheckinTargetId(m.id); setCheckinNotes(""); setCheckinMsg("") }}
                              >
                                <Plus className="w-3.5 h-3.5" />Write Check-in
                              </Button>
                            )}
                          </div>

                          {/* Inline check-in form */}
                          {checkinTargetId === m.id && (
                            <div className="space-y-3 pt-1">
                              <Textarea
                                rows={4}
                                placeholder={`Write your check-in notes for ${m.firstName}...`}
                                value={checkinNotes}
                                onChange={e => setCheckinNotes(e.target.value)}
                                disabled={isSendingCheckin}
                                autoFocus
                              />
                              {checkinMsg && <p className="text-xs text-destructive">{checkinMsg}</p>}
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setCheckinTargetId(null); setCheckinNotes(""); setCheckinMsg("") }}
                                  disabled={isSendingCheckin}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSendCheckin(m.id)}
                                  disabled={isSendingCheckin || !checkinNotes.trim()}
                                  className="gap-1.5"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  {isSendingCheckin ? "Sending..." : `Send to ${m.firstName}`}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing check-ins */}
                {teamReviews.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold">Submitted Check-ins</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Check-ins you've sent to your team for {selectedCycle?.name}.</p>
                    </div>
                    <Card>
                      <CardContent className="p-0">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Employee</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Sent</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Acknowledged</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamReviews.map(r => (
                              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 font-medium">
                                  {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge
                                    variant={r.status === "acknowledged" ? "default" : "outline"}
                                    className="text-xs"
                                  >
                                    {CHECKIN_STATUS_LABELS[r.status] ?? r.status}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{fmt(r.submittedAt)}</td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {r.status === "acknowledged" ? fmt(r.employeeAcknowledgedAt) : <span className="text-amber-600 text-xs">Pending</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {membersWithoutCheckin.length === 0 && teamReviews.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No team members found.
                    </CardContent>
                  </Card>
                )}
              </div>

            ) : (
              /* ── QUARTERLY / BIANNUAL / ANNUAL: KPI reviews ─────── */
              teamReviews.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No team reviews found for this cycle.
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Team Performance Reviews</CardTitle>
                    <CardDescription>Review and rate your team members' KPI submissions for {selectedCycle?.name}.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Employee</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Department</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Submitted</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Reviewed</th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {teamReviews.map(r => (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 font-medium">
                              {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{r.employee?.department ?? "—"}</td>
                            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                            <td className="px-4 py-3 text-muted-foreground">{fmt(r.submittedAt)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{fmt(r.managerReviewedAt)}</td>
                            <td className="px-4 py-3 text-right">
                              {r.status === "submitted" && (
                                <Button size="sm" variant="outline" onClick={() => setReviewTarget(r)}>
                                  Review <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                              )}
                              {r.status === "manager_reviewed" && (
                                <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">Awaiting HR</Badge>
                              )}
                              {r.status === "hr_approved" && isAnnual && (
                                <Badge variant="outline" className="text-xs text-violet-600 border-violet-200">Awaiting GM</Badge>
                              )}
                              {r.status === "hr_approved" && !isAnnual && (
                                <Badge className="text-xs">Approved</Badge>
                              )}
                              {r.status === "gm_approved" && (
                                <Badge className="text-xs bg-violet-600">GM Approved</Badge>
                              )}
                              {r.status === "draft" && (
                                <Badge variant="secondary" className="text-xs">Not submitted</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )
            )}
          </TabsContent>
        )}

        {/* ── HR Sign-off ───────────────────────────────────────────── */}
        {isHR && !isMonthly && (
          <TabsContent value="hr-signoff" className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Awaiting HR Sign-off</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Reviews that passed manager review and need HR approval for {selectedCycle?.name}.
                {isAnnual && " After HR approval, the review goes to the GM for final sign-off."}
              </p>
            </div>

            {awaitingHRApproval.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">No reviews pending HR sign-off for this cycle.</p>
                </CardContent>
              </Card>
            ) : (
              awaitingHRApproval.map(r => (
                <Card key={r.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId}
                        </CardTitle>
                        <CardDescription>
                          {r.employee?.jobTitle} · {r.employee?.department} · {r.cycleName}
                        </CardDescription>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* KPI summary */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">KPI</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Target</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Actual</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.kpis.map(k => (
                            <tr key={k.id} className="border-b last:border-0">
                              <td className="px-3 py-2 font-medium">{k.title}</td>
                              <td className="px-3 py-2 text-muted-foreground">{k.target}</td>
                              <td className="px-3 py-2">{k.actual ?? "—"}</td>
                              <td className="px-3 py-2"><StarRating rating={k.managerRating} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {r.managerNotes && (
                      <div className="rounded-md bg-blue-50/50 border border-blue-100 px-3 py-2">
                        <p className="text-xs font-medium text-blue-700 mb-1">Manager Notes — {r.managerReviewerName}</p>
                        <p className="text-xs">{r.managerNotes}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs">
                        HR Notes (optional){isAnnual && <span className="text-muted-foreground ml-1">— this review will proceed to GM after approval</span>}
                      </Label>
                      <Textarea
                        rows={2}
                        className="text-xs"
                        placeholder="Add HR remarks before approving..."
                        value={approvingId === r.id ? hrNotes : ""}
                        onChange={e => { setApprovingId(r.id); setHrNotes(e.target.value) }}
                        disabled={isApproving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleHrApprove(r)}
                        disabled={isApproving}
                        className="w-full gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {isApproving && approvingId === r.id
                          ? "Approving..."
                          : isAnnual ? "Approve & Forward to GM" : "Approve & Clear Incentive Gate"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        {/* ── GM Sign-off (annual + executive only) ─────────────────── */}
        {isAnnual && isExecutive && (
          <TabsContent value="gm-signoff" className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">GM Sign-off — Annual Reviews</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Annual reviews that have been HR-approved require your final sign-off to clear the incentive gate.
              </p>
            </div>

            {awaitingGMApproval.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Crown className="w-8 h-8 text-violet-400 mx-auto mb-3" />
                  <p className="text-muted-foreground">No annual reviews pending GM sign-off.</p>
                </CardContent>
              </Card>
            ) : (
              awaitingGMApproval.map(r => (
                <Card key={r.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId}
                        </CardTitle>
                        <CardDescription>
                          {r.employee?.jobTitle} · {r.employee?.department} · {r.cycleName}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs text-violet-600 border-violet-200">Awaiting GM</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* KPI summary */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">KPI</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Target</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Actual</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.kpis.map(k => (
                            <tr key={k.id} className="border-b last:border-0">
                              <td className="px-3 py-2 font-medium">{k.title}</td>
                              <td className="px-3 py-2 text-muted-foreground">{k.target}</td>
                              <td className="px-3 py-2">{k.actual ?? "—"}</td>
                              <td className="px-3 py-2"><StarRating rating={k.managerRating} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {r.managerNotes && (
                      <div className="rounded-md bg-blue-50/50 border border-blue-100 px-3 py-2">
                        <p className="text-xs font-medium text-blue-700 mb-1">Manager Notes — {r.managerReviewerName}</p>
                        <p className="text-xs">{r.managerNotes}</p>
                      </div>
                    )}
                    {r.hrNotes && (
                      <div className="rounded-md bg-emerald-50/50 border border-emerald-100 px-3 py-2">
                        <p className="text-xs font-medium text-emerald-700 mb-1">HR Notes — {r.hrReviewerName}</p>
                        <p className="text-xs">{r.hrNotes}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs">GM Notes (optional)</Label>
                      <Textarea
                        rows={2}
                        className="text-xs"
                        placeholder="Add remarks before final approval..."
                        value={gmApprovingId === r.id ? gmNotes : ""}
                        onChange={e => { setGmApprovingId(r.id); setGmNotes(e.target.value) }}
                        disabled={isGmApproving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleGmApprove(r)}
                        disabled={isGmApproving}
                        className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
                      >
                        <Crown className="w-4 h-4" />
                        {isGmApproving && gmApprovingId === r.id ? "Approving..." : "GM Approve & Clear Incentive Gate"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        {/* ── Incentive Gate ─────────────────────────────────────────── */}
        {canSeeGate && !isMonthly && (
          <TabsContent value="gate" className="space-y-4">
            {!gateStatus ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">Loading gate status...</CardContent>
              </Card>
            ) : (
              <>
                <Card className={gateStatus.blocked ? "border-red-200 bg-red-50/30" : "border-emerald-200 bg-emerald-50/30"}>
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${gateStatus.blocked ? "bg-red-100" : "bg-emerald-100"}`}>
                        {gateStatus.blocked ? <Lock className="w-7 h-7 text-red-600" /> : <CheckCircle2 className="w-7 h-7 text-emerald-600" />}
                      </div>
                      <div>
                        <p className={`text-lg font-bold ${gateStatus.blocked ? "text-red-700" : "text-emerald-700"}`}>
                          Incentive Gate: {gateStatus.blocked ? "BLOCKED" : "CLEARED"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {selectedCycle?.name} · {gateStatus.approved} of {gateStatus.total} employees approved
                          {isAnnual && " (requires GM sign-off)"}
                        </p>
                        {gateStatus.blocked && (
                          <p className="text-xs text-red-600 mt-1">
                            Incentive processing is blocked until all {gateStatus.total} reviews are{isAnnual ? " GM-approved" : " HR-approved"}.
                          </p>
                        )}
                        {!gateStatus.blocked && (
                          <p className="text-xs text-emerald-600 mt-1">All reviews approved. Incentive processing may proceed.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Approval progress</span>
                    <span>{gateStatus.approved}/{gateStatus.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${gateStatus.blocked ? "bg-amber-400" : "bg-emerald-500"}`}
                      style={{ width: gateStatus.total > 0 ? `${(gateStatus.approved / gateStatus.total) * 100}%` : "0%" }}
                    />
                  </div>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Employee Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Employee</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Gate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gateStatus.breakdown.map(b => (
                          <tr key={b.employeeId} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium">{b.employeeName}</td>
                            <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                            <td className="px-4 py-3">
                              {(b.status === "hr_approved" && !isAnnual) || b.status === "gm_approved"
                                ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3 h-3" />Cleared</span>
                                : <span className="flex items-center gap-1 text-xs text-red-500"><Lock className="w-3 h-3" />Blocked</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground bg-muted/50 border rounded-lg px-4 py-3">
                  The incentive gate is a governance signal only — this portal does not trigger payroll. Once cleared, notify the payroll team to proceed for {selectedCycle?.name}.
                </p>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Manager review dialog (quarterly/annual) */}
      <PerformanceReviewDialog
        review={reviewTarget}
        isOpen={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        onSuccess={() => { setReviewTarget(null); load() }}
        reviewerId={user.id}
        reviewerName={`${user.firstName} ${user.lastName}`}
      />
    </div>
    </>
  )
}
