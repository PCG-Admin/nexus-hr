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
import { AlertCircle } from "lucide-react"
import { type UserRole } from "@/lib/auth"
import { getOrgConfig, DEFAULT_DEPARTMENTS, DEFAULT_GRADES } from "@/lib/org-config"
import { getAllEmployees, type Employee } from "@/lib/supabase/leave-service"
import { apiFetch } from "@/lib/api-fetch"

const SA_LANGUAGES = ["Afrikaans","English","isiNdebele","isiXhosa","isiZulu","Sepedi","Sesotho","Setswana","siSwati","Tshivenda","Xitsonga"]
const MANAGER_ROLES = ["line_manager", "hr_manager", "executive", "system_admin"]

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
  managerId: "",
  // contact
  phone: "",
  personalEmail: "",
  address: "",
  city: "",
  postalCode: "",
  postalAddress: "",
  // emergency
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  // identity
  idNumber: "",
  passportNumber: "",
  dateOfBirth: "",
  // personal
  gender: "",
  maritalStatus: "",
  language: "",
  numberOfDependants: "",
  spouseName: "",
  // financial
  taxNumber: "",
  taxOffice: "",
  bankName: "",
  bankBranchCode: "",
  bankAccountNumber: "",
  bankAccountType: "",
  bankAccountHolderName: "",
  bankAccountRelationship: "",
  // eea
  eeaGroup: "",
  eeaHasDisability: "false",
  eeaDisabilityDescription: "",
}

