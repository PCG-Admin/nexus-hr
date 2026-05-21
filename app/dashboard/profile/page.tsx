"use client"

import { useAuth, type User } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState, type ElementType } from "react"
import { NavHeader } from "@/components/nav-header"
import { ProfileEditDialog } from "@/components/profile-edit-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Pencil,
  User as UserIcon,
  Briefcase,
  MapPin,
  Phone,
  AlertTriangle,
  Lock,
  Building2,
  Mail,
  Calendar,
  Hash,
  GraduationCap,
  BadgeCheck,
} from "lucide-react"
import { format } from "date-fns"

const ROLE_LABELS: Record<string, string> = {
  employee:     "Employee",
  line_manager: "Line Manager",
  hr_manager:   "HR Manager",
  executive:    "Executive",
  system_admin: "System Admin",
}

const ROLE_COLORS: Record<string, string> = {
  system_admin: "bg-red-100 text-red-800 border-red-200",
  hr_manager:   "bg-purple-100 text-purple-800 border-purple-200",
  executive:    "bg-amber-100 text-amber-800 border-amber-200",
  line_manager: "bg-blue-100 text-blue-800 border-blue-200",
  employee:     "bg-slate-100 text-slate-700 border-slate-200",
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  permanent:  "Permanent",
  fixed_term: "Fixed-Term Contract",
  probation:  "Probationary",
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon?: ElementType
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground leading-none mb-1">{label}</p>
        {value ? (
          <p className="text-sm font-medium break-words">{value}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Not provided</p>
        )}
      </div>
    </div>
  )
}

function EditNotice() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
      <Lock className="w-3.5 h-3.5 shrink-0" />
      Managed by HR. Contact your HR Manager to request changes.
    </div>
  )
}

function SensitiveNotice() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
      <Lock className="w-3.5 h-3.5 shrink-0" />
      Sensitive personal information. Visible to you only. Contact HR to update.
    </div>
  )
}

export default function ProfilePage() {
  const { user, isLoading, updateUser } = useAuth()
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.push("/")
  }, [user, isLoading, router])

  const handleSave = async (updates: Partial<User>) => {
    const dbReady = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
    )
    if (dbReady) {
      const res = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error("Failed to save")
    }
    updateUser(updates)
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  const roleLabel = ROLE_LABELS[user.role] ?? user.role
  const roleColor = ROLE_COLORS[user.role] ?? ROLE_COLORS.employee

  return (
    <div className="min-h-screen bg-slate-50">
      <NavHeader />

      <main className="container mx-auto px-6 py-8">
        <div className="flex gap-6 items-start">

          {/* ── Left Sidebar (sticky profile card) ──────────────── */}
          <div className="w-72 shrink-0 sticky top-6">
            <Card className="overflow-hidden">
              <div className="h-16 bg-gradient-to-r from-primary/80 to-primary/40" />
              <CardContent className="pt-0 px-5 pb-5">
                <div className="-mt-8 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-md ring-2 ring-white flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">{initials}</span>
                  </div>
                </div>
                <h2 className="text-lg font-bold leading-tight">{user.firstName} {user.lastName}</h2>
                {user.jobTitle && <p className="text-muted-foreground text-xs mt-0.5">{user.jobTitle}</p>}

                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge variant="outline" className={`text-xs ${roleColor}`}>
                    <BadgeCheck className="w-3 h-3 mr-1" />
                    {roleLabel}
                  </Badge>
                  {user.employmentType && (
                    <Badge variant="outline" className="text-xs">
                      {EMPLOYMENT_TYPE_LABELS[user.employmentType]}
                    </Badge>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  {user.employeeNumber && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="w-3.5 h-3.5 shrink-0" />
                      <span>{user.employeeNumber}</span>
                    </div>
                  )}
                  {user.department && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{user.department}</span>
                    </div>
                  )}
                  {user.grade && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                      <span>Grade {user.grade}</span>
                    </div>
                  )}
                  {user.hireDate && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>Joined {format(new Date(user.hireDate), "d MMM yyyy")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-5 gap-1.5"
                  onClick={() => setIsEditOpen(true)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── Right: Tabbed Sections ───────────────────────────── */}
          <div className="flex-1 min-w-0">
        <Tabs defaultValue="employment">
          <TabsList className="mb-4">
            <TabsTrigger value="employment" className="gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              Employment
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Contact & Address
            </TabsTrigger>
            <TabsTrigger value="emergency" className="gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Emergency
            </TabsTrigger>
            <TabsTrigger value="identity" className="gap-1.5">
              <UserIcon className="w-3.5 h-3.5" />
              Identity
            </TabsTrigger>
          </TabsList>

          {/* Employment tab */}
          <TabsContent value="employment">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <Field icon={Briefcase}     label="Job Title"        value={user.jobTitle} />
                  <Field icon={BadgeCheck}    label="Employment Type"  value={user.employmentType ? EMPLOYMENT_TYPE_LABELS[user.employmentType] : null} />
                  <Field icon={Building2}     label="Department"       value={user.department} />
                  <Field icon={GraduationCap} label="Grade"            value={user.grade?.toString()} />
                  <Field icon={Calendar}      label="Hire Date"        value={user.hireDate ? format(new Date(user.hireDate), "d MMMM yyyy") : null} />
                  <Field icon={Mail}          label="Work Email"       value={user.email} />
                </div>
                <EditNotice />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact & Address tab */}
          <TabsContent value="contact">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</p>
                  <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setIsEditOpen(true)}>
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <Field icon={Phone} label="Mobile Number"  value={user.phone} />
                  <Field icon={Mail}  label="Personal Email" value={user.personalEmail} />
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Address</p>
                  <div className="grid grid-cols-2 gap-6">
                    <Field icon={MapPin} label="Street Address" value={user.address} />
                    <Field icon={MapPin} label="City"           value={user.city} />
                    <Field icon={Hash}   label="Postal Code"    value={user.postalCode} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergency tab */}
          <TabsContent value="emergency">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergency Contact</p>
                  <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setIsEditOpen(true)}>
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Button>
                </div>
                {user.emergencyContactName ? (
                  <div className="grid grid-cols-2 gap-6">
                    <Field icon={UserIcon}        label="Full Name"     value={user.emergencyContactName} />
                    <Field icon={Phone}           label="Phone"         value={user.emergencyContactPhone} />
                    <Field icon={AlertTriangle}   label="Relationship"  value={user.emergencyContactRelationship} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
                    <p className="font-medium text-sm">No emergency contact on file</p>
                    <p className="text-xs text-muted-foreground mt-1">Please add an emergency contact for your records.</p>
                    <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => setIsEditOpen(true)}>
                      <Pencil className="w-3 h-3" />
                      Add Emergency Contact
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Identity tab */}
          <TabsContent value="identity">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sensitive Identity Information</p>
                <div className="grid grid-cols-2 gap-6">
                  <Field icon={Hash}     label="ID / Passport Number" value={user.idNumber} />
                  <Field icon={Calendar} label="Date of Birth"        value={user.dateOfBirth ? format(new Date(user.dateOfBirth), "d MMMM yyyy") : null} />
                </div>
                <SensitiveNotice />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </div>{/* end right column */}
        </div>{/* end flex row */}
      </main>

      <ProfileEditDialog
        user={user}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
