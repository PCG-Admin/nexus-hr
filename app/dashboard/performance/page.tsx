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
} from "lucide-react"
import {
  getPerformanceCycles, getCycleReviews, getMyReview,
  getTeamReviews, hrApprove, submitReview, saveDraftKPIs,
  getIncentiveGateStatus,
  PERFORMANCE_CYCLES,
  type PerformanceCycle, type PerformanceReview,
  type KPIEntry, type ReviewStatus, type IncentiveGateStatus,
} from "@/lib/supabase/performance-service"
import { PerformanceReviewDialog } from "@/components/performance-review-dialog"
import { NavHeader } from "@/components/nav-header"

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<ReviewStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }> = {
  draft:            { label: "Draft",                  variant: "secondary", icon: <Clock className="w-3 h-3" /> },
  submitted:        { label: "Submitted — Awaiting Manager Review", variant: "outline",   icon: <Send className="w-3 h-3" /> },
  manager_reviewed: { label: "Awaiting HR Sign-off",   variant: "outline",   icon: <Users className="w-3 h-3" /> },
  hr_approved:      { label: "HR Approved",             variant: "default",   icon: <CheckCircle2 className="w-3 h-3" /> },
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const m = STATUS_META[status]
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

  const [selectedCycleId, setSelectedCycleId] = useState(PERFORMANCE_CYCLES.find(c => c.isActive)?.id ?? PERFORMANCE_CYCLES[0].id)
  const [myReview,   setMyReview]   = useState<PerformanceReview | null>(null)
  const [teamReviews, setTeamReviews] = useState<PerformanceReview[]>([])
  const [gateStatus,  setGateStatus]  = useState<IncentiveGateStatus | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState("")

  // KPI edit state (My Review tab)
  const [editKpis,       setEditKpis]       = useState<KPIEntry[]>([])
  const [employeeNotes,  setEmployeeNotes]  = useState("")
  const [isSaving,       setIsSaving]       = useState(false)
  const [saveMsg,        setSaveMsg]        = useState("")

  // HR approve state
  const [hrNotes,       setHrNotes]       = useState("")
  const [approvingId,   setApprovingId]   = useState<string | null>(null)
  const [isApproving,   setIsApproving]   = useState(false)

  // Manager review dialog
  const [reviewTarget, setReviewTarget] = useState<PerformanceReview | null>(null)

  const isManager   = ["line_manager", "hr_manager", "system_admin"].includes(user?.role ?? "")
  const isHR        = ["hr_manager", "system_admin"].includes(user?.role ?? "")
  const isExecutive = user?.role === "executive"
  const canSeeGate  = isHR || isExecutive

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [mine, team, gate] = await Promise.all([
        getMyReview(user.id, selectedCycleId),
        isManager ? getTeamReviews(user.id, selectedCycleId) : Promise.resolve([]),
        canSeeGate ? getIncentiveGateStatus(selectedCycleId) : Promise.resolve(null),
      ])
      setMyReview(mine)
      setTeamReviews(team)
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
  }, [user, selectedCycleId, isManager, canSeeGate])

  useEffect(() => {
    if (!isLoading && !user) router.push("/")
  }, [isLoading, user, router])

  useEffect(() => { if (user) load() }, [load, user])

  const handleSaveDraft = async () => {
    if (!myReview) return
    setIsSaving(true)
    setSaveMsg("")
    const result = await saveDraftKPIs(myReview.id, editKpis, employeeNotes)
    setIsSaving(false)
    setSaveMsg(result.success ? "Draft saved." : result.error ?? "Failed to save")
    if (result.success) load()
  }

  const handleSubmit = async () => {
    if (!myReview) return
    setIsSaving(true)
    setSaveMsg("")
    const result = await submitReview(myReview.id, editKpis, employeeNotes)
    setIsSaving(false)
    setSaveMsg(result.success ? "Submitted for manager review." : result.error ?? "Failed to submit")
    if (result.success) load()
  }

  const handleHrApprove = async (review: PerformanceReview) => {
    if (!user) return
    setApprovingId(review.id)
    setIsApproving(true)
    const name = `${user.firstName} ${user.lastName}`
    const result = await hrApprove(review.id, user.id, name, hrNotes)
    setIsApproving(false)
    setApprovingId(null)
    if (result.success) { setHrNotes(""); load() }
  }

  const updateKpiActual = (kpiId: string, actual: string) =>
    setEditKpis(prev => prev.map(k => k.id === kpiId ? { ...k, actual } : k))

  if (isLoading || loading) {
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

  const selectedCycle = PERFORMANCE_CYCLES.find(c => c.id === selectedCycleId)!
  const canEdit = myReview?.status === "draft"
  const awaitingHRApproval = teamReviews.filter(r => r.status === "manager_reviewed")
  const q2TeamReviews = teamReviews.filter(r => r.status !== "hr_approved" || selectedCycleId !== "cycle-q1-2026")

  return (
    <>
    <NavHeader />
    <div className="container mx-auto px-4 py-8 space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Balanced scorecard · Phase 1 — manual KPI entry</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Review Cycle</Label>
          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERFORMANCE_CYCLES.map(c => (
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

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="my-review" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-review">
            <TrendingUp className="w-4 h-4 mr-2" />My Review
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="team">
              <Users className="w-4 h-4 mr-2" />Team Reviews
            </TabsTrigger>
          )}
          {isHR && (
            <TabsTrigger value="hr-signoff">
              <ShieldCheck className="w-4 h-4 mr-2" />
              HR Sign-off
              {awaitingHRApproval.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">{awaitingHRApproval.length}</Badge>
              )}
            </TabsTrigger>
          )}
          {canSeeGate && (
            <TabsTrigger value="gate">
              <Lock className="w-4 h-4 mr-2" />Incentive Gate
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── My Review ─────────────────────────────────────────────────── */}
        <TabsContent value="my-review" className="space-y-4">
          {!myReview ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No performance review found for this cycle.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <StatusBadge status={myReview.status} />
                {myReview.status === "hr_approved" && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Incentive gate cleared — {fmt(myReview.hrApprovedAt)}
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
                    {/* Header row */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                      <div className="col-span-4">KPI</div>
                      <div className="col-span-2">Target</div>
                      <div className="col-span-2">My Actual</div>
                      <div className="col-span-1 text-center">Weight</div>
                      <div className="col-span-2">Manager Rating</div>
                      <div className="col-span-1">Comment</div>
                    </div>
                    <div className="border-b" />
                    {editKpis.map((kpi) => (
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
                        <div className="col-span-2">
                          <StarRating rating={kpi.managerRating} />
                        </div>
                        <div className="col-span-1 text-xs text-muted-foreground">
                          {kpi.managerComment ?? "—"}
                        </div>
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

              {/* Manager / HR notes (read-only for employee) */}
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
                      <Send className="w-4 h-4 mr-2" />
                      Submit for Review
                    </Button>
                  </div>
                </div>
              )}

              {/* Timeline */}
              {(myReview.submittedAt || myReview.managerReviewedAt || myReview.hrApprovedAt) && (
                <div className="border rounded-lg px-4 py-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Review Timeline</p>
                  {myReview.submittedAt && (
                    <p className="text-xs text-muted-foreground">Submitted: {fmt(myReview.submittedAt)}</p>
                  )}
                  {myReview.managerReviewedAt && (
                    <p className="text-xs text-muted-foreground">
                      Manager reviewed by {myReview.managerReviewerName}: {fmt(myReview.managerReviewedAt)}
                    </p>
                  )}
                  {myReview.hrApprovedAt && (
                    <p className="text-xs text-muted-foreground">
                      HR approved by {myReview.hrReviewerName}: {fmt(myReview.hrApprovedAt)}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Team Reviews ──────────────────────────────────────────────── */}
        {isManager && (
          <TabsContent value="team" className="space-y-4">
            {teamReviews.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No team reviews found for this cycle.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Team Performance Reviews</CardTitle>
                  <CardDescription>Review and rate your team members' KPI submissions for {selectedCycle.name}.</CardDescription>
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setReviewTarget(r)}
                              >
                                Review <ChevronRight className="w-3.5 h-3.5 ml-1" />
                              </Button>
                            )}
                            {r.status === "manager_reviewed" && (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">Awaiting HR</Badge>
                            )}
                            {r.status === "hr_approved" && (
                              <Badge className="text-xs">Approved</Badge>
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
            )}
          </TabsContent>
        )}

        {/* ── HR Sign-off ───────────────────────────────────────────────── */}
        {isHR && (
          <TabsContent value="hr-signoff" className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Awaiting HR Sign-off</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Reviews that have passed manager review and are pending HR approval for {selectedCycle.name}.
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

                    {/* Manager notes */}
                    {r.managerNotes && (
                      <div className="rounded-md bg-blue-50/50 border border-blue-100 px-3 py-2">
                        <p className="text-xs font-medium text-blue-700 mb-1">Manager Notes — {r.managerReviewerName}</p>
                        <p className="text-xs">{r.managerNotes}</p>
                      </div>
                    )}

                    {/* HR approval */}
                    <div className="space-y-2">
                      <Label className="text-xs">HR Notes (optional)</Label>
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
                        className="w-full"
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        {isApproving && approvingId === r.id ? "Approving..." : "Approve & Clear Incentive Gate"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        {/* ── Incentive Gate ────────────────────────────────────────────── */}
        {canSeeGate && (
          <TabsContent value="gate" className="space-y-4">
            {!gateStatus ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">Loading gate status...</CardContent>
              </Card>
            ) : (
              <>
                {/* Gate indicator */}
                <Card className={gateStatus.blocked ? "border-red-200 bg-red-50/30" : "border-emerald-200 bg-emerald-50/30"}>
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${gateStatus.blocked ? "bg-red-100" : "bg-emerald-100"}`}>
                        {gateStatus.blocked
                          ? <Lock className="w-7 h-7 text-red-600" />
                          : <CheckCircle2 className="w-7 h-7 text-emerald-600" />}
                      </div>
                      <div>
                        <p className={`text-lg font-bold ${gateStatus.blocked ? "text-red-700" : "text-emerald-700"}`}>
                          Incentive Gate: {gateStatus.blocked ? "BLOCKED" : "CLEARED"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {selectedCycle.name} · {gateStatus.approved} of {gateStatus.total} employees HR-approved
                        </p>
                        {gateStatus.blocked && (
                          <p className="text-xs text-red-600 mt-1">
                            Incentive processing is blocked until all {gateStatus.total} reviews are HR-approved.
                          </p>
                        )}
                        {!gateStatus.blocked && (
                          <p className="text-xs text-emerald-600 mt-1">
                            All reviews approved. Incentive processing may proceed.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Progress bar */}
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

                {/* Breakdown table */}
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
                              {b.status === "hr_approved"
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
                  The incentive gate is a governance signal only — this portal does not trigger payroll. Once cleared, notify the payroll team to proceed with incentive processing for {selectedCycle.name}.
                </p>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Manager review dialog */}
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
