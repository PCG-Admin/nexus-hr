import { createClient } from './client'
import type { Database } from './types'
import type { UserRole } from '@/lib/auth'

const isDbConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'

type LeaveTypeRow = Database['public']['Tables']['leave_types']['Row']
type LeaveBalanceRow = Database['public']['Tables']['leave_balances']['Row']
type LeaveRequestRow = Database['public']['Tables']['leave_requests']['Row']
type LeaveRequestInsert = Database['public']['Tables']['leave_requests']['Insert']

// Transformed types for the UI
export type LeaveType = {
  id: string
  name: string
  description: string | null
  defaultDaysPerYear: number
  accrualType: 'annual' | 'monthly' | 'fixed'
  requiresDocumentation: boolean
  color: string | null
}

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
}

// Fetch all leave types
export async function getLeaveTypes(): Promise<LeaveType[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('leave_types')
    .select('*')
    .order('name')

  if (error) return []

  return (data as LeaveTypeRow[]).map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    defaultDaysPerYear: row.default_days_per_year,
    accrualType: row.accrual_type,
    requiresDocumentation: row.requires_documentation,
    color: row.color,
  }))
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

  // Sum approved days per leave type directly from requests (always accurate,
  // avoids depending on the cached used_days column being up-to-date)
  const usedByType: Record<string, number> = {}
  if (requestsResult.data) {
    for (const req of requestsResult.data) {
      usedByType[req.leave_type_id] = (usedByType[req.leave_type_id] || 0) + req.days_requested
    }
  }

  return (balancesResult.data as (LeaveBalanceRow & { leave_types: { name: string; color: string | null } })[]).map(row => {
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

  return (data as (LeaveRequestRow & { leave_types: { name: string } })[]).map(row => ({
    id: row.id,
    userId: row.user_id,
    leaveTypeId: row.leave_type_id,
    leaveTypeName: row.leave_types?.name || 'Unknown',
    startDate: row.start_date,
    endDate: row.end_date,
    daysRequested: row.days_requested,
    reason: row.reason,
    status: row.status,
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
}): Promise<{ success: boolean; error?: string; data?: LeaveRequest }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()

  // Managers/admins bypass stage-1 and go straight to final-approval queue
  const isElevatedRole = request.userRole === 'line_manager' || request.userRole === 'hr_manager' || request.userRole === 'system_admin'
  const initialStatus = isElevatedRole ? 'pending_ceo' : 'pending'

  const insertData: LeaveRequestInsert = {
    user_id: request.userId,
    leave_type_id: request.leaveTypeId,
    start_date: request.startDate,
    end_date: request.endDate,
    days_requested: request.daysRequested,
    reason: request.reason || null,
    document_url: request.documentUrl || null,
    status: initialStatus,
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

  const row = data as LeaveRequestRow & { leave_types: { name: string } }

  // Notify the right audience based on initial status
  fetch('/api/notifications/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leaveRequestId: row.id,
      employeeName: request.employeeName || 'An employee',
      leaveTypeName: row.leave_types?.name || 'Leave',
      startDate: row.start_date,
      endDate: row.end_date,
      daysRequested: row.days_requested,
      targetRoles: isElevatedRole ? ['ceo'] : ['admin', 'manager'],
      title: isElevatedRole ? 'Leave Request Awaiting Your Approval' : 'New Leave Request',
    }),
  }).catch(err => console.error('Failed to send notifications:', err))

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
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelationship: string | null
  managerId: string | null
  idNumber: string | null
  dateOfBirth: string | null
}

// Extended leave request with employee info for approvals
export type LeaveRequestWithEmployee = LeaveRequest & {
  employee: Employee
}

// Fetch all leave requests for managers/admins to review
export async function getAllLeaveRequests(): Promise<LeaveRequestWithEmployee[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()

  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      *,
      leave_types (
        name
      ),
      profiles!leave_requests_user_id_fkey (
        id,
        email,
        first_name,
        last_name,
        employee_number,
        department,
        role,
        hire_date
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return []

  type RequestWithProfile = LeaveRequestRow & {
    leave_types: { name: string }
    profiles: {
      id: string
      email: string
      first_name: string
      last_name: string
      employee_number: string | null
      department: string | null
      role: 'employee' | 'manager' | 'admin' | 'ceo'
      hire_date: string | null
    }
  }

  return (data as RequestWithProfile[])
    .filter(row => row.profiles !== null)
    .map(row => ({
      id: row.id,
      userId: row.user_id,
      leaveTypeId: row.leave_type_id,
      leaveTypeName: row.leave_types?.name || 'Unknown',
      startDate: row.start_date,
      endDate: row.end_date,
      daysRequested: row.days_requested,
      reason: row.reason,
      status: row.status,
      reviewerId: row.reviewer_id,
      reviewerNotes: row.reviewer_notes,
      reviewedAt: row.reviewed_at,
      managerReviewerId: row.manager_reviewer_id,
      managerReviewedAt: row.manager_reviewed_at,
      documentUrl: row.document_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      employee: {
        id: row.profiles.id,
        email: row.profiles.email,
        firstName: row.profiles.first_name,
        lastName: row.profiles.last_name,
        employeeNumber: row.profiles.employee_number,
        department: row.profiles.department,
        role: row.profiles.role,
        hireDate: row.profiles.hire_date,
      },
    }))
}

// Helper to calculate days elapsed for a leave request
function calculateElapsedDays(startDate: string, endDate: string, daysRequested: number): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  // If leave hasn't started yet, no days used
  if (start > today) {
    return 0
  }

  // If leave is complete, use the full days requested
  if (end <= today) {
    return daysRequested
  }

  // Leave is in progress - count days from start to today (inclusive)
  const diffTime = today.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  return Math.min(diffDays, daysRequested)
}

