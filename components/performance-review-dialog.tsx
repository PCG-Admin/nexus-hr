"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Star } from "lucide-react"
import { type PerformanceReview, type KPIEntry, managerReviewSubmit } from "@/lib/supabase/performance-service"

type Props = {
  review: PerformanceReview | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  reviewerName: string
  reviewerId: string
}

export function PerformanceReviewDialog({ review, isOpen, onClose, onSuccess, reviewerName, reviewerId }: Props) {
  const [kpis, setKpis] = useState<KPIEntry[]>([])
  const [managerNotes, setManagerNotes] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync state when review changes
  const initState = (r: PerformanceReview) => {
    setKpis(r.kpis.map(k => ({ ...k })))
    setManagerNotes(r.managerNotes ?? "")
    setError("")
  }

  const handleOpenChange = (open: boolean) => {
    if (open && review) initState(review)
    if (!open) onClose()
  }

  const setRating = (kpiId: string, rating: number) =>
    setKpis(prev => prev.map(k => k.id === kpiId ? { ...k, managerRating: rating } : k))

  const setComment = (kpiId: string, comment: string) =>
    setKpis(prev => prev.map(k => k.id === kpiId ? { ...k, managerComment: comment } : k))

  const handleSubmit = async () => {
    if (!review) return
    const unrated = kpis.filter(k => k.managerRating === null)
    if (unrated.length > 0) {
      setError(`Please rate all KPIs before submitting. Missing: ${unrated.map(k => k.title).join(", ")}`)
      return
    }
    setError("")
    setIsSubmitting(true)
    try {
      const result = await managerReviewSubmit(review.id, reviewerId, reviewerName, kpis, managerNotes)
      if (!result.success) { setError(result.error ?? "Failed to submit review"); return }
      onSuccess()
      onClose()
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!review) return null

  const employeeName = review.employee
    ? `${review.employee.firstName} ${review.employee.lastName}`
    : review.employeeId

  const activeKpis = kpis.length > 0 ? kpis : review.kpis

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manager Review — {employeeName}</DialogTitle>
          <DialogDescription>
            {review.cycleName} · Rate each KPI (1–5) and add comments. Your notes will be visible to HR.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="overflow-y-auto flex-1 space-y-5 pr-1">
          {/* Employee submission */}
          {review.employeeNotes && (
            <div className="rounded-lg bg-muted/50 border px-4 py-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employee Notes</p>
              <p className="text-sm">{review.employeeNotes}</p>
            </div>
          )}

          {/* KPI rating table */}
          <div className="space-y-4">
            {activeKpis.map((kpi) => (
              <div key={kpi.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{kpi.title}</span>
                      <Badge variant="outline" className="text-xs">{kpi.weight}%</Badge>
                    </div>
                    {kpi.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{kpi.description}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Target</span>
                    <p className="font-medium">{kpi.target}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Employee Actual</span>
                    <p className="font-medium">{kpi.actual ?? <span className="text-muted-foreground italic">Not entered</span>}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Your Rating *</Label>
                    <Select
                      value={kpi.managerRating?.toString() ?? ""}
                      onValueChange={(v) => setRating(kpi.id, parseInt(v))}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Rate 1–5" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(n => (
                          <SelectItem key={n} value={n.toString()}>
                            <span className="flex items-center gap-1">
                              {Array.from({ length: n }, (_, i) => (
                                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                              ))}
                              <span className="ml-1 text-xs text-muted-foreground">
                                {["", "Below expectations", "Needs improvement", "Meets expectations", "Exceeds expectations", "Outstanding"][n]}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Comment</Label>
                    <Textarea
                      rows={2}
                      className="text-xs resize-none"
                      placeholder="Optional comment for this KPI"
                      value={kpi.managerComment ?? ""}
                      onChange={e => setComment(kpi.id, e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Overall notes */}
          <div className="space-y-1.5">
            <Label>Overall Manager Notes</Label>
            <Textarea
              rows={3}
              placeholder="Summary remarks, recommendations, areas for development..."
              value={managerNotes}
              onChange={e => setManagerNotes(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="pt-4 border-t mt-2 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
