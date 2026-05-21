"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { LeaveRequestWithEmployee } from "@/lib/supabase/leave-service"
import { Calendar, Clock, UserIcon, CheckCircle2, XCircle, FileText, Download, AlertTriangle } from "lucide-react"
import { format } from "date-fns"

type ApprovalRequestCardProps = {
  request: LeaveRequestWithEmployee
  onApprove: (id: string, notes: string) => void
  onReject: (id: string, notes: string) => void
  isLoading?: boolean
}

export function ApprovalRequestCard({ request, onApprove, onReject, isLoading }: ApprovalRequestCardProps) {
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState("")
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)

  const handleAction = (type: "approve" | "reject") => {
    setActionType(type)
    setShowNotes(true)
  }

  const handleConfirm = () => {
    if (actionType === "approve") {
      onApprove(request.id, notes)
    } else if (actionType === "reject") {
      onReject(request.id, notes)
    }
    setShowNotes(false)
    setNotes("")
    setActionType(null)
  }

  const handleCancel = () => {
    setShowNotes(false)
    setNotes("")
    setActionType(null)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Employee Info */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <UserIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                <h4 className="font-semibold">
                  {request.employee.firstName} {request.employee.lastName}
                </h4>
                {request.employee.employeeNumber && (
                  <Badge variant="outline" className="text-xs">
                    {request.employee.employeeNumber}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{request.employee.department || 'No department'}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge className="bg-amber-100 text-amber-800 border-amber-300" variant="outline">
                Pending Review
              </Badge>
              {request.isOverride && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-300 gap-1" variant="outline">
                  <AlertTriangle className="w-3 h-3" />
                  Balance Override
                </Badge>
              )}
            </div>
          </div>

          {/* Override notice */}
          {request.isOverride && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                This request exceeds the employee's available leave balance. Approving constitutes a formal override — ensure this is authorised.
              </span>
            </div>
          )}

          {/* Leave Details */}
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <h5 className="font-semibold text-primary">{request.leaveTypeName}</h5>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  {format(new Date(request.startDate), "MMM dd")} - {format(new Date(request.endDate), "MMM dd, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{request.daysRequested} days</span>
              </div>
            </div>
            {request.reason && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm">
                  <span className="font-medium">Reason:</span> {request.reason}
                </p>
              </div>
            )}
            {request.documentUrl && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Supporting Document Attached</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 bg-transparent"
                  onClick={() => window.open(request.documentUrl!, "_blank")}
                >
                  <Download className="w-4 h-4 mr-2" />
                  View Document
                </Button>
              </div>
            )}
          </div>

          {/* Actions or Notes */}
          {!showNotes ? (
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleAction("approve")}
                disabled={isLoading}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleAction("reject")}
                disabled={isLoading}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`notes-${request.id}`}>
                  {actionType === "approve" ? "Approval Notes" : "Rejection Reason"} (Optional)
                </Label>
                <Textarea
                  id={`notes-${request.id}`}
                  placeholder={
                    actionType === "approve" ? "Add any notes for the employee..." : "Provide a reason for rejection..."
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className={`flex-1 ${actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                  variant={actionType === "approve" ? "default" : "destructive"}
                  onClick={handleConfirm}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : `Confirm ${actionType === "approve" ? "Approval" : "Rejection"}`}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Submitted Date */}
          <p className="text-xs text-muted-foreground text-right">
            Submitted {format(new Date(request.createdAt), "MMM dd, yyyy 'at' HH:mm")}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
