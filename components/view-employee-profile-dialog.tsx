"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Briefcase, Phone, MapPin, AlertTriangle, Building2, Mail, Calendar, Hash, GraduationCap, BadgeCheck } from "lucide-react"
import { type Employee } from "@/lib/supabase/leave-service"
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
  if (!employee) return null

  const initials = `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()
  const roleColor = ROLE_COLORS[employee.role] ?? ROLE_COLORS.employee

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          {/* Mini profile hero */}
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
          <TabsList className="shrink-0">
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto flex-1 mt-4">

            <TabsContent value="employment" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <Field icon={Briefcase}     label="Job Title"        value={employee.jobTitle} />
                <Field icon={BadgeCheck}    label="Employment Type"  value={employee.employmentType ? EMPLOYMENT_TYPE_LABELS[employee.employmentType] : null} />
                <Field icon={Building2}     label="Department"       value={employee.department} />
                <Field icon={GraduationCap} label="Grade"            value={employee.grade?.toString()} />
                <Field icon={Calendar}      label="Hire Date"        value={employee.hireDate ? format(new Date(employee.hireDate), "d MMMM yyyy") : null} />
                <Field icon={Hash}          label="Employee Number"  value={employee.employeeNumber} />
                <Field icon={Mail}          label="Work Email"       value={employee.email} />
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <Field icon={Phone}  label="Mobile Number" value={employee.phone} />
                <Field icon={Mail}   label="Work Email"    value={employee.email} />
                <Field icon={MapPin} label="Address"       value={employee.address} />
                <Field icon={MapPin} label="City"          value={employee.city} />
                <Field icon={Hash}   label="Postal Code"   value={employee.postalCode} />
              </div>
            </TabsContent>

            <TabsContent value="emergency" className="space-y-4 mt-0">
              {employee.emergencyContactName ? (
                <div className="grid grid-cols-2 gap-4">
                  <Field icon={AlertTriangle} label="Full Name"     value={employee.emergencyContactName} />
                  <Field icon={Phone}         label="Phone"         value={employee.emergencyContactPhone} />
                  <Field icon={AlertTriangle} label="Relationship"  value={employee.emergencyContactRelationship} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                  <p className="text-sm text-muted-foreground">No emergency contact on file</p>
                </div>
              )}
            </TabsContent>

          </div>
        </Tabs>

        <p className="text-xs text-muted-foreground border-t pt-3 mt-2 shrink-0">
          Read-only view. Contact HR to update this employee's information.
        </p>
      </DialogContent>
    </Dialog>
  )
}
