"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  employeeNumber: string | null
  role: "employee" | "manager" | "admin" | "ceo"
  managerId: string | null
  department: string | null
  hireDate: string | null
  createdAt: string
  updatedAt: string
}

const DEMO_USERS = [
  {
    email: "admin@nexushr.com",
    password: "password123",
    user: {
      id: "demo-admin-001",
      email: "admin@nexushr.com",
      firstName: "Admin",
      lastName: "User",
      employeeNumber: "EMP001",
      role: "admin" as const,
      managerId: null,
      department: "Administration",
      hireDate: "2024-01-01",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
]

const SESSION_COOKIE = "demo-session"

type AuthContextType = {
  user: User | null
  supabaseUser: null
  session: null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function setSessionCookie(user: User) {
  const data = JSON.stringify({ role: user.role, id: user.id })
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(data)}; path=/; max-age=${60 * 60 * 24 * 7}`
}

function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`
}

function getUserFromCookie(): User | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${SESSION_COOKIE}=`))
  if (!match) return null
  try {
    const data = JSON.parse(decodeURIComponent(match.split("=").slice(1).join("=")))
    return DEMO_USERS.find((c) => c.user.id === data.id)?.user ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const existing = getUserFromCookie()
    if (existing) setUser(existing)
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const match = DEMO_USERS.find((c) => c.email === email && c.password === password)
    if (!match) return { success: false, error: "Invalid email or password" }
    setSessionCookie(match.user)
    setUser(match.user)
    return { success: true }
  }

  const logout = async () => {
    clearSessionCookie()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, supabaseUser: null, session: null, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
