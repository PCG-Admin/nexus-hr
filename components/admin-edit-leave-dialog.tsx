"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { X, AlertCircle, FileText, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getPublicHolidayDates, countWorkingDays } from "@/lib/supabase/holiday-service"
import type { LeaveRequestWithEmployee } from "@/lib/supabase/leave-service"

type Props = {
  request: LeaveRequestWithEmployee | null
  onClose: () => void
  onUpdated: () => void
}

export function AdminEditLeaveDialog({ request, onClose, onUpdated }: Props) {
  const [endDate, setEndDate] = useState("")
  const [daysRequested, setDaysRequested] = useState(0)
  const [adminNote, setAdminNote] = useState("")
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const year = new Date().getFullYear()
    getPublicHolidayDates(year, year + 1).then(setHolidayDates)
  }, [])

  useEffect(() => {
    if (request) {
      setEndDate(request.endDate)
      setDaysRequested(request.daysRequested)
      setAdminNote(request.reviewerNotes ?? "")
      setError("")
    }
  }, [request])

  // Recalculate days whenever end date changes
  useEffect(() => {
    if (!request || !endDate) return
    const start = new Date(request.startDate)
    const end = new Date(endDate)
    if (end >= start) {
      setDaysRequested(countWorkingDays(start, end, holidayDates))
      setError("")
    } else {
      setError("End date cannot be before the start date")
      setDaysRequested(0)
    }
  }, [endDate, request, holidayDates])

  if (!request) return null

  const daysChanged = daysRequested !== request.daysRequested || endDate !== request.endDate

  const handleSave = async () => {
    if (!adminNote.trim()) {
      setError("An override note is required to explain the change.")
      return
    }
    if (daysRequested < 1) {
      setError("Days requested must be at least 1.")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      const res = await fetch("/api/leave/admin-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          endDate,
          daysRequested,
          adminNote,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to save changes.")
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
          <div>
            <h2 className="text-lg font-semibold">Override Approved Leave</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {request.employee.firstName} {request.employee.lastName} — {request.leaveTypeName}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Start date — read-only */}
          <div className="space-y-1">
            <Label>Start Date (fixed)</Label>
            <p className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">
              {format(new Date(request.startDate + "T00:00:00"), "d MMMM yyyy")}
            </p>
          </div>

          {/* End date — editable */}
          <div className="space-y-1">
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              min={request.startDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          {/* Recalculated days */}
          <div className="space-y-1">
            <Label>Working Days</Label>
            <div className={`text-sm rounded px-3 py-2 ${daysChanged ? "bg-amber-50 border border-amber-200 text-amber-800 font-medium" : "bg-muted text-muted-foreground"}`}>
              {daysChanged
                ? `${request.daysRequested} day${request.daysRequested !== 1 ? "s" : ""} → ${daysRequested} day${daysRequested !== 1 ? "s" : ""} (excl. weekends & public holidays)`
                : `${daysRequested} day${daysRequested !== 1 ? "s" : ""} — no change`}
            </div>
          </div>

          {/* Document link if any */}
          {request.documentUrl && (
            <div className="space-y-1">
              <Label>Supporting Document</Label>
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
            </div>
          )}

          {/* Override note — required */}
          <div className="space-y-1">
            <Label>
              Override Note <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              placeholder="Explain the reason for this override (e.g. employee returned early on day 2)"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Required — this note is saved on the request as the manager note.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || daysRequested < 1 || !adminNote.trim()}
          >
            {isSaving ? "Saving..." : "Save Override"}
          </Button>
        </div>
      </div>
    </div>
  )
}
