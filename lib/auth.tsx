"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { initDiagnostics } from "@/lib/diagnostics"

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
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`
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

    const employee = mapEmployee(data as unknown as Record<string, unknown>)

    // id_number and date_of_birth are restricted at column level — fetch own PII via secure RPC
    const { data: pii } = await supabase.rpc("get_my_employee_pii")
    if (pii && pii.length > 0) {
      employee.idNumber = (pii[0] as { id_number: string | null }).id_number
      employee.dateOfBirth = (pii[0] as { date_of_birth: string | null }).date_of_birth
    }

    return employee
  }, [])

  useEffect(() => {
    const supabase = createClient()
    initDiagnostics()
    let mounted = true

    function clearStaleSession() {
      localStorage.removeItem('nexus-hr-auth')
      clearRoleCookie()
    }

    let loadedUserId: string | null = null

    async function loadUser(userId: string, attempt = 1) {
      const MAX_ATTEMPTS = 3
      let timedOut = false

      const employee = await Promise.race([
        fetchEmployee(userId),
        new Promise<null>(resolve =>
          setTimeout(() => { timedOut = true; resolve(null) }, 8000)
        ),
      ])

      if (!mounted) return

      if (employee) {
        setUser(employee)
        setRoleCookie(employee.role)
        loadedUserId = userId
        return
      }

      if (timedOut && attempt < MAX_ATTEMPTS) {
        // Network too slow — retry before giving up
        console.warn(`[NEXUS] fetchEmployee timeout, retrying (attempt ${attempt}/${MAX_ATTEMPTS})`)
        await new Promise(r => setTimeout(r, 2000 * attempt))
        if (mounted) await loadUser(userId, attempt + 1)
        return
      }

      if (!timedOut) {
        // Definitive null response — employee record genuinely not found
        clearStaleSession()
      }
      // timedOut + max retries exhausted — session stays intact, user stays null
    }

    async function init() {
      try {
        // Step 1: read localStorage — fast, no network, no hang risk.
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        if (!session?.user) {
          // No stored session at all — show login immediately, no network call needed.
          return
        }

        // Step 2: session exists in localStorage — validate it with the server.
        // Race against 5 s: if VS Code webview hangs on the refresh network call,
        // we clear the stale session and show login instead of freezing forever.
        // Timeout resolves (not rejects) so we don't throw and skip the finally.
        const { data: { user: authUser }, error } = await Promise.race([
          supabase.auth.getUser(),
          new Promise<{ data: { user: null }; error: Error }>(resolve =>
            setTimeout(() => resolve({ data: { user: null }, error: new Error('timeout') }), 5000)
          ),
        ])

        if (!mounted) return

        if (error?.message === 'timeout') {
          // Network timed out — the session in localStorage is still valid.
          // Don't nuke it just because the server was slow. Use the cached session.
          await loadUser(session.user.id)
          return
        }

        if (error || !authUser) {
          clearStaleSession()
          return
        }

        await loadUser(authUser.id)
      } catch {
        if (mounted) clearStaleSession()
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    init()

    // Re-validate when the tab becomes visible again.
    // VS Code webview suspends ALL network connections when VS Code loses focus.
    // After a long absence (>3 min) every pending and new Supabase call hangs,
    // so we force a full page reload to get fresh connections instead of leaving
    // every data-fetch stuck at "Loading...".
    // For short absences we just re-validate the session token with getUser().
    let hiddenAt = 0
    async function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }
      if (!localStorage.getItem('nexus-hr-auth')) return

      const hiddenForMs = hiddenAt > 0 ? Date.now() - hiddenAt : 0

      if (hiddenAt > 0 && hiddenForMs > 3 * 60 * 1000) {
        window.location.reload()
        return
      }

      // Brief alt-tab (< 30 s) — don't revalidate. Calling getUser() here fires
      // onAuthStateChange SIGNED_IN, which recreates the user object, which resets
      // every data-fetch useEffect and leaves components stuck on "Loading...".
      if (hiddenForMs < 30 * 1000) return

      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser()
        if (!mounted) return
        if (error || !authUser) {
          setUser(null)
          clearStaleSession()
        }
      } catch {
        // network failure — onAuthStateChange SIGNED_OUT will handle it
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Keep session in sync across tabs and on token refresh / expiry
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // Same user already loaded — skip the DB round-trip. Recreating the user
        // object with identical data changes its reference, which triggers every
        // useEffect([user]) to re-run and reset components to loading state.
        if (loadedUserId === session.user.id) return
        await loadUser(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        clearStaleSession()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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
