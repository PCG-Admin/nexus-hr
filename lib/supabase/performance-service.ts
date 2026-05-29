import { createClient } from "@/lib/supabase/client"

export type CycleType = "monthly" | "quarterly" | "biannual" | "annual"
export type ReviewStatus =
  | "draft"
  | "submitted"
  | "manager_reviewed"
  | "hr_approved"
  | "acknowledged"
  | "gm_approved"

export type PerformanceCycle = {
  id: string
  name: string
  type: CycleType
  startDate: string
  endDate: string
  year: number
  isActive: boolean
}

export type KPIEntry = {
  id: string
  title: string
  description: string | null
  target: string
  actual: string | null
  weight: number
  managerRating: number | null
  managerComment: string | null
}

export type PerformanceReview = {
  id: string
  employeeId: string
  cycleId: string
  cycleName: string
  cycleType: CycleType
  status: ReviewStatus
  kpis: KPIEntry[]
  employeeNotes: string | null
  submittedAt: string | null
  managerReviewerId: string | null
  managerReviewerName: string | null
  managerNotes: string | null
  managerCheckinNotes: string | null
  managerReviewedAt: string | null
  hrReviewerId: string | null
  hrReviewerName: string | null
  hrNotes: string | null
  hrApprovedAt: string | null
  employeeAcknowledgedAt: string | null
  gmReviewerId: string | null
  gmReviewerName: string | null
  gmNotes: string | null
  gmApprovedAt: string | null
  incentiveGateCleared: boolean
  createdAt: string
  updatedAt: string
  employee?: {
    id: string
    firstName: string
    lastName: string
    department: string | null
    jobTitle: string | null
  }
}

export type IncentiveGateStatus = {
  cycleId: string
  total: number
  approved: number
  pending: number
  blocked: boolean
  breakdown: Array<{ employeeId: string; employeeName: string; status: ReviewStatus }>
}

// ── DB guard ──────────────────────────────────────────────────────────────────

function isDbConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!(url && !url.includes("placeholder"))
}

// ── Row mapper ────────────────────────────────────────────────────────────────

function mapReview(row: any): PerformanceReview {
  const cycle = row.cycle
  return {
    id:                    row.id,
    employeeId:            row.employee_id,
    cycleId:               row.cycle_id,
    cycleName:             cycle?.name    ?? row.cycle_id,
    cycleType:             (cycle?.type   ?? "quarterly") as CycleType,
    status:                row.status     as ReviewStatus,
    kpis:                  Array.isArray(row.kpis) ? row.kpis : [],
    employeeNotes:         row.employee_notes       ?? null,
    submittedAt:           row.submitted_at          ?? null,
    managerReviewerId:     row.manager_reviewer_id   ?? null,
    managerReviewerName:   row.manager_reviewer_name ?? null,
    managerNotes:          row.manager_notes         ?? null,
    managerCheckinNotes:   row.manager_checkin_notes ?? null,
    managerReviewedAt:     row.manager_reviewed_at   ?? null,
    hrReviewerId:          row.hr_reviewer_id        ?? null,
    hrReviewerName:        row.hr_reviewer_name      ?? null,
    hrNotes:               row.hr_notes              ?? null,
    hrApprovedAt:          row.hr_approved_at        ?? null,
    employeeAcknowledgedAt: row.employee_acknowledged_at ?? null,
    gmReviewerId:          row.gm_reviewer_id        ?? null,
    gmReviewerName:        row.gm_reviewer_name      ?? null,
    gmNotes:               row.gm_notes              ?? null,
    gmApprovedAt:          row.gm_approved_at        ?? null,
    incentiveGateCleared:  row.incentive_gate_cleared ?? false,
    createdAt:             row.created_at,
    updatedAt:             row.updated_at,
    employee: row.employee ? {
      id:         row.employee.id,
      firstName:  row.employee.first_name,
      lastName:   row.employee.last_name,
      department: row.employee.department ?? null,
      jobTitle:   row.employee.job_title  ?? null,
    } : undefined,
  }
}

// ── Performance audit helper ──────────────────────────────────────────────────

async function writePerformanceAudit(params: {
  reviewId?: string | null
  employeeId: string
  employeeName: string
  actorId: string
  actorName: string
  action: 'created' | 'draft_saved' | 'submitted' | 'manager_reviewed' | 'hr_approved' | 'acknowledged' | 'gm_approved'
  fromStatus?: string | null
  toStatus?: string | null
  cycleName?: string | null
  notes?: string | null
}): Promise<void> {
  if (!isDbConfigured()) return
  try {
    const supabase = createClient()
    await (supabase as any).from('performance_audit').insert({
      review_id:     params.reviewId   ?? null,
      employee_id:   params.employeeId,
      employee_name: params.employeeName,
      actor_id:      params.actorId,
      actor_name:    params.actorName,
      action:        params.action,
      from_status:   params.fromStatus ?? null,
      to_status:     params.toStatus   ?? null,
      cycle_name:    params.cycleName  ?? null,
      notes:         params.notes      ?? null,
    })
  } catch (err) {
    console.error('writePerformanceAudit failed:', err)
  }
}

