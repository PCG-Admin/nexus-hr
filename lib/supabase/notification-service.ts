import { createClient } from './client'

const isDbConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))

export type Notification = {
  id: string
  userId: string
  title: string
  message: string
  type: string
  referenceId: string | null
  read: boolean
  createdAt: string
}

// Mock notifications for demo mode (no DB)
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-001",
    userId: "demo-manager-001",
    title: "New Leave Request",
    message: "Sarah Dlamini has submitted an Annual Leave request for 4 day(s) (2026-05-26 – 2026-05-29). This request exceeds her available balance — balance override approval required.",
    type: "leave_request",
    referenceId: "demo-req-001",
    read: false,
    createdAt: "2026-05-20T08:05:00Z",
  },
  {
    id: "notif-002",
    userId: "demo-hr-001",
    title: "Leave Awaiting Final Approval",
    message: "James Naidoo has approved Sarah Dlamini's Annual Leave (2026-06-10 – 2026-06-13, 4 days). Your final sign-off is required.",
    type: "leave_request",
    referenceId: "demo-req-002",
    read: false,
    createdAt: "2026-05-19T11:05:00Z",
  },
  {
    id: "notif-003",
    userId: "demo-admin-001",
    title: "Leave Awaiting Final Approval",
    message: "James Naidoo has approved Sarah Dlamini's Annual Leave (2026-06-10 – 2026-06-13, 4 days). Your final sign-off is required.",
    type: "leave_request",
    referenceId: "demo-req-002",
    read: true,
    createdAt: "2026-05-19T11:05:00Z",
  },
  {
    id: "notif-004",
    userId: "demo-manager-001",
    title: "Leave Request Approved",
    message: "Priya Patel (HR) has approved Sarah Dlamini's Sick Leave request (2026-04-10 – 2026-04-11, 2 days).",
    type: "leave_approved",
    referenceId: "demo-req-003",
    read: true,
    createdAt: "2026-04-09T14:05:00Z",
  },
]

export async function getNotifications(userId: string): Promise<Notification[]> {
  if (!isDbConfigured()) {
    return MOCK_NOTIFICATIONS.filter(n => n.userId === userId)
  }
  const supabase = createClient()

  const { data, error } = await (supabase as any)
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error || !data) return []

  return (data as any[]).map(row => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    referenceId: row.reference_id,
    read: row.read,
    createdAt: row.created_at,
  }))
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  if (!isDbConfigured()) return
  const supabase = createClient()
  await (supabase as any)
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!isDbConfigured()) return
  const supabase = createClient()
  await (supabase as any)
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false)
}

export async function deleteNotification(notificationId: string): Promise<void> {
  if (!isDbConfigured()) return
  const supabase = createClient()
  await (supabase as any).from('notifications').delete().eq('id', notificationId)
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  if (!isDbConfigured()) return
  const supabase = createClient()
  await (supabase as any).from('notifications').delete().eq('user_id', userId)
}

// Called after a leave request is submitted — notifies managers/HR/admin
export async function notifyReviewersOfNewRequest(
  leaveRequestId: string,
  employeeName: string,
  leaveTypeName: string,
  startDate: string,
  endDate: string,
  daysRequested: number
): Promise<void> {
  if (!isDbConfigured()) return
  const supabase = createClient()

  const { data: reviewers, error } = await (supabase as any)
    .from('employees')
    .select('id')
    .in('role', ['hr_manager', 'line_manager', 'system_admin'])

  if (error || !reviewers || reviewers.length === 0) return

  const notifications = (reviewers as any[]).map(reviewer => ({
    user_id: reviewer.id,
    title: 'New Leave Request',
    message: `${employeeName} has submitted a ${leaveTypeName} request for ${daysRequested} day(s) (${startDate} – ${endDate}).`,
    type: 'leave_request',
    reference_id: leaveRequestId,
    read: false,
  }))

  await (supabase as any).from('notifications').insert(notifications)
}

// Notify final approvers (HR/admin) after manager stage-1 approval
export async function notifyFinalApproversOfEscalation(
  leaveRequestId: string,
  employeeName: string,
  managerName: string,
  leaveTypeName: string,
  startDate: string,
  endDate: string,
  daysRequested: number
): Promise<void> {
  if (!isDbConfigured()) return
  const supabase = createClient()

  const { data: approvers, error } = await (supabase as any)
    .from('employees')
    .select('id')
    .in('role', ['hr_manager', 'system_admin'])

  if (error || !approvers || approvers.length === 0) return

  const notifications = (approvers as any[]).map(approver => ({
    user_id: approver.id,
    title: 'Leave Awaiting Final Approval',
    message: `${managerName} has approved ${employeeName}'s ${leaveTypeName} request (${startDate} – ${endDate}, ${daysRequested} day(s)). Your final sign-off is required.`,
    type: 'leave_escalated',
    reference_id: leaveRequestId,
    read: false,
  }))

  await (supabase as any).from('notifications').insert(notifications)
}
