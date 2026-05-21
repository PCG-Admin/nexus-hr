"use client"

import { useState, useEffect } from "react"
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
import { AlertCircle, CheckCircle2, Mail } from "lucide-react"
import { updateEmployee, type Employee } from "@/lib/supabase/leave-service"
import { type UserRole } from "@/lib/auth"
import { getOrgConfig } from "@/lib/org-config"

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

export function EditEmployeeDialog({ employee, isOpen, onClose, onSuccess }: EditEmployeeDialogProps) {
  const [formData, setFormData] = useState<FormData>(EMPTY)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "error">("idle")
  const [orgConfig, setOrgConfigState] = useState(() => getOrgConfig())

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))

  useEffect(() => {
    if (employee && isOpen) {
      setOrgConfigState(getOrgConfig())
      setFormData({
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
      })
      setEmailStatus("idle")
      setError("")
    }
  }, [employee, isOpen])

  const handleSendSetupEmail = async () => {
    if (!employee) return
    setIsSendingEmail(true)
    setEmailStatus("idle")
    try {
      const res = await fetch("/api/admin/send-setup-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const handleSubmit = async () => {
    if (!employee) return
    setError("")

    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError("First name, last name and email are required")
      return
    }

    setIsSubmitting(true)
    try {
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
      })

      if (!result.success) {
        setError(result.error || "Failed to update employee")
        return
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
