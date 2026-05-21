"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type UserRole = "employee" | "line_manager" | "hr_manager" | "executive" | "system_admin"

export type User = {
  // Identity
  id: string
  email: string
  firstName: string
  lastName: string
  employeeNumber: string | null
  // Employment (HR-managed)
  role: UserRole
  department: string | null
  grade: number | null
  hireDate: string | null
  jobTitle: string | null
  employmentType: 'permanent' | 'fixed_term' | 'probation' | null
  managerId: string | null
  // Personal contact (self-editable)
  phone: string | null
  personalEmail: string | null
  // Address (self-editable)
  address: string | null
  city: string | null
  postalCode: string | null
  // Emergency contact (self-editable)
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelationship: string | null
  // Sensitive identity (self-view only)
  idNumber: string | null
  dateOfBirth: string | null
  createdAt: string
  updatedAt: string
}

const DEMO_USERS = [
  {
    email: "employee@nexushr.com",
    password: "password123",
    user: {
      id: "demo-employee-001",
      email: "employee@nexushr.com",
      firstName: "Sarah",
      lastName: "Dlamini",
      employeeNumber: "EMP003",
      role: "employee" as const,
      managerId: "demo-manager-001",
      department: "Sales",
      grade: 2,
      hireDate: "2024-03-01",
      jobTitle: "Sales Consultant",
      employmentType: "permanent" as const,
      phone: "+27 82 000 0003",
      personalEmail: "sarah.dlamini@gmail.com",
      address: "12 Oak Street, Sandton",
      city: "Johannesburg",
      postalCode: "2196",
      emergencyContactName: "Thabo Dlamini",
      emergencyContactPhone: "+27 71 000 0099",
      emergencyContactRelationship: "Brother",
      idNumber: "9901010000083",
      dateOfBirth: "1999-01-01",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    email: "manager@nexushr.com",
    password: "password123",
    user: {
      id: "demo-manager-001",
      email: "manager@nexushr.com",
      firstName: "James",
      lastName: "Naidoo",
      employeeNumber: "EMP002",
      role: "line_manager" as const,
      managerId: null,
      department: "Sales",
      grade: 4,
      hireDate: "2023-06-01",
      jobTitle: "Sales Team Lead",
      employmentType: "permanent" as const,
      phone: "+27 83 000 0002",
      personalEmail: "james.naidoo@gmail.com",
      address: "45 Elm Avenue, Rosebank",
      city: "Johannesburg",
      postalCode: "2196",
      emergencyContactName: "Kavita Naidoo",
      emergencyContactPhone: "+27 72 000 0088",
      emergencyContactRelationship: "Spouse",
      idNumber: "8805150000085",
      dateOfBirth: "1988-05-15",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    email: "hr@nexushr.com",
    password: "password123",
    user: {
      id: "demo-hr-001",
      email: "hr@nexushr.com",
      firstName: "Priya",
      lastName: "Patel",
      employeeNumber: "EMP004",
      role: "hr_manager" as const,
      managerId: null,
      department: "Human Resources",
      grade: 5,
      hireDate: "2022-09-01",
      jobTitle: "HR Manager",
      employmentType: "permanent" as const,
      phone: "+27 84 000 0004",
      personalEmail: "priya.patel@gmail.com",
      address: "7 Maple Lane, Fourways",
      city: "Johannesburg",
      postalCode: "2055",
      emergencyContactName: "Raj Patel",
      emergencyContactPhone: "+27 73 000 0077",
      emergencyContactRelationship: "Husband",
      idNumber: "9203220000086",
      dateOfBirth: "1992-03-22",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    email: "executive@nexushr.com",
    password: "password123",
    user: {
      id: "demo-executive-001",
      email: "executive@nexushr.com",
      firstName: "Michael",
      lastName: "van der Berg",
      employeeNumber: "EMP005",
      role: "executive" as const,
      managerId: null,
      department: "Executive",
      grade: 6,
      hireDate: "2020-01-01",
      jobTitle: "General Manager",
      employmentType: "permanent" as const,
      phone: "+27 85 000 0005",
      personalEmail: "michael.vdberg@gmail.com",
      address: "1 Acacia Drive, Morningside",
      city: "Johannesburg",
      postalCode: "2057",
      emergencyContactName: "Linda van der Berg",
      emergencyContactPhone: "+27 74 000 0066",
      emergencyContactRelationship: "Spouse",
      idNumber: "7011290000087",
      dateOfBirth: "1970-11-29",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    email: "admin@nexushr.com",
    password: "password123",
    user: {
      id: "demo-admin-001",
      email: "admin@nexushr.com",
      firstName: "Tricia",
      lastName: "Williams",
      employeeNumber: "EMP001",
      role: "system_admin" as const,
      managerId: null,
      department: "Administration",
      grade: 5,
      hireDate: "2021-01-01",
      jobTitle: "System Administrator",
      employmentType: "permanent" as const,
      phone: "+27 86 000 0001",
      personalEmail: "tricia.williams@gmail.com",
      address: "33 Pine Road, Midrand",
      city: "Midrand",
      postalCode: "1685",
      emergencyContactName: "Derek Williams",
      emergencyContactPhone: "+27 75 000 0055",
      emergencyContactRelationship: "Husband",
      idNumber: "8507180000089",
      dateOfBirth: "1985-07-18",
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
  updateUser: (updates: Partial<User>) => void
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

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : prev)
  }

  return (
    <AuthContext.Provider value={{ user, supabaseUser: null, session: null, login, logout, updateUser, isLoading }}>
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