export function AddEmployeeDialog({ isOpen, onClose, onSuccess }: AddEmployeeDialogProps) {
  const [formData, setFormData] = useState(EMPTY)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orgConfig, setOrgConfig] = useState({ departments: DEFAULT_DEPARTMENTS, grades: DEFAULT_GRADES })
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [langIsOther, setLangIsOther] = useState(false)

  useEffect(() => {
    getOrgConfig().then(setOrgConfig)
  }, [])

  useEffect(() => {
    if (isOpen) getAllEmployees().then(setAllEmployees)
  }, [isOpen])

  const set = (field: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))

  const sel = (field: keyof typeof EMPTY) => (v: string) =>
    setFormData((prev) => ({ ...prev, [field]: v }))

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
      const response = await apiFetch("/api/admin/create-user", {
        method: "POST",
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
          managerId: formData.managerId || null,
          phone: formData.phone || null,
          personalEmail: formData.personalEmail || null,
          address: formData.address || null,
          city: formData.city || null,
          postalCode: formData.postalCode || null,
          postalAddress: formData.postalAddress || null,
          emergencyContactName: formData.emergencyContactName || null,
          emergencyContactPhone: formData.emergencyContactPhone || null,
          emergencyContactRelationship: formData.emergencyContactRelationship || null,
          idNumber: formData.idNumber || null,
          passportNumber: formData.passportNumber || null,
          dateOfBirth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          maritalStatus: formData.maritalStatus || null,
          language: formData.language || null,
          numberOfDependants: formData.numberOfDependants ? parseInt(formData.numberOfDependants) : null,
          spouseName: formData.spouseName || null,
          taxNumber: formData.taxNumber || null,
          taxOffice: formData.taxOffice || null,
          bankName: formData.bankName || null,
          bankBranchCode: formData.bankBranchCode || null,
          bankAccountNumber: formData.bankAccountNumber || null,
          bankAccountType: formData.bankAccountType || null,
          bankAccountHolderName: formData.bankAccountHolderName || null,
          bankAccountRelationship: formData.bankAccountRelationship || null,
          eeaGroup: formData.eeaGroup || null,
          eeaHasDisability: formData.eeaHasDisability === "true",
          eeaDisabilityDescription: formData.eeaDisabilityDescription || null,
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Create a new employee account. Only Employment tab fields are required.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="employment" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="shrink-0 flex-wrap h-auto gap-1">
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="eea">EEA</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto flex-1 mt-4 pr-1">

            {/* ── Employment ─────────────────────────────────── */}
            <TabsContent value="employment" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                {field("firstName", "First Name *",  "text",     "John")}
                {field("lastName",  "Last Name *",   "text",     "Doe")}
                {field("email",     "Work Email *",  "email",    "john@company.com")}
                {field("password",  "Password *",    "password", "Min. 6 characters")}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Role *</Label>
                  <Select value={formData.role} onValueChange={sel("role") as (v: UserRole) => void} disabled={isSubmitting}>
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
                  <Select value={formData.employmentType} onValueChange={sel("employmentType")} disabled={isSubmitting}>
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
                {field("jobTitle", "Job Title", "text", "Sales Consultant")}
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select value={formData.department} onValueChange={sel("department")} disabled={isSubmitting}>
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
                  <Select value={formData.grade} onValueChange={sel("grade")} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {orgConfig.grades.map(g => (
                        <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {field("employeeNumber", "Employee Number", "text", "EMP001")}
              </div>
              {field("hireDate", "Hire Date", "date")}

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
                    {allEmployees.filter(e => e.isActive && MANAGER_ROLES.includes(e.role)).map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.role.replace('_', ' ')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* ── Contact ────────────────────────────────────── */}
            <TabsContent value="contact" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                {field("phone",         "Mobile Number",  "tel",   "+27 82 000 0000")}
                {field("personalEmail", "Personal Email", "email", "name@gmail.com")}
              </div>
              {field("address",        "Street / Physical Address", "text", "12 Oak Street, Sandton")}
              <div className="grid grid-cols-2 gap-4">
                {field("city",       "City",        "text", "Johannesburg")}
                {field("postalCode", "Postal Code", "text", "2196")}
              </div>
              {field("postalAddress", "Postal Address (if different)", "text", "PO Box 1234, Sandton, 2146")}
            </TabsContent>

            {/* ── Emergency ──────────────────────────────────── */}
            <TabsContent value="emergency" className="space-y-4 mt-0">
              {field("emergencyContactName", "Contact Full Name", "text", "Jane Doe")}
              <div className="grid grid-cols-2 gap-4">
                {field("emergencyContactPhone", "Contact Phone", "tel", "+27 71 000 0000")}
                <div className="space-y-1.5">
                  <Label>Relationship</Label>
                  <Select value={formData.emergencyContactRelationship} onValueChange={sel("emergencyContactRelationship")} disabled={isSubmitting}>
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

            {/* ── Identity ───────────────────────────────────── */}
            <TabsContent value="identity" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                {field("idNumber",      "SA ID Number",     "text", "8001010000000")}
                {field("passportNumber","Passport Number",  "text", "A12345678")}
              </div>
              {field("dateOfBirth", "Date of Birth", "date")}
              <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                Sensitive data — visible to HR and the employee only. Handle in compliance with POPIA.
              </p>
            </TabsContent>

            {/* ── Personal ───────────────────────────────────── */}
            <TabsContent value="personal" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={formData.gender} onValueChange={sel("gender")} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Marital Status</Label>
                  <Select value={formData.maritalStatus} onValueChange={sel("maritalStatus")} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Home Language</Label>
                  <Select
                    value={langIsOther ? "__other__" : (formData.language || "")}
                    onValueChange={(v) => {
                      if (v === "__other__") { setLangIsOther(true); setFormData(p => ({ ...p, language: "" })) }
                      else { setLangIsOther(false); setFormData(p => ({ ...p, language: v })) }
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                    <SelectContent>
                      {SA_LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      <SelectItem value="__other__">Other (International)</SelectItem>
                    </SelectContent>
                  </Select>
                  {langIsOther && (
                    <Input
                      placeholder="Enter home language"
                      value={formData.language}
                      onChange={e => setFormData(p => ({ ...p, language: e.target.value }))}
                      disabled={isSubmitting}
                      className="mt-1.5"
                    />
                  )}
                </div>
                {field("numberOfDependants", "Number of Dependants", "number", "0")}
              </div>
              {field("spouseName", "Spouse / Partner Name", "text", "Jane Doe")}
            </TabsContent>

            {/* ── Financial ──────────────────────────────────── */}
            <TabsContent value="financial" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                {field("taxNumber", "Tax Number",  "text", "9001010000000")}
                {field("taxOffice", "SARS Office", "text", "Johannesburg")}
              </div>
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Banking Details</p>
                <div className="grid grid-cols-2 gap-4">
                  {field("bankName",       "Bank Name",          "text", "FNB")}
                  {field("bankBranchCode", "Branch Code",        "text", "250655")}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {field("bankAccountNumber", "Account Number", "text", "62000000000")}
                  <div className="space-y-1.5">
                    <Label>Account Type</Label>
                    <Select value={formData.bankAccountType} onValueChange={sel("bankAccountType")} disabled={isSubmitting}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {field("bankAccountHolderName",    "Account Holder Name",         "text", "John Doe")}
                  {field("bankAccountRelationship",  "Holder Relationship to Employee", "text", "Self")}
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                Sensitive data — handle in compliance with POPIA. Visible to HR only.
              </p>
            </TabsContent>

            {/* ── EEA ────────────────────────────────────────── */}
            <TabsContent value="eea" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>EEA Population Group</Label>
                  <Select value={formData.eeaGroup} onValueChange={sel("eeaGroup")} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="african">African</SelectItem>
                      <SelectItem value="coloured">Coloured</SelectItem>
                      <SelectItem value="indian">Indian / Asian</SelectItem>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="foreign_national">Foreign National</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Has Disability?</Label>
                  <Select value={formData.eeaHasDisability} onValueChange={sel("eeaHasDisability")} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">No</SelectItem>
                      <SelectItem value="true">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.eeaHasDisability === "true" && field("eeaDisabilityDescription", "Disability Description", "text", "Describe the nature of the disability")}
              <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                Required for EEA1 reporting under the Employment Equity Act. Data is handled confidentially.
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
