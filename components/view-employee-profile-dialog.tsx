"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Briefcase, Phone, MapPin, AlertTriangle, Building2, Mail, Calendar, Hash,
  GraduationCap, BadgeCheck, Clock, User as UserIcon, CreditCard, Shield, FolderOpen,
} from "lucide-react"
import { type Employee, getEmployeeAuditTrail, type EmployeeAuditEntry } from "@/lib/supabase/leave-service"
import { useAuth } from "@/lib/auth"
import { EmployeeDocumentSlots } from "@/components/employee-document-slots"
import { format } from "date-fns"
import { type ElementType } from "react"

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee", line_manager: "Line Manager", hr_manager: "HR Manager",
  executive: "Executive", system_admin: "System Admin",
}
const ROLE_COLORS: Record<string, string> = {
  system_admin: "bg-red-100 text-red-800 border-red-200",
  hr_manager:   "bg-purple-100 text-purple-800 border-purple-200",
  executive:    "bg-amber-100 text-amber-800 border-amber-200",
  line_manager: "bg-blue-100 text-blue-800 border-blue-200",
  employee:     "bg-slate-100 text-slate-700 border-slate-200",
}
const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  permanent: "Permanent", fixed_term: "Fixed-Term Contract", probation: "Probationary",
}
const GENDER_LABELS: Record<string, string> = {
  male: "Male", female: "Female", other: "Other", prefer_not_to_say: "Prefer not to say",
}
const MARITAL_LABELS: Record<string, string> = {
  single: "Single", married: "Married", divorced: "Divorced", widowed: "Widowed",
}
const EEA_LABELS: Record<string, string> = {
  african: "African", coloured: "Coloured", indian: "Indian / Asian",
  white: "White", foreign_national: "Foreign National",
}
const BANK_TYPE_LABELS: Record<string, string> = {
  cheque: "Cheque", savings: "Savings", current: "Current",
}

function Field({ icon: Icon, label, value }: { icon?: ElementType; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
      <div>
        <p className="text-xs text-muted-foreground leading-none mb-1">{label}</p>
        {value
          ? <p className="text-sm font-medium">{value}</p>
          : <p className="text-sm text-muted-foreground italic">Not provided</p>
        }
      </div>
    </div>
  )
}

type Props = {
  employee: Employee | null
  isOpen: boolean
  onClose: () => void
}

