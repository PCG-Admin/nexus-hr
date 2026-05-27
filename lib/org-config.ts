import { createClient } from '@/lib/supabase/client'

export type OrgConfig = {
  departments: string[]
  grades: number[]
}

export const DEFAULT_DEPARTMENTS: string[] = [
  "Administration",
  "Executive",
  "Finance",
  "Human Resources",
  "Marketing",
  "Operations",
  "Sales",
  "Technical",
]

export const DEFAULT_GRADES: number[] = [1, 2, 3, 4, 5, 6]

export async function getOrgConfig(): Promise<OrgConfig> {
  try {
    const supabase = createClient()
    const [deptResult, gradeResult] = await Promise.all([
      supabase.from('org_departments').select('name').eq('is_active', true).order('name'),
      supabase.from('org_grades').select('grade').eq('is_active', true).order('grade'),
    ])

    const departments = deptResult.data && deptResult.data.length > 0
      ? deptResult.data.map((d: { name: string }) => d.name)
      : DEFAULT_DEPARTMENTS

    const grades = gradeResult.data && gradeResult.data.length > 0
      ? gradeResult.data.map((g: { grade: number }) => g.grade)
      : DEFAULT_GRADES

    return { departments, grades }
  } catch {
    return { departments: DEFAULT_DEPARTMENTS, grades: DEFAULT_GRADES }
  }
}

export async function addDepartment(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('org_departments')
      .upsert({ name, is_active: true }, { onConflict: 'name' })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to add department' }
  }
}

export async function removeDepartment(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('org_departments')
      .update({ is_active: false })
      .eq('name', name)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to remove department' }
  }
}

export async function addGrade(grade: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('org_grades')
      .upsert({ grade, is_active: true }, { onConflict: 'grade' })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to add grade' }
  }
}

export async function removeGrade(grade: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('org_grades')
      .update({ is_active: false })
      .eq('grade', grade)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to remove grade' }
  }
}
