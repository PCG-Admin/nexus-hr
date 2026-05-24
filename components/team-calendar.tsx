"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type LeaveRequestWithEmployee } from "@/lib/supabase/leave-service"

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const COLORS = [
  { bg: "bg-blue-100",    text: "text-blue-800"    },
  { bg: "bg-violet-100",  text: "text-violet-800"  },
  { bg: "bg-amber-100",   text: "text-amber-800"   },
  { bg: "bg-pink-100",    text: "text-pink-800"    },
  { bg: "bg-cyan-100",    text: "text-cyan-800"    },
  { bg: "bg-orange-100",  text: "text-orange-800"  },
  { bg: "bg-rose-100",    text: "text-rose-800"    },
  { bg: "bg-indigo-100",  text: "text-indigo-800"  },
]

type Props = {
  requests: LeaveRequestWithEmployee[]
  onRequestClick?: (req: LeaveRequestWithEmployee) => void
}

export function TeamCalendar({ requests, onRequestClick }: Props) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const [monthStart, setMonthStart] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  )

  const year  = monthStart.getFullYear()
  const month = monthStart.getMonth()

  const daysInMonth    = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0

  const cells = useMemo<(number | null)[]>(() => {
    const arr: (number | null)[] = []
    for (let i = 0; i < firstDayOfWeek; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(d)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [firstDayOfWeek, daysInMonth])

  // Assign a stable, unique color to each employee in encounter order
  const employeeColorMap = useMemo(() => {
    const map = new Map<string, typeof COLORS[number]>()
    let idx = 0
    for (const req of requests) {
      if (!map.has(req.userId)) {
        map.set(req.userId, COLORS[idx % COLORS.length])
        idx++
      }
    }
    return map
  }, [requests])

  // Map dateStr -> requests on that day (approved + pending only)
  const dayMap = useMemo(() => {
    const map = new Map<string, LeaveRequestWithEmployee[]>()
    for (const req of requests) {
      if (req.status === "rejected" || req.status === "cancelled") continue
      const start  = new Date(req.startDate + "T00:00:00")
      const end    = new Date(req.endDate   + "T00:00:00")
      const cursor = new Date(start)
      while (cursor <= end) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(req)
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    return map
  }, [requests])

  const prevMonth = () => setMonthStart(new Date(year, month - 1, 1))
  const nextMonth = () => setMonthStart(new Date(year, month + 1, 1))
  const goToday   = () => setMonthStart(new Date(today.getFullYear(), today.getMonth(), 1))

  const monthLabel     = monthStart.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  const uniqueEmployees = useMemo(() => {
    const seen = new Map<string, LeaveRequestWithEmployee>()
    for (const r of requests) {
      if (!seen.has(r.userId)) seen.set(r.userId, r)
    }
    return Array.from(seen.values())
  }, [requests])

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold">{monthLabel}</h3>
          {!isCurrentMonth && (
            <Button variant="ghost" size="sm" onClick={goToday} className="text-xs h-7 px-2.5">
              Today
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b bg-muted/20">
        {DAY_HEADERS.map(d => (
          <div key={d} className="py-2.5 text-center text-xs font-semibold text-muted-foreground tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-l">
        {cells.map((day, i) => {
          if (day === null) {
            return (
              <div key={`pad-${i}`} className="min-h-[120px] border-r border-b bg-muted/10" />
            )
          }

          const dateStr   = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const isToday   = dateStr === todayStr
          const dayReqs   = dayMap.get(dateStr) ?? []
          const MAX_CHIPS = 3
          const visible   = dayReqs.slice(0, MAX_CHIPS)
          const overflow  = dayReqs.length - MAX_CHIPS
          const isWeekend = (i % 7) >= 5

          return (
            <div
              key={dateStr}
              className={`min-h-[120px] p-1.5 flex flex-col gap-1 border-r border-b transition-colors ${
                isToday   ? "bg-primary/5" :
                isWeekend ? "bg-muted/20 hover:bg-muted/30" :
                            "hover:bg-muted/20"
              }`}
            >
              {/* Day number */}
              <span className={`self-start text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full leading-none ${
                isToday
                  ? "bg-primary text-primary-foreground font-bold"
                  : isWeekend
                  ? "text-muted-foreground/50"
                  : "text-muted-foreground"
              }`}>
                {day}
              </span>

              {/* Chips */}
              <div className="flex flex-col gap-0.5 min-w-0">
                {visible.map(req => {
                  const color     = employeeColorMap.get(req.userId) ?? COLORS[0]
                  const initials  = `${req.employee.firstName[0]}${req.employee.lastName[0]}`.toUpperCase()
                  const isPending = req.status === "pending" || req.status === "pending_ceo"
                  return (
                    <button
                      key={req.id}
                      onClick={() => onRequestClick?.(req)}
                      title={`${req.employee.firstName} ${req.employee.lastName} — ${req.leaveTypeName}${isPending ? " (Pending)" : ""}`}
                      className={`w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate text-left transition-opacity hover:opacity-80 ${color.bg} ${color.text} ${
                        isPending ? "opacity-50 border border-dashed border-current" : ""
                      } ${onRequestClick ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <span className="shrink-0 font-bold">{initials}</span>
                      <span className="truncate">{req.employee.firstName}</span>
                    </button>
                  )
                })}
                {overflow > 0 && (
                  <span className="text-[10px] text-muted-foreground pl-1 leading-none">
                    +{overflow} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      {uniqueEmployees.length > 0 && (
        <div className="px-4 py-3 border-t bg-muted/20 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground mr-1">Team:</span>
          {uniqueEmployees.map(r => {
            const color    = employeeColorMap.get(r.userId) ?? COLORS[0]
            const initials = `${r.employee.firstName[0]}${r.employee.lastName[0]}`.toUpperCase()
            return (
              <div
                key={r.userId}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${color.bg} ${color.text}`}
              >
                <span className="font-bold text-[10px]">{initials}</span>
                {r.employee.firstName} {r.employee.lastName}
              </div>
            )
          })}
          <span className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-blue-100 border border-blue-300" />
              Approved
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-muted border border-dashed border-muted-foreground/50" />
              Pending
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
