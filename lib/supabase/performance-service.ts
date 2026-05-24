import { createClient } from "@/lib/supabase/client"

export type CycleType = "monthly" | "quarterly" | "biannual" | "annual"
export type ReviewStatus = "draft" | "submitted" | "manager_reviewed" | "hr_approved"

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
  status: ReviewStatus
  kpis: KPIEntry[]
  employeeNotes: string | null
  submittedAt: string | null
  managerReviewerId: string | null
  managerReviewerName: string | null
  managerNotes: string | null
  managerReviewedAt: string | null
  hrReviewerId: string | null
  hrReviewerName: string | null
  hrNotes: string | null
  hrApprovedAt: string | null
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

// ── Performance audit helper ──────────────────────────────────────────────────

async function writePerformanceAudit(params: {
  reviewId?: string | null
  employeeId: string
  employeeName: string
  actorId: string
  actorName: string
  action: 'created' | 'draft_saved' | 'submitted' | 'manager_reviewed' | 'hr_approved'
  fromStatus?: string | null
  toStatus?: string | null
  cycleName?: string | null
  notes?: string | null
}): Promise<void> {
  if (!isDbConfigured()) return
  try {
    const supabase = createClient()
    await (supabase as any).from('performance_audit').insert({
      review_id:     params.reviewId ?? null,
      employee_id:   params.employeeId,
      employee_name: params.employeeName,
      actor_id:      params.actorId,
      actor_name:    params.actorName,
      action:        params.action,
      from_status:   params.fromStatus ?? null,
      to_status:     params.toStatus ?? null,
      cycle_name:    params.cycleName ?? null,
      notes:         params.notes ?? null,
    })
  } catch (err) {
    console.error('writePerformanceAudit failed:', err)
  }
}

// ── Static cycle catalogue ───────────────────────────────────────────────────

export const PERFORMANCE_CYCLES: PerformanceCycle[] = [
  { id: "cycle-q1-2026", name: "Q1 2026 (Jan–Mar)", type: "quarterly", startDate: "2026-01-01", endDate: "2026-03-31", year: 2026, isActive: false },
  { id: "cycle-q2-2026", name: "Q2 2026 (Apr–Jun)", type: "quarterly", startDate: "2026-04-01", endDate: "2026-06-30", year: 2026, isActive: true  },
]

// ── KPI templates per role ───────────────────────────────────────────────────

const SALES_KPI_TEMPLATE: Omit<KPIEntry, "id" | "actual" | "managerRating" | "managerComment">[] = [
  { title: "Revenue Target Achievement",   description: "% of monthly revenue target met",          target: "100% of target",    weight: 40 },
  { title: "New Client Acquisition",       description: "Number of new clients onboarded",           target: "3 new clients",     weight: 25 },
  { title: "Customer Satisfaction (CSAT)", description: "Average customer satisfaction score",       target: "≥ 4.0 / 5.0",      weight: 20 },
  { title: "Reporting & Admin Compliance", description: "CRM updated daily; reports submitted on time", target: "100% on time",  weight: 15 },
]

const HR_KPI_TEMPLATE: Omit<KPIEntry, "id" | "actual" | "managerRating" | "managerComment">[] = [
  { title: "Recruitment Cycle Time",       description: "Average days from posting to offer",        target: "≤ 30 days",         weight: 30 },
  { title: "Leave Policy Compliance",      description: "% of leave requests processed within SLA",  target: "100% within 48h",   weight: 25 },
  { title: "Employee Query Resolution",    description: "HR queries resolved within 2 working days", target: "≥ 95%",             weight: 25 },
  { title: "Training Completion Rate",     description: "Mandatory training completed by employees", target: "100% by quarter end",weight: 20 },
]

const GENERAL_KPI_TEMPLATE: Omit<KPIEntry, "id" | "actual" | "managerRating" | "managerComment">[] = [
  { title: "Deliverable Completion Rate",  description: "Planned deliverables completed on time",    target: "≥ 90%",             weight: 35 },
  { title: "Stakeholder Satisfaction",     description: "Score from quarterly stakeholder survey",   target: "≥ 4.0 / 5.0",      weight: 25 },
  { title: "Process Improvement Initiative", description: "Identify and document 1 process improvement", target: "1 per quarter", weight: 20 },
  { title: "Mandatory Training",           description: "All assigned compliance training completed", target: "100%",             weight: 20 },
]

