import { createClient } from './client'
import { writeAdminAudit } from './admin-audit-service'

const isDbConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))

export type AnnouncementCategory = 'general' | 'hr' | 'operations' | 'it' | 'finance' | 'safety'
export type AnnouncementTargetType = 'all' | 'department' | 'grade'

export type Announcement = {
  id: string
  title: string
  body: string
  category: AnnouncementCategory
  targetType: AnnouncementTargetType
  targetValues: string[]
  isPublished: boolean
  publishedAt: string | null
  scheduledAt: string | null
  expiresAt: string | null
  createdById: string | null
  createdByName: string
  createdAt: string
  updatedAt: string
}

export const CATEGORY_CONFIG: Record<AnnouncementCategory, { label: string; color: string; bg: string; border: string; dot: string }> = {
  general:    { label: 'General',    color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-400',   dot: 'bg-blue-500'   },
  hr:         { label: 'HR',         color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-400', dot: 'bg-violet-500' },
  operations: { label: 'Operations', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-400', dot: 'bg-orange-500' },
  it:         { label: 'IT/Systems', color: 'text-cyan-700',   bg: 'bg-cyan-50',   border: 'border-cyan-400',   dot: 'bg-cyan-500'   },
  finance:    { label: 'Finance',    color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-400',dot: 'bg-emerald-500'},
  safety:     { label: 'Safety',     color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-400',    dot: 'bg-red-500'    },
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-001',
    title: 'Office Closure — Youth Day (16 June 2026)',
    body: 'Please be reminded that the office will be closed on Monday 16 June 2026 in observance of Youth Day. Normal operations resume on Tuesday 17 June. All leave requests for this period have been updated accordingly.',
    category: 'general',
    targetType: 'all',
    targetValues: [],
    isPublished: true,
    publishedAt: '2026-05-20T09:00:00Z',
    scheduledAt: null,
    expiresAt: '2026-06-17T00:00:00Z',
    createdById: 'demo-hr-001',
    createdByName: 'Priya Patel',
    createdAt: '2026-05-19T15:00:00Z',
    updatedAt: '2026-05-20T09:00:00Z',
  },
  {
    id: 'ann-002',
    title: 'Updated Leave Policy — Effective 1 June 2026',
    body: 'Our leave policy has been updated to align with the latest BCEA guidelines. Key changes include revised sick leave accumulation rules and updated family responsibility leave provisions. Please review the updated policy document in the HR Policies section.',
    category: 'hr',
    targetType: 'all',
    targetValues: [],
    isPublished: true,
    publishedAt: '2026-05-18T10:30:00Z',
    scheduledAt: null,
    expiresAt: null,
    createdById: 'demo-hr-001',
    createdByName: 'Priya Patel',
    createdAt: '2026-05-17T14:00:00Z',
    updatedAt: '2026-05-18T10:30:00Z',
  },
  {
    id: 'ann-003',
    title: 'Q2 2026 Performance Reviews — Submission Deadline',
    body: 'Reminder: Q2 2026 performance review KPI submissions are due by 30 June 2026. Please ensure your self-assessment is completed and submitted through the Performance module. Late submissions may affect your incentive gate status.',
    category: 'hr',
    targetType: 'all',
    targetValues: [],
    isPublished: true,
    publishedAt: '2026-05-15T08:00:00Z',
    scheduledAt: null,
    expiresAt: '2026-06-30T23:59:00Z',
    createdById: 'demo-hr-001',
    createdByName: 'Priya Patel',
    createdAt: '2026-05-14T16:00:00Z',
    updatedAt: '2026-05-15T08:00:00Z',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToAnnouncement(row: any): Announcement {
  return {
    id:            row.id,
    title:         row.title,
    body:          row.body,
    category:      row.category as AnnouncementCategory,
    targetType:    row.target_type as AnnouncementTargetType,
    targetValues:  row.target_values ?? [],
    isPublished:   row.is_published,
    publishedAt:   row.published_at,
    scheduledAt:   row.scheduled_at,
    expiresAt:     row.expires_at,
    createdById:   row.created_by,
    createdByName: row.created_by_name,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  }
}

function isTargetedAt(a: Announcement, department: string | null, grade: number | null): boolean {
  if (a.targetType === 'all') return true
  if (a.targetType === 'department' && department)
    return a.targetValues.includes(department)
  if (a.targetType === 'grade' && grade !== null)
    return a.targetValues.includes(String(grade))
  return false
}

// ── Public functions ──────────────────────────────────────────────────────────

/** Employee-facing: returns published, non-expired, targeted announcements */
export async function getActiveAnnouncements(
  department: string | null,
  grade: number | null,
): Promise<Announcement[]> {
  if (!isDbConfigured()) {
    const now = new Date().toISOString()
    return DEMO_ANNOUNCEMENTS.filter(a =>
      a.isPublished &&
      (a.expiresAt === null || a.expiresAt > now) &&
      isTargetedAt(a, department, grade)
    )
  }
  const supabase = createClient()
  const now = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('announcements')
    .select('*')
    .eq('is_published', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('published_at', { ascending: false })

  if (error || !data) return []

  return (data as any[])
    .map(rowToAnnouncement)
    .filter(a => isTargetedAt(a, department, grade))
}

/** Admin-facing: returns all announcements including drafts */
export async function getAllAnnouncements(): Promise<Announcement[]> {
  if (!isDbConfigured()) return DEMO_ANNOUNCEMENTS
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as any[]).map(rowToAnnouncement)
}

export async function createAnnouncement(params: {
  title: string
  body: string
  category: AnnouncementCategory
  targetType: AnnouncementTargetType
  targetValues: string[]
  scheduledAt: string | null
  expiresAt: string | null
  createdById: string
  createdByName: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!isDbConfigured()) return { success: true, id: `ann-${Date.now()}` }
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('announcements')
    .insert({
      title:           params.title,
      body:            params.body,
      category:        params.category,
      target_type:     params.targetType,
      target_values:   params.targetValues,
      scheduled_at:    params.scheduledAt,
      expires_at:      params.expiresAt,
      is_published:    false,
      created_by:      params.createdById,
      created_by_name: params.createdByName,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, id: data.id }
}

export async function publishAnnouncement(
  announcementId: string,
  accessToken: string,
  actor?: { id: string; name: string },
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()
  const now = new Date().toISOString()

  // 1. Mark as published
  const { data: ann, error: updateErr } = await (supabase as any)
    .from('announcements')
    .update({ is_published: true, published_at: now, updated_at: now })
    .eq('id', announcementId)
    .select('*')
    .single()

  if (updateErr || !ann) return { success: false, error: updateErr?.message }

  if (actor) {
    writeAdminAudit({
      actorId:     actor.id,
      actorName:   actor.name,
      action:      'announcement_published',
      entityType:  'announcement',
      entityId:    announcementId,
      entityLabel: ann.title,
    })
  }

  // 2. Find recipient employee IDs based on targeting
  let recipientIds: string[] = []
  if (ann.target_type === 'all') {
    const { data: emps } = await (supabase as any)
      .from('employees')
      .select('id')
    recipientIds = (emps ?? []).map((e: any) => e.id)
  } else if (ann.target_type === 'department') {
    const { data: emps } = await (supabase as any)
      .from('employees')
      .select('id')
      .in('department', ann.target_values ?? [])
    recipientIds = (emps ?? []).map((e: any) => e.id)
  } else if (ann.target_type === 'grade') {
    const grades = (ann.target_values ?? []).map(Number).filter(Boolean)
    const { data: emps } = await (supabase as any)
      .from('employees')
      .select('id')
      .in('grade', grades)
    recipientIds = (emps ?? []).map((e: any) => e.id)
  }

  // 3. Fire in-app notifications
  if (recipientIds.length > 0 && accessToken) {
    try {
      await fetch('/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({
          leaveRequestId:   announcementId,
          targetUserIds:    recipientIds,
          title:            ann.title,
          message:          `${CATEGORY_CONFIG[ann.category as AnnouncementCategory]?.label ?? 'Announcement'}: ${ann.body.slice(0, 120)}${ann.body.length > 120 ? '…' : ''}`,
          notificationType: 'announcement',
        }),
      })
    } catch { /* non-fatal */ }
  }

  return { success: true }
}

export async function scheduleAnnouncement(
  announcementId: string,
  scheduledAt: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from('announcements')
    .update({ scheduled_at: scheduledAt, updated_at: new Date().toISOString() })
    .eq('id', announcementId)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function updateAnnouncement(
  announcementId: string,
  params: Partial<{
    title: string; body: string; category: AnnouncementCategory
    targetType: AnnouncementTargetType; targetValues: string[]
    scheduledAt: string | null; expiresAt: string | null
  }>,
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from('announcements')
    .update({
      ...(params.title       !== undefined && { title:         params.title }),
      ...(params.body        !== undefined && { body:          params.body }),
      ...(params.category    !== undefined && { category:      params.category }),
      ...(params.targetType  !== undefined && { target_type:   params.targetType }),
      ...(params.targetValues!== undefined && { target_values: params.targetValues }),
      ...(params.scheduledAt !== undefined && { scheduled_at:  params.scheduledAt }),
      ...(params.expiresAt   !== undefined && { expires_at:    params.expiresAt }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', announcementId)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function deleteAnnouncement(
  announcementId: string,
  actor?: { id: string; name: string; title?: string },
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from('announcements')
    .delete()
    .eq('id', announcementId)
  if (error) return { success: false, error: error.message }
  if (actor) {
    writeAdminAudit({
      actorId:     actor.id,
      actorName:   actor.name,
      action:      'announcement_deleted',
      entityType:  'announcement',
      entityId:    announcementId,
      entityLabel: actor.title ?? null,
    })
  }
  return { success: true }
}

/** Cron helper: returns scheduled announcements whose time has passed */
export async function getDueScheduledAnnouncements(): Promise<Announcement[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()
  const now = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('announcements')
    .select('*')
    .eq('is_published', false)
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', now)
  if (error || !data) return []
  return (data as any[]).map(rowToAnnouncement)
}

/** Count of active announcements for a user (for nav badge) */
export async function getAnnouncementCount(
  department: string | null,
  grade: number | null,
): Promise<number> {
  const active = await getActiveAnnouncements(department, grade)
  return active.length
}
