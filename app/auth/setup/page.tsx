"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function SetupContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const h = searchParams.get("h")

  if (!h) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Invalid setup link. Please ask your administrator to resend it.</p>
      </div>
    )
  }

  const handleSetPassword = () => {
    router.push(`/auth/callback?token_hash=${encodeURIComponent(h)}&type=recovery`)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Nexus HR Leave Platform</CardTitle>
          <CardDescription>
            Your account has been created. Click the button below to set your password and get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={handleSetPassword}>
            Set My Password
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <SetupContent />
    </Suspense>
  )
}
