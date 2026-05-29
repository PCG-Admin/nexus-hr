import { createClient } from './client'

const isDbConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))

export type AdminAuditAction =
  | 'balance_adjusted'
  | 'leave_type_updated'
  | 'holiday_created'
  | 'holiday_deleted'
  | 'policy_uploaded'
  | 'policy_archived'
  | 'policy_restored'
  | 'employee_deleted'
  | 'employee_created'
  | 'employee_deactivated'
  | 'employee_reactivated'
  | 'document_uploaded'
  | 'leave_submitted'
  | 'leave_approved'
  | 'leave_rejected'
  | 'announcement_published'
  | 'announcement_deleted'
  | 'department_added'
  | 'department_removed'
  | 'grade_added'
  | 'grade_removed'
  | 'report_exported'
  | 'leave_accrual_run'

export type AuditModule = 'leave' | 'employee' | 'performance' | 'disciplinary' | 'policy' | 'announcement' | 'config'

export const ADMIN_AUDIT_LABELS: Record<AdminAuditAction, string> = {
  balance_adjusted:      'Leave Balance Adjusted',
  leave_type_updated:    'Leave Type Updated',
  holiday_created:       'Public Holiday Added',
  holiday_deleted:       'Public Holiday Deleted',
  policy_uploaded:       'Policy Uploaded',
  policy_archived:       'Policy Archived',
  policy_restored:       'Policy Restored',
  employee_deleted:      'Employee Deleted',
  employee_created:      'Employee Created',
  employee_deactivated:  'Employee Deactivated',
  employee_reactivated:  'Employee Reactivated',
  document_uploaded:     'Document Uploaded',
  leave_submitted:       'Leave Request Submitted',
  leave_approved:        'Leave Request Approved',
  leave_rejected:        'Leave Request Rejected',
  announcement_published:'Announcement Published',
  announcement_deleted:  'Announcement Deleted',
  department_added:      'Department Added',
  department_removed:    'Department Removed',
  grade_added:           'Grade Added',
  grade_removed:         'Grade Removed',
  report_exported:       'Report Exported',
  leave_accrual_run:     'Leave Accrual Run',
}

export const UNIFIED_AUDIT_LABELS: Record<string, string> = {
  ...ADMIN_AUDIT_LABELS,
  // employee_audit
  profile_changed:   'Profile Updated',
  // performance_audit
  created:           'Review Created',
  draft_saved:       'Draft Saved',
  submitted:         'Review Submitted',
  manager_reviewed:  'Manager Review Completed',
  hr_approved:       'HR Approved',
  acknowledged:      'Acknowledged',
  gm_approved:       'GM Approved',
  // disciplinary_audit
  edited:            'Record Edited',
  finalised:         'Record Finalised',
}

export type ChangeRecord = {
  field: string
  label: string
  previousValue: string
  newValue: string
}

export type AdminAuditEntry = {
  id: string
  actorId: string | null
  actorName: string
  action: AdminAuditAction
  entityType: string
  entityId: string | null
  entityLabel: string | null
  changes: ChangeRecord[]
  timestamp: string
}

export type UnifiedAuditEntry = {
  id: string
  timestamp: string
  actorId: string | null
  actorName: string
  module: AuditModule
  action: string
  entityLabel: string | null
  changes: ChangeRecord[]
}

export async function writeAdminAudit(params: {
  actorId: string
  actorName: string
  action: AdminAuditAction
  entityType: string
  entityId?: string | null
  entityLabel?: string | null
  changes?: ChangeRecord[]
}): Promise<void> {
  if (!isDbConfigured()) return
  try {
    const supabase = createClient()
    await (supabase as any).from('admin_audit').insert({
      actor_id:     params.actorId,
      actor_name:   params.actorName,
      action:       params.action,
      entity_type:  params.entityType,
      entity_id:    params.entityId ?? null,
      entity_label: params.entityLabel ?? null,
      changes:      params.changes ?? [],
    })
  } catch (err) {
    console.error('writeAdminAudit failed:', err)
  }
}

export async function getAdminAuditUnified(limit = 250): Promise<UnifiedAuditEntry[]> {
  if (!isDbConfigured()) return []
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('admin_audit_unified')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error || !data) return []

    return (data as any[]).map(row => ({
      id:          row.id,
      timestamp:   row.timestamp,
      actorId:     row.actor_id,
      actorName:   row.actor_name,
      module:      row.module as AuditModule,
      action:      row.action,
      entityLabel: row.entity_label,
      changes:     row.changes ?? [],
    }))
  } catch {
    return []
  }
}

// Kept for backwards compatibility — use getAdminAuditUnified for the admin UI
export async function getAdminAuditLog(limit = 100): Promise<AdminAuditEntry[]> {
  if (!isDbConfigured()) return []
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('admin_audit')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error || !data) return []

    return (data as any[]).map(row => ({
      id:          row.id,
      actorId:     row.actor_id,
      actorName:   row.actor_name,
      action:      row.action as AdminAuditAction,
      entityType:  row.entity_type,
      entityId:    row.entity_id,
      entityLabel: row.entity_label,
      changes:     row.changes ?? [],
      timestamp:   row.timestamp,
    }))
  } catch {
    return []
  }
}