// ── KPI templates ─────────────────────────────────────────────────────────────

const SALES_KPI_TEMPLATE: Omit<KPIEntry, "id" | "actual" | "managerRating" | "managerComment">[] = [
  { title: "Revenue Target Achievement",    description: "% of monthly revenue target met",             target: "100% of target",     weight: 40 },
  { title: "New Client Acquisition",        description: "Number of new clients onboarded",              target: "3 new clients",      weight: 25 },
  { title: "Customer Satisfaction (CSAT)",  description: "Average customer satisfaction score",          target: "≥ 4.0 / 5.0",       weight: 20 },
  { title: "Reporting & Admin Compliance",  description: "CRM updated daily; reports submitted on time", target: "100% on time",       weight: 15 },
]

const HR_KPI_TEMPLATE: Omit<KPIEntry, "id" | "actual" | "managerRating" | "managerComment">[] = [
  { title: "Recruitment Cycle Time",        description: "Average days from posting to offer",           target: "≤ 30 days",          weight: 30 },
  { title: "Leave Policy Compliance",       description: "% of leave requests processed within SLA",     target: "100% within 48h",    weight: 25 },
  { title: "Employee Query Resolution",     description: "HR queries resolved within 2 working days",    target: "≥ 95%",              weight: 25 },
  { title: "Training Completion Rate",      description: "Mandatory training completed by employees",    target: "100% by quarter end", weight: 20 },
]

const GENERAL_KPI_TEMPLATE: Omit<KPIEntry, "id" | "actual" | "managerRating" | "managerComment">[] = [
  { title: "Deliverable Completion Rate",   description: "Planned deliverables completed on time",       target: "≥ 90%",              weight: 35 },
  { title: "Stakeholder Satisfaction",      description: "Score from quarterly stakeholder survey",      target: "≥ 4.0 / 5.0",       weight: 25 },
  { title: "Process Improvement Initiative",description: "Identify and document 1 process improvement",  target: "1 per quarter",      weight: 20 },
  { title: "Mandatory Training",            description: "All assigned compliance training completed",    target: "100%",               weight: 20 },
]

function buildKpiTemplate(
  template: Omit<KPIEntry, "id" | "actual" | "managerRating" | "managerComment">[],
  prefix: string,
): KPIEntry[] {
  return template.map((t, i) => ({
    id: `${prefix}-kpi-${i + 1}`,
    ...t,
    actual: null,
    managerRating: null,
    managerComment: null,
  }))
}

function getKpiTemplateForEmployee(emp: {
  role?: string | null
  jobTitle?: string | null
  department?: string | null
} | null): KPIEntry[] {
  const role     = emp?.role            ?? ""
  const jobTitle = (emp?.jobTitle       ?? "").toLowerCase()
  const dept     = (emp?.department     ?? "").toLowerCase()
  const prefix   = `kpi-${Date.now()}`

  if (role === "hr_manager" || dept.includes("human resource") || dept.includes("hr")) {
    return buildKpiTemplate(HR_KPI_TEMPLATE, prefix)
  }
  if (jobTitle.includes("sales") || dept.includes("sales")) {
    return buildKpiTemplate(SALES_KPI_TEMPLATE, prefix)
  }
  return buildKpiTemplate(GENERAL_KPI_TEMPLATE, prefix)
}

// ── Static fallback cycle catalogue (demo mode) ───────────────────────────────

export const PERFORMANCE_CYCLES: PerformanceCycle[] = [
  { id: "cycle-may-2026-checkin", name: "May 2026 Check-in",  type: "monthly",   startDate: "2026-05-01", endDate: "2026-05-31", year: 2026, isActive: true  },
  { id: "cycle-q2-2026",          name: "Q2 2026 (Apr–Jun)",  type: "quarterly", startDate: "2026-04-01", endDate: "2026-06-30", year: 2026, isActive: true  },
  { id: "cycle-q1-2026",          name: "Q1 2026 (Jan–Mar)",  type: "quarterly", startDate: "2026-01-01", endDate: "2026-03-31", year: 2026, isActive: false },
  { id: "cycle-annual-2026",      name: "Annual Review 2026", type: "annual",    startDate: "2026-01-01", endDate: "2026-12-31", year: 2026, isActive: false },
]

// ── Mock reviews (demo mode only) ────────────────────────────────────────────

function makeKPIs(
  template: Omit<KPIEntry, "id" | "actual" | "managerRating" | "managerComment">[],
  prefix: string,
  filled: boolean,
  managerDone: boolean,
): KPIEntry[] {
  return template.map((t, i) => ({
    id: `${prefix}-kpi-${i + 1}`,
    ...t,
    actual: filled ? ["Achieved 108% of target", "4 new clients onboarded", "4.3 / 5.0", "100% submitted on time"][i] ?? "Completed" : null,
    managerRating:  managerDone ? [5, 4, 4, 5][i] ?? 4 : null,
    managerComment: managerDone ? ["Excellent — exceeded target.", "Strong performance.", "Good result.", "No issues."][i] ?? null : null,
  }))
}

