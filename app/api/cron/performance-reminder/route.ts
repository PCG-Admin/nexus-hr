import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase configuration for admin client')
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const currentMonth = new Date().toLocaleString('en-ZA', { month: 'long', year: 'numeric' })

    // Fetch all active line managers
    const { data: managers, error } = await supabaseAdmin
      .from('employees' as any)
      .select('id, first_name, last_name')
      .eq('role', 'line_manager')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching line managers:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!managers || managers.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No active line managers found' })
    }

    // Insert one notification per manager
    const notifications = (managers as any[]).map(m => ({
      user_id:      m.id,
      title:        'Monthly Performance Check-ins Due',
      message:      `Reminder: please complete your monthly performance check-ins for your team for ${currentMonth}. Log in to Performance Management to submit.`,
      type:         'performance_reminder',
      reference_id: null,
      read:         false,
    }))

    const { error: insertError } = await supabaseAdmin
      .from('notifications' as any)
      .insert(notifications)

    if (insertError) {
      console.error('Error inserting performance reminder notifications:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success:   true,
      sent:      notifications.length,
      month:     currentMonth,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Unexpected error in performance reminder cron:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Allow manual trigger from admin UI
export async function POST(request: Request) {
  return GET(request)
}
