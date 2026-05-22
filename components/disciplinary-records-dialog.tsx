"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Plus, Lock, AlertTriangle, Pencil, FileText, Upload, X, Clock } from "lucide-react"
import { format } from "date-fns"
import type { Employee } from "@/lib/supabase/leave-service"
import type { DisciplinaryRecord, DisciplinaryType, AuditEntry, FieldChange } from "@/lib/supabase/disciplinary-service"
import {
  DISCIPLINARY_TYPE_LABELS, DISCIPLINARY_TYPE_COLORS,
  getEmployeeDisciplinaryRecords, createDisciplinaryRecord,
  updateDisciplinaryRecord, finaliseDisciplinaryRecord, getRecordAuditTrail,
  uploadDisciplinaryDocument,
} from "@/lib/supabase/disciplinary-service"
import { DEMO_DISCIPLINARY_RECORDS, DEMO_AUDIT_ENTRIES } from "@/lib/demo-data"
import { useAuth } from "@/lib/auth"

type View = "list" | "add" | "edit" | "view"

type FormState = {
  type: DisciplinaryType | ""
  incidentDate: string
  hearingDate: string
  description: string
  outcome: string
}

const EMPTY_FORM: FormState = { type: "", incidentDate: "", hearingDate: "", description: "", outcome: "" }

const FIELD_LABELS: Partial<Record<keyof FormState | "status" | "documentUrl", string>> = {
  type: "Incident Type", incidentDate: "Incident Date", hearingDate: "Hearing Date",
  description: "Description", outcome: "Outcome", status: "Status", documentUrl: "Supporting Document",
}

type Props = { employee: Employee | null; isOpen: boolean; onClose: () => void }

const isDb = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder"))

