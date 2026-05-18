import { createClient } from './client'

const isDbConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'

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

export async function getNotifications(userId: string): Promise<Notification[]> {
  if (!isDbConfigured()) return []
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return []

  return data.map(row => ({
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
  const supabase = createClient()
  await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false)
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('notifications').delete().eq('id', notificationId)
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('notifications').delete().eq('user_id', userId)
}

// Called after a leave request is submitted — notifies all admins and managers
export async function notifyReviewersOfNewRequest(
  leaveRequestId: string,
  employeeName: string,
  leaveTypeName: string,
  startDate: string,
  endDate: string,
  daysRequested: number
): Promise<void> {
  const supabase = createClient()

  const { data: reviewers, error } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'manager'])

  if (error || !reviewers || reviewers.length === 0) return

  const notifications = reviewers.map(reviewer => ({
    user_id: reviewer.id,
    title: 'New Leave Request',
    message: `${employeeName} has submitted a ${leaveTypeName} request for ${daysRequested} day(s) (${startDate} – ${endDate}).`,
    type: 'leave_request',
    reference_id: leaveRequestId,
    read: false,
  }))

  await supabase.from('notifications').insert(notifications)
}
