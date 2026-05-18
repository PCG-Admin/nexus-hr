import { LoginForm } from "@/components/login-form"

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Leave Platform</h1>
          <p className="text-muted-foreground">BCEA-Compliant Leave Management for South Africa</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