const BASE_MOCK_REVIEWS: PerformanceReview[] = [
  // ── Sarah Dlamini ─────────────────────────────────────────────────────────
  {
    id: "rev-sarah-q1", employeeId: "demo-employee-001",
    cycleId: "cycle-q1-2026", cycleName: "Q1 2026 (Jan–Mar)", cycleType: "quarterly",
    status: "hr_approved",
    kpis: makeKPIs(SALES_KPI_TEMPLATE, "sarah-q1", true, true),
    employeeNotes: "Strong quarter — exceeded revenue target.", submittedAt: "2026-04-03T09:00:00Z",
    managerReviewerId: "demo-manager-001", managerReviewerName: "James Naidoo",
    managerNotes: "Sarah delivered consistently. Recommend full incentive release.", managerCheckinNotes: null, managerReviewedAt: "2026-04-07T14:00:00Z",
    hrReviewerId: "demo-hr-001", hrReviewerName: "Priya Patel",
    hrNotes: "Reviewed and approved.", hrApprovedAt: "2026-04-10T11:00:00Z",
    employeeAcknowledgedAt: null, gmReviewerId: null, gmReviewerName: null, gmNotes: null, gmApprovedAt: null,
    incentiveGateCleared: true, createdAt: "2026-01-02T08:00:00Z", updatedAt: "2026-04-10T11:00:00Z",
    employee: { id: "demo-employee-001", firstName: "Sarah", lastName: "Dlamini", department: "Sales", jobTitle: "Sales Consultant" },
  },
  {
    id: "rev-sarah-q2", employeeId: "demo-employee-001",
    cycleId: "cycle-q2-2026", cycleName: "Q2 2026 (Apr–Jun)", cycleType: "quarterly",
    status: "submitted",
    kpis: makeKPIs(SALES_KPI_TEMPLATE, "sarah-q2", true, false),
    employeeNotes: "Good progress so far.", submittedAt: "2026-05-19T10:00:00Z",
    managerReviewerId: null, managerReviewerName: null, managerNotes: null, managerCheckinNotes: null, managerReviewedAt: null,
    hrReviewerId: null, hrReviewerName: null, hrNotes: null, hrApprovedAt: null,
    employeeAcknowledgedAt: null, gmReviewerId: null, gmReviewerName: null, gmNotes: null, gmApprovedAt: null,
    incentiveGateCleared: false, createdAt: "2026-04-02T08:00:00Z", updatedAt: "2026-05-19T10:00:00Z",
    employee: { id: "demo-employee-001", firstName: "Sarah", lastName: "Dlamini", department: "Sales", jobTitle: "Sales Consultant" },
  },
  {
    id: "rev-sarah-may-checkin", employeeId: "demo-employee-001",
    cycleId: "cycle-may-2026-checkin", cycleName: "May 2026 Check-in", cycleType: "monthly",
    status: "submitted",
    kpis: [],
    employeeNotes: null, submittedAt: "2026-05-25T09:00:00Z",
    managerReviewerId: "demo-manager-001", managerReviewerName: "James Naidoo",
    managerNotes: null,
    managerCheckinNotes: "Strong month Sarah. Pipeline is healthy — client Momentum now confirmed. Keep focus on the new acquisition target for June. One area to watch: CRM updates need to be daily, a few gaps in April.",
    managerReviewedAt: "2026-05-25T09:00:00Z",
    hrReviewerId: null, hrReviewerName: null, hrNotes: null, hrApprovedAt: null,
    employeeAcknowledgedAt: null, gmReviewerId: null, gmReviewerName: null, gmNotes: null, gmApprovedAt: null,
    incentiveGateCleared: false, createdAt: "2026-05-25T09:00:00Z", updatedAt: "2026-05-25T09:00:00Z",
    employee: { id: "demo-employee-001", firstName: "Sarah", lastName: "Dlamini", department: "Sales", jobTitle: "Sales Consultant" },
  },
  // ── James Naidoo ──────────────────────────────────────────────────────────
  {
    id: "rev-james-q2", employeeId: "demo-manager-001",
    cycleId: "cycle-q2-2026", cycleName: "Q2 2026 (Apr–Jun)", cycleType: "quarterly",
    status: "manager_reviewed",
    kpis: makeKPIs(SALES_KPI_TEMPLATE, "james-q2", true, true),
    employeeNotes: "Team is on track.", submittedAt: "2026-05-16T09:00:00Z",
    managerReviewerId: "demo-hr-001", managerReviewerName: "Priya Patel",
    managerNotes: "James continues to lead effectively.", managerCheckinNotes: null, managerReviewedAt: "2026-05-18T14:00:00Z",
    hrReviewerId: null, hrReviewerName: null, hrNotes: null, hrApprovedAt: null,
    employeeAcknowledgedAt: null, gmReviewerId: null, gmReviewerName: null, gmNotes: null, gmApprovedAt: null,
    incentiveGateCleared: false, createdAt: "2026-04-02T08:00:00Z", updatedAt: "2026-05-18T14:00:00Z",
    employee: { id: "demo-manager-001", firstName: "James", lastName: "Naidoo", department: "Sales", jobTitle: "Sales Team Lead" },
  },
  // ── Priya Patel ───────────────────────────────────────────────────────────
  {
    id: "rev-priya-q2", employeeId: "demo-hr-001",
    cycleId: "cycle-q2-2026", cycleName: "Q2 2026 (Apr–Jun)", cycleType: "quarterly",
    status: "draft",
    kpis: makeKPIs(HR_KPI_TEMPLATE, "priya-q2", false, false),
    employeeNotes: null, submittedAt: null,
    managerReviewerId: null, managerReviewerName: null, managerNotes: null, managerCheckinNotes: null, managerReviewedAt: null,
    hrReviewerId: null, hrReviewerName: null, hrNotes: null, hrApprovedAt: null,
    employeeAcknowledgedAt: null, gmReviewerId: null, gmReviewerName: null, gmNotes: null, gmApprovedAt: null,
    incentiveGateCleared: false, createdAt: "2026-04-02T08:00:00Z", updatedAt: "2026-04-02T08:00:00Z",
    employee: { id: "demo-hr-001", firstName: "Priya", lastName: "Patel", department: "Human Resources", jobTitle: "HR Manager" },
  },
  // ── Michael van der Berg ──────────────────────────────────────────────────
  {
    id: "rev-michael-q2", employeeId: "demo-executive-001",
    cycleId: "cycle-q2-2026", cycleName: "Q2 2026 (Apr–Jun)", cycleType: "quarterly",
    status: "draft",
    kpis: makeKPIs(GENERAL_KPI_TEMPLATE, "michael-q2", false, false),
    employeeNotes: null, submittedAt: null,
    managerReviewerId: null, managerReviewerName: null, managerNotes: null, managerCheckinNotes: null, managerReviewedAt: null,
    hrReviewerId: null, hrReviewerName: null, hrNotes: null, hrApprovedAt: null,
    employeeAcknowledgedAt: null, gmReviewerId: null, gmReviewerName: null, gmNotes: null, gmApprovedAt: null,
    incentiveGateCleared: false, createdAt: "2026-04-02T08:00:00Z", updatedAt: "2026-04-02T08:00:00Z",
    employee: { id: "demo-executive-001", firstName: "Michael", lastName: "van der Berg", department: "Executive", jobTitle: "General Manager" },
  },
  // ── Tricia Williams ───────────────────────────────────────────────────────
  {
    id: "rev-tricia-q2", employeeId: "demo-admin-001",
    cycleId: "cycle-q2-2026", cycleName: "Q2 2026 (Apr–Jun)", cycleType: "quarterly",
    status: "submitted",
    kpis: makeKPIs(GENERAL_KPI_TEMPLATE, "tricia-q2", true, false),
    employeeNotes: "Platform migration in progress.", submittedAt: "2026-05-17T08:30:00Z",
    managerReviewerId: null, managerReviewerName: null, managerNotes: null, managerCheckinNotes: null, managerReviewedAt: null,
    hrReviewerId: null, hrReviewerName: null, hrNotes: null, hrApprovedAt: null,
    employeeAcknowledgedAt: null, gmReviewerId: null, gmReviewerName: null, gmNotes: null, gmApprovedAt: null,
    incentiveGateCleared: false, createdAt: "2026-04-02T08:00:00Z", updatedAt: "2026-05-17T08:30:00Z",
    employee: { id: "demo-admin-001", firstName: "Tricia", lastName: "Williams", department: "Administration", jobTitle: "System Administrator" },
  },
]