export function ViewEmployeeProfileDialog({ employee, isOpen, onClose }: Props) {
  const { user } = useAuth()
  const isHR = user?.role === 'hr_manager' || user?.role === 'system_admin'
  const [auditTrail, setAuditTrail] = useState<EmployeeAuditEntry[]>([])

  useEffect(() => {
    if (isOpen && employee && isHR) {
      getEmployeeAuditTrail(employee.id).then(setAuditTrail)
    }
  }, [isOpen, employee, isHR])

  if (!employee) return null

  const initials = `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()
  const roleColor = ROLE_COLORS[employee.role] ?? ROLE_COLORS.employee
  const emp = employee as any

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-4 pb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">{initials}</span>
            </div>
            <div>
              <DialogTitle className="text-lg leading-tight">
                {employee.firstName} {employee.lastName}
              </DialogTitle>
              {employee.jobTitle && (
                <p className="text-sm text-muted-foreground mt-0.5">{employee.jobTitle}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant="outline" className={`text-xs ${roleColor}`}>
                  <BadgeCheck className="w-3 h-3 mr-1" />
                  {ROLE_LABELS[employee.role] ?? employee.role}
                </Badge>
                {employee.employmentType && (
                  <Badge variant="outline" className="text-xs">
                    {EMPLOYMENT_TYPE_LABELS[employee.employmentType]}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="employment" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="shrink-0 flex-wrap h-auto gap-1">
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            {isHR && <TabsTrigger value="financial">Financial</TabsTrigger>}
            {isHR && <TabsTrigger value="eea">EEA</TabsTrigger>}
            {isHR && <TabsTrigger value="documents">Documents</TabsTrigger>}
            {isHR && <TabsTrigger value="history">History</TabsTrigger>}
          </TabsList>

          <div className="overflow-y-auto flex-1 mt-4">

            {/* Employment */}
            <TabsContent value="employment" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <Field icon={Briefcase}     label="Job Title"       value={employee.jobTitle} />
                <Field icon={BadgeCheck}    label="Employment Type" value={employee.employmentType ? EMPLOYMENT_TYPE_LABELS[employee.employmentType] : null} />
                <Field icon={Building2}     label="Department"      value={employee.department} />
                <Field icon={GraduationCap} label="Grade"           value={employee.grade != null ? `Grade ${employee.grade}` : null} />
                <Field icon={Calendar}      label="Hire Date"       value={employee.hireDate ? format(new Date(employee.hireDate), "d MMMM yyyy") : null} />
                <Field icon={Hash}          label="Employee Number" value={employee.employeeNumber} />
                <Field icon={Mail}          label="Work Email"      value={employee.email} />
              </div>
            </TabsContent>

            {/* Contact */}
            <TabsContent value="contact" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <Field icon={Phone}  label="Mobile Number"  value={employee.phone} />
                <Field icon={Mail}   label="Personal Email" value={employee.personalEmail} />
                <Field icon={MapPin} label="Street Address" value={employee.address} />
                <Field icon={MapPin} label="City"           value={employee.city} />
                <Field icon={Hash}   label="Postal Code"    value={employee.postalCode} />
                <Field icon={MapPin} label="Postal Address" value={emp.postalAddress} />
              </div>
            </TabsContent>

            {/* Emergency */}
            <TabsContent value="emergency" className="space-y-4 mt-0">
              {employee.emergencyContactName ? (
                <div className="grid grid-cols-2 gap-4">
                  <Field icon={AlertTriangle} label="Full Name"    value={employee.emergencyContactName} />
                  <Field icon={Phone}         label="Phone"        value={employee.emergencyContactPhone} />
                  <Field icon={AlertTriangle} label="Relationship" value={employee.emergencyContactRelationship} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                  <p className="text-sm text-muted-foreground">No emergency contact on file</p>
                </div>
              )}
            </TabsContent>

            {/* Personal */}
            <TabsContent value="personal" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <Field icon={UserIcon} label="Gender"        value={emp.gender ? (GENDER_LABELS[emp.gender] ?? emp.gender) : null} />
                <Field icon={UserIcon} label="Marital Status" value={emp.maritalStatus ? (MARITAL_LABELS[emp.maritalStatus] ?? emp.maritalStatus) : null} />
                <Field icon={UserIcon} label="Home Language"  value={emp.language} />
                <Field icon={Hash}     label="Dependants"     value={emp.numberOfDependants != null ? String(emp.numberOfDependants) : null} />
                <Field icon={UserIcon} label="Spouse / Partner Name" value={emp.spouseName} />
              </div>
              {isHR && (
                <div className="mt-4 border-t pt-4 grid grid-cols-2 gap-4">
                  <Field icon={Hash}     label="SA ID Number"     value={employee.idNumber} />
                  <Field icon={Hash}     label="Passport Number"  value={emp.passportNumber} />
                  <Field icon={Calendar} label="Date of Birth"    value={employee.dateOfBirth ? format(new Date(employee.dateOfBirth), "d MMMM yyyy") : null} />
                </div>
              )}
            </TabsContent>

            {/* Financial (HR only) */}
            {isHR && (
              <TabsContent value="financial" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <Field icon={Hash}       label="Tax Number"  value={emp.taxNumber} />
                  <Field icon={Hash}       label="SARS Office" value={emp.taxOffice} />
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Banking</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field icon={CreditCard} label="Bank"            value={emp.bankName} />
                    <Field icon={Hash}       label="Branch Code"     value={emp.bankBranchCode} />
                    <Field icon={Hash}       label="Account Number"  value={emp.bankAccountNumber} />
                    <Field icon={CreditCard} label="Account Type"    value={emp.bankAccountType ? (BANK_TYPE_LABELS[emp.bankAccountType] ?? emp.bankAccountType) : null} />
                    <Field icon={UserIcon}   label="Account Holder"  value={emp.bankAccountHolderName} />
                    <Field icon={UserIcon}   label="Holder Relationship" value={emp.bankAccountRelationship} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                  Sensitive — visible to HR only. Handle in compliance with POPIA.
                </p>
              </TabsContent>
            )}

            {/* EEA (HR only) */}
            {isHR && (
              <TabsContent value="eea" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <Field icon={Shield} label="Population Group" value={emp.eeaGroup ? (EEA_LABELS[emp.eeaGroup] ?? emp.eeaGroup) : null} />
                  <Field icon={Shield} label="Has Disability"   value={emp.eeaHasDisability ? "Yes" : "No"} />
                  {emp.eeaHasDisability && (
                    <div className="col-span-2">
                      <Field icon={Shield} label="Disability Description" value={emp.eeaDisabilityDescription} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  EEA1 data — required for Employment Equity Act reporting. Visible to HR only.
                </p>
              </TabsContent>
            )}

            {/* Documents (HR only) */}
            {isHR && (
              <TabsContent value="documents" className="mt-0">
                <EmployeeDocumentSlots
                  employeeId={employee.id}
                  uploadedById={user!.id}
                  canDelete={true}
                />
              </TabsContent>
            )}

            {/* History (HR only) */}
            {isHR && (
              <TabsContent value="history" className="mt-0">
                {auditTrail.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Clock className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No change history recorded yet</p>
                  </div>
                ) : (
                  <div className="relative space-y-0">
                    {auditTrail.map((entry, idx) => (
                      <div key={entry.id} className="relative flex gap-3 pb-5">
                        {idx < auditTrail.length - 1 && (
                          <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
                        )}
                        <div className="relative z-10 mt-1 w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-sm font-semibold">{entry.actorName}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.timestamp), "d MMM yyyy · HH:mm")}
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
            )}

          </div>
        </Tabs>

        <p className="text-xs text-muted-foreground border-t pt-3 mt-2 shrink-0">
          Read-only view. Contact HR to update this employee's information.
        </p>
      </DialogContent>
    </Dialog>
  )
}
