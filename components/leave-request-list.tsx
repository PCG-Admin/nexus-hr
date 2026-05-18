import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { LeaveRequest } from "@/lib/supabase/leave-service"
import { Calendar, Clock, ChevronRight } from "lucide-react"
import { format } from "date-fns"

type Props = {
  requests: LeaveRequest[]
  onRequestClick: (request: LeaveRequest) => void
}

export function LeaveRequestList({ requests, onRequestClick }: Props) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-100 text-emerald-800 border-emerald-300"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300"
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-300"
      case "cancelled":
        return "bg-slate-100 text-slate-800 border-slate-300"
      default:
        return "bg-slate-100 text-slate-800 border-slate-300"
    }
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Request History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No leave requests found. Submit your first request to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Request History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            onClick={() => onRequestClick(request)}
            className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{request.leaveTypeName}</h4>
                <Badge className={getStatusColor(request.status)} variant="outline">
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(request.startDate), "MMM dd")} -{" "}
                    {format(new Date(request.endDate), "MMM dd, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{request.daysRequested} days</span>
                </div>
              </div>

              {request.reason && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Reason:</span> {request.reason}
                </p>
              )}

              {request.reviewerNotes && (
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  <span className="font-medium">Manager Notes:</span> {request.reviewerNotes}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <span>{format(new Date(request.createdAt), "MMM dd, yyyy")}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