// ── localStorage persistence for demo mode ───────────────────────────────────

const STORAGE_KEY = "nexus-perf-reviews"

function loadDemoReviews(): PerformanceReview[] {
  if (typeof window === "undefined") return BASE_MOCK_REVIEWS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return BASE_MOCK_REVIEWS
    const saved: Record<string, PerformanceReview> = JSON.parse(raw)
    return BASE_MOCK_REVIEWS.map(r => saved[r.id] ?? r)
  } catch {
    return BASE_MOCK_REVIEWS
  }
}

function saveDemoReviews(reviews: PerformanceReview[]): void {
  if (typeof window === "undefined") return
  try {
    const map: Record<string, PerformanceReview> = {}
    reviews.forEach(r => { map[r.id] = r })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch { /* ignore */ }
}

function mutateDemoReview(id: string, patch: Partial<PerformanceReview>): void {
  const reviews = loadDemoReviews()
  const all = reviews.map(r => r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)
  // Handle new reviews not in BASE_MOCK_REVIEWS
  if (!all.find(r => r.id === id)) {
    const map: Record<string, PerformanceReview> = {}
    all.forEach(r => { map[r.id] = r })
    // Was a newly inserted review - add it
  }
  saveDemoReviews(all)
}

// ── Public service functions ──────────────────────────────────────────────────

export async function getPerformanceCycles(): Promise<PerformanceCycle[]> {
  if (!isDbConfigured()) return PERFORMANCE_CYCLES
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('performance_cycles')
      .select('*')
      .order('is_active', { ascending: false })
      .order('start_date', { ascending: true })
    if (error || !data) {
      console.error('getPerformanceCycles:', error)
      return PERFORMANCE_CYCLES
    }
    return (data as any[]).map(c => ({
      id:        c.id,
      name:      c.name,
      type:      c.type as CycleType,
      startDate: c.start_date,
      endDate:   c.end_date,
      year:      c.year,
      isActive:  c.is_active,
    }))
  } catch (err) {
    console.error('getPerformanceCycles error:', err)
    return PERFORMANCE_CYCLES
  }
}

