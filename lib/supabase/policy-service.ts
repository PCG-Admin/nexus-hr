import { createClient } from './client'

const isDbConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'

export type HRPolicy = {
  id: string
  title: string
  description: string | null
  category: string
  fileUrl: string
  fileName: string
  version: number
  isActive: boolean
  isArchived: boolean
  visibility: 'all' | 'management' | 'hr_only'
  uploadedBy: string | null
  uploadedByName: string
  createdAt: string
  updatedAt: string
  acknowledgedByMe?: boolean
  acknowledgementCount?: number
}

function mapPolicy(r: Record<string, unknown>, myAcknowledgedIds?: Set<string>): HRPolicy {
  return {
    id:               r.id as string,
    title:            r.title as string,
    description:      (r.description as string | null) ?? null,
    category:         r.category as string,
    fileUrl:          r.file_url as string,
    fileName:         r.file_name as string,
    version:          r.version as number,
    isActive:         r.is_active as boolean,
    isArchived:       r.is_archived as boolean,
    visibility:       r.visibility as HRPolicy['visibility'],
    uploadedBy:       (r.uploaded_by as string | null) ?? null,
    uploadedByName:   r.uploaded_by_name as string,
    createdAt:        r.created_at as string,
    updatedAt:        r.updated_at as string,
    acknowledgedByMe: myAcknowledgedIds ? myAcknowledgedIds.has(r.id as string) : undefined,
    acknowledgementCount: r.acknowledgement_count as number | undefined,
  }
}

// Employees: RLS filters by visibility + active/not-archived automatically
export async function getVisiblePolicies(userId: string): Promise<HRPolicy[]> {
  if (!isDbConfigured()) return DEMO_POLICIES
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any

  const [{ data: policies }, { data: acks }] = await Promise.all([
    db.from('hr_policies').select('*').eq('is_archived', false).eq('is_active', true).order('category').order('title'),
    db.from('hr_policy_acknowledgements').select('policy_id').eq('user_id', userId),
  ])

  if (!policies) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myAcknowledgedIds = new Set<string>((acks ?? []).map((a: any) => a.policy_id as string))
  return (policies as Record<string, unknown>[]).map(r => mapPolicy(r, myAcknowledgedIds))
}

// HR Admin: all policies including archived, with acknowledgement counts
export async function getAllPolicies(): Promise<HRPolicy[]> {
  if (!isDbConfigured()) return DEMO_POLICIES
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any

  const { data: policies } = await db
    .from('hr_policies')
    .select('*, hr_policy_acknowledgements(count)')
    .order('is_archived')
    .order('category')
    .order('title')

  if (!policies) return []
  return (policies as Record<string, unknown>[]).map(r => {
    const ackArr = r.hr_policy_acknowledgements as { count: number }[] | null
    return { ...mapPolicy(r), acknowledgementCount: ackArr?.[0]?.count ?? 0 }
  })
}

