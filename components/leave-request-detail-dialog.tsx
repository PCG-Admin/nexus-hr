"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Calendar, Clock, FileText, ExternalLink, Pencil, X, AlertCircle, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updateLeaveRequest, uploadDocument, getLeaveLedger, type LeaveRequest, type LeaveLedgerEntry } from "@/lib/supabase/leave-service"
import { getPublicHolidayDates, countWorkingDays } from "@/lib/supabase/holiday-service"
import { useAuth } from "@/lib/auth"

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-amber-100 text-amber-800 border-amber-300",
  pending_hr: "bg-blue-100 text-blue-800 border-blue-300",
  approved:    "bg-emerald-100 text-emerald-800 border-emerald-300",
  rejected:    "bg-red-100 text-red-800 border-red-300",
  cancelled:   "bg-slate-100 text-slate-800 border-slate-300",
}

const ACTION_LABELS: Record<string, string> = {
  submitted:        "Submitted",
  edited:           "Edited",
  manager_approved: "Manager Approved",
  approved:         "Approved",
  rejected:         "Rejected",
  cancelled:        "Cancelled",
  admin_edited:     "Admin Override",
}

const ACTION_COLORS: Record<string, string> = {
  submitted:        "bg-blue-500",
  edited:           "bg-slate-400",
  manager_approved: "bg-amber-500",
  approved:         "bg-emerald-500",
  rejected:         "bg-red-500",
  cancelled:        "bg-slate-400",
  admin_edited:     "bg-purple-500",
}

type Props = {
  request: LeaveRequest | null
  onClose: () => void
  onUpdated: () => void
}

export function LeaveRequestDetailDialog({ request, onClose, onUpdated }: Props) {
  const { user } = useAuth()
  const [editMode, setEditMode] = useState(false)

  // Edit form state
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")
  const [document, setDocument] = useState<File | null>(null)
  const [daysRequested, setDaysRequested] = useState(0)
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set())

  const [removeDocument, setRemoveDocument] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [ledger, setLedger] = useState<LeaveLedgerEntry[]>([])

  // Populate edit fields and load ledger when request changes
  useEffect(() => {
    if (request) {
      setStartDate(request.startDate)
      setEndDate(request.endDate)
      setReason(request.reason ?? "")
      setDaysRequested(request.daysRequested)
      setEditMode(false)
      setError("")
      setDocument(null)
      setRemoveDocument(false)
      getLeaveLedger(request.id).then(setLedger)
    }
  }, [request])

  // Load holidays for day recalculation
  useEffect(() => {
    const year = new Date().getFullYear()
    getPublicHolidayDates(year, year + 1).then(setHolidayDates)
  }, [])

  // Recalculate days when dates change in edit mode
  useEffect(() => {
    if (!editMode || !startDate || !endDate) return
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end >= start) {
      setDaysRequested(countWorkingDays(start, end, holidayDates))
      setError("")
    } else {
      setError("End date must be after start date")
      setDaysRequested(0)
    }
  }, [startDate, endDate, editMode, holidayDates])

  if (!request) return null

  const isPending = request.status === "pending"

  const handleSave = async () => {
    if (!user || daysRequested <= 0) return
    setIsSaving(true)
    setError("")

    try {
      let documentUrl: string | null | undefined = request.documentUrl

      if (document) {
        // New upload always wins — replaces existing or overrides remove flag
        const uploadResult = await uploadDocument(document, user.id)
        if (uploadResult.success) {
          documentUrl = uploadResult.url
        } else {
          console.error("Document upload failed:", uploadResult.error)
        }
      } else if (removeDocument) {
        documentUrl = null
      }

      const result = await updateLeaveRequest(
        request.id,
        { startDate, endDate, daysRequested, reason: reason || undefined, documentUrl },
        user ? { id: user.id, name: `${user.firstName} ${user.lastName}` } : undefined
      )

      if (!result.success) {
        // This is where the race condition message surfaces to the user
        setError(result.error ?? "Failed to update request.")
        setIsSaving(false)
        return
      }

      onUpdated()
      onClose()
    } catch {
      setError("An unexpected error occurred.")
    }

    setIsSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{request.leaveTypeName}</h2>
            <Badge className={STATUS_STYLES[request.status]} variant="outline">
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Badge>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Race condition / save error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Dates + days */}
          {editMode ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              {daysRequested > 0 && (
                <div className="col-span-2 text-sm text-muted-foreground bg-muted rounded px-3 py-2">
                  Total working days (excl. weekends & public holidays): <strong>{daysRequested}</strong>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(request.startDate + "T00:00:00"), "d MMM yyyy")} –{" "}
                  {format(new Date(request.endDate + "T00:00:00"), "d MMM yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{request.daysRequested} day{request.daysRequested !== 1 ? "s" : ""}</span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1">
            <Label>Reason</Label>
            {editMode ? (
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Provide a reason (optional)"
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {request.reason ?? <span className="italic">No reason provided</span>}
              </p>
            )}
          </div>

          {/* Document */}
          <div className="space-y-1">
            <Label>Supporting Document</Label>
            {editMode ? (
              <div className="space-y-2">
                {request.documentUrl && !removeDocument && (
                  <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <a
                      href={request.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      <FileText className="w-4 h-4" />
                      View current document
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => { setRemoveDocument(true); setDocument(null) }}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {removeDocument && (
                  <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-600">Document will be removed on save.</p>
                    <button
                      onClick={() => setRemoveDocument(false)}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Undo
                    </button>
                  </div>
                )}
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null
                    setDocument(file)
                    if (file) setRemoveDocument(false)
                  }}
                />
              </div>
            ) : request.documentUrl ? (
              <a
                href={request.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <FileText className="w-4 h-4" />
                View attached document
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <p className="text-sm text-muted-foreground italic">No document attached</p>
            )}
          </div>

          {/* Reviewer notes — shown when approved or rejected */}
          {(request.status === "approved" || request.status === "rejected") && (
            <div className="space-y-1">
              <Label>Manager Notes</Label>
              <p className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">
                {request.reviewerNotes ?? <span className="italic">No notes left</span>}
              </p>
            </div>
          )}

          {/* Submitted date */}
          <p className="text-xs text-muted-foreground">
            Submitted on {format(new Date(request.createdAt), "d MMMM yyyy")}
          </p>

          {/* Ledger timeline */}
          {ledger.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity History</p>
              </div>
              <div className="relative space-y-0 pl-1">
                {ledger.map((entry, idx) => (
                  <div key={entry.id} className="relative flex gap-3 pb-4">
                    {idx < ledger.length - 1 && (
                      <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />
                    )}
                    <div className={`relative z-10 mt-1 w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 ${ACTION_COLORS[entry.action] ?? "bg-slate-400"}`} />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xs font-semibold">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                        <span className="text-xs text-muted-foreground">by {entry.actorName}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(entry.createdAt), "d MMM yyyy · HH:mm")}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">"{entry.notes}"</p>
                      )}
                      {entry.action === 'edited' && entry.startDate && entry.endDate && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Dates updated to {format(new Date(entry.startDate + "T00:00:00"), "d MMM")} – {format(new Date(entry.endDate + "T00:00:00"), "d MMM yyyy")} · {entry.daysRequested} day{entry.daysRequested !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => { setEditMode(false); setError(""); setRemoveDocument(false) }} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || daysRequested <= 0}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {isPending && user?.id === request.userId && (
                <Button onClick={() => setEditMode(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Request
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
