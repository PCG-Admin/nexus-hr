"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { NavHeader } from "@/components/nav-header"
import { getActiveAnnouncements, CATEGORY_CONFIG, type Announcement } from "@/lib/supabase/announcement-service"
import { Megaphone, Users, Settings2, Monitor, DollarSign, ShieldAlert } from "lucide-react"
import { format, formatDistanceToNow, isPast } from "date-fns"

const LAST_SEEN_KEY = "nexus-announcements-last-seen"

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  general:    <Megaphone  className="w-4 h-4" />,
  hr:         <Users      className="w-4 h-4" />,
  operations: <Settings2  className="w-4 h-4" />,
  it:         <Monitor    className="w-4 h-4" />,
  finance:    <DollarSign className="w-4 h-4" />,
  safety:     <ShieldAlert className="w-4 h-4" />,
}

function isNew(publishedAt: string | null, lastSeen: string | null): boolean {
  if (!publishedAt) return false
  if (!lastSeen) return true
  return publishedAt > lastSeen
}

function expiryLabel(expiresAt: string | null): string | null {
  if (!expiresAt) return null
  const d = new Date(expiresAt)
  if (isPast(d)) return null
  return `Expires ${formatDistanceToNow(d, { addSuffix: true })}`
}

export default function AnnouncementsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [lastSeen, setLastSeen] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) router.push("/")
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return
    const prev = localStorage.getItem(LAST_SEEN_KEY)
    setLastSeen(prev)
    // Mark as seen now
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString())

    setIsLoadingData(true)
    getActiveAnnouncements(user.department ?? null, user.grade ?? null)
      .then(setAnnouncements)
      .finally(() => setIsLoadingData(false))
  }, [user])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const newCount = announcements.filter(a => isNew(a.publishedAt, lastSeen)).length

  return (
    <div className="min-h-screen bg-slate-50">
      <NavHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Announcements</h2>
              <p className="text-sm text-muted-foreground">
                Company-wide and targeted communications from HR
              </p>
            </div>
          </div>
          {newCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              {newCount} new since your last visit
            </div>
          )}
        </div>

        {/* Feed */}
        {isLoadingData ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-muted-foreground opacity-40" />
            </div>
            <p className="font-medium text-muted-foreground">No announcements right now</p>
            <p className="text-sm text-muted-foreground/70">Check back later for company news and updates</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map(ann => {
              const cfg     = CATEGORY_CONFIG[ann.category]
              const icon    = CATEGORY_ICONS[ann.category]
              const fresh   = isNew(ann.publishedAt, lastSeen)
              const expiry  = expiryLabel(ann.expiresAt)

              return (
                <div
                  key={ann.id}
                  className={`bg-card rounded-xl border-l-4 ${cfg.border} shadow-sm overflow-hidden ${
                    fresh ? "ring-1 ring-primary/20" : ""
                  }`}
                >
                  <div className="p-5">
                    {/* Category + New badge */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md ${cfg.bg} ${cfg.color}`}>
                        {icon}
                        {cfg.label}
                      </div>
                      <div className="flex items-center gap-2">
                        {fresh && (
                          <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                        {expiry && (
                          <span className="text-xs text-muted-foreground">{expiry}</span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold leading-snug mb-2">{ann.title}</h3>

                    {/* Body */}
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {ann.body}
                    </p>

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        Posted by <span className="font-medium text-foreground">{ann.createdByName}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ann.publishedAt
                          ? formatDistanceToNow(new Date(ann.publishedAt), { addSuffix: true })
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
