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

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getApiUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseAdmin = getSupabaseAdmin()

    const { data: profile } = await supabaseAdmin
      .from('employees' as any)
      .select('role, first_name, last_name')
      .eq('id', currentUser.id)
      .single()

    if (!profile || !['hr_manager', 'system_admin'].includes((profile as any).role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      email, password, firstName, lastName, role,
      department, employeeNumber, jobTitle, grade, employmentType, hireDate, managerId,
      phone, personalEmail, address, city, postalCode,
      emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
      idNumber, dateOfBirth,
      postalAddress, passportNumber, gender, maritalStatus, language,
      numberOfDependants, spouseName, taxNumber, taxOffice,
      bankName, bankBranchCode, bankAccountNumber, bankAccountType,
      bankAccountHolderName, bankAccountRelationship,
      eeaGroup, eeaHasDisability, eeaDisabilityDescription,
    } = body

    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { error: profileError } = await supabaseAdmin
      .from('employees' as any)
      .insert({
        id: authData.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        department: department || null,
        employee_number: employeeNumber || null,
        job_title: jobTitle || null,
        grade: grade || null,
        employment_type: employmentType || null,
        hire_date: hireDate || new Date().toISOString().split('T')[0],
        manager_id: managerId || null,
        phone: phone || null,
        personal_email: personalEmail || null,
        address: address || null,
        city: city || null,
        postal_code: postalCode || null,
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
        emergency_contact_relationship: emergencyContactRelationship || null,
        id_number: idNumber || null,
        date_of_birth: dateOfBirth || null,
        postal_address: postalAddress || null,
        passport_number: passportNumber || null,
        gender: gender || null,
        marital_status: maritalStatus || null,
        language: language || null,
        number_of_dependants: numberOfDependants ?? null,
        spouse_name: spouseName || null,
        tax_number: taxNumber || null,
        tax_office: taxOffice || null,
        bank_name: bankName || null,
        bank_branch_code: bankBranchCode || null,
        bank_account_number: bankAccountNumber || null,
        bank_account_type: bankAccountType || null,
        bank_account_holder_name: bankAccountHolderName || null,
        bank_account_relationship: bankAccountRelationship || null,
        eea_group: eeaGroup || null,
        eea_has_disability: eeaHasDisability ?? false,
        eea_disability_description: eeaDisabilityDescription || null,
        is_active: true,
      })

    if (profileError) {
      console.error('Error creating employee record:', profileError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    const { data: leaveTypes } = await supabaseAdmin.from('leave_types').select('id, default_days')

    if (leaveTypes && leaveTypes.length > 0) {
      const currentYear = new Date().getFullYear()

      // Fetch grade-based entitlements if the employee has a grade assigned
      let gradeEntitlements: { leave_type_id: string; days: number }[] = []
      if (grade) {
        const { data: ent } = await supabaseAdmin
          .from('grade_leave_entitlements' as any)
          .select('leave_type_id, days')
          .eq('grade', grade)
        gradeEntitlements = (ent as any[]) ?? []
      }

      const balances = (leaveTypes as { id: string; default_days: number }[]).map((lt) => {
        const override = gradeEntitlements.find(e => e.leave_type_id === lt.id)
        return {
          user_id:       authData.user.id,
          leave_type_id: lt.id,
          total_days:    override ? override.days : lt.default_days,
          used_days:     0,
          year:          currentYear,
        }
      })
      await supabaseAdmin.from('leave_balances').insert(balances)
    }

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
        console.error('Setup email error (non-fatal):', emailErr)
      }
    }

    try {
      await supabaseAdmin.from('admin_audit' as any).insert({
        actor_id:     currentUser.id,
        actor_name:   (profile as any).first_name
          ? `${(profile as any).first_name} ${(profile as any).last_name ?? ''}`.trim()
          : currentUser.email ?? 'Admin',
        action:       'employee_created',
        entity_type:  'employee',
        entity_id:    authData.user.id,
        entity_label: `${firstName} ${lastName}`,
        changes:      [],
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: true, user: { id: authData.user.id, email, firstName, lastName, role } })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
