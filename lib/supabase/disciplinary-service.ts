import { createClient } from './client'

const isDbConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))

export type DisciplinaryType =
  | 'verbal_warning'
  | 'written_warning'
  | 'final_written_warning'
  | 'suspension'
  | 'dismissal'

export type DisciplinaryRecord = {
  id: string
  employeeId: string
  type: DisciplinaryType
  incidentDate: string
  hearingDate: string | null
  description: string
  outcome: string | null
  status: 'draft' | 'finalised'
  documentUrl: string | null
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export const DISCIPLINARY_TYPE_LABELS: Record<DisciplinaryType, string> = {
  verbal_warning:        'Verbal Warning',
  written_warning:       'Written Warning',
  final_written_warning: 'Final Written Warning',
  suspension:            'Suspension',
  dismissal:             'Dismissal',
}

export const DISCIPLINARY_TYPE_COLORS: Record<DisciplinaryType, string> = {
  verbal_warning:        'bg-yellow-100 text-yellow-800 border-yellow-300',
  written_warning:       'bg-orange-100 text-orange-800 border-orange-300',
  final_written_warning: 'bg-red-100 text-red-800 border-red-300',
  suspension:            'bg-purple-100 text-purple-800 border-purple-300',
  dismissal:             'bg-slate-900 text-white border-slate-900',
}

export type FieldChange = {
  field: string
  label: string
  previousValue: string | null
  newValue: string | null
}

export type AuditEntry = {
  id: string
  recordId: string
  action: 'created' | 'edited' | 'finalised'
  actorId: string
  actorName: string
  timestamp: string
  changes: FieldChange[]
}

// ── private helper ────────────────────────────────────────────
async function writeAuditEntry(entry: {
  recordId: string
  action: AuditEntry['action']
  actorId: string
  actorName: string
  changes: FieldChange[]
}): Promise<void> {
  if (!isDbConfigured()) return
  const supabase = createClient()
  await (supabase as any).from('disciplinary_audit').insert({
    record_id:  entry.recordId,
    action:     entry.action,
    actor_id:   entry.actorId,
    actor_name: entry.actorName,
    changes:    entry.changes,
  })
}

// ── public API ────────────────────────────────────────────────

export async function getRecordAuditTrail(recordId: string): Promise<AuditEntry[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('disciplinary_audit')
    .select('*')
    .eq('record_id', recordId)
    .order('timestamp', { ascending: true })
  if (error || !data) return []
  return (data as any[]).map(row => ({
    id:        row.id,
    recordId:  row.record_id,
    action:    row.action as AuditEntry['action'],
    actorId:   row.actor_id,
    actorName: row.actor_name,
    timestamp: row.timestamp,
    changes:   row.changes ?? [],
  }))
}

export async function getEmployeeDisciplinaryRecords(employeeId: string): Promise<DisciplinaryRecord[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('disciplinary_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('incident_date', { ascending: false })
  if (error || !data) return []
  return (data as any[]).map(row => ({
    id:            row.id,
    employeeId:    row.employee_id,
    type:          row.type as DisciplinaryType,
    incidentDate:  row.incident_date,
    hearingDate:   row.hearing_date ?? null,
    description:   row.description,
    outcome:       row.outcome ?? null,
    status:        row.status as 'draft' | 'finalised',
    documentUrl:   row.document_url ?? null,
    createdBy:     row.created_by,
    createdByName: row.created_by_name,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  }))
}

export async function uploadDisciplinaryDocument(
  file: File,
  employeeId: string,
  incidentType?: string,
  incidentDate?: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const typeSlug = incidentType ? incidentType.replace(/_/g, '-') : 'document'
  const datePart = incidentDate ?? new Date().toISOString().slice(0, 10)
  const path = `disciplinary/${employeeId}/${typeSlug}-${datePart}.${ext}`
  const { error } = await supabase.storage.from('leave-documents').upload(path, file, { upsert: true })
  if (error) return { success: false, error: error.message }
  return { success: true, url: `/api/documents/${path}` }
}

export async function createDisciplinaryRecord(record: {
  employeeId: string
  type: DisciplinaryType
  incidentDate: string
  hearingDate?: string | null
  description: string
  outcome?: string | null
  documentUrl?: string | null
  createdBy: string
  createdByName: string
  changes: FieldChange[]
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('disciplinary_records')
    .insert({
      employee_id:     record.employeeId,
      type:            record.type,
      incident_date:   record.incidentDate,
      hearing_date:    record.hearingDate ?? null,
      description:     record.description,
      outcome:         record.outcome ?? null,
      document_url:    record.documentUrl ?? null,
      status:          'draft',
      created_by:      record.createdBy,
      created_by_name: record.createdByName,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  await writeAuditEntry({
    recordId:  data.id,
    action:    'created',
    actorId:   record.createdBy,
    actorName: record.createdByName,
    changes:   record.changes,
  })

  return { success: true, id: data.id }
}

export async function updateDisciplinaryRecord(
  id: string,
  updates: {
    type?: DisciplinaryType
    incidentDate?: string
    hearingDate?: string | null
    description?: string
    outcome?: string | null
    documentUrl?: string | null
  },
  audit: {
    actorId: string
    actorName: string
    changes: FieldChange[]
  }
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from('disciplinary_records')
    .update({
      ...(updates.type         !== undefined && { type:          updates.type }),
      ...(updates.incidentDate !== undefined && { incident_date: updates.incidentDate }),
      ...(updates.hearingDate  !== undefined && { hearing_date:  updates.hearingDate }),
      ...(updates.description  !== undefined && { description:   updates.description }),
      ...(updates.outcome      !== undefined && { outcome:        updates.outcome }),
      ...(updates.documentUrl  !== undefined && { document_url:  updates.documentUrl }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'draft')

  if (error) return { success: false, error: error.message }

  if (audit.changes.length > 0) {
    await writeAuditEntry({
      recordId:  id,
      action:    'edited',
      actorId:   audit.actorId,
      actorName: audit.actorName,
      changes:   audit.changes,
    })
  }

  return { success: true }
}

export async function finaliseDisciplinaryRecord(
  id: string,
  audit: { actorId: string; actorName: string }
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from('disciplinary_records')
    .update({ status: 'finalised', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'draft')

  if (error) return { success: false, error: error.message }

  await writeAuditEntry({
    recordId:  id,
    action:    'finalised',
    actorId:   audit.actorId,
    actorName: audit.actorName,
    changes:   [{ field: 'status', label: 'Status', previousValue: 'Draft', newValue: 'Finalised' }],
  })

  return { success: true }
}

// ── Admin reporting ───────────────────────────────────────────────────────────

export type DisciplinaryRecordWithEmployee = DisciplinaryRecord & {
  employee: { id: string; firstName: string; lastName: string; department: string | null }
}

export async function getAllDisciplinaryRecords(): Promise<DisciplinaryRecordWithEmployee[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()

  const [recordsResult, employeesResult] = await Promise.all([
    (supabase as any).from('disciplinary_records').select('*').order('incident_date', { ascending: false }),
    (supabase as any).from('employees').select('id, first_name, last_name, department'),
  ])

  if (recordsResult.error || !recordsResult.data) return []

  const empMap = new Map<string, { id: string; firstName: string; lastName: string; department: string | null }>(
    ((employeesResult.data ?? []) as any[]).map((e: any) => [
      e.id,
      { id: e.id, firstName: e.first_name, lastName: e.last_name, department: e.department ?? null },
    ])
  )

  return (recordsResult.data as any[])
    .map((row: any) => {
      const emp = empMap.get(row.employee_id)
      if (!emp) return null
      return {
        id:            row.id,
        employeeId:    row.employee_id,
        type:          row.type as DisciplinaryType,
        incidentDate:  row.incident_date,
        hearingDate:   row.hearing_date ?? null,
        description:   row.description,
        outcome:       row.outcome ?? null,
        status:        row.status as 'draft' | 'finalised',
        documentUrl:   row.document_url ?? null,
        createdBy:     row.created_by,
        createdByName: row.created_by_name,
        createdAt:     row.created_at,
        updatedAt:     row.updated_at,
        employee:      emp,
      }
    })
    .filter((r): r is DisciplinaryRecordWithEmployee => r !== null)
}