export function DisciplinaryRecordsDialog({ employee, isOpen, onClose }: Props) {
  const { user } = useAuth()
  const [view, setView]               = useState<View>("list")
  const [records, setRecords]         = useState<DisciplinaryRecord[]>([])
  const [activeRecord, setActiveRecord] = useState<DisciplinaryRecord | null>(null)
  const [form, setForm]               = useState<FormState>(EMPTY_FORM)
  const [docFile, setDocFile]         = useState<File | null>(null)
  const [docPreview, setDocPreview]   = useState<string>("")
  const [isSaving, setIsSaving]       = useState(false)
  const [error, setError]             = useState("")
  const [finaliseTarget, setFinaliseTarget] = useState<DisciplinaryRecord | null>(null)
  const [isLoading, setIsLoading]     = useState(false)
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])

  const canEdit = ["hr_manager", "system_admin", "line_manager"].includes(user?.role ?? "")

  const loadRecords = async () => {
    if (!employee) return
    setIsLoading(true)
    if (!isDb()) {
      setRecords(DEMO_DISCIPLINARY_RECORDS.filter(r => r.employeeId === employee.id))
      setAuditEntries(DEMO_AUDIT_ENTRIES.filter(a =>
        DEMO_DISCIPLINARY_RECORDS.filter(r => r.employeeId === employee.id).some(r => r.id === a.recordId)
      ))
    } else {
      setRecords(await getEmployeeDisciplinaryRecords(employee.id))
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (isOpen && employee) {
      setView("list"); setActiveRecord(null); setForm(EMPTY_FORM)
      setDocFile(null); setDocPreview(""); setError("")
      loadRecords()
    }
  }, [isOpen, employee])

  const pushAudit = (entry: AuditEntry) => setAuditEntries(prev => [...prev, entry])

  const makeAuditId = () => `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  // ── helpers ──
  const handleOpenAdd = () => {
    setForm(EMPTY_FORM); setDocFile(null); setDocPreview(""); setError(""); setView("add")
  }

  const handleOpenEdit = (record: DisciplinaryRecord) => {
    setActiveRecord(record)
    setForm({
      type: record.type, incidentDate: record.incidentDate,
      hearingDate: record.hearingDate ?? "", description: record.description, outcome: record.outcome ?? "",
    })
    setDocFile(null)
    setDocPreview(record.documentUrl ?? "")
    setError("")
    if (isDb()) getRecordAuditTrail(record.id).then(entries => setAuditEntries(prev => {
      const without = prev.filter(a => a.recordId !== record.id)
      return [...without, ...entries]
    }))
    setView("edit")
  }

  const handleOpenView = (record: DisciplinaryRecord) => {
    setActiveRecord(record)
    if (isDb()) getRecordAuditTrail(record.id).then(entries => setAuditEntries(prev => {
      const without = prev.filter(a => a.recordId !== record.id)
      return [...without, ...entries]
    }))
    setView("view")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError("File must be under 5MB"); return }
    if (!["application/pdf", "image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setError("Only PDF, JPG, PNG files are allowed"); return
    }
    setDocFile(file); setDocPreview(file.name); setError("")
  }

  // ── save new ──
  const handleSaveNew = async () => {
    if (!user || !employee) return
    if (!form.type || !form.incidentDate || !form.description.trim()) {
      setError("Incident type, incident date, and description are required."); return
    }
    setIsSaving(true); setError("")

    let docUrl: string | null = null
    if (docFile) {
      const upload = await uploadDisciplinaryDocument(docFile, employee.id)
      if (!upload.success) { setError(upload.error ?? "Failed to upload document."); setIsSaving(false); return }
      docUrl = upload.url ?? null
    }

    const changes: FieldChange[] = [
      { field: "type",         label: "Incident Type", previousValue: null, newValue: DISCIPLINARY_TYPE_LABELS[form.type as DisciplinaryType] },
      { field: "incidentDate", label: "Incident Date", previousValue: null, newValue: form.incidentDate },
      ...(form.hearingDate   ? [{ field: "hearingDate",  label: "Hearing Date", previousValue: null, newValue: form.hearingDate }] : []),
      { field: "description", label: "Description",    previousValue: null, newValue: form.description.trim().slice(0, 80) + (form.description.length > 80 ? "…" : "") },
      ...(form.outcome.trim() ? [{ field: "outcome", label: "Outcome", previousValue: null, newValue: form.outcome.trim().slice(0, 80) + (form.outcome.length > 80 ? "…" : "") }] : []),
      ...(docUrl ? [{ field: "documentUrl", label: "Supporting Document", previousValue: null, newValue: "Attached" }] : []),
    ]

    const result = await createDisciplinaryRecord({
      employeeId: employee.id, type: form.type as DisciplinaryType,
      incidentDate: form.incidentDate, hearingDate: form.hearingDate || null,
      description: form.description.trim(), outcome: form.outcome.trim() || null,
      documentUrl: docUrl,
      createdBy: user.id, createdByName: `${user.firstName} ${user.lastName}`,
      changes,
    })
    if (!result.success) { setError(result.error ?? "Failed to save."); setIsSaving(false); return }

    if (!isDb()) {
      const newId = result.id ?? `demo-dis-${Date.now()}`
      const newRecord: DisciplinaryRecord = {
        id: newId, employeeId: employee.id, type: form.type as DisciplinaryType,
        incidentDate: form.incidentDate, hearingDate: form.hearingDate || null,
        description: form.description.trim(), outcome: form.outcome.trim() || null,
        status: "draft", documentUrl: docUrl,
        createdBy: user.id, createdByName: `${user.firstName} ${user.lastName}`,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }
      setRecords(prev => [newRecord, ...prev])
      pushAudit({ id: makeAuditId(), recordId: newId, action: "created", actorId: user.id, actorName: `${user.firstName} ${user.lastName}`, timestamp: new Date().toISOString(), changes })
    } else {
      await loadRecords()
    }

    setIsSaving(false); setView("list")
  }

  // ── save edit ──
  const handleSaveEdit = async () => {
    if (!activeRecord || !user) return
    if (!form.type || !form.incidentDate || !form.description.trim()) {
      setError("Incident type, incident date, and description are required."); return
    }
    setIsSaving(true); setError("")

    let docUrl: string | null = activeRecord.documentUrl
    if (docFile) {
      const upload = await uploadDisciplinaryDocument(docFile, employee!.id)
      if (!upload.success) { setError(upload.error ?? "Failed to upload document."); setIsSaving(false); return }
      docUrl = upload.url ?? null
    } else if (!docPreview) {
      docUrl = null
    }

    // Build field-level diff before saving
    const changes: FieldChange[] = []
    if (form.type !== activeRecord.type)
      changes.push({ field: "type", label: "Incident Type", previousValue: DISCIPLINARY_TYPE_LABELS[activeRecord.type], newValue: DISCIPLINARY_TYPE_LABELS[form.type as DisciplinaryType] })
    if (form.incidentDate !== activeRecord.incidentDate)
      changes.push({ field: "incidentDate", label: "Incident Date", previousValue: activeRecord.incidentDate, newValue: form.incidentDate })
    if ((form.hearingDate || null) !== activeRecord.hearingDate)
      changes.push({ field: "hearingDate", label: "Hearing Date", previousValue: activeRecord.hearingDate, newValue: form.hearingDate || null })
    if (form.description.trim() !== activeRecord.description)
      changes.push({ field: "description", label: "Description", previousValue: activeRecord.description.slice(0, 60) + "…", newValue: form.description.trim().slice(0, 60) + "…" })
    if ((form.outcome.trim() || null) !== activeRecord.outcome)
      changes.push({ field: "outcome", label: "Outcome", previousValue: activeRecord.outcome ? activeRecord.outcome.slice(0, 60) + "…" : null, newValue: form.outcome.trim() ? form.outcome.trim().slice(0, 60) + "…" : null })
    if (docUrl !== activeRecord.documentUrl)
      changes.push({ field: "documentUrl", label: "Supporting Document", previousValue: activeRecord.documentUrl ? "Previous document" : null, newValue: docUrl ? "New document attached" : null })

    const result = await updateDisciplinaryRecord(
      activeRecord.id,
      { type: form.type as DisciplinaryType, incidentDate: form.incidentDate, hearingDate: form.hearingDate || null, description: form.description.trim(), outcome: form.outcome.trim() || null, documentUrl: docUrl },
      { actorId: user.id, actorName: `${user.firstName} ${user.lastName}`, changes }
    )
    if (!result.success) { setError(result.error ?? "Failed to update."); setIsSaving(false); return }

    if (!isDb() && changes.length > 0)
      pushAudit({ id: makeAuditId(), recordId: activeRecord.id, action: "edited", actorId: user.id, actorName: `${user.firstName} ${user.lastName}`, timestamp: new Date().toISOString(), changes })

    if (!isDb()) {
      setRecords(prev => prev.map(r => r.id === activeRecord.id
        ? { ...r, type: form.type as DisciplinaryType, incidentDate: form.incidentDate, hearingDate: form.hearingDate || null, description: form.description.trim(), outcome: form.outcome.trim() || null, documentUrl: docUrl, updatedAt: new Date().toISOString() }
        : r))
    } else await loadRecords()

    setIsSaving(false); setView("list")
  }

  // ── finalise ──
  const handleFinalise = async () => {
    if (!finaliseTarget || !user) return
    const result = await finaliseDisciplinaryRecord(finaliseTarget.id, {
      actorId: user.id, actorName: `${user.firstName} ${user.lastName}`,
    })
    if (!result.success) { setError(result.error ?? "Failed to finalise."); setFinaliseTarget(null); return }

    if (!isDb())
      pushAudit({ id: makeAuditId(), recordId: finaliseTarget.id, action: "finalised", actorId: user.id, actorName: `${user.firstName} ${user.lastName}`, timestamp: new Date().toISOString(), changes: [{ field: "status", label: "Status", previousValue: "Draft", newValue: "Finalised" }] })

    if (!isDb()) setRecords(prev => prev.map(r => r.id === finaliseTarget.id ? { ...r, status: "finalised" as const } : r))
    else await loadRecords()

    setFinaliseTarget(null); setView("list")
  }

  if (!employee) return null
  const initials = `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()
  const recordAudit = (id: string) => auditEntries.filter(a => a.recordId === id).sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{initials}</span>
              </div>
              <div>
                <DialogTitle className="text-base leading-tight">
                  Disciplinary Records — {employee.firstName} {employee.lastName}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{employee.jobTitle ?? employee.department}</p>
              </div>
            </div>
          </DialogHeader>

          <Alert className="border-amber-300 bg-amber-50 shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-900">
              <strong>Confidential — restricted access.</strong> Employees do not have visibility of this section.
            </AlertDescription>
          </Alert>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-0">

            {/* ── LIST ── */}
            {view === "list" && (
              <div className="space-y-3 pt-1">

                {/* Inline finalise confirmation — avoids nested dialog portal issues */}
                {finaliseTarget && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-red-600 shrink-0" />
                      <p className="text-sm font-semibold text-red-900">Finalise this record?</p>
                    </div>
                    <div className="text-xs text-red-800 bg-red-100 rounded-md px-3 py-2">
                      <strong>{DISCIPLINARY_TYPE_LABELS[finaliseTarget.type]}</strong> — {format(new Date(finaliseTarget.incidentDate), "d MMM yyyy")}
                    </div>
                    <p className="text-xs text-red-700">Once finalised this record <strong>cannot be edited or deleted</strong>. This is a permanent legal record.</p>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleFinalise} disabled={isSaving}>
                        <Lock className="w-3.5 h-3.5 mr-1.5" />{isSaving ? "Finalising..." : "Finalise (Permanent)"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setFinaliseTarget(null)} disabled={isSaving}>Cancel</Button>
                    </div>
                  </div>
                )}

                {canEdit && !finaliseTarget && (
                  <Button size="sm" onClick={handleOpenAdd} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />Add New Record
                  </Button>
                )}
                {isLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading records...</div>
                ) : records.length === 0 ? (
                  <div className="py-10 text-center">
                    <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">No disciplinary records on file</p>
                  </div>
                ) : records.map(record => (
                  <div key={record.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${DISCIPLINARY_TYPE_COLORS[record.type]}`}>
                          {DISCIPLINARY_TYPE_LABELS[record.type]}
                        </Badge>
                        {record.status === "finalised"
                          ? <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-300 gap-1"><Lock className="w-3 h-3" />Finalised</Badge>
                          : <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">Draft</Badge>
                        }
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">{format(new Date(record.incidentDate), "d MMM yyyy")}</p>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{record.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Created by {record.createdByName}
                        {recordAudit(record.id).length > 1 && (
                          <span className="ml-2 text-primary">· {recordAudit(record.id).length} audit events</span>
                        )}
                      </p>
                      <div className="flex gap-2">
                        {record.status === "draft" && canEdit ? (
                          <>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenEdit(record)}>
                              <Pencil className="w-3 h-3 mr-1" />Edit
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50" onClick={() => setFinaliseTarget(record)}>
                              <Lock className="w-3 h-3 mr-1" />Finalise
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenView(record)}>View</Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── ADD / EDIT FORM ── */}
            {(view === "add" || view === "edit") && (
              <div className="space-y-4 pt-1">
                <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4" />Back to records
                </button>
                <p className="text-sm font-semibold">{view === "add" ? "New Disciplinary Record" : "Edit Draft Record"}</p>

                {error && <Alert variant="destructive"><AlertDescription className="text-sm">{error}</AlertDescription></Alert>}

                <div className="space-y-2">
                  <Label>Incident Type <span className="text-destructive">*</span></Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as DisciplinaryType }))}>
                    <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(DISCIPLINARY_TYPE_LABELS) as [DisciplinaryType, string][]).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Incident Date <span className="text-destructive">*</span></Label>
                    <Input type="date" value={form.incidentDate} onChange={e => setForm(f => ({ ...f, incidentDate: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hearing Date <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Input type="date" value={form.hearingDate} onChange={e => setForm(f => ({ ...f, hearingDate: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description <span className="text-destructive">*</span></Label>
                  <Textarea rows={4} placeholder="Describe the incident in full..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label>Outcome <span className="text-xs text-muted-foreground">(optional — can be added after hearing)</span></Label>
                  <Textarea rows={3} placeholder="Outcome or sanction imposed..." value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} />
                </div>

                {/* Document upload */}
                <div className="space-y-2">
                  <Label>Supporting Document <span className="text-xs text-muted-foreground">(PDF, JPG, PNG — max 5MB)</span></Label>
                  {!docPreview ? (
                    <div className="border-2 border-dashed rounded-lg p-5 text-center hover:border-primary transition-colors">
                      <Input id="dis-doc" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
                      <Label htmlFor="dis-doc" className="cursor-pointer">
                        <Upload className="w-7 h-7 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground mt-0.5">PDF, JPG or PNG up to 5MB</p>
                      </Label>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                      <FileText className="w-7 h-7 text-primary shrink-0" />
                      <p className="text-sm font-medium flex-1 truncate">
                        {docFile ? docFile.name : "Existing document"}
                      </p>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setDocFile(null); setDocPreview("") }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Audit trail visible on edit so HR can review history before finalising */}
                {view === "edit" && activeRecord && recordAudit(activeRecord.id).length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Change History</p>
                    </div>
                    <div className="space-y-2">
                      {recordAudit(activeRecord.id).map(entry => (
                        <div key={entry.id} className="border-l-2 border-muted pl-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${
                              entry.action === "created"   ? "bg-blue-50 text-blue-700 border-blue-300" :
                              entry.action === "finalised" ? "bg-slate-100 text-slate-700 border-slate-300" :
                              "bg-amber-50 text-amber-700 border-amber-300"
                            }`}>
                              {entry.action === "created" ? "Created" : entry.action === "finalised" ? "Finalised" : "Edited"}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {entry.actorName} · {format(new Date(entry.timestamp), "d MMM yyyy 'at' HH:mm")}
                            </p>
                          </div>
                          {entry.changes.filter(c => c.field !== "status").map((change, i) => (
                            <div key={i} className="text-xs text-muted-foreground pl-1">
                              <span className="font-medium text-foreground">{change.label}:</span>{" "}
                              {change.previousValue
                                ? <><span className="line-through opacity-60">{change.previousValue}</span> → {change.newValue}</>
                                : <span>{change.newValue}</span>
                              }
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button className="flex-1" onClick={view === "add" ? handleSaveNew : handleSaveEdit} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save as Draft"}
                  </Button>
                  <Button variant="outline" onClick={() => setView("list")} disabled={isSaving}>Cancel</Button>
                </div>
              </div>
            )}

            {/* ── VIEW (finalised — read-only + audit trail) ── */}
            {view === "view" && activeRecord && (
              <div className="space-y-4 pt-1">
                <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4" />Back to records
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${DISCIPLINARY_TYPE_COLORS[activeRecord.type]}`}>
                    {DISCIPLINARY_TYPE_LABELS[activeRecord.type]}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-300 gap-1">
                    <Lock className="w-3 h-3" />Finalised — Immutable
                  </Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Incident Date</p>
                      <p className="font-medium">{format(new Date(activeRecord.incidentDate), "d MMMM yyyy")}</p>
                    </div>
                    {activeRecord.hearingDate && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Hearing Date</p>
                        <p className="font-medium">{format(new Date(activeRecord.hearingDate), "d MMMM yyyy")}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="leading-relaxed bg-muted/40 rounded-md p-3">{activeRecord.description}</p>
                  </div>
                  {activeRecord.outcome && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Outcome</p>
                      <p className="leading-relaxed bg-muted/40 rounded-md p-3">{activeRecord.outcome}</p>
                    </div>
                  )}
                  {activeRecord.documentUrl && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Supporting Document</p>
                      <a
                        href={activeRecord.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 border rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                      >
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <p className="text-sm font-medium truncate text-primary underline underline-offset-2">View Document</p>
                      </a>
                    </div>
                  )}
                </div>

                <Alert className="border-slate-300 bg-slate-50">
                  <Lock className="h-4 w-4 text-slate-500" />
                  <AlertDescription className="text-xs text-slate-700">
                    Finalised on {format(new Date(activeRecord.updatedAt), "d MMM yyyy")}. Cannot be edited. Contact HR if a correction is required.
                  </AlertDescription>
                </Alert>

                {/* Audit trail */}
                {recordAudit(activeRecord.id).length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">Change History</p>
                    </div>
                    <div className="space-y-2">
                      {recordAudit(activeRecord.id).map(entry => (
                        <div key={entry.id} className="border-l-2 border-muted pl-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${
                              entry.action === "created"  ? "bg-blue-50 text-blue-700 border-blue-300" :
                              entry.action === "finalised"? "bg-slate-100 text-slate-700 border-slate-300" :
                              "bg-amber-50 text-amber-700 border-amber-300"
                            }`}>
                              {entry.action === "created" ? "Created" : entry.action === "finalised" ? "Finalised" : "Edited"}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {entry.actorName} · {format(new Date(entry.timestamp), "d MMM yyyy 'at' HH:mm")}
                            </p>
                          </div>
                          {entry.changes.filter(c => c.field !== "status").map((change, i) => (
                            <div key={i} className="text-xs text-muted-foreground pl-1">
                              <span className="font-medium text-foreground">{change.label}:</span>{" "}
                              {change.previousValue ? (
                                <><span className="line-through opacity-60">{change.previousValue}</span> → {change.newValue}</>
                              ) : (
                                <span>{change.newValue}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>

      </Dialog>
    </>
  )
}
