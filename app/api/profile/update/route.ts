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

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getApiUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const supabaseAdmin = getSupabaseAdmin()

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if ('phone'                        in body) update.phone                          = body.phone                        ?? null
    if ('personalEmail'                in body) update.personal_email                 = body.personalEmail                ?? null
    if ('address'                      in body) update.address                        = body.address                      ?? null
    if ('city'                         in body) update.city                           = body.city                         ?? null
    if ('postalCode'                   in body) update.postal_code                    = body.postalCode                   ?? null
    if ('emergencyContactName'         in body) update.emergency_contact_name         = body.emergencyContactName         ?? null
    if ('emergencyContactPhone'        in body) update.emergency_contact_phone        = body.emergencyContactPhone        ?? null
    if ('emergencyContactRelationship' in body) update.emergency_contact_relationship = body.emergencyContactRelationship ?? null
    if ('postalAddress'   in body) update.postal_address    = body.postalAddress   ?? null
    if ('gender'          in body) update.gender             = body.gender          ?? null
    if ('maritalStatus'   in body) update.marital_status     = body.maritalStatus   ?? null
    if ('language'        in body) update.language           = body.language        ?? null
    if ('numberOfDependants' in body) update.number_of_dependants = body.numberOfDependants ?? null
    if ('spouseName'      in body) update.spouse_name        = body.spouseName      ?? null

    const { error } = await supabaseAdmin
      .from('employees')
      .update(update)
      .eq('id', currentUser.id)

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error in profile update:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
