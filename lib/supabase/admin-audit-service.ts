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
  | 'leave_accrual_run'

export const ADMIN_AUDIT_LABELS: Record<AdminAuditAction, string> = {
  balance_adjusted:  'Leave Balance Adjusted',
  leave_type_updated:'Leave Type Updated',
  holiday_created:   'Public Holiday Added',
  holiday_deleted:   'Public Holiday Deleted',
  policy_uploaded:   'Policy Uploaded',
  policy_archived:   'Policy Archived',
  policy_restored:   'Policy Restored',
  employee_deleted:  'Employee Deleted',
  leave_accrual_run: 'Leave Accrual Run',
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