// Manager stage-1 approval — moves request to pending_ceo and notifies CEO
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

  if (names) {
    fetch('/api/notifications/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leaveRequestId: requestId,
        employeeName: names.employeeName,
        leaveTypeName: names.leaveTypeName,
        startDate: names.startDate,
        endDate: names.endDate,
        daysRequested: names.daysRequested,
        targetRoles: ['ceo'],
        title: 'Leave Request Awaiting Your Approval',
        message: `${names.managerName} approved ${names.employeeName}'s ${names.leaveTypeName} request (${names.daysRequested} day(s)). Awaiting your final approval.`,
      }),
    }).catch(err => console.error('Failed to notify CEO:', err))
  }

  return { success: true }
}

// CEO final approval — moves request to approved
export async function approveLeaveRequest(
  requestId: string,
  reviewerId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('leave_requests')
    .update({
      status: 'approved',
      reviewer_id: reviewerId,
      reviewer_notes: notes || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (error) {
    console.error('Error approving leave request:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Reject a leave request
export async function rejectLeaveRequest(
  requestId: string,
  reviewerId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

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

  return { success: true }
}

// ============ Admin Functions ============

// Fetch all employees (profiles)
export async function getAllEmployees(): Promise<Employee[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('last_name')

  if (error) return []

  return data.map(row => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    employeeNumber: row.employee_number ?? null,
    department: row.department ?? null,
    role: row.role,
    grade: (row as any).grade ?? null,
    hireDate: row.hire_date ?? null,
    jobTitle: (row as any).job_title ?? null,
    employmentType: (row as any).employment_type ?? null,
    phone: (row as any).phone ?? null,
    personalEmail: (row as any).personal_email ?? null,
    address: (row as any).address ?? null,
    city: (row as any).city ?? null,
    postalCode: (row as any).postal_code ?? null,
    emergencyContactName: (row as any).emergency_contact_name ?? null,
    emergencyContactPhone: (row as any).emergency_contact_phone ?? null,
    emergencyContactRelationship: (row as any).emergency_contact_relationship ?? null,
    managerId: (row as any).manager_id ?? null,
    idNumber: (row as any).id_number ?? null,
    dateOfBirth: (row as any).date_of_birth ?? null,
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

  const { data, error } = await supabase
    .from('leave_balances')
    .select(`
      *,
      leave_types (
        name,
        color
      ),
      profiles!leave_balances_user_id_fkey (
        id,
        email,
        first_name,
        last_name,
        employee_number,
        department,
        role,
        hire_date
      )
    `)
    .eq('year', currentYear)
    .order('created_at', { ascending: false })

  if (error) return []

  type BalanceWithProfile = LeaveBalanceRow & {
    leave_types: { name: string; color: string | null }
    profiles: {
      id: string
      email: string
      first_name: string
      last_name: string
      employee_number: string | null
      department: string | null
      role: 'employee' | 'manager' | 'admin' | 'ceo'
      hire_date: string | null
    }
  }

  return (data as BalanceWithProfile[]).map(row => ({
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
      id: row.profiles.id,
      email: row.profiles.email,
      firstName: row.profiles.first_name,
      lastName: row.profiles.last_name,
      employeeNumber: row.profiles.employee_number,
      department: row.profiles.department,
      role: row.profiles.role,
      hireDate: row.profiles.hire_date,
    },
  }))
}

// Update a pending leave request (employee only)
// Race condition protection: re-reads status immediately before saving.
// If admin approved/rejected between the user opening the dialog and clicking Save,
// the update is blocked and a clear message is returned.
export async function updateLeaveRequest(
  requestId: string,
  updates: {
    startDate: string
    endDate: string
    daysRequested: number
    reason?: string
    documentUrl?: string | null
  }
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

  // Step 2: update — the .eq('status','pending') is a second safety net
  // so even a millisecond-level race still can't overwrite a reviewed request
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
  }
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()

  const { error } = await supabase
    .from('profiles')
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', employeeId)

  if (error) {
    console.error('Error updating employee:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Delete an employee (admin only)
export async function deleteEmployee(
  employeeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // First delete leave balances
  await supabase
    .from('leave_balances')
    .delete()
    .eq('user_id', employeeId)

  // Then delete leave requests
  await supabase
    .from('leave_requests')
    .delete()
    .eq('user_id', employeeId)

  // Finally delete the profile
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', employeeId)

  if (error) {
    console.error('Error deleting employee:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
