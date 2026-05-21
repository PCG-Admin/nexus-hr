import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase configuration')
  return createServerClient(url, serviceRoleKey)
}

export async function POST(request: Request) {
  try {
    // Verify the caller is an authenticated admin or manager
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('employees' as any)
      .select('role')
      .eq('id', user.id)
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

    const supabaseAdmin = getSupabaseAdmin()

    // Update the leave request
    const { error: updateError } = await supabaseAdmin
      .from('leave_requests')
      .update({
        end_date: endDate,
        days_requested: daysRequested,
        reviewer_notes: adminNote.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('status', 'approved') // safety: only edit approved requests

    if (updateError) {
      console.error('Error updating leave request:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Recalculate all leave balances so the change reflects immediately
    const { error: balanceError } = await supabaseAdmin.rpc('update_all_leave_balances')
    if (balanceError) {
      console.error('Balance recalculation error (non-fatal):', balanceError)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error in admin-edit:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