export async function getMyReview(userId: string, cycleId: string): Promise<PerformanceReview | null> {
  if (!isDbConfigured()) {
    return loadDemoReviews().find(r => r.employeeId === userId && r.cycleId === cycleId) ?? null
  }
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('performance_reviews')
      .select('*, cycle:performance_cycles(name, type)')
      .eq('employee_id', userId)
      .eq('cycle_id', cycleId)
      .maybeSingle()
    if (error) { console.error('getMyReview:', error); return null }
    if (!data) return null
    return mapReview(data)
  } catch (err) {
    console.error('getMyReview error:', err)
    return null
  }
}

export async function getCycleReviews(cycleId: string): Promise<PerformanceReview[]> {
  if (!isDbConfigured()) {
    return loadDemoReviews().filter(r => r.cycleId === cycleId)
  }
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('performance_reviews')
      .select(`
        *,
        cycle:performance_cycles(name, type),
        employee:employees!performance_reviews_employee_id_fkey(id, first_name, last_name, department, job_title)
      `)
      .eq('cycle_id', cycleId)
    if (error) { console.error('getCycleReviews:', error); return [] }
    return ((data as any[]) ?? []).map(mapReview)
  } catch (err) {
    console.error('getCycleReviews error:', err)
    return []
  }
}

export async function getTeamReviews(managerId: string, cycleId: string): Promise<PerformanceReview[]> {
  if (!isDbConfigured()) {
    const all = loadDemoReviews().filter(r => r.cycleId === cycleId)
    if (managerId === "demo-manager-001") {
      return all.filter(r => r.employeeId === "demo-employee-001")
    }
    return all.filter(r => r.employeeId !== managerId)
  }
  try {
    const supabase = createClient()

    // 1. Get team members who report to this manager
    const { data: members, error: membersErr } = await (supabase as any)
      .from('employees')
      .select('id')
      .eq('manager_id', managerId)
      .eq('is_active', true)

    if (membersErr) { console.error('getTeamReviews - members:', membersErr); return [] }
    if (!members || (members as any[]).length === 0) return []

    const memberIds = (members as any[]).map((m: any) => m.id)

    // 2. Get their reviews for the cycle
    const { data, error } = await (supabase as any)
      .from('performance_reviews')
      .select(`
        *,
        cycle:performance_cycles(name, type),
        employee:employees!performance_reviews_employee_id_fkey(id, first_name, last_name, department, job_title)
      `)
      .in('employee_id', memberIds)
      .eq('cycle_id', cycleId)

    if (error) { console.error('getTeamReviews - reviews:', error); return [] }
    return ((data as any[]) ?? []).map(mapReview)
  } catch (err) {
    console.error('getTeamReviews error:', err)
    return []
  }
}

export async function getTeamMembers(
  managerId: string,
): Promise<Array<{ id: string; firstName: string; lastName: string; department: string | null; jobTitle: string | null }>> {
  if (!isDbConfigured()) {
    // Demo: James manages Sarah
    if (managerId === "demo-manager-001") {
      return [{ id: "demo-employee-001", firstName: "Sarah", lastName: "Dlamini", department: "Sales", jobTitle: "Sales Consultant" }]
    }
    return []
  }
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('employees')
      .select('id, first_name, last_name, department, job_title')
      .eq('manager_id', managerId)
      .eq('is_active', true)
    if (error) { console.error('getTeamMembers:', error); return [] }
    return ((data as any[]) ?? []).map((m: any) => ({
      id:         m.id,
      firstName:  m.first_name,
      lastName:   m.last_name,
      department: m.department ?? null,
      jobTitle:   m.job_title  ?? null,
    }))
  } catch (err) {
    console.error('getTeamMembers error:', err)
    return []
  }
}

// Creates a new draft KPI review for the given employee in the given cycle
export async function createReview(userId: string, cycleId: string): Promise<PerformanceReview | null> {
  if (!isDbConfigured()) {
    // Demo: not supported for new reviews
    return null
  }
  try {
    const supabase = createClient()

    // Get employee info to pick KPI template
    const { data: emp } = await (supabase as any)
      .from('employees')
      .select('id, first_name, last_name, role, job_title, department')
      .eq('id', userId)
      .maybeSingle()

    const kpis = getKpiTemplateForEmployee(emp ? {
      role:       emp.role,
      jobTitle:   emp.job_title,
      department: emp.department,
    } : null)

    const { data, error } = await (supabase as any)
      .from('performance_reviews')
      .insert({ employee_id: userId, cycle_id: cycleId, status: 'draft', kpis })
      .select('*, cycle:performance_cycles(name, type)')
      .single()

    if (error) { console.error('createReview:', error); return null }

    void writePerformanceAudit({
      reviewId:     data.id,
      employeeId:   userId,
      employeeName: emp ? `${emp.first_name} ${emp.last_name}` : userId,
      actorId:      userId,
      actorName:    emp ? `${emp.first_name} ${emp.last_name}` : userId,
      action:       'created',
      fromStatus:   null,
      toStatus:     'draft',
      cycleName:    data.cycle?.name ?? null,
    })

    return mapReview(data)
  } catch (err) {
    console.error('createReview error:', err)
    return null
  }
}

