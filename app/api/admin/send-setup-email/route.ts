import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/supabase/api-auth'
import type { NextRequest } from 'next/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase configuration')
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
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

    if (!profile || !['hr_manager', 'system_admin'].includes((profile as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, firstName } = body

    if (!email || !firstName) return NextResponse.json({ error: 'email and firstName are required' }, { status: 400 })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${siteUrl}/auth/callback` },
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Error generating setup link:', linkError)
      return NextResponse.json({ error: linkError?.message ?? 'Failed to generate setup link' }, { status: 500 })
    }

    const setupLink = `${siteUrl}/auth/setup?h=${encodeURIComponent(linkData.properties.hashed_token)}`

    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL
    if (makeWebhookUrl) {
      try {
        await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, firstName, setupLink }),
        })
      } catch (webhookErr) {
        console.error('Make webhook error:', webhookErr)
      }
    }

    return NextResponse.json({ success: true, makeConfigured: !!makeWebhookUrl })
  } catch (err) {
    console.error('Unexpected error in send-setup-email:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
