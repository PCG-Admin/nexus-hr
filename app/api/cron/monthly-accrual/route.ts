import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

    const { data, error } = await supabaseAdmin.rpc('run_monthly_accrual')

    if (error) {
      console.error('Error running monthly accrual:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result = data?.[0]

    return NextResponse.json({
      success: true,
      processed: result?.processed ?? 0,
      skipped: result?.skipped ?? 0,
      message: result?.message ?? 'Accrual complete',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Allow manual trigger from admin UI
export async function POST(request: Request) {
  return GET(request)
}