// Manager creates a monthly check-in for a team member
export async function createMonthlyCheckin(params: {
  managerId: string
  managerName: string
  employeeId: string
  cycleId: string
  checkinNotes: string
}): Promise<{ success: boolean; review?: PerformanceReview; error?: string }> {
  if (!isDbConfigured()) {
    // Demo: create in localStorage
    const cycleInfo = PERFORMANCE_CYCLES.find(c => c.id === params.cycleId)
    const newReview: PerformanceReview = {
      id: `rev-monthly-${Date.now()}`,
      employeeId: params.employeeId,
      cycleId: params.cycleId,
      cycleName: cycleInfo?.name ?? params.cycleId,
      cycleType: "monthly",
      status: "submitted",
      kpis: [],
      employeeNotes: null, submittedAt: new Date().toISOString(),
      managerReviewerId: params.managerId, managerReviewerName: params.managerName,
      managerNotes: null, managerCheckinNotes: params.checkinNotes,
      managerReviewedAt: new Date().toISOString(),
      hrReviewerId: null, hrReviewerName: null, hrNotes: null, hrApprovedAt: null,
      employeeAcknowledgedAt: null, gmReviewerId: null, gmReviewerName: null, gmNotes: null, gmApprovedAt: null,
      incentiveGateCleared: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    const all = loadDemoReviews()
    saveDemoReviews([...all, newReview])
    return { success: true, review: newReview }
  }
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('performance_reviews')
      .insert({
        employee_id:           params.employeeId,
        cycle_id:              params.cycleId,
        status:                'submitted',
        kpis:                  [],
        manager_reviewer_id:   params.managerId,
        manager_reviewer_name: params.managerName,
        manager_checkin_notes: params.checkinNotes,
        manager_reviewed_at:   new Date().toISOString(),
        submitted_at:          new Date().toISOString(),
      })
      .select('*, cycle:performance_cycles(name, type)')
      .single()
    if (error) { console.error('createMonthlyCheckin:', error); return { success: false, error: error.message } }
    return { success: true, review: mapReview(data) }
  } catch (err: any) {
    console.error('createMonthlyCheckin error:', err)
    return { success: false, error: err?.message ?? 'Unknown error' }
  }
}

// Manager updates draft check-in notes (before submitting)
export async function updateMonthlyCheckin(
  reviewId: string,
  checkinNotes: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) {
    mutateDemoReview(reviewId, { managerCheckinNotes: checkinNotes })
    return { success: true }
  }
  try {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('performance_reviews')
      .update({ manager_checkin_notes: checkinNotes, updated_at: new Date().toISOString() })
      .eq('id', reviewId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Unknown error' }
  }
}

// Employee acknowledges a monthly check-in
export async function employeeAcknowledge(
  reviewId: string,
  employeeId: string,
  audit?: { employeeName: string; cycleName?: string },
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) {
    mutateDemoReview(reviewId, {
      status: "acknowledged",
      employeeAcknowledgedAt: new Date().toISOString(),
    })
    return { success: true }
  }
  try {
    const supabase = createClient()
    const now = new Date().toISOString()
    const { error } = await (supabase as any)
      .from('performance_reviews')
      .update({
        status:                    'acknowledged',
        employee_acknowledged_at:  now,
        updated_at:                now,
      })
      .eq('id', reviewId)
      .eq('employee_id', employeeId)
    if (error) { console.error('employeeAcknowledge:', error); return { success: false, error: error.message } }
    if (audit) {
      void writePerformanceAudit({
        reviewId,
        employeeId,
        employeeName: audit.employeeName,
        actorId:      employeeId,
        actorName:    audit.employeeName,
        action:       'acknowledged',
        fromStatus:   'submitted',
        toStatus:     'acknowledged',
        cycleName:    audit.cycleName ?? null,
      })
    }
    return { success: true }
  } catch (err: any) {
    console.error('employeeAcknowledge error:', err)
    return { success: false, error: err?.message ?? 'Unknown error' }
  }
}

export async function saveDraftKPIs(
  reviewId: string,
  kpis: KPIEntry[],
  employeeNotes: string | null,
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) {
    mutateDemoReview(reviewId, { kpis, employeeNotes, status: "draft" })
    return { success: true }
  }
  try {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('performance_reviews')
      .update({ kpis, employee_notes: employeeNotes, updated_at: new Date().toISOString() })
      .eq('id', reviewId)
    if (error) { console.error('saveDraftKPIs:', error); return { success: false, error: error.message } }
    return { success: true }
  } catch (err: any) {
    console.error('saveDraftKPIs error:', err)
    return { success: false, error: err?.message ?? 'Unknown error' }
  }
}

