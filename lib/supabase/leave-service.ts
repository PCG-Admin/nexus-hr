import { createClient } from './client'
import type { Database } from './types'
import type { UserRole } from '@/lib/auth'
import { writeAdminAudit } from './admin-audit-service'

const isDbConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'

// Fire-and-forget notification via API route — passes the session token so the
// API can verify the caller even though the session lives in localStorage not cookies.
async function postNotification(payload: Record<string, unknown>): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    await fetch('/api/notifications/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('postNotification failed:', err)
  }
}

// Append a permanent ledger entry — fire-and-forget, never throws
async function writeLedger(entry: {
  leaveRequestId: string
  actorId: string
  actorName: string
  action: string
  fromStatus: string | null
  toStatus: string
  notes?: string | null
  daysRequested?: number | null
  startDate?: string | null
  endDate?: string | null
}) {
  const supabase = createClient()
  await supabase.from('leave_ledger').insert({
    leave_request_id: entry.leaveRequestId,
    actor_id:         entry.actorId,
    actor_name:       entry.actorName,
    action:           entry.action,
    from_status:      entry.fromStatus,
    to_status:        entry.toStatus,
    notes:            entry.notes ?? null,
    days_requested:   entry.daysRequested ?? null,
    start_date:       entry.startDate ?? null,
    end_date:         entry.endDate ?? null,
  })
}

type LeaveTypeRow = Database['public']['Tables']['leave_types']['Row']
type LeaveBalanceRow = Database['public']['Tables']['leave_balances']['Row']
type LeaveRequestRow = Database['public']['Tables']['leave_requests']['Row']
type LeaveRequestInsert = Database['public']['Tables']['leave_requests']['Insert']

// Transformed types for the UI

export type LeaveBalance = {
  id: string
  userId: string
  leaveTypeId: string
  leaveTypeName: string
  totalDays: number
  usedDays: number
  availableDays: number
  year: number
  color: string | null
}

export type LeaveType = {
  id: string
  name: string
  defaultDays: number
  color: string | null
  isActive: boolean
  requiresManagerApproval: boolean
  requiresDocument: boolean
}

export async function getLeaveTypes(): Promise<LeaveType[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from('leave_types')
    .select('id, name, default_days, color, is_active, requires_manager_approval, requires_document')
    .order('name')
  if (error || !data) return []
  return (data as any[]).map(r => ({
    id:                      r.id as string,
    name:                    r.name as string,
    defaultDays:             r.default_days as number,
    color:                   r.color as string | null,
    isActive:                r.is_active as boolean,
    requiresManagerApproval: (r.requires_manager_approval ?? true) as boolean,
    requiresDocument:        (r.requires_document ?? false) as boolean,
  }))
}

