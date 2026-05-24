import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase config')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST() {
  try {
    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    // Find scheduled announcements whose time has passed
    const { data: due, error } = await supabase
      .from('announcements' as any)
      .select('*')
      .eq('is_published', false)
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!due || due.length === 0) return NextResponse.json({ published: 0 })

    let published = 0
    for (const ann of due as any[]) {
      // Publish
      const { error: upErr } = await supabase
        .from('announcements' as any)
        .update({ is_published: true, published_at: now, updated_at: now })
        .eq('id', ann.id)

      if (upErr) continue

      // Determine recipients
      let recipientIds: string[] = []
      if (ann.target_type === 'all') {
        const { data: emps } = await supabase.from('employees' as any).select('id')
        recipientIds = (emps ?? []).map((e: any) => e.id)
      } else if (ann.target_type === 'department') {
        const { data: emps } = await supabase.from('employees' as any).select('id').in('department', ann.target_values ?? [])
        recipientIds = (emps ?? []).map((e: any) => e.id)
      } else if (ann.target_type === 'grade') {
        const grades = (ann.target_values ?? []).map(Number).filter(Boolean)
        const { data: emps } = await supabase.from('employees' as any).select('id').in('grade', grades)
        recipientIds = (emps ?? []).map((e: any) => e.id)
      }

      // Insert notifications
      if (recipientIds.length > 0) {
        const notifications = recipientIds.map(uid => ({
          user_id:      uid,
          title:        ann.title,
          message:      ann.body.slice(0, 200),
          type:         'announcement',
          reference_id: ann.id,
          read:         false,
        }))
        await supabase.from('notifications' as any).insert(notifications)
      }

      published++
    }

    return NextResponse.json({ published })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
