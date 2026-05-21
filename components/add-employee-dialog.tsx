"use client"

import { useState } from "react"
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
import { AlertCircle } from "lucide-react"
import { type UserRole } from "@/lib/auth"

type AddEmployeeDialogProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const EMPTY = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "employee" as UserRole,
  jobTitle: "",
  employmentType: "",
  department: "",
  grade: "",
  employeeNumber: "",
  hireDate: "",
  phone: "",
  personalEmail: "",
  address: "",
  city: "",
  postalCode: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  idNumber: "",
  dateOfBirth: "",
}

export function AddEmployeeDialog({ isOpen, onClose, onSuccess }: AddEmployeeDialogProps) {
  const [formData, setFormData] = useState(EMPTY)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const set = (field: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async () => {
    setError("")

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setError("First name, last name, email and password are required")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          jobTitle: formData.jobTitle || null,
          employmentType: formData.employmentType || null,
          department: formData.department || null,
          grade: formData.grade ? parseInt(formData.grade) : null,
          employeeNumber: formData.employeeNumber || null,
          hireDate: formData.hireDate || null,
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
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to create employee")
        return
      }

      setFormData(EMPTY)
      onSuccess()
      onClose()
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData(EMPTY)
    setError("")
    onClose()
  }

  const field = (id: keyof typeof EMPTY, label: string, type = "text", placeholder = "") => (
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
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Create a new employee account. Only the first tab fields are required to get started.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
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
                {field("firstName",      "First Name *",  "text",  "John")}
                {field("lastName",       "Last Name *",   "text",  "Doe")}
                {field("email",          "Work Email *",  "email", "john@company.com")}
                {field("password",       "Password *",    "password", "Min. 6 characters")}
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
                {field("jobTitle",        "Job Title",       "text",   "Sales Consultant")}
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(v) => setFormData((p) => ({ ...p, department: v }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Human Resources">Human Resources</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="Executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {field("grade",          "Grade",           "number", "1")}
                {field("employeeNumber", "Employee Number", "text",   "EMP001")}
              </div>
              {field("hireDate", "Hire Date", "date")}
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
              {field("emergencyContactName", "Contact Full Name", "text", "Jane Doe")}
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

        <DialogFooter className="pt-4 border-t mt-2 shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
