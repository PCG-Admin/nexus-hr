"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

export type UserRole = "employee" | "line_manager" | "hr_manager" | "executive" | "system_admin"

export type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  employeeNumber: string | null
  role: UserRole
  department: string | null
  grade: number | null
  hireDate: string | null
  jobTitle: string | null
  employmentType: "permanent" | "fixed_term" | "probation" | null
  managerId: string | null
  phone: string | null
  personalEmail: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelationship: string | null
  idNumber: string | null
  dateOfBirth: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Map DB snake_case row → camelCase User
function mapEmployee(row: Record<string, unknown>): User {
  return {
    id:                            row.id as string,
    email:                         row.email as string,
    firstName:                     row.first_name as string,
    lastName:                      row.last_name as string,
    employeeNumber:                (row.employee_number as string | null) ?? null,
    role:                          row.role as UserRole,
    department:                    (row.department as string | null) ?? null,
    grade:                         (row.grade as number | null) ?? null,
    hireDate:                      (row.hire_date as string | null) ?? null,
    jobTitle:                      (row.job_title as string | null) ?? null,
    employmentType:                (row.employment_type as User["employmentType"]) ?? null,
    managerId:                     (row.manager_id as string | null) ?? null,
    phone:                         (row.phone as string | null) ?? null,
    personalEmail:                 (row.personal_email as string | null) ?? null,
    address:                       (row.address as string | null) ?? null,
    city:                          (row.city as string | null) ?? null,
    postalCode:                    (row.postal_code as string | null) ?? null,
    emergencyContactName:          (row.emergency_contact_name as string | null) ?? null,
    emergencyContactPhone:         (row.emergency_contact_phone as string | null) ?? null,
    emergencyContactRelationship:  (row.emergency_contact_relationship as string | null) ?? null,
    idNumber:                      (row.id_number as string | null) ?? null,
    dateOfBirth:                   (row.date_of_birth as string | null) ?? null,
    isActive:                      (row.is_active as boolean) ?? true,
    createdAt:                     row.created_at as string,
    updatedAt:                     row.updated_at as string,
  }
}

const ROLE_COOKIE = "nexus-role"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function setRoleCookie(role: string) {
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

function clearRoleCookie() {
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`
}

type AuthContextType = {
  user: User | null
  supabaseUser: null
  session: null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchEmployee = useCallback(async (userId: string): Promise<User | null> => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("id", userId)
      .single()
    if (error || !data) return null
    return mapEmployee(data as unknown as Record<string, unknown>)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (session?.user) {
          const employee = await fetchEmployee(session.user.id)
          if (mounted && employee) {
            setUser(employee)
            setRoleCookie(employee.role)
          }
        }
      } catch {
        // any error — leave user null, redirect to login will follow
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    init()

    // Keep session in sync across tabs
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (event === "SIGNED_IN" && session?.user) {
        const employee = await fetchEmployee(session.user.id)
        if (mounted && employee) {
          setUser(employee)
          setRoleCookie(employee.role)
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        clearRoleCookie()
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        const employee = await fetchEmployee(session.user.id)
        if (mounted && employee) {
          setUser(employee)
          setRoleCookie(employee.role)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchEmployee]) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Translate common Supabase error messages to user-friendly text
      if (error.message.includes("Invalid login credentials")) {
        return { success: false, error: "Invalid email or password" }
      }
      return { success: false, error: error.message }
    }

    if (!data.session) return { success: false, error: "Sign-in failed — no session returned" }

    const employee = await fetchEmployee(data.user.id)
    if (!employee) {
      await supabase.auth.signOut()
      return { success: false, error: "No employee record found for this account. Contact your administrator." }
    }

    if (!employee.isActive) {
      await supabase.auth.signOut()
      return { success: false, error: "This account has been deactivated. Contact HR." }
    }

    setUser(employee)
    setRoleCookie(employee.role)
    return { success: true }
  }

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    clearRoleCookie()
  }

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : prev)
  }

  return (
    <AuthContext.Provider value={{ user, supabaseUser: null, session: null, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
