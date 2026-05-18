import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Create admin client lazily to avoid build-time errors
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration for admin client')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: Request) {
  try {
    // Verify the request is from an authenticated admin
    const supabase = await createServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'ceo')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { email, password, firstName, lastName, role, department, employeeNumber } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Update profile (trigger auto-creates it, so we update with full details)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        department: department || null,
        employee_number: employeeNumber || null,
        hire_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      // Try to delete the auth user if profile update failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Create leave balances for the new user
    const { data: leaveTypes } = await supabaseAdmin
      .from('leave_types')
      .select('id, name, default_days_per_year, accrual_type')

    if (leaveTypes && leaveTypes.length > 0) {
      const currentYear = new Date().getFullYear()
      const now = new Date()

      const isEmployee = role === 'employee'

      const balances = leaveTypes.map((lt) => {
        // Employees accrue monthly — start at 0, cron adds 1.25 from next month.
        // Admins/managers get the full fixed allocation immediately (no accrual).
        const useAccrual = isEmployee && lt.accrual_type === 'monthly'
        return {
          user_id: authData.user.id,
          leave_type_id: lt.id,
          total_days: useAccrual ? 0 : lt.default_days_per_year,
          used_days: 0,
          year: currentYear,
          last_accrued_at: useAccrual ? now.toISOString() : null,
        }
      })

      await supabaseAdmin.from('leave_balances').insert(balances)
    }

    // Auto-send password setup email via Make (fire-and-forget)
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    if (makeWebhookUrl) {
      try {
        const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: `${siteUrl}/auth/callback` },
        })
        if (linkData?.properties?.hashed_token) {
          const setupLink = `${siteUrl}/auth/setup?h=${encodeURIComponent(linkData.properties.hashed_token)}`
          await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, firstName, setupLink }),
          })
        }
      } catch (emailErr) {
        // Non-fatal — user was created, email just didn't send
        console.error('Setup email error (non-fatal):', emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email,
        firstName,
        lastName,
        role,
      },
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