export async function archivePolicy(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: false, error: 'DB not configured' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any
  const { error } = await db
    .from('hr_policies')
    .update({ is_archived: true, is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function restorePolicy(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: false, error: 'DB not configured' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any
  const { error } = await db
    .from('hr_policies')
    .update({ is_archived: false, is_active: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

// Uploads a replacement file, archives the current version, inserts v+1 record.
// Old version is preserved (archived) for CCMA audit trail — never deleted.
// Employees who acknowledged the old version will see Acknowledge again on the new one.
export async function uploadNewVersion(
  currentPolicy: HRPolicy,
  file: File,
  uploader: { id: string; name: string }
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: false, error: 'DB not configured' }
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // 1. Upload new file to storage
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${Date.now()}_v${currentPolicy.version + 1}_${safeName}`
  const { error: storageError } = await supabase.storage
    .from('hr-policies')
    .upload(path, file, { upsert: false })
  if (storageError) return { success: false, error: storageError.message }

  const { data: urlData } = supabase.storage.from('hr-policies').getPublicUrl(path)

  // 2. Archive current version
  const { error: archiveError } = await db
    .from('hr_policies')
    .update({ is_archived: true, is_active: false, updated_at: new Date().toISOString() })
    .eq('id', currentPolicy.id)
  if (archiveError) return { success: false, error: archiveError.message }

  // 3. Insert new version record (inherits title/description/category/visibility)
  const { error: insertError } = await db.from('hr_policies').insert({
    title:            currentPolicy.title,
    description:      currentPolicy.description,
    category:         currentPolicy.category,
    file_url:         urlData.publicUrl,
    file_name:        file.name,
    version:          currentPolicy.version + 1,
    visibility:       currentPolicy.visibility,
    uploaded_by:      uploader.id,
    uploaded_by_name: uploader.name,
  })
  if (insertError) return { success: false, error: insertError.message }
  return { success: true }
}

export async function acknowledgePolicy(
  policyId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: true }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any
  const { error } = await db
    .from('hr_policy_acknowledgements')
    .upsert({ policy_id: policyId, user_id: userId }, { onConflict: 'policy_id,user_id' })
  return error ? { success: false, error: error.message } : { success: true }
}

export async function uploadPolicy(
  file: File,
  metadata: {
    title: string
    description: string
    category: string
    visibility: 'all' | 'management' | 'hr_only'
  },
  uploader: { id: string; name: string }
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) return { success: false, error: 'DB not configured' }
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${Date.now()}_${safeName}`

  const { error: storageError } = await supabase.storage
    .from('hr-policies')
    .upload(path, file, { upsert: false })

  if (storageError) return { success: false, error: storageError.message }

  const { data: urlData } = supabase.storage.from('hr-policies').getPublicUrl(path)

  const { error: dbError } = await db.from('hr_policies').insert({
    title:            metadata.title,
    description:      metadata.description || null,
    category:         metadata.category,
    file_url:         urlData.publicUrl,
    file_name:        file.name,
    visibility:       metadata.visibility,
    uploaded_by:      uploader.id,
    uploaded_by_name: uploader.name,
  })

  if (dbError) return { success: false, error: dbError.message }
  return { success: true }
}

export type PolicyAcknowledgement = {
  id: string
  policyId: string
  policyTitle: string
  userId: string
  employeeName: string
  employeeNumber: string | null
  acknowledgedAt: string
}

export async function getPolicyAcknowledgements(policyId: string): Promise<PolicyAcknowledgement[]> {
  if (!isDbConfigured()) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any
  const { data } = await db
    .from('hr_policy_acknowledgements')
    .select('id, policy_id, user_id, created_at, employees(first_name, last_name, employee_number), hr_policies(title)')
    .eq('policy_id', policyId)
    .order('created_at', { ascending: false })
  if (!data) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r: any) => ({
    id:             r.id as string,
    policyId:       r.policy_id as string,
    policyTitle:    r.hr_policies?.title ?? '',
    userId:         r.user_id as string,
    employeeName:   `${r.employees?.first_name ?? ''} ${r.employees?.last_name ?? ''}`.trim(),
    employeeNumber: r.employees?.employee_number ?? null,
    acknowledgedAt: r.created_at as string,
  }))
}

// ─── Demo fallback ────────────────────────────────────────────────────────────
const DEMO_POLICIES: HRPolicy[] = [
  {
    id: 'demo-1', title: 'Staff Information Sheet', description: 'Employee personal, banking and emergency contact information', category: 'Onboarding',
    fileUrl: '/forms/Staff Information Sheet 1.pdf', fileName: 'Staff Information Sheet 1.pdf', version: 1,
    isActive: true, isArchived: false, visibility: 'all', uploadedBy: null, uploadedByName: 'System',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), acknowledgedByMe: false, acknowledgementCount: 0,
  },
  {
    id: 'demo-2', title: 'EEA1 Employment Equity Form', description: 'SA Employment Equity Act statutory form', category: 'Onboarding',
    fileUrl: '/forms/1. EEA 1 (1) 1.pdf', fileName: '1. EEA 1 (1) 1.pdf', version: 1,
    isActive: true, isArchived: false, visibility: 'all', uploadedBy: null, uploadedByName: 'System',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), acknowledgedByMe: false, acknowledgementCount: 0,
  },
  {
    id: 'demo-3', title: 'Acknowledgement of Debt', description: 'Employee acknowledgement of a debt owed to the company', category: 'HR Agreements',
    fileUrl: '/forms/ACKNOWLEDGEMENT OF DEBT.pdf', fileName: 'ACKNOWLEDGEMENT OF DEBT.pdf', version: 1,
    isActive: true, isArchived: false, visibility: 'all', uploadedBy: null, uploadedByName: 'System',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), acknowledgedByMe: false, acknowledgementCount: 0,
  },
]