export async function updateLeaveType(
  id: string,
  config: { requiresManagerApproval?: boolean; requiresDocument?: boolean; defaultDays?: number }
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()
  const update: Record<string, unknown> = {}
  if (config.requiresManagerApproval !== undefined) update.requires_manager_approval = config.requiresManagerApproval
  if (config.requiresDocument !== undefined)        update.requires_document         = config.requiresDocument
  if (config.defaultDays !== undefined)             update.default_days              = config.defaultDays
  const { error } = await supabase.from('leave_types').update(update).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export type LeaveRequest = {
  id: string
  userId: string
  leaveTypeId: string
  leaveTypeName: string
  startDate: string
  endDate: string
  daysRequested: number
  reason: string | null
  status: 'pending' | 'pending_ceo' | 'approved' | 'rejected' | 'cancelled'
  reviewerId: string | null
  reviewerNotes: string | null
  reviewedAt: string | null
  managerReviewerId: string | null
  managerReviewedAt: string | null
  documentUrl: string | null
  createdAt: string
  updatedAt: string
  isOverride?: boolean
}


// Fetch leave balances for a user
export async function getLeaveBalances(userId: string, year?: number): Promise<LeaveBalance[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()
  const currentYear = year || new Date().getFullYear()

  const [balancesResult, requestsResult] = await Promise.all([
    supabase
      .from('leave_balances')
      .select(`*, leave_types(name, color)`)
      .eq('user_id', userId)
      .eq('year', currentYear),
    supabase
      .from('leave_requests')
      .select('leave_type_id, days_requested')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('start_date', `${currentYear}-01-01`)
      .lte('start_date', `${currentYear}-12-31`),
  ])

  if (balancesResult.error) return []

  // Sum approved days per leave type directly from requests (always accurate)
  const usedByType: Record<string, number> = {}
  if (requestsResult.data) {
    for (const req of requestsResult.data) {
      usedByType[req.leave_type_id] = (usedByType[req.leave_type_id] || 0) + req.days_requested
    }
  }

  return (balancesResult.data as unknown as (LeaveBalanceRow & { leave_types: { name: string; color: string | null } })[]).map(row => {
    const usedDays = usedByType[row.leave_type_id] || 0
    return {
      id: row.id,
      userId: row.user_id,
      leaveTypeId: row.leave_type_id,
      leaveTypeName: row.leave_types?.name || 'Unknown',
      totalDays: row.total_days,
      usedDays,
      availableDays: row.total_days - usedDays,
      year: row.year,
      color: row.leave_types?.color || null,
    }
  })
}

// Fetch leave requests for a user
export async function getLeaveRequests(userId: string): Promise<LeaveRequest[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()

  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      *,
      leave_types (
        name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return []

  return (data as unknown as (LeaveRequestRow & { leave_types: { name: string } })[]).map(row => ({
    id: row.id,
    userId: row.user_id,
    leaveTypeId: row.leave_type_id,
    leaveTypeName: row.leave_types?.name || 'Unknown',
    startDate: row.start_date,
    endDate: row.end_date,
    daysRequested: row.days_requested,
    reason: row.reason,
    status: row.status,
    isOverride: row.is_override ?? false,
    reviewerId: row.reviewer_id,
    reviewerNotes: row.reviewer_notes,
    reviewedAt: row.reviewed_at,
    managerReviewerId: row.manager_reviewer_id,
    managerReviewedAt: row.manager_reviewed_at,
    documentUrl: row.document_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

// Submit a new leave request
export async function submitLeaveRequest(request: {
  userId: string
  userRole?: UserRole
  leaveTypeId: string
  startDate: string
  endDate: string
  daysRequested: number
  reason?: string
  documentUrl?: string
  employeeName?: string
  isOverride?: boolean
}): Promise<{ success: boolean; error?: string; data?: LeaveRequest }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()

  // Determine initial status:
  // 1. Elevated roles always bypass manager stage
  // 2. Leave types with requires_manager_approval = false go direct to HR queue
  // 3. Otherwise standard two-stage: pending → manager → pending_ceo → HR
  const isElevatedRole = request.userRole === 'line_manager' || request.userRole === 'hr_manager' || request.userRole === 'system_admin'
  let initialStatus: 'pending' | 'pending_ceo' = isElevatedRole ? 'pending_ceo' : 'pending'
  if (!isElevatedRole && initialStatus === 'pending') {
    const { data: ltRow } = await supabase
      .from('leave_types')
      .select('requires_manager_approval')
      .eq('id', request.leaveTypeId)
      .single()
    if (ltRow && ltRow.requires_manager_approval === false) {
      initialStatus = 'pending_ceo'
    }
  }

  const insertData: LeaveRequestInsert = {
    user_id: request.userId,
    leave_type_id: request.leaveTypeId,
    start_date: request.startDate,
    end_date: request.endDate,
    days_requested: request.daysRequested,
    reason: request.reason || null,
    document_url: request.documentUrl || null,
    status: initialStatus,
    is_override: request.isOverride ?? false,
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .insert(insertData)
    .select(`
      *,
      leave_types (
        name
      )
    `)
    .single()

  if (error) {
    console.error('Error submitting leave request:', error)
    return { success: false, error: error.message }
  }

  const row = data as unknown as LeaveRequestRow & { leave_types: { name: string } }

  // Ledger — initial submission
  writeLedger({
    leaveRequestId: row.id,
    actorId:        request.userId,
    actorName:      request.employeeName || 'Employee',
    action:         'submitted',
    fromStatus:     null,
    toStatus:       row.status,
    daysRequested:  row.days_requested,
    startDate:      row.start_date,
    endDate:        row.end_date,
  })

  writeAdminAudit({
    actorId:     request.userId,
    actorName:   request.employeeName || 'Employee',
    action:      'leave_submitted',
    entityType:  'leave_request',
    entityId:    row.id,
    entityLabel: `${request.employeeName || 'Employee'} — ${row.leave_types?.name || 'Leave'} (${row.start_date} to ${row.end_date})`,
  })

  // Notify the right audience based on initial status
  postNotification({
    leaveRequestId: row.id,
    employeeName: request.employeeName || 'An employee',
    leaveTypeName: row.leave_types?.name || 'Leave',
    startDate: row.start_date,
    endDate: row.end_date,
    daysRequested: row.days_requested,
    targetRoles: isElevatedRole ? ['hr_manager', 'system_admin'] : ['hr_manager', 'system_admin', 'line_manager'],
    title: request.isOverride
      ? 'Leave Request — Balance Override Required'
      : isElevatedRole ? 'Leave Request Awaiting Your Approval' : 'New Leave Request',
  })

  return {
    success: true,
    data: {
      id: row.id,
      userId: row.user_id,
      leaveTypeId: row.leave_type_id,
      leaveTypeName: row.leave_types?.name || 'Unknown',
      startDate: row.start_date,
      endDate: row.end_date,
      daysRequested: row.days_requested,
      reason: row.reason,
      status: row.status,
      isOverride: row.is_override ?? false,
      reviewerId: row.reviewer_id,
      reviewerNotes: row.reviewer_notes,
      reviewedAt: row.reviewed_at,
      managerReviewerId: row.manager_reviewer_id,
      managerReviewedAt: row.manager_reviewed_at,
      documentUrl: row.document_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  }
}

// Upload document to Supabase Storage
export async function uploadDocument(file: File, userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = createClient()

  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('leave-documents')
    .upload(fileName, file)

  if (error) {
    console.error('Error uploading document:', error)
    return { success: false, error: error.message }
  }

  const { data: urlData } = supabase.storage
    .from('leave-documents')
    .getPublicUrl(data.path)

  return { success: true, url: urlData.publicUrl }
}

// Type for employee info (mirrors User fields from lib/auth)
export type Employee = {
  id: string
  email: string
  firstName: string
  lastName: string
  employeeNumber: string | null
  department: string | null
  role: UserRole
  grade: number | null
  hireDate: string | null
  jobTitle: string | null
  employmentType: 'permanent' | 'fixed_term' | 'probation' | null
  phone: string | null
  personalEmail: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  postalAddress: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelationship: string | null
  managerId: string | null
  idNumber: string | null
  dateOfBirth: string | null
  gender: string | null
  maritalStatus: string | null
  language: string | null
  numberOfDependants: number | null
  spouseName: string | null
  passportNumber: string | null
  taxNumber: string | null
  taxOffice: string | null
  bankName: string | null
  bankBranchCode: string | null
  bankAccountNumber: string | null
  bankAccountType: string | null
  bankAccountHolderName: string | null
  bankAccountRelationship: string | null
  eeaGroup: string | null
  eeaHasDisability: boolean
  eeaDisabilityDescription: string | null
  isActive: boolean
}

// Extended leave request with employee info for approvals
export type LeaveRequestWithEmployee = LeaveRequest & {
  employee: Employee
}

// Fetch all leave requests for managers/admins to review
export async function getAllLeaveRequests(): Promise<LeaveRequestWithEmployee[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()

  // Two-step: fetch requests + leave types, then fetch employees separately
  // Avoids FK join hint issues (PostgREST FK name can differ from migration)
  const [requestsResult, employeesResult] = await Promise.all([
    supabase
      .from('leave_requests')
      .select('*, leave_types(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('employees')
      .select('id, email, first_name, last_name, employee_number, department, role, grade, job_title, employment_type, hire_date, manager_id, phone, personal_email, address, city, postal_code, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, id_number, date_of_birth, is_active'),
  ])

  if (requestsResult.error || !requestsResult.data) return []

  type EmpRow = {
    id: string; email: string; first_name: string; last_name: string
    employee_number: string | null; department: string | null; role: UserRole
    grade: number | null; job_title: string | null
    employment_type: 'permanent' | 'fixed_term' | 'probation' | null
    hire_date: string | null; manager_id: string | null; phone: string | null
    personal_email: string | null; address: string | null; city: string | null
    postal_code: string | null; emergency_contact_name: string | null
    emergency_contact_phone: string | null; emergency_contact_relationship: string | null
    id_number: string | null; date_of_birth: string | null; is_active: boolean
  }

  const empMap = new Map<string, EmpRow>(
    ((employeesResult.data ?? []) as unknown as EmpRow[]).map(e => [e.id, e])
  )

  type ReqRow = LeaveRequestRow & { leave_types: { name: string } | null }

  return (requestsResult.data as unknown as ReqRow[])
    .map(row => {
      const emp = empMap.get(row.user_id)
      if (!emp) return null
      return {
        id: row.id,
        userId: row.user_id,
        leaveTypeId: row.leave_type_id,
        leaveTypeName: row.leave_types?.name || 'Unknown',
        startDate: row.start_date,
        endDate: row.end_date,
        daysRequested: row.days_requested,
        reason: row.reason,
        status: row.status,
        isOverride: row.is_override ?? false,
        reviewerId: row.reviewer_id,
        reviewerNotes: row.reviewer_notes,
        reviewedAt: row.reviewed_at,
        managerReviewerId: row.manager_reviewer_id,
        managerReviewedAt: row.manager_reviewed_at,
        documentUrl: row.document_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        employee: {
          id: emp.id,
          email: emp.email,
          firstName: emp.first_name,
          lastName: emp.last_name,
          employeeNumber: emp.employee_number,
          department: emp.department,
          role: emp.role,
          grade: emp.grade,
          jobTitle: emp.job_title,
          employmentType: emp.employment_type,
          hireDate: emp.hire_date,
          managerId: emp.manager_id,
          phone: emp.phone,
          personalEmail: emp.personal_email,
          address: emp.address,
          city: emp.city,
          postalCode: emp.postal_code,
          emergencyContactName: emp.emergency_contact_name,
          emergencyContactPhone: emp.emergency_contact_phone,
          emergencyContactRelationship: emp.emergency_contact_relationship,
          idNumber: emp.id_number,
          dateOfBirth: emp.date_of_birth,
          isActive: emp.is_active,
        },
      }
    })
    .filter((r): r is LeaveRequestWithEmployee => r !== null)
}

// Manager stage-1 approval — moves request to pending_ceo and notifies HR/admin
export async function managerApproveLeaveRequest(
  requestId: string,
  managerId: string,
  notes?: string,
  names?: { employeeName: string; managerName: string; leaveTypeName: string; startDate: string; endDate: string; daysRequested: number }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('leave_requests')
    .update({
      status: 'pending_ceo',
      manager_reviewer_id: managerId,
      manager_reviewed_at: new Date().toISOString(),
      reviewer_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (error) {
    console.error('Error in manager approval:', error)
    return { success: false, error: error.message }
  }

  writeLedger({
    leaveRequestId: requestId,
    actorId:        managerId,
    actorName:      names?.managerName || 'Manager',
    action:         'manager_approved',
    fromStatus:     'pending',
    toStatus:       'pending_ceo',
    notes:          notes ?? null,
  })

  if (names) {
    postNotification({
      leaveRequestId: requestId,
      employeeName: names.employeeName,
      leaveTypeName: names.leaveTypeName,
      startDate: names.startDate,
      endDate: names.endDate,
      daysRequested: names.daysRequested,
      targetRoles: ['hr_manager', 'system_admin'],
      title: 'Leave Request Awaiting Your Approval',
      message: `${names.managerName} approved ${names.employeeName}'s ${names.leaveTypeName} request (${names.daysRequested} day(s)). Awaiting final approval.`,
    })
  }

  return { success: true }
}

// Final approval — moves request to approved
export async function approveLeaveRequest(
  requestId: string,
  reviewerId: string,
  notes?: string,
  reviewerName?: string,
  context?: { employeeName: string; leaveTypeName: string; startDate: string; endDate: string; daysRequested: number; employeeId: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { data: row, error } = await supabase
    .from('leave_requests')
    .update({
      status: 'approved',
      reviewer_id: reviewerId,
      reviewer_notes: notes || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select('user_id')
    .single()

  if (error) {
    console.error('Error approving leave request:', error)
    return { success: false, error: error.message }
  }

  writeLedger({
    leaveRequestId: requestId,
    actorId:        reviewerId,
    actorName:      reviewerName || 'HR / Admin',
    action:         'approved',
    fromStatus:     'pending_ceo',
    toStatus:       'approved',
    notes:          notes ?? null,
  })

  writeAdminAudit({
    actorId:     reviewerId,
    actorName:   reviewerName || 'HR / Admin',
    action:      'leave_approved',
    entityType:  'leave_request',
    entityId:    requestId,
    entityLabel: context?.employeeName
      ? `${context.employeeName} — ${context.leaveTypeName} (${context.startDate} to ${context.endDate})`
      : requestId,
  })

  // Notify the employee whose request was approved
  const employeeId = context?.employeeId ?? (row as any)?.user_id
  if (employeeId) {
    postNotification({
      leaveRequestId: requestId,
      targetUserIds: [employeeId],
      title: 'Leave Request Approved',
      message: context
        ? `Your ${context.leaveTypeName} request (${context.daysRequested} day(s), ${context.startDate} – ${context.endDate}) has been approved by ${reviewerName || 'HR'}.`
        : `Your leave request has been approved by ${reviewerName || 'HR'}.`,
      notificationType: 'leave_approved',
    })
  }

  return { success: true }
}

// Reject a leave request
export async function rejectLeaveRequest(
  requestId: string,
  reviewerId: string,
  notes?: string,
  reviewerName?: string,
  context?: { employeeName: string; leaveTypeName: string; startDate: string; endDate: string; daysRequested: number; employeeId: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { data: current } = await supabase
    .from('leave_requests')
    .select('status, user_id')
    .eq('id', requestId)
    .single()

  const { error } = await supabase
    .from('leave_requests')
    .update({
      status: 'rejected',
      reviewer_id: reviewerId,
      reviewer_notes: notes || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (error) {
    console.error('Error rejecting leave request:', error)
    return { success: false, error: error.message }
  }

  writeLedger({
    leaveRequestId: requestId,
    actorId:        reviewerId,
    actorName:      reviewerName || 'HR / Admin',
    action:         'rejected',
    fromStatus:     current?.status ?? null,
    toStatus:       'rejected',
    notes:          notes ?? null,
  })

  writeAdminAudit({
    actorId:     reviewerId,
    actorName:   reviewerName || 'HR / Admin',
    action:      'leave_rejected',
    entityType:  'leave_request',
    entityId:    requestId,
    entityLabel: context?.employeeName
      ? `${context.employeeName} — ${context.leaveTypeName} (${context.startDate} to ${context.endDate})`
      : requestId,
  })

  // Notify the employee whose request was rejected
  const employeeId = context?.employeeId ?? (current as any)?.user_id
  if (employeeId) {
    postNotification({
      leaveRequestId: requestId,
      targetUserIds: [employeeId],
      title: 'Leave Request Declined',
      message: context
        ? `Your ${context.leaveTypeName} request (${context.daysRequested} day(s), ${context.startDate} – ${context.endDate}) has been declined by ${reviewerName || 'HR'}${notes ? `: "${notes}"` : '.'}`
        : `Your leave request has been declined by ${reviewerName || 'HR'}${notes ? `: "${notes}"` : '.'}`,
      notificationType: 'leave_rejected',
    })
  }

  return { success: true }
}

// ============ Admin Functions ============

// Fetch all employees
export async function getAllEmployees(): Promise<Employee[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('last_name')

  if (error) return []

  return (data as unknown as Record<string, unknown>[]).map(row => ({
    id: row.id as string,
    email: row.email as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    employeeNumber: (row.employee_number as string | null) ?? null,
    department: (row.department as string | null) ?? null,
    role: row.role as UserRole,
    grade: (row.grade as number | null) ?? null,
    hireDate: (row.hire_date as string | null) ?? null,
    jobTitle: (row.job_title as string | null) ?? null,
    employmentType: (row.employment_type as Employee['employmentType']) ?? null,
    phone: (row.phone as string | null) ?? null,
    personalEmail: (row.personal_email as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    postalCode: (row.postal_code as string | null) ?? null,
    postalAddress: (row.postal_address as string | null) ?? null,
    emergencyContactName: (row.emergency_contact_name as string | null) ?? null,
    emergencyContactPhone: (row.emergency_contact_phone as string | null) ?? null,
    emergencyContactRelationship: (row.emergency_contact_relationship as string | null) ?? null,
    managerId: (row.manager_id as string | null) ?? null,
    idNumber: (row.id_number as string | null) ?? null,
    dateOfBirth: (row.date_of_birth as string | null) ?? null,
    gender: (row.gender as string | null) ?? null,
    maritalStatus: (row.marital_status as string | null) ?? null,
    language: (row.language as string | null) ?? null,
    numberOfDependants: (row.number_of_dependants as number | null) ?? null,
    spouseName: (row.spouse_name as string | null) ?? null,
    passportNumber: (row.passport_number as string | null) ?? null,
    taxNumber: (row.tax_number as string | null) ?? null,
    taxOffice: (row.tax_office as string | null) ?? null,
    bankName: (row.bank_name as string | null) ?? null,
    bankBranchCode: (row.bank_branch_code as string | null) ?? null,
    bankAccountNumber: (row.bank_account_number as string | null) ?? null,
    bankAccountType: (row.bank_account_type as string | null) ?? null,
    bankAccountHolderName: (row.bank_account_holder_name as string | null) ?? null,
    bankAccountRelationship: (row.bank_account_relationship as string | null) ?? null,
    eeaGroup: (row.eea_group as string | null) ?? null,
    eeaHasDisability: (row.eea_has_disability as boolean) ?? false,
    eeaDisabilityDescription: (row.eea_disability_description as string | null) ?? null,
    isActive: (row.is_active as boolean) ?? true,
  }))
}

// Leave ledger types
export type LeaveLedgerEntry = {
  id: string
  leaveRequestId: string
  actorId: string
  actorName: string
  action: string
  fromStatus: string | null
  toStatus: string
  notes: string | null
  daysRequested: number | null
  startDate: string | null
  endDate: string | null
  createdAt: string
}

export async function getLeaveLedger(leaveRequestId: string): Promise<LeaveLedgerEntry[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()

  const { data, error } = await supabase
    .from('leave_ledger')
    .select('*')
    .eq('leave_request_id', leaveRequestId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return (data as Record<string, unknown>[]).map(row => ({
    id:              row.id as string,
    leaveRequestId:  row.leave_request_id as string,
    actorId:         row.actor_id as string,
    actorName:       row.actor_name as string,
    action:          row.action as string,
    fromStatus:      (row.from_status as string | null) ?? null,
    toStatus:        row.to_status as string,
    notes:           (row.notes as string | null) ?? null,
    daysRequested:   (row.days_requested as number | null) ?? null,
    startDate:       (row.start_date as string | null) ?? null,
    endDate:         (row.end_date as string | null) ?? null,
    createdAt:       row.created_at as string,
  }))
}

// Extended leave balance with employee info for admin
export type LeaveBalanceWithEmployee = LeaveBalance & {
  employee: Employee
}

// Fetch all leave balances for admin
export async function getAllLeaveBalances(year?: number): Promise<LeaveBalanceWithEmployee[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()
  const currentYear = year || new Date().getFullYear()

  const [balancesResult, employeesResult] = await Promise.all([
    supabase
      .from('leave_balances')
      .select('*, leave_types(name, color)')
      .eq('year', currentYear)
      .order('created_at', { ascending: false }),
    supabase
      .from('employees')
      .select('id, email, first_name, last_name, employee_number, department, role, grade, job_title, employment_type, hire_date, manager_id, phone, personal_email, address, city, postal_code, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, id_number, date_of_birth, is_active'),
  ])

  if (balancesResult.error || !balancesResult.data) return []

  type EmpRow = {
    id: string; email: string; first_name: string; last_name: string
    employee_number: string | null; department: string | null; role: UserRole
    grade: number | null; job_title: string | null
    employment_type: 'permanent' | 'fixed_term' | 'probation' | null
    hire_date: string | null; manager_id: string | null; phone: string | null
    personal_email: string | null; address: string | null; city: string | null
    postal_code: string | null; emergency_contact_name: string | null
    emergency_contact_phone: string | null; emergency_contact_relationship: string | null
    id_number: string | null; date_of_birth: string | null; is_active: boolean
  }

  const empMap = new Map<string, EmpRow>(
    ((employeesResult.data ?? []) as unknown as EmpRow[]).map(e => [e.id, e])
  )

  type BalRow = LeaveBalanceRow & { leave_types: { name: string; color: string | null } | null }

  return (balancesResult.data as unknown as BalRow[])
    .map(row => {
      const emp = empMap.get(row.user_id)
      if (!emp) return null
      return {
        id: row.id,
        userId: row.user_id,
        leaveTypeId: row.leave_type_id,
        leaveTypeName: row.leave_types?.name || 'Unknown',
        totalDays: row.total_days,
        usedDays: row.used_days,
        availableDays: row.total_days - row.used_days,
        year: row.year,
        color: row.leave_types?.color || null,
        employee: {
          id: emp.id,
          email: emp.email,
          firstName: emp.first_name,
          lastName: emp.last_name,
          employeeNumber: emp.employee_number,
          department: emp.department,
          role: emp.role,
          grade: emp.grade,
          jobTitle: emp.job_title,
          employmentType: emp.employment_type,
          hireDate: emp.hire_date,
          managerId: emp.manager_id,
          phone: emp.phone,
          personalEmail: emp.personal_email,
          address: emp.address,
          city: emp.city,
          postalCode: emp.postal_code,
          emergencyContactName: emp.emergency_contact_name,
          emergencyContactPhone: emp.emergency_contact_phone,
          emergencyContactRelationship: emp.emergency_contact_relationship,
          idNumber: emp.id_number,
          dateOfBirth: emp.date_of_birth,
          isActive: emp.is_active,
        },
      }
    })
    .filter((r): r is LeaveBalanceWithEmployee => r !== null)
}

// Update a pending leave request (employee only)
// Race condition protection: re-reads status immediately before saving.
export async function updateLeaveRequest(
  requestId: string,
  updates: {
    startDate: string
    endDate: string
    daysRequested: number
    reason?: string
    documentUrl?: string | null
  },
  actor?: { id: string; name: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // Step 1: fresh status check — catches the race condition
  const { data: current, error: fetchError } = await supabase
    .from('leave_requests')
    .select('status')
    .eq('id', requestId)
    .single()

  if (fetchError || !current) {
    return { success: false, error: 'Request not found.' }
  }

  if (current.status !== 'pending') {
    return {
      success: false,
      error: `This request has already been ${current.status} and can no longer be edited.`,
    }
  }

  const { error } = await supabase
    .from('leave_requests')
    .update({
      start_date: updates.startDate,
      end_date: updates.endDate,
      days_requested: updates.daysRequested,
      reason: updates.reason || null,
      document_url: updates.documentUrl ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (error) return { success: false, error: error.message }

  if (actor) {
    writeLedger({
      leaveRequestId: requestId,
      actorId:        actor.id,
      actorName:      actor.name,
      action:         'edited',
      fromStatus:     'pending',
      toStatus:       'pending',
      daysRequested:  updates.daysRequested,
      startDate:      updates.startDate,
      endDate:        updates.endDate,
    })
  }

  return { success: true }
}

// Update a leave balance (admin only)
export async function updateLeaveBalance(
  balanceId: string,
  totalDays: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('leave_balances')
    .update({
      total_days: totalDays,
      updated_at: new Date().toISOString(),
    })
    .eq('id', balanceId)

  if (error) {
    console.error('Error updating leave balance:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Update an employee (HR/admin only)
export async function updateEmployee(
  employeeId: string,
  data: {
    firstName: string
    lastName: string
    email: string
    role: UserRole
    department: string | null
    grade: number | null
    jobTitle: string | null
    employmentType: 'permanent' | 'fixed_term' | 'probation' | null
    hireDate: string | null
    managerId: string | null
    phone: string | null
    personalEmail: string | null
    address: string | null
    city: string | null
    postalCode: string | null
    emergencyContactName: string | null
    emergencyContactPhone: string | null
    emergencyContactRelationship: string | null
    idNumber: string | null
    dateOfBirth: string | null
    postalAddress: string | null
    passportNumber: string | null
    gender: string | null
    maritalStatus: string | null
    language: string | null
    numberOfDependants: number | null
    spouseName: string | null
    taxNumber: string | null
    taxOffice: string | null
    bankName: string | null
    bankBranchCode: string | null
    bankAccountNumber: string | null
    bankAccountType: string | null
    bankAccountHolderName: string | null
    bankAccountRelationship: string | null
    eeaGroup: string | null
    eeaHasDisability: boolean
    eeaDisabilityDescription: string | null
  },
  audit?: {
    actorId: string
    actorName: string
    changes: EmployeeFieldChange[]
  }
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()

  const { error } = await supabase
    .from('employees')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      role: data.role,
      department: data.department,
      grade: data.grade,
      job_title: data.jobTitle,
      employment_type: data.employmentType,
      hire_date: data.hireDate,
      manager_id: data.managerId,
      phone: data.phone,
      personal_email: data.personalEmail,
      address: data.address,
      city: data.city,
      postal_code: data.postalCode,
      emergency_contact_name: data.emergencyContactName,
      emergency_contact_phone: data.emergencyContactPhone,
      emergency_contact_relationship: data.emergencyContactRelationship,
      id_number: data.idNumber,
      date_of_birth: data.dateOfBirth,
      postal_address: data.postalAddress,
      passport_number: data.passportNumber,
      gender: data.gender as any,
      marital_status: data.maritalStatus as any,
      language: data.language,
      number_of_dependants: data.numberOfDependants,
      spouse_name: data.spouseName,
      tax_number: data.taxNumber,
      tax_office: data.taxOffice,
      bank_name: data.bankName,
      bank_branch_code: data.bankBranchCode,
      bank_account_number: data.bankAccountNumber,
      bank_account_type: data.bankAccountType as any,
      bank_account_holder_name: data.bankAccountHolderName,
      bank_account_relationship: data.bankAccountRelationship,
      eea_group: data.eeaGroup as any,
      eea_has_disability: data.eeaHasDisability,
      eea_disability_description: data.eeaDisabilityDescription,
      updated_at: new Date().toISOString(),
    })
    .eq('id', employeeId)

  if (error) {
    console.error('Error updating employee:', error)
    return { success: false, error: error.message }
  }

  if (audit && audit.changes.length > 0) {
    await (supabase as any).from('employee_audit').insert({
      employee_id: employeeId,
      actor_id:    audit.actorId,
      actor_name:  audit.actorName,
      changes:     audit.changes,
    })
  }

  // Recalculate leave balances for the current year when grade is set
  if (data.grade) {
    const currentYear = new Date().getFullYear()
    const { data: entitlements } = await (supabase as any)
      .from('grade_leave_entitlements')
      .select('leave_type_id, days')
      .eq('grade', data.grade)
    if (entitlements && (entitlements as any[]).length > 0) {
      for (const e of entitlements as { leave_type_id: string; days: number }[]) {
        await supabase
          .from('leave_balances')
          .update({ total_days: e.days })
          .eq('user_id', employeeId)
          .eq('leave_type_id', e.leave_type_id)
          .eq('year', currentYear)
      }
    }
  }

  return { success: true }
}

// ── Employee audit trail ──────────────────────────────────

export type EmployeeFieldChange = {
  field: string
  label: string
  previousValue: string | null
  newValue: string | null
}

export type EmployeeAuditEntry = {
  id: string
  employeeId: string
  actorId: string
  actorName: string
  timestamp: string
  changes: EmployeeFieldChange[]
}

export async function getEmployeeAuditTrail(employeeId: string): Promise<EmployeeAuditEntry[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('employee_audit')
    .select('*')
    .eq('employee_id', employeeId)
    .order('timestamp', { ascending: false })
  if (error || !data) return []
  return (data as any[]).map(row => ({
    id:         row.id,
    employeeId: row.employee_id,
    actorId:    row.actor_id,
    actorName:  row.actor_name,
    timestamp:  row.timestamp,
    changes:    row.changes ?? [],
  }))
}

// Delete an employee (admin only — hard delete; use deactivate for soft delete)
export async function deleteEmployee(
  employeeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  await supabase.from('leave_balances').delete().eq('user_id', employeeId)
  await supabase.from('leave_requests').delete().eq('user_id', employeeId)

  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', employeeId)

  if (error) {
    console.error('Error deleting employee:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ── Grade leave entitlements ──────────────────────────────

export type GradeEntitlement = { grade: number; days: number }

export async function getAnnualLeaveEntitlements(): Promise<GradeEntitlement[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()

  const { data: lt } = await supabase
    .from('leave_types')
    .select('id')
    .eq('name', 'Annual Leave')
    .single()
  if (!lt) return []

  const { data } = await (supabase as any)
    .from('grade_leave_entitlements')
    .select('grade, days')
    .eq('leave_type_id', lt.id)
    .order('grade')
  return (data as any[] ?? []).map(r => ({ grade: r.grade as number, days: r.days as number }))
}

export async function deleteAnnualLeaveEntitlement(
  grade: number
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from('grade_leave_entitlements')
    .delete()
    .eq('grade', grade)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function insertAnnualLeaveEntitlement(
  grade: number,
  days: number
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()

  const { data: lt } = await supabase
    .from('leave_types')
    .select('id')
    .eq('name', 'Annual Leave')
    .single()
  if (!lt) return { success: false, error: 'Annual Leave type not found' }

  const { error } = await (supabase as any)
    .from('grade_leave_entitlements')
    .insert({ grade, leave_type_id: lt.id, days })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateAnnualLeaveEntitlement(
  grade: number,
  days: number
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()

  const { data: lt } = await supabase
    .from('leave_types')
    .select('id')
    .eq('name', 'Annual Leave')
    .single()
  if (!lt) return { success: false, error: 'Annual Leave type not found' }

  const { error } = await (supabase as any)
    .from('grade_leave_entitlements')
    .update({ days })
    .eq('grade', grade)
    .eq('leave_type_id', lt.id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
