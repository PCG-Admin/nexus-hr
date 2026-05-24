"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { NavHeader } from "@/components/nav-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getVisiblePolicies, acknowledgePolicy, type HRPolicy } from "@/lib/supabase/policy-service"
import { Download, CheckCircle2, Search, BookOpen, Loader2, ChevronRight, Eye } from "lucide-react"

const CATEGORY_ORDER = ["Onboarding", "Probation", "HR Agreements", "Offboarding", "Leave", "Performance", "Disciplinary", "General"]

const VISIBILITY_BADGE: Record<string, { label: string; className: string }> = {
  all:        { label: "All Staff",   className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  management: { label: "Management", className: "bg-blue-100 text-blue-800 border-blue-200" },
  hr_only:    { label: "HR Only",    className: "bg-purple-100 text-purple-800 border-purple-200" },
}

export default function PoliciesPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [policies, setPolicies] = useState<HRPolicy[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [acknowledging, setAcknowledging] = useState<string | null>(null)

  const fetchPolicies = useCallback(async () => {
    if (!user) return
    setIsLoadingData(true)
    const data = await getVisiblePolicies(user.id)
    setPolicies(data)
    setIsLoadingData(false)
  }, [user])

  useEffect(() => {
    if (!isLoading && !user) { router.push("/"); return }
    if (!isLoading && user) fetchPolicies()
  }, [isLoading, user, fetchPolicies, router])

  const handleAcknowledge = async (policy: HRPolicy) => {
    if (!user || policy.acknowledgedByMe) return
    setAcknowledging(policy.id)
    const result = await acknowledgePolicy(policy.id, user.id)
    if (result.success) {
      setPolicies(prev => prev.map(p => p.id === policy.id ? { ...p, acknowledgedByMe: true } : p))
    }
    setAcknowledging(null)
  }

  const handleDownload = (policy: HRPolicy) => {
    window.open(policy.fileUrl, "_blank", "noopener,noreferrer")
  }

  const lowerQuery = searchQuery.toLowerCase()
  const filtered = policies.filter(p =>
    !lowerQuery ||
    p.title.toLowerCase().includes(lowerQuery) ||
    (p.description ?? "").toLowerCase().includes(lowerQuery) ||
    p.category.toLowerCase().includes(lowerQuery)
  )

  // Group by category
  const grouped = filtered.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {} as Record<string, HRPolicy[]>)

  const sortedCategories = [
    ...CATEGORY_ORDER.filter(c => grouped[c]),
    ...Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c)),
  ]

  const totalPolicies = policies.length
  const acknowledgedCount = policies.filter(p => p.acknowledgedByMe).length

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">HR Policies &amp; Documents</h1>
              <p className="text-sm text-muted-foreground">Company policies, agreements and forms</p>
            </div>
          </div>

          {/* Progress bar */}
          {totalPolicies > 0 && (
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-xs">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${(acknowledgedCount / totalPolicies) * 100}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground whitespace-nowrap">
                <span className="font-semibold text-foreground">{acknowledgedCount}</span> of {totalPolicies} acknowledged
              </p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search policies…"
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchQuery ? "No policies match your search." : "No policies available."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {sortedCategories.map(category => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h2>
                  <span className="text-xs text-muted-foreground">({grouped[category].length})</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[category].map(policy => (
                    <PolicyCard
                      key={policy.id}
                      policy={policy}
                      acknowledging={acknowledging === policy.id}
                      onDownload={() => handleDownload(policy)}
                      onAcknowledge={() => handleAcknowledge(policy)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function PolicyCard({
  policy,
  acknowledging,
  onDownload,
  onAcknowledge,
}: {
  policy: HRPolicy
  acknowledging: boolean
  onDownload: () => void
  onAcknowledge: () => void
}) {
  const vis = VISIBILITY_BADGE[policy.visibility] ?? VISIBILITY_BADGE.all

  return (
    <Card className={`transition-all hover:shadow-md ${policy.acknowledgedByMe ? "border-emerald-200 bg-emerald-50/30" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-snug line-clamp-2">{policy.title}</CardTitle>
          {policy.acknowledgedByMe && (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-xs ${vis.className}`}>{vis.label}</Badge>
          <Badge variant="outline" className="text-xs text-muted-foreground">v{policy.version}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {policy.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{policy.description}</p>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={onDownload}>
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            View / Download
          </Button>

          {policy.acknowledgedByMe ? (
            <Button size="sm" variant="outline" className="flex-1 text-xs text-emerald-700 border-emerald-300 bg-emerald-50 cursor-default" disabled>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Acknowledged
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={onAcknowledge}
              disabled={acknowledging}
            >
              {acknowledging
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Acknowledge</>
              }
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
