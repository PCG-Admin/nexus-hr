import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase admin configuration')
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: Request) {
  try {
    // Session is stored in localStorage (not cookies), so auth is verified via Bearer token.
    const supabaseAdmin = getSupabaseAdmin()
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user: currentUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      targetUserIds,
      title: titleOverride,
      message: messageOverride,
      notificationType,
    } = body

    if (!leaveRequestId) {
      return NextResponse.json({ error: 'Missing leaveRequestId' }, { status: 400 })
    }

    // Collect recipient IDs — explicit user IDs take priority, else look up by role
    let recipientIds: string[] = []

    if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      recipientIds = targetUserIds
    } else {
      const roles = Array.isArray(targetRoles) && targetRoles.length > 0
        ? targetRoles
        : ['hr_manager', 'system_admin', 'line_manager']

      const { data: roleUsers, error: profilesError } = await supabaseAdmin
        .from('employees' as any)
        .select('id')
        .in('role', roles)

      if (profilesError || !roleUsers || roleUsers.length === 0) {
        return NextResponse.json({ success: true, notified: 0 })
      }
      recipientIds = (roleUsers as any[]).map((r: any) => r.id as string)
    }

    if (recipientIds.length === 0) {
      return NextResponse.json({ success: true, notified: 0 })
    }

    const notifTitle = titleOverride || 'New Leave Request'
    const notifMessage = messageOverride ||
      `${employeeName} submitted a ${leaveTypeName} request for ${daysRequested} day(s) (${startDate} – ${endDate}).`

    const notifications = recipientIds.map(id => ({
      user_id: id,
      title: notifTitle,
      message: notifMessage,
      type: notificationType || 'leave_request',
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

    return NextResponse.json({ success: true, notified: recipientIds.length })
  } catch (err) {
    console.error('Unexpected error creating notifications:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
