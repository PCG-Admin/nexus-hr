import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration for admin client')
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: Request) {
  try {
    // Verify caller is authenticated
    const supabase = await createServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only employees (submitting their own leave) and admins/managers should reach this.
    // Verify the caller is actually authenticated — role check happens implicitly via
    // the leave submission flow, but we block unauthenticated callers above.
    // Extra safety: confirm the caller exists in profiles.
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!callerProfile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      leaveRequestId,
      employeeName,
      leaveTypeName,
      startDate,
      endDate,
      daysRequested,
      targetRoles,
      title: titleOverride,
      message: messageOverride,
    } = body

    if (!leaveRequestId || !employeeName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const roles = Array.isArray(targetRoles) && targetRoles.length > 0
      ? targetRoles
      : ['admin', 'manager']

    const { data: reviewers, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .in('role', roles)

    if (profilesError || !reviewers || reviewers.length === 0) {
      return NextResponse.json({ success: true, notified: 0 })
    }

    const notifTitle = titleOverride || 'New Leave Request'
    const notifMessage = messageOverride ||
      `${employeeName} submitted a ${leaveTypeName} request for ${daysRequested} day(s) (${startDate} – ${endDate}).`

    const notifications = reviewers.map(reviewer => ({
      user_id: reviewer.id,
      title: notifTitle,
      message: notifMessage,
      type: 'leave_request',
      reference_id: leaveRequestId,
      read: false,
    }))

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)

    if (insertError) {
      console.error('Error inserting notifications:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, notified: reviewers.length })
  } catch (err) {
    console.error('Unexpected error creating notifications:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
