import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/supabase/api-auth'
import type { NextRequest } from 'next/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase configuration for admin client')
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function DELETE(request: NextRequest) {
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
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    if (userId === currentUser.id) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })

    await supabaseAdmin.from('leave_balances').delete().eq('user_id', userId)
    await supabaseAdmin.from('leave_requests').delete().eq('user_id', userId)
    await supabaseAdmin.from('employees' as any).delete().eq('id', userId)

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('Error deleting auth user:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
