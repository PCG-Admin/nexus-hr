"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Mail, Clock } from "lucide-react"
import { updateEmployee, getAllEmployees, getEmployeeAuditTrail, type Employee, type EmployeeFieldChange, type EmployeeAuditEntry } from "@/lib/supabase/leave-service"
import { useAuth, type UserRole } from "@/lib/auth"
import { getOrgConfig } from "@/lib/org-config"
import { apiFetch } from "@/lib/api-fetch"

type EditEmployeeDialogProps = {
  employee: Employee | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type FormData = {
  // Employment
  firstName: string
  lastName: string
  email: string
  employeeNumber: string
  role: UserRole
  jobTitle: string
  employmentType: string
  department: string
  grade: string
  hireDate: string
  managerId: string
  // Contact
  phone: string
  personalEmail: string
  address: string
  city: string
  postalCode: string
  // Emergency
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelationship: string
  // Identity
  idNumber: string
  dateOfBirth: string
}

const EMPTY: FormData = {
  firstName: "", lastName: "", email: "", employeeNumber: "",
  role: "employee", jobTitle: "", employmentType: "", department: "",
  grade: "", hireDate: "", managerId: "",
  phone: "", personalEmail: "", address: "", city: "", postalCode: "",
  emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "",
  idNumber: "", dateOfBirth: "",
}

const ROLE_LABELS: Record<string, string> = {
  employee: 'Employee', line_manager: 'Line Manager', hr_manager: 'HR Manager',
  executive: 'Executive', system_admin: 'System Admin',
}
const EMPLOYMENT_LABELS: Record<string, string> = {
  permanent: 'Permanent', fixed_term: 'Fixed-Term Contract', probation: 'Probationary',
}

export function EditEmployeeDialog({ employee, isOpen, onClose, onSuccess }: EditEmployeeDialogProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<FormData>(EMPTY)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "error">("idle")
  const [orgConfig, setOrgConfigState] = useState(() => getOrgConfig())
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [auditTrail, setAuditTrail] = useState<EmployeeAuditEntry[]>([])
  // snapshot of original values when dialog opens — used for diff at save time
  const originalSnapshot = useRef<FormData>(EMPTY)

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))

  useEffect(() => {
    if (isOpen && employee) {
      getAllEmployees().then(setAllEmployees)
      getEmployeeAuditTrail(employee.id).then(setAuditTrail)
    }
  }, [isOpen, employee])

  useEffect(() => {
    if (employee && isOpen) {
      setOrgConfigState(getOrgConfig())
      const snap: FormData = {
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        employeeNumber: employee.employeeNumber ?? "",
        role: employee.role as UserRole,
        jobTitle: employee.jobTitle ?? "",
        employmentType: employee.employmentType ?? "",
        department: employee.department ?? "",
        grade: employee.grade?.toString() ?? "",
        hireDate: employee.hireDate ?? "",
        managerId: employee.managerId ?? "",
        phone: employee.phone ?? "",
        personalEmail: employee.personalEmail ?? "",
        address: employee.address ?? "",
        city: employee.city ?? "",
        postalCode: employee.postalCode ?? "",
        emergencyContactName: employee.emergencyContactName ?? "",
        emergencyContactPhone: employee.emergencyContactPhone ?? "",
        emergencyContactRelationship: employee.emergencyContactRelationship ?? "",
        idNumber: employee.idNumber ?? "",
        dateOfBirth: employee.dateOfBirth ?? "",
      }
      setFormData(snap)
      originalSnapshot.current = snap
      setEmailStatus("idle")
      setError("")
    }
  }, [employee, isOpen])

  const handleSendSetupEmail = async () => {
    if (!employee) return
    setIsSendingEmail(true)
    setEmailStatus("idle")
    try {
      const res = await apiFetch("/api/admin/send-setup-email", {
        method: "POST",
        body: JSON.stringify({ email: employee.email, firstName: employee.firstName }),
      })
      const data = await res.json()
      setEmailStatus(res.ok && data.success ? "sent" : "error")
      if (!res.ok) setError(data.error ?? "Failed to send setup email")
    } catch {
      setEmailStatus("error")
      setError("An unexpected error occurred")
    }
    setIsSendingEmail(false)
  }

  const buildChanges = (): EmployeeFieldChange[] => {
    const orig = originalSnapshot.current
    const FIELD_META: { field: keyof FormData; label: string; format?: (v: string) => string }[] = [
      { field: 'firstName',                    label: 'First Name' },
      { field: 'lastName',                     label: 'Last Name' },
      { field: 'email',                        label: 'Work Email' },
      { field: 'employeeNumber',               label: 'Employee Number' },
      { field: 'role',                         label: 'Role',            format: v => ROLE_LABELS[v] ?? v },
      { field: 'jobTitle',                     label: 'Job Title' },
      { field: 'employmentType',               label: 'Employment Type', format: v => EMPLOYMENT_LABELS[v] ?? v },
      { field: 'department',                   label: 'Department' },
      { field: 'grade',                        label: 'Grade',           format: v => v ? `Grade ${v}` : '' },
      { field: 'hireDate',                     label: 'Hire Date' },
      { field: 'managerId',                    label: 'Manager',         format: v => { const m = allEmployees.find(e => e.id === v); return m ? `${m.firstName} ${m.lastName}` : v } },
      { field: 'phone',                        label: 'Mobile Number' },
      { field: 'personalEmail',                label: 'Personal Email' },
      { field: 'address',                      label: 'Address' },
      { field: 'city',                         label: 'City' },
      { field: 'postalCode',                   label: 'Postal Code' },
      { field: 'emergencyContactName',         label: 'Emergency Contact Name' },
      { field: 'emergencyContactPhone',        label: 'Emergency Contact Phone' },
      { field: 'emergencyContactRelationship', label: 'Emergency Contact Relationship' },
      { field: 'idNumber',                     label: 'ID Number' },
      { field: 'dateOfBirth',                  label: 'Date of Birth' },
    ]
    return FIELD_META
      .filter(({ field }) => (orig[field] ?? '') !== (formData[field] ?? ''))
      .map(({ field, label, format }) => ({
        field,
        label,
        previousValue: orig[field] ? (format ? format(orig[field]) : orig[field]) : null,
        newValue:      formData[field] ? (format ? format(formData[field]) : formData[field]) : null,
      }))
  }

  const handleSubmit = async () => {
    if (!employee) return
    setError("")

    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError("First name, last name and email are required")
      return
    }

    setIsSubmitting(true)
    try {
      const changes = buildChanges()
      const result = await updateEmployee(employee.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        department: formData.department || null,
        grade: formData.grade ? parseInt(formData.grade) : null,
        jobTitle: formData.jobTitle || null,
        employmentType: (formData.employmentType as any) || null,
        hireDate: formData.hireDate || null,
        managerId: formData.managerId || null,
        phone: formData.phone || null,
        personalEmail: formData.personalEmail || null,
        address: formData.address || null,
        city: formData.city || null,
        postalCode: formData.postalCode || null,
        emergencyContactName: formData.emergencyContactName || null,
        emergencyContactPhone: formData.emergencyContactPhone || null,
        emergencyContactRelationship: formData.emergencyContactRelationship || null,
        idNumber: formData.idNumber || null,
        dateOfBirth: formData.dateOfBirth || null,
      }, user ? { actorId: user.id, actorName: `${user.firstName} ${user.lastName}`, changes } : undefined)

      if (!result.success) {
        setError(result.error || "Failed to update employee")
        return
      }

      if (employee && changes.length > 0) {
        getEmployeeAuditTrail(employee.id).then(setAuditTrail)
      }
      onSuccess()
      onClose()
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setError("")
    onClose()
  }

  const field = (id: keyof FormData, label: string, type = "text", placeholder = "") => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={formData[id]}
        onChange={set(id)}
        disabled={isSubmitting}
        placeholder={placeholder}
      />
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {employee ? `${employee.firstName} ${employee.lastName}` : "Edit Employee"}
          </DialogTitle>
          <DialogDescription>
            Full profile management. Changes are saved when you click Save.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mx-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="employment" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="history">
              History
              {auditTrail.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{auditTrail.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto flex-1 mt-4 pr-1">

            {/* ── Employment tab ─────────────────────────────── */}
            <TabsContent value="employment" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                {field("firstName",      "First Name *",      "text", "John")}
                {field("lastName",       "Last Name *",       "text", "Doe")}
                {field("email",          "Work Email *",      "email", "john@company.com")}
                {field("employeeNumber", "Employee Number",   "text", "EMP001")}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v: UserRole) => setFormData((p) => ({ ...p, role: v }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="line_manager">Line Manager</SelectItem>
                      <SelectItem value="hr_manager">HR Manager</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                      <SelectItem value="system_admin">System Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Employment Type</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(v) => setFormData((p) => ({ ...p, employmentType: v }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="fixed_term">Fixed-Term Contract</SelectItem>
                      <SelectItem value="probation">Probationary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {field("jobTitle",   "Job Title",   "text", "Sales Consultant")}
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(v) => setFormData((p) => ({ ...p, department: v }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {orgConfig.departments.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Grade</Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(v) => setFormData((p) => ({ ...p, grade: v }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {orgConfig.grades.map(g => (
                        <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {field("hireDate", "Hire Date", "date")}
              </div>

              <div className="space-y-1.5">
                <Label>Reports To (Manager)</Label>
                <Select
                  value={formData.managerId || "none"}
                  onValueChange={(v) => setFormData((p) => ({ ...p, managerId: v === "none" ? "" : v }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No manager —</SelectItem>
                    {allEmployees
                      .filter(e => e.id !== employee?.id && e.isActive)
                      .map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} ({e.role.replace('_', ' ')})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* ── Contact tab ────────────────────────────────── */}
            <TabsContent value="contact" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                {field("phone",         "Mobile Number",  "tel",   "+27 82 000 0000")}
                {field("personalEmail", "Personal Email", "email", "name@gmail.com")}
              </div>
              {field("address", "Street Address", "text", "12 Oak Street, Sandton")}
              <div className="grid grid-cols-2 gap-4">
                {field("city",       "City",        "text", "Johannesburg")}
                {field("postalCode", "Postal Code", "text", "2196")}
              </div>
            </TabsContent>

            {/* ── Emergency tab ──────────────────────────────── */}
            <TabsContent value="emergency" className="space-y-4 mt-0">
              {field("emergencyContactName",  "Contact Full Name", "text", "Jane Doe")}
              <div className="grid grid-cols-2 gap-4">
                {field("emergencyContactPhone", "Contact Phone", "tel", "+27 71 000 0000")}
                <div className="space-y-1.5">
                  <Label>Relationship</Label>
                  <Select
                    value={formData.emergencyContactRelationship}
                    onValueChange={(v) => setFormData((p) => ({ ...p, emergencyContactRelationship: v }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Partner">Partner</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Child">Child</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* ── Identity tab ───────────────────────────────── */}
            <TabsContent value="identity" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                {field("idNumber",    "SA ID / Passport Number", "text", "8001010000000")}
                {field("dateOfBirth", "Date of Birth",           "date")}
              </div>
              <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                Sensitive data — visible to HR and the employee only. Handle in compliance with POPIA.
              </p>
            </TabsContent>

            {/* ── History tab ────────────────────────────────── */}
            <TabsContent value="history" className="mt-0">
              {auditTrail.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No changes recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Changes will appear here after the first edit is saved</p>
                </div>
              ) : (
                <div className="relative space-y-0">
                  {auditTrail.map((entry, idx) => (
                    <div key={entry.id} className="relative flex gap-3 pb-5">
                      {/* timeline spine */}
                      {idx < auditTrail.length - 1 && (
                        <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
                      )}
                      {/* dot */}
                      <div className="relative z-10 mt-1 w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                      </div>
                      {/* content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-sm font-semibold">{entry.actorName}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' · '}
                            {new Date(entry.timestamp).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {entry.changes.map((change, i) => (
                            <div key={i} className="grid grid-cols-[120px_1fr] items-start gap-2 text-xs">
                              <span className="text-muted-foreground font-medium truncate pt-0.5">{change.label}</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 line-through">
                                  {change.previousValue ?? '—'}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                                  {change.newValue ?? '—'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

          </div>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:items-center sm:justify-between pt-4 border-t mt-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendSetupEmail}
              disabled={isSendingEmail || isSubmitting}
              className="text-xs"
            >
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              {isSendingEmail ? "Sending..." : "Send Password Setup Email"}
            </Button>
            {emailStatus === "sent" && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sent
              </span>
            )}
            {emailStatus === "error" && (
              <span className="text-xs text-red-500">Failed</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
