// Organisational structure configuration.
// In demo mode, persisted to localStorage. Replaces hardcoded department/grade lists.
// When DB is connected, migrate to a config table and remove localStorage reads.

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

const STORAGE_KEY = "nexus-org-config"

export function getOrgConfig(): OrgConfig {
  if (typeof window === "undefined") {
    return { departments: DEFAULT_DEPARTMENTS, grades: DEFAULT_GRADES }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { departments: DEFAULT_DEPARTMENTS, grades: DEFAULT_GRADES }
    const parsed = JSON.parse(raw) as Partial<OrgConfig>
    return {
      departments: Array.isArray(parsed.departments) && parsed.departments.length > 0
        ? parsed.departments
        : DEFAULT_DEPARTMENTS,
      grades: Array.isArray(parsed.grades) && parsed.grades.length > 0
        ? parsed.grades
        : DEFAULT_GRADES,
    }
  } catch {
    return { departments: DEFAULT_DEPARTMENTS, grades: DEFAULT_GRADES }
  }
}

export function saveOrgConfig(config: OrgConfig): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
