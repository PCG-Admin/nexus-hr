import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type EmployeeUpdate = Database['public']['Tables']['employees']['Update']

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Map camelCase from the client to snake_case DB columns — only contact/personal fields
    const update: EmployeeUpdate = {
      updated_at: new Date().toISOString(),
    }
    if ('phone'                        in body) update.phone                          = body.phone                        ?? null
    if ('personalEmail'                in body) update.personal_email                 = body.personalEmail                ?? null
    if ('address'                      in body) update.address                        = body.address                      ?? null
    if ('city'                         in body) update.city                           = body.city                         ?? null
    if ('postalCode'                   in body) update.postal_code                    = body.postalCode                   ?? null
    if ('emergencyContactName'         in body) update.emergency_contact_name         = body.emergencyContactName         ?? null
    if ('emergencyContactPhone'        in body) update.emergency_contact_phone        = body.emergencyContactPhone        ?? null
    if ('emergencyContactRelationship' in body) update.emergency_contact_relationship = body.emergencyContactRelationship ?? null

    const { error } = await supabase
      .from('employees')
      .update(update)
      .eq('id', user.id)

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
