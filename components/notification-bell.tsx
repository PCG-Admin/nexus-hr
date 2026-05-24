"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bell, CheckCircle2, XCircle, Clock, AlertTriangle, FileText, X, CheckCheck, Megaphone } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  type Notification,
} from "@/lib/supabase/notification-service"
import { useAuth } from "@/lib/auth"

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

type NotifStyle = {
  icon: React.ReactNode
  bg: string
  iconBg: string
  dot: string
}

function getNotifStyle(type: string): NotifStyle {
  switch (type) {
    case 'leave_approved':
      return {
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        bg: "bg-emerald-50/60",
        iconBg: "bg-emerald-100",
        dot: "bg-emerald-500",
      }
    case 'leave_rejected':
      return {
        icon: <XCircle className="w-4 h-4 text-red-500" />,
        bg: "bg-red-50/60",
        iconBg: "bg-red-100",
        dot: "bg-red-500",
      }
    case 'leave_escalated':
      return {
        icon: <Clock className="w-4 h-4 text-amber-600" />,
        bg: "bg-amber-50/60",
        iconBg: "bg-amber-100",
        dot: "bg-amber-500",
      }
    case 'leave_override':
      return {
        icon: <AlertTriangle className="w-4 h-4 text-orange-600" />,
        bg: "bg-orange-50/60",
        iconBg: "bg-orange-100",
        dot: "bg-orange-500",
      }
    case 'announcement':
      return {
        icon: <Megaphone className="w-4 h-4 text-violet-600" />,
        bg: "bg-violet-50/60",
        iconBg: "bg-violet-100",
        dot: "bg-violet-500",
      }
    default: // leave_request, info, etc.
      return {
        icon: <FileText className="w-4 h-4 text-blue-600" />,
        bg: "bg-blue-50/60",
        iconBg: "bg-blue-100",
        dot: "bg-blue-500",
      }
  }
}

export function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const data = await getNotifications(user.id)
    setNotifications(data)
  }, [user])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markNotificationRead(notification.id)
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n))
    }
    setOpen(false)
    const isEmployeeNotif   = notification.type === 'leave_approved' || notification.type === 'leave_rejected'
    const isAnnouncement    = notification.type === 'announcement'
    const basePath = isAnnouncement ? "/dashboard/announcements"
                   : isEmployeeNotif ? "/dashboard"
                   : "/dashboard/approvals"
    const target = (!isAnnouncement && notification.referenceId)
      ? `${basePath}?request=${notification.referenceId}`
      : basePath
    router.push(target)
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    await markAllNotificationsRead(user.id)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleDeleteOne = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    await deleteNotification(notificationId)
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const handleDeleteAll = async () => {
    if (!user) return
    await deleteAllNotifications(user.id)
    setNotifications([])
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 rounded-md hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? "text-foreground" : "text-muted-foreground"}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-card border rounded-xl shadow-xl z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-medium leading-none">
                  {unreadCount} new
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={handleDeleteAll}
                  className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Bell className="w-5 h-5 text-muted-foreground opacity-50" />
                </div>
                <p className="text-sm text-muted-foreground">You're all caught up</p>
              </div>
            ) : (
              notifications.map(notification => {
                const style = getNotifStyle(notification.type)
                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-0 group transition-colors ${
                      !notification.read ? style.bg : "hover:bg-muted/30"
                    }`}
                  >
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="flex-1 text-left px-4 py-3.5 flex items-start gap-3"
                    >
                      {/* Icon */}
                      <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${style.iconBg}`}>
                        {style.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${!notification.read ? "font-semibold" : "font-medium"}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${style.dot}`} />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1.5 font-medium">
                          {timeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </button>

                    {/* Delete button — visible on hover */}
                    <button
                      onClick={e => handleDeleteOne(e, notification.id)}
                      className="shrink-0 self-start mt-2 mr-2 p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
                      aria-label="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
