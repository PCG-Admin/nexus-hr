"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  createAnnouncement, publishAnnouncement, updateAnnouncement,
  CATEGORY_CONFIG,
  type Announcement, type AnnouncementCategory, type AnnouncementTargetType,
} from "@/lib/supabase/announcement-service"
import { createClient } from "@/lib/supabase/client"

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  creatorId: string
  creatorName: string
  departments: string[]
  grades: number[]
  editing?: Announcement | null
}

const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [AnnouncementCategory, typeof CATEGORY_CONFIG[AnnouncementCategory]][]

export function CreateAnnouncementDialog({
  isOpen, onClose, onSuccess, creatorId, creatorName,
  departments, grades, editing,
}: Props) {
  const [title, setTitle]           = useState(editing?.title ?? "")
  const [body, setBody]             = useState(editing?.body ?? "")
  const [category, setCategory]     = useState<AnnouncementCategory>(editing?.category ?? "general")
  const [targetType, setTargetType] = useState<AnnouncementTargetType>(editing?.targetType ?? "all")
  const [targetDepts, setTargetDepts] = useState<string[]>(editing?.targetType === "department" ? editing.targetValues : [])
  const [targetGrades, setTargetGrades] = useState<string[]>(editing?.targetType === "grade" ? editing.targetValues : [])
  const [publishNow, setPublishNow] = useState(true)
  const [scheduledAt, setScheduledAt] = useState(editing?.scheduledAt?.slice(0, 16) ?? "")
  const [expiresAt, setExpiresAt]   = useState(editing?.expiresAt?.slice(0, 16) ?? "")
  const [isSaving, setIsSaving]     = useState(false)
  const [error, setError]           = useState("")

  useEffect(() => {
    setTitle(editing?.title ?? "")
    setBody(editing?.body ?? "")
    setCategory(editing?.category ?? "general")
    setTargetType(editing?.targetType ?? "all")
    setTargetDepts(editing?.targetType === "department" ? editing.targetValues : [])
    setTargetGrades(editing?.targetType === "grade" ? editing.targetValues : [])
    setScheduledAt(editing?.scheduledAt?.slice(0, 16) ?? "")
    setExpiresAt(editing?.expiresAt?.slice(0, 16) ?? "")
    setPublishNow(true)
    setError("")
  }, [editing, isOpen])

  const targetValues = targetType === "department" ? targetDepts : targetType === "grade" ? targetGrades : []

  const toggleDept = (d: string) =>
    setTargetDepts(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  const toggleGrade = (g: string) =>
    setTargetGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const handleSubmit = async (andPublish: boolean) => {
    if (!title.trim() || !body.trim()) { setError("Title and message are required."); return }
    if (targetType !== "all" && targetValues.length === 0) { setError(`Select at least one ${targetType}.`); return }
    setIsSaving(true)
    setError("")

    try {
      let announcementId = editing?.id ?? null

      if (editing) {
        await updateAnnouncement(editing.id, {
          title: title.trim(), body: body.trim(), category, targetType,
          targetValues,
          scheduledAt: !publishNow && scheduledAt ? new Date(scheduledAt).toISOString() : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        })
      } else {
        const result = await createAnnouncement({
          title: title.trim(), body: body.trim(), category,
          targetType, targetValues,
          scheduledAt: !publishNow && scheduledAt ? new Date(scheduledAt).toISOString() : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          createdById: creatorId, createdByName: creatorName,
        })
        if (!result.success) { setError(result.error ?? "Failed to create announcement"); setIsSaving(false); return }
        announcementId = result.id ?? null
      }

      if (andPublish && announcementId) {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        await publishAnnouncement(announcementId, session?.access_token ?? "")
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError("An unexpected error occurred.")
    }
    setIsSaving(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Announcement" : "Create Announcement"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Title <span className="text-red-500">*</span></Label>
            <Input id="ann-title" placeholder="e.g. Office Closure — 16 June 2026" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-body">Message <span className="text-red-500">*</span></Label>
            <Textarea id="ann-body" placeholder="Write your announcement here…" value={body} onChange={e => setBody(e.target.value)} rows={5} className="resize-none" />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    category === key ? `${cfg.bg} ${cfg.color} border-current` : "bg-muted text-muted-foreground border-transparent hover:border-muted-foreground/30"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Targeting */}
          <div className="space-y-3">
            <Label>Audience</Label>
            <div className="flex gap-3">
              {(["all", "department", "grade"] as AnnouncementTargetType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTargetType(t)}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-all ${
                    targetType === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  {t === "all" ? "All Employees" : t === "department" ? "By Department" : "By Grade"}
                </button>
              ))}
            </div>
            {targetType === "department" && departments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {departments.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDept(d)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                      targetDepts.includes(d) ? "bg-primary/10 text-primary border-primary/40 font-semibold" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
            {targetType === "grade" && grades.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {grades.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGrade(String(g))}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                      targetGrades.includes(String(g)) ? "bg-primary/10 text-primary border-primary/40 font-semibold" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    Grade {g}
                  </button>
                ))}
              </div>
            )}
            {targetType !== "all" && departments.length === 0 && grades.length === 0 && (
              <p className="text-xs text-muted-foreground">No departments/grades configured. Set them up in the Organisation tab first.</p>
            )}
          </div>

          {/* Publish timing */}
          <div className="space-y-3">
            <Label>Publish</Label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPublishNow(true)}
                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-all ${publishNow ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                Publish Now
              </button>
              <button type="button" onClick={() => setPublishNow(false)}
                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-all ${!publishNow ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                Schedule
              </button>
            </div>
            {!publishNow && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Publish date & time</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
              </div>
            )}
          </div>

          {/* Expiry */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-expiry">Expiry <span className="text-xs font-normal text-muted-foreground">(optional — announcement disappears after this date)</span></Label>
            <Input id="ann-expiry" type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          {!editing && (
            <Button variant="outline" onClick={() => handleSubmit(false)} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save as Draft"}
            </Button>
          )}
          <Button onClick={() => handleSubmit(publishNow || !!editing?.isPublished)} disabled={isSaving}>
            {isSaving ? "Publishing…" : editing ? "Save Changes" : publishNow ? "Publish Now" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