export async function submitReview(
  reviewId: string,
  kpis: KPIEntry[],
  employeeNotes: string | null,
  audit?: { employeeId: string; employeeName: string; cycleName?: string },
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) {
    mutateDemoReview(reviewId, {
      kpis, employeeNotes, status: "submitted",
      submittedAt: new Date().toISOString(),
    })
    if (audit) {
      void writePerformanceAudit({
        reviewId, employeeId: audit.employeeId, employeeName: audit.employeeName,
        actorId: audit.employeeId, actorName: audit.employeeName,
        action: 'submitted', fromStatus: 'draft', toStatus: 'submitted', cycleName: audit.cycleName ?? null,
      })
    }
    return { success: true }
  }
  try {
    const supabase = createClient()
    const now = new Date().toISOString()
    const { error } = await (supabase as any)
      .from('performance_reviews')
      .update({ kpis, employee_notes: employeeNotes, status: 'submitted', submitted_at: now, updated_at: now })
      .eq('id', reviewId)
    if (error) { console.error('submitReview:', error); return { success: false, error: error.message } }
    if (audit) {
      void writePerformanceAudit({
        reviewId, employeeId: audit.employeeId, employeeName: audit.employeeName,
        actorId: audit.employeeId, actorName: audit.employeeName,
        action: 'submitted', fromStatus: 'draft', toStatus: 'submitted', cycleName: audit.cycleName ?? null,
      })
    }
    return { success: true }
  } catch (err: any) {
    console.error('submitReview error:', err)
    return { success: false, error: err?.message ?? 'Unknown error' }
  }
}

export async function managerReviewSubmit(
  reviewId: string,
  reviewerId: string,
  reviewerName: string,
  kpisWithRatings: KPIEntry[],
  managerNotes: string,
  audit?: { employeeId: string; employeeName: string; cycleName?: string },
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) {
    mutateDemoReview(reviewId, {
      kpis: kpisWithRatings,
      managerReviewerId: reviewerId, managerReviewerName: reviewerName,
      managerNotes, managerReviewedAt: new Date().toISOString(),
      status: "manager_reviewed",
    })
    if (audit) {
      void writePerformanceAudit({
        reviewId, employeeId: audit.employeeId, employeeName: audit.employeeName,
        actorId: reviewerId, actorName: reviewerName,
        action: 'manager_reviewed', fromStatus: 'submitted', toStatus: 'manager_reviewed',
        cycleName: audit.cycleName ?? null, notes: managerNotes || null,
      })
    }
    return { success: true }
  }
  try {
    const supabase = createClient()
    const now = new Date().toISOString()
    const { error } = await (supabase as any)
      .from('performance_reviews')
      .update({
        kpis: kpisWithRatings,
        manager_reviewer_id:   reviewerId,
        manager_reviewer_name: reviewerName,
        manager_notes:         managerNotes,
        manager_reviewed_at:   now,
        status:                'manager_reviewed',
        updated_at:            now,
      })
      .eq('id', reviewId)
    if (error) { console.error('managerReviewSubmit:', error); return { success: false, error: error.message } }
    if (audit) {
      void writePerformanceAudit({
        reviewId, employeeId: audit.employeeId, employeeName: audit.employeeName,
        actorId: reviewerId, actorName: reviewerName,
        action: 'manager_reviewed', fromStatus: 'submitted', toStatus: 'manager_reviewed',
        cycleName: audit.cycleName ?? null, notes: managerNotes || null,
      })
    }
    return { success: true }
  } catch (err: any) {
    console.error('managerReviewSubmit error:', err)
    return { success: false, error: err?.message ?? 'Unknown error' }
  }
}

export async function hrApprove(
  reviewId: string,
  reviewerId: string,
  reviewerName: string,
  hrNotes: string,
  audit?: { employeeId: string; employeeName: string; cycleName?: string; cycleType?: CycleType },
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) {
    mutateDemoReview(reviewId, {
      hrReviewerId: reviewerId, hrReviewerName: reviewerName,
      hrNotes, hrApprovedAt: new Date().toISOString(),
      status: "hr_approved",
      incentiveGateCleared: audit?.cycleType !== 'annual', // annual needs GM too
    })
    if (audit) {
      void writePerformanceAudit({
        reviewId, employeeId: audit.employeeId, employeeName: audit.employeeName,
        actorId: reviewerId, actorName: reviewerName,
        action: 'hr_approved', fromStatus: 'manager_reviewed', toStatus: 'hr_approved',
        cycleName: audit.cycleName ?? null, notes: hrNotes || null,
      })
    }
    return { success: true }
  }
  try {
    const supabase = createClient()
    const now = new Date().toISOString()
    const isAnnual = audit?.cycleType === 'annual'
    const { error } = await (supabase as any)
      .from('performance_reviews')
      .update({
        hr_reviewer_id:   reviewerId,
        hr_reviewer_name: reviewerName,
        hr_notes:         hrNotes,
        hr_approved_at:   now,
        status:           'hr_approved',
        // For non-annual, gate clears here. For annual, it clears at GM approval.
        incentive_gate_cleared: !isAnnual,
        updated_at:       now,
      })
      .eq('id', reviewId)
    if (error) { console.error('hrApprove:', error); return { success: false, error: error.message } }
    if (audit) {
      void writePerformanceAudit({
        reviewId, employeeId: audit.employeeId, employeeName: audit.employeeName,
        actorId: reviewerId, actorName: reviewerName,
        action: 'hr_approved', fromStatus: 'manager_reviewed', toStatus: 'hr_approved',
        cycleName: audit.cycleName ?? null, notes: hrNotes || null,
      })
    }
    return { success: true }
  } catch (err: any) {
    console.error('hrApprove error:', err)
    return { success: false, error: err?.message ?? 'Unknown error' }
  }
}

