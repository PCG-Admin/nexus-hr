import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/supabase/api-auth'
import type { NextRequest } from 'next/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase configuration')
  return createClient(url, serviceRoleKey)
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getApiUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseAdmin = getSupabaseAdmin()

    const { data: profile } = await supabaseAdmin
      .from('employees' as any)
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!profile || !['hr_manager', 'system_admin', 'line_manager'].includes((profile as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { requestId, endDate, daysRequested, adminNote } = body

    if (!requestId || !endDate || !daysRequested || !adminNote?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (daysRequested < 1) {
      return NextResponse.json({ error: 'Days requested must be at least 1' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('leave_requests')
      .update({
        end_date: endDate,
        days_requested: daysRequested,
        reviewer_notes: adminNote.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('status', 'approved')

    if (updateError) {
      console.error('Error updating leave request:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { error: balanceError } = await supabaseAdmin.rpc('update_all_leave_balances')
    if (balanceError) console.error('Balance recalculation error (non-fatal):', balanceError)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error in admin-edit:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
