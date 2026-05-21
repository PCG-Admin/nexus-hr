"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth"
import Image from "next/image"

const DEMO_CREDENTIALS = [
  { label: "Employee",       email: "employee@nexushr.com",  role: "employee"     },
  { label: "Line Manager",   email: "manager@nexushr.com",   role: "line_manager" },
  { label: "HR Manager",     email: "hr@nexushr.com",        role: "hr_manager"   },
  { label: "Executive",      email: "executive@nexushr.com", role: "executive"    },
  { label: "System Admin",   email: "admin@nexushr.com",     role: "system_admin" },
]

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const result = await login(email, password)

    if (result.success) {
      router.push("/dashboard")
    } else {
      setError(result.error || "Invalid email or password")
    }

    setIsLoading(false)
  }

  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword("password123")
    setError("")
  }

  return (
    <div className="w-full max-w-3xl flex rounded-xl shadow-lg overflow-hidden bg-card">
      {/* Left — login form */}
      <div className="flex-1 p-8 flex flex-col justify-center">
        <div className="mb-6 text-center">
          <Image
            src="/XLNEXUSLOGO.png"
            alt="Nexus HR Logo"
            width={260}
            height={80}
            className="object-contain w-full h-auto mx-auto mb-4"
          />
          <h1 className="text-xl font-semibold">Login to HR Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your credentials to access your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="yourname@nexustravel.co.za"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>

      {/* Divider */}
      <div className="w-px bg-border self-stretch" />

      {/* Right — demo credentials */}
      <div className="w-64 p-8 flex flex-col justify-center bg-muted/30">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Demo Access</p>
        <p className="text-xs text-muted-foreground mb-4">Click a role to fill credentials</p>
        <div className="flex flex-col gap-2">
          {DEMO_CREDENTIALS.map((c) => (
            <button
              key={c.role}
              type="button"
              onClick={() => quickLogin(c.email)}
              className="text-xs px-3 py-2.5 rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors text-left"
            >
              <span className="font-medium block">{c.label}</span>
              <span className="opacity-60">{c.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