// GM/Executive final approval for annual reviews
export async function gmApprove(
  reviewId: string,
  reviewerId: string,
  reviewerName: string,
  gmNotes: string,
  audit?: { employeeId: string; employeeName: string; cycleName?: string },
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) {
    mutateDemoReview(reviewId, {
      gmReviewerId: reviewerId, gmReviewerName: reviewerName,
      gmNotes, gmApprovedAt: new Date().toISOString(),
      status: "gm_approved",
      incentiveGateCleared: true,
    })
    if (audit) {
      void writePerformanceAudit({
        reviewId, employeeId: audit.employeeId, employeeName: audit.employeeName,
        actorId: reviewerId, actorName: reviewerName,
        action: 'gm_approved', fromStatus: 'hr_approved', toStatus: 'gm_approved',
        cycleName: audit.cycleName ?? null, notes: gmNotes || null,
      })
    }
    return { success: true }
  }
  try {
    const supabase = createClient()
    const now = new Date().toISOString()
    const { error } = await (supabase as any)
      .from('performance_reviews')
      .update({
        gm_reviewer_id:   reviewerId,
        gm_reviewer_name: reviewerName,
        gm_notes:         gmNotes,
        gm_approved_at:   now,
        status:           'gm_approved',
        incentive_gate_cleared: true,
        updated_at:       now,
      })
      .eq('id', reviewId)
    if (error) { console.error('gmApprove:', error); return { success: false, error: error.message } }
    if (audit) {
      void writePerformanceAudit({
        reviewId, employeeId: audit.employeeId, employeeName: audit.employeeName,
        actorId: reviewerId, actorName: reviewerName,
        action: 'gm_approved', fromStatus: 'hr_approved', toStatus: 'gm_approved',
        cycleName: audit.cycleName ?? null, notes: gmNotes || null,
      })
    }
    return { success: true }
  } catch (err: any) {
    console.error('gmApprove error:', err)
    return { success: false, error: err?.message ?? 'Unknown error' }
  }
}

export async function getIncentiveGateStatus(
  cycleId: string,
  cycleType?: CycleType,
): Promise<IncentiveGateStatus> {
  const finalStatus: ReviewStatus = cycleType === 'annual' ? 'gm_approved' : 'hr_approved'

  if (!isDbConfigured()) {
    const reviews = loadDemoReviews().filter(r => r.cycleId === cycleId)
    const approved = reviews.filter(r => r.status === finalStatus).length
    return {
      cycleId, total: reviews.length, approved,
      pending: reviews.length - approved,
      blocked: approved < reviews.length,
      breakdown: reviews.map(r => ({
        employeeId: r.employeeId,
        employeeName: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId,
        status: r.status,
      })),
    }
  }
  try {
    const supabase = createClient()

    // Step 1 — fetch reviews (status + employee_id only, no FK join)
    const { data: reviewData, error: reviewErr } = await (supabase as any)
      .from('performance_reviews')
      .select('id, employee_id, status')
      .eq('cycle_id', cycleId)
    if (reviewErr) console.error('getIncentiveGateStatus reviews:', reviewErr)
    const reviews: any[] = reviewData ?? []

    // Step 2 — fetch employee names in a separate query
    const empIds: string[] = [...new Set<string>(reviews.map((r: any) => r.employee_id as string))]
    const empMap: Record<string, string> = {}
    if (empIds.length > 0) {
      const { data: emps, error: empErr } = await (supabase as any)
        .from('employees')
        .select('id, first_name, last_name')
        .in('id', empIds)
      if (empErr) console.error('getIncentiveGateStatus employees:', empErr)
      for (const e of emps ?? []) {
        empMap[e.id] = `${e.first_name} ${e.last_name}`
      }
    }

    const approved = reviews.filter((r: any) => r.status === finalStatus).length
    return {
      cycleId,
      total:   reviews.length,
      approved,
      pending: reviews.length - approved,
      blocked: approved < reviews.length,
      breakdown: reviews.map((r: any) => ({
        employeeId:   r.employee_id,
        employeeName: empMap[r.employee_id] ?? r.employee_id,
        status:       r.status as ReviewStatus,
      })),
    }
  } catch (err) {
    console.error('getIncentiveGateStatus error:', err)
    return { cycleId, total: 0, approved: 0, pending: 0, blocked: true, breakdown: [] }
  }
}
