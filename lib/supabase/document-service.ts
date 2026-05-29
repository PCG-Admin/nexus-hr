import { createClient } from './client'
import type { DocumentType } from './types'
import { writeAdminAudit } from './admin-audit-service'

const BUCKET = 'employee-documents'

export type EmployeeDoc = {
  id: string
  employeeId: string
  documentType: string
  fileUrl: string
  fileName: string | null
  uploadedBy: string | null
  createdAt: string
}

export async function getEmployeeDocuments(employeeId: string): Promise<EmployeeDoc[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('employee_documents')
    .select('*')
    .eq('employee_id', employeeId)
  if (!data) return []
  return data.map(row => ({
    id:           row.id,
    employeeId:   row.employee_id,
    documentType: row.document_type,
    fileUrl:      row.file_url,
    fileName:     row.file_name,
    uploadedBy:   row.uploaded_by,
    createdAt:    row.created_at,
  }))
}

export async function uploadEmployeeDocument(
  employeeId: string,
  documentType: string,
  file: File,
  uploadedById: string,
  uploadedByName?: string,
  employeeLabel?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // Fetch existing so we can delete the old storage file after replace
  const { data: existing } = await supabase
    .from('employee_documents')
    .select('file_url')
    .eq('employee_id', employeeId)
    .eq('document_type', documentType)
    .maybeSingle()

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${employeeId}/${documentType}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false })

  if (uploadError) return { success: false, error: uploadError.message }

  const { error: dbError } = await supabase
    .from('employee_documents')
    .upsert(
      {
        employee_id:   employeeId,
        document_type: documentType as DocumentType,
        file_url:      storagePath,
        file_name:     file.name,
        uploaded_by:   uploadedById,
      },
      { onConflict: 'employee_id,document_type' }
    )

  if (dbError) {
    await supabase.storage.from(BUCKET).remove([storagePath])
    return { success: false, error: dbError.message }
  }

  // Clean up old storage file
  if (existing?.file_url && existing.file_url !== storagePath) {
    await supabase.storage.from(BUCKET).remove([existing.file_url])
  }

  writeAdminAudit({
    actorId:     uploadedById,
    actorName:   uploadedByName ?? 'Unknown',
    action:      'document_uploaded',
    entityType:  'employee_document',
    entityId:    employeeId,
    entityLabel: employeeLabel
      ? `${employeeLabel} — ${documentType.replace(/_/g, ' ')}`
      : documentType.replace(/_/g, ' '),
  })

  return { success: true }
}

export async function getDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600) // 1-hour expiry
  if (error) return null
  return data.signedUrl
}

export async function deleteEmployeeDocument(
  id: string,
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('employee_documents').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  await supabase.storage.from(BUCKET).remove([storagePath])
  return { success: true }
}