function makeKPIs(template: typeof SALES_KPI_TEMPLATE, prefix: string, filled: boolean, managerDone: boolean): KPIEntry[] {
  return template.map((t, i) => ({
    id: `${prefix}-kpi-${i + 1}`,
    ...t,
    actual: filled ? ["Achieved 108% of target", "4 new clients onboarded", "4.3 / 5.0", "100% submitted on time"][i] ?? "Completed" : null,
    managerRating: managerDone ? [5, 4, 4, 5][i] ?? 4 : null,
    managerComment: managerDone ? ["Excellent — exceeded target.", "Strong performance.", "Good result.", "No issues."][i] ?? null : null,
  }))
}

// ── Mock reviews ─────────────────────────────────────────────────────────────

const BASE_MOCK_REVIEWS: PerformanceReview[] = [
  // ── Sarah Dlamini (employee) ──────────────────────────────────────────────
  {
    id: "rev-sarah-q1",
    employeeId: "demo-employee-001",
    cycleId: "cycle-q1-2026",
    cycleName: "Q1 2026 (Jan–Mar)",
    status: "hr_approved",
    kpis: makeKPIs(SALES_KPI_TEMPLATE, "sarah-q1", true, true),
    employeeNotes: "Strong quarter — exceeded revenue target. Client relationships are solid.",
    submittedAt: "2026-04-03T09:00:00Z",
    managerReviewerId: "demo-manager-001",
    managerReviewerName: "James Naidoo",
    managerNotes: "Sarah delivered consistently this quarter. Recommend full incentive release.",
    managerReviewedAt: "2026-04-07T14:00:00Z",
    hrReviewerId: "demo-hr-001",
    hrReviewerName: "Priya Patel",
    hrNotes: "Reviewed and approved. Incentive gate cleared.",
    hrApprovedAt: "2026-04-10T11:00:00Z",
    incentiveGateCleared: true,
    createdAt: "2026-01-02T08:00:00Z",
    updatedAt: "2026-04-10T11:00:00Z",
    employee: { id: "demo-employee-001", firstName: "Sarah", lastName: "Dlamini", department: "Sales", jobTitle: "Sales Consultant" },
  },
  {
    id: "rev-sarah-q2",
    employeeId: "demo-employee-001",
    cycleId: "cycle-q2-2026",
    cycleName: "Q2 2026 (Apr–Jun)",
    status: "submitted",
    kpis: makeKPIs(SALES_KPI_TEMPLATE, "sarah-q2", true, false),
    employeeNotes: "Good progress so far. Client pipeline is strong for the remainder of the quarter.",
    submittedAt: "2026-05-19T10:00:00Z",
    managerReviewerId: null,
    managerReviewerName: null,
    managerNotes: null,
    managerReviewedAt: null,
    hrReviewerId: null,
    hrReviewerName: null,
    hrNotes: null,
    hrApprovedAt: null,
    incentiveGateCleared: false,
    createdAt: "2026-04-02T08:00:00Z",
    updatedAt: "2026-05-19T10:00:00Z",
    employee: { id: "demo-employee-001", firstName: "Sarah", lastName: "Dlamini", department: "Sales", jobTitle: "Sales Consultant" },
  },

  // ── James Naidoo (line_manager) ───────────────────────────────────────────
  {
    id: "rev-james-q1",
    employeeId: "demo-manager-001",
    cycleId: "cycle-q1-2026",
    cycleName: "Q1 2026 (Jan–Mar)",
    status: "hr_approved",
    kpis: makeKPIs(SALES_KPI_TEMPLATE, "james-q1", true, true),
    employeeNotes: "Team hit all targets. Focused on coaching junior staff this quarter.",
    submittedAt: "2026-04-02T08:30:00Z",
    managerReviewerId: "demo-hr-001",
    managerReviewerName: "Priya Patel",
    managerNotes: "James is performing well as team lead. Targets met across the board.",
    managerReviewedAt: "2026-04-08T10:00:00Z",
    hrReviewerId: "demo-hr-001",
    hrReviewerName: "Priya Patel",
    hrNotes: "Approved. Gate cleared.",
    hrApprovedAt: "2026-04-10T11:30:00Z",
    incentiveGateCleared: true,
    createdAt: "2026-01-02T08:00:00Z",
    updatedAt: "2026-04-10T11:30:00Z",
    employee: { id: "demo-manager-001", firstName: "James", lastName: "Naidoo", department: "Sales", jobTitle: "Sales Team Lead" },
  },
  {
    id: "rev-james-q2",
    employeeId: "demo-manager-001",
    cycleId: "cycle-q2-2026",
    cycleName: "Q2 2026 (Apr–Jun)",
    status: "manager_reviewed",
    kpis: makeKPIs(SALES_KPI_TEMPLATE, "james-q2", true, true),
    employeeNotes: "Team is on track. Onboarding two new consultants this quarter.",
    submittedAt: "2026-05-16T09:00:00Z",
    managerReviewerId: "demo-hr-001",
    managerReviewerName: "Priya Patel",
    managerNotes: "James continues to lead the team effectively. Awaiting HR sign-off.",
    managerReviewedAt: "2026-05-18T14:00:00Z",
    hrReviewerId: null,
    hrReviewerName: null,
    hrNotes: null,
    hrApprovedAt: null,
    incentiveGateCleared: false,
    createdAt: "2026-04-02T08:00:00Z",
    updatedAt: "2026-05-18T14:00:00Z",
    employee: { id: "demo-manager-001", firstName: "James", lastName: "Naidoo", department: "Sales", jobTitle: "Sales Team Lead" },
  },

  // ── Priya Patel (hr_manager) ──────────────────────────────────────────────
  {
    id: "rev-priya-q1",
    employeeId: "demo-hr-001",
    cycleId: "cycle-q1-2026",
    cycleName: "Q1 2026 (Jan–Mar)",
    status: "hr_approved",
    kpis: makeKPIs(HR_KPI_TEMPLATE, "priya-q1", true, true),
    employeeNotes: "Recruitment and compliance metrics met. Policy updates rolled out successfully.",
    submittedAt: "2026-04-03T09:30:00Z",
    managerReviewerId: "demo-admin-001",
    managerReviewerName: "Tricia Williams",
    managerNotes: "Priya has managed HR operations effectively this quarter.",
    managerReviewedAt: "2026-04-09T10:00:00Z",
    hrReviewerId: "demo-admin-001",
    hrReviewerName: "Tricia Williams",
    hrNotes: "Approved.",
    hrApprovedAt: "2026-04-11T09:00:00Z",
    incentiveGateCleared: true,
    createdAt: "2026-01-02T08:00:00Z",
    updatedAt: "2026-04-11T09:00:00Z",
    employee: { id: "demo-hr-001", firstName: "Priya", lastName: "Patel", department: "Human Resources", jobTitle: "HR Manager" },
  },
  {
    id: "rev-priya-q2",
    employeeId: "demo-hr-001",
    cycleId: "cycle-q2-2026",
    cycleName: "Q2 2026 (Apr–Jun)",
    status: "draft",
    kpis: makeKPIs(HR_KPI_TEMPLATE, "priya-q2", false, false),
    employeeNotes: null,
    submittedAt: null,
    managerReviewerId: null,
    managerReviewerName: null,
    managerNotes: null,
    managerReviewedAt: null,
    hrReviewerId: null,
    hrReviewerName: null,
    hrNotes: null,
    hrApprovedAt: null,
    incentiveGateCleared: false,
    createdAt: "2026-04-02T08:00:00Z",
    updatedAt: "2026-04-02T08:00:00Z",
    employee: { id: "demo-hr-001", firstName: "Priya", lastName: "Patel", department: "Human Resources", jobTitle: "HR Manager" },
  },

  // ── Michael van der Berg (executive) ─────────────────────────────────────
  {
    id: "rev-michael-q1",
    employeeId: "demo-executive-001",
    cycleId: "cycle-q1-2026",
    cycleName: "Q1 2026 (Jan–Mar)",
    status: "hr_approved",
    kpis: makeKPIs(GENERAL_KPI_TEMPLATE, "michael-q1", true, true),
    employeeNotes: "Strategic objectives for Q1 achieved. Business development pipeline strengthened.",
    submittedAt: "2026-04-02T07:00:00Z",
    managerReviewerId: "demo-hr-001",
    managerReviewerName: "Priya Patel",
    managerNotes: "Michael's leadership is driving strong results across departments.",
    managerReviewedAt: "2026-04-09T11:00:00Z",
    hrReviewerId: "demo-hr-001",
    hrReviewerName: "Priya Patel",
    hrNotes: "Approved. Gate cleared.",
    hrApprovedAt: "2026-04-11T10:00:00Z",
    incentiveGateCleared: true,
    createdAt: "2026-01-02T08:00:00Z",
    updatedAt: "2026-04-11T10:00:00Z",
    employee: { id: "demo-executive-001", firstName: "Michael", lastName: "van der Berg", department: "Executive", jobTitle: "General Manager" },
  },
  {
    id: "rev-michael-q2",
    employeeId: "demo-executive-001",
    cycleId: "cycle-q2-2026",
    cycleName: "Q2 2026 (Apr–Jun)",
    status: "draft",
    kpis: makeKPIs(GENERAL_KPI_TEMPLATE, "michael-q2", false, false),
    employeeNotes: null,
    submittedAt: null,
    managerReviewerId: null,
    managerReviewerName: null,
    managerNotes: null,
    managerReviewedAt: null,
    hrReviewerId: null,
    hrReviewerName: null,
    hrNotes: null,
    hrApprovedAt: null,
    incentiveGateCleared: false,
    createdAt: "2026-04-02T08:00:00Z",
    updatedAt: "2026-04-02T08:00:00Z",
    employee: { id: "demo-executive-001", firstName: "Michael", lastName: "van der Berg", department: "Executive", jobTitle: "General Manager" },
  },

  // ── Tricia Williams (system_admin) ────────────────────────────────────────
  {
    id: "rev-tricia-q1",
    employeeId: "demo-admin-001",
    cycleId: "cycle-q1-2026",
    cycleName: "Q1 2026 (Jan–Mar)",
    status: "hr_approved",
    kpis: makeKPIs(GENERAL_KPI_TEMPLATE, "tricia-q1", true, true),
    employeeNotes: "System uptime maintained. Onboarding processes improved.",
    submittedAt: "2026-04-03T10:00:00Z",
    managerReviewerId: "demo-hr-001",
    managerReviewerName: "Priya Patel",
    managerNotes: "Tricia manages admin operations reliably.",
    managerReviewedAt: "2026-04-09T09:00:00Z",
    hrReviewerId: "demo-hr-001",
    hrReviewerName: "Priya Patel",
    hrNotes: "Approved.",
    hrApprovedAt: "2026-04-11T09:30:00Z",
    incentiveGateCleared: true,
    createdAt: "2026-01-02T08:00:00Z",
    updatedAt: "2026-04-11T09:30:00Z",
    employee: { id: "demo-admin-001", firstName: "Tricia", lastName: "Williams", department: "Administration", jobTitle: "System Administrator" },
  },
  {
    id: "rev-tricia-q2",
    employeeId: "demo-admin-001",
    cycleId: "cycle-q2-2026",
    cycleName: "Q2 2026 (Apr–Jun)",
    status: "submitted",
    kpis: makeKPIs(GENERAL_KPI_TEMPLATE, "tricia-q2", true, false),
    employeeNotes: "Platform migration in progress. All SLAs met to date.",
    submittedAt: "2026-05-17T08:30:00Z",
    managerReviewerId: null,
    managerReviewerName: null,
    managerNotes: null,
    managerReviewedAt: null,
    hrReviewerId: null,
    hrReviewerName: null,
    hrNotes: null,
    hrApprovedAt: null,
    incentiveGateCleared: false,
    createdAt: "2026-04-02T08:00:00Z",
    updatedAt: "2026-05-17T08:30:00Z",
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
  const updated = reviews.map(r => r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)
  saveDemoReviews(updated)
}

// ── Public service functions ──────────────────────────────────────────────────

export async function getPerformanceCycles(): Promise<PerformanceCycle[]> {
  return PERFORMANCE_CYCLES
}

export async function getMyReview(userId: string, cycleId: string): Promise<PerformanceReview | null> {
  if (!isDbConfigured()) {
    return loadDemoReviews().find(r => r.employeeId === userId && r.cycleId === cycleId) ?? null
  }
  return null
}

export async function getCycleReviews(cycleId: string): Promise<PerformanceReview[]> {
  if (!isDbConfigured()) {
    return loadDemoReviews().filter(r => r.cycleId === cycleId)
  }
  return []
}

export async function getTeamReviews(managerId: string, cycleId: string): Promise<PerformanceReview[]> {
  // In demo, the sales team (Sarah) reports to James. Everyone else reports to HR/admin.
  // For HR/admin roles viewing "team", show all reviews.
  if (!isDbConfigured()) {
    const all = loadDemoReviews().filter(r => r.cycleId === cycleId)
    if (managerId === "demo-manager-001") {
      return all.filter(r => r.employeeId === "demo-employee-001")
    }
    // HR / admin see all except themselves in the team tab
    return all.filter(r => r.employeeId !== managerId)
  }
  return []
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
  return { success: false, error: "Database not configured" }
}

export async function submitReview(
  reviewId: string,
  kpis: KPIEntry[],
  employeeNotes: string | null,
  audit?: { employeeId: string; employeeName: string; cycleName?: string },
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) {
    mutateDemoReview(reviewId, {
      kpis,
      employeeNotes,
      status: "submitted",
      submittedAt: new Date().toISOString(),
    })
    if (audit) {
      void writePerformanceAudit({
        reviewId,
        employeeId:   audit.employeeId,
        employeeName: audit.employeeName,
        actorId:      audit.employeeId,
        actorName:    audit.employeeName,
        action:       'submitted',
        fromStatus:   'draft',
        toStatus:     'submitted',
        cycleName:    audit.cycleName ?? null,
      })
    }
    return { success: true }
  }
  return { success: false, error: "Database not configured" }
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
      managerReviewerId: reviewerId,
      managerReviewerName: reviewerName,
      managerNotes,
      managerReviewedAt: new Date().toISOString(),
      status: "manager_reviewed",
    })
    if (audit) {
      void writePerformanceAudit({
        reviewId,
        employeeId:   audit.employeeId,
        employeeName: audit.employeeName,
        actorId:      reviewerId,
        actorName:    reviewerName,
        action:       'manager_reviewed',
        fromStatus:   'submitted',
        toStatus:     'manager_reviewed',
        cycleName:    audit.cycleName ?? null,
        notes:        managerNotes || null,
      })
    }
    return { success: true }
  }
  return { success: false, error: "Database not configured" }
}

