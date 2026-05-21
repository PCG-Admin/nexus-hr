"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { NavHeader } from "@/components/nav-header"
import { ViewEmployeeProfileDialog } from "@/components/view-employee-profile-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Eye, Building2, GraduationCap, Mail } from "lucide-react"
import { getAllEmployees, type Employee } from "@/lib/supabase/leave-service"
import { DEMO_EMPLOYEES } from "@/lib/demo-data"

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee", line_manager: "Line Manager", hr_manager: "HR Manager",
  executive: "Executive", system_admin: "System Admin",
}

export default function TeamPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [teamMembers, setTeamMembers] = useState<Employee[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    if (!isLoading && !user) router.push("/")
    if (!isLoading && user && user.role !== "line_manager") router.push("/dashboard")
  }, [user, isLoading, router])

  const fetchTeam = useCallback(async () => {
    if (!user) return
    setIsLoadingData(true)

    const dbReady = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder"))

    if (!dbReady) {
      // Filter demo employees whose managerId matches the current user
      setTeamMembers(DEMO_EMPLOYEES.filter((e) => e.managerId === user.id))
      setIsLoadingData(false)
      return
    }

    const all = await getAllEmployees()
    setTeamMembers(all.filter((e) => e.managerId === user.id))
    setIsLoadingData(false)
  }, [user])

  useEffect(() => {
    if (user?.role === "line_manager") fetchTeam()
  }, [user, fetchTeam])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavHeader />

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">My Team</h2>
          <p className="text-muted-foreground mt-1">
            View profiles of your direct reports
          </p>
        </div>

        {isLoadingData ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : teamMembers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="font-medium">No direct reports found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Employees are assigned to you when HR sets their reporting line.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((member) => {
              const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
              return (
                <Card key={member.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {member.jobTitle ?? ROLE_LABELS[member.role]}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                      {member.department && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          {member.department}
                        </div>
                      )}
                      {member.grade && (
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                          Grade {member.grade}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => setViewingEmployee(member)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Profile
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <ViewEmployeeProfileDialog
        employee={viewingEmployee}
        isOpen={!!viewingEmployee}
        onClose={() => setViewingEmployee(null)}
      />
    </div>
  )
}