export async function hrApprove(
  reviewId: string,
  reviewerId: string,
  reviewerName: string,
  hrNotes: string,
  audit?: { employeeId: string; employeeName: string; cycleName?: string },
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) {
    mutateDemoReview(reviewId, {
      hrReviewerId: reviewerId,
      hrReviewerName: reviewerName,
      hrNotes,
      hrApprovedAt: new Date().toISOString(),
      status: "hr_approved",
      incentiveGateCleared: true,
    })
    if (audit) {
      void writePerformanceAudit({
        reviewId,
        employeeId:   audit.employeeId,
        employeeName: audit.employeeName,
        actorId:      reviewerId,
        actorName:    reviewerName,
        action:       'hr_approved',
        fromStatus:   'manager_reviewed',
        toStatus:     'hr_approved',
        cycleName:    audit.cycleName ?? null,
        notes:        hrNotes || null,
      })
    }
    return { success: true }
  }
  return { success: false, error: "Database not configured" }
}

export async function getIncentiveGateStatus(cycleId: string): Promise<IncentiveGateStatus> {
  const reviews = !isDbConfigured() ? loadDemoReviews().filter(r => r.cycleId === cycleId) : []
  const approved = reviews.filter(r => r.status === "hr_approved").length
  return {
    cycleId,
    total: reviews.length,
    approved,
    pending: reviews.length - approved,
    blocked: approved < reviews.length,
    breakdown: reviews.map(r => ({
      employeeId: r.employeeId,
      employeeName: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId,
      status: r.status,
    })),
  }
}
