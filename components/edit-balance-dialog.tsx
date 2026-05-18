"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { LeaveBalanceWithEmployee } from "@/lib/supabase/leave-service"

type EditBalanceDialogProps = {
  balance: LeaveBalanceWithEmployee
  isOpen: boolean
  onClose: () => void
  onSave: (balanceId: string, newTotalDays: number) => void
  isSaving?: boolean
}

export function EditBalanceDialog({ balance, isOpen, onClose, onSave, isSaving }: EditBalanceDialogProps) {
  const [totalDays, setTotalDays] = useState(balance.totalDays.toString())
  const [error, setError] = useState("")

  const employeeName = `${balance.employee.firstName} ${balance.employee.lastName}`

  const handleSave = () => {
    const newTotal = Number.parseFloat(totalDays)

    // Validation
    if (isNaN(newTotal) || newTotal < 0) {
      setError("Please enter a valid number of days")
      return
    }

    if (newTotal < balance.usedDays) {
      setError(`Total days cannot be less than used days (${balance.usedDays})`)
      return
    }

    onSave(balance.id, newTotal)
    setError("")
  }

  const handleClose = () => {
    setTotalDays(balance.totalDays.toString())
    setError("")
    onClose()
  }

  const newAvailable = Number.parseFloat(totalDays) - balance.usedDays

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Leave Balance</DialogTitle>
          <DialogDescription>
            Adjust the total leave days for {employeeName} - {balance.leaveTypeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="totalDays">Total Days</Label>
            <Input
              id="totalDays"
              type="number"
              step="0.5"
              min="0"
              value={totalDays}
              onChange={(e) => setTotalDays(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Total:</span>
              <span className="font-medium">{balance.totalDays} days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Used:</span>
              <span className="font-medium">{balance.usedDays} days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Available:</span>
              <span className="font-medium">{balance.availableDays} days</span>
            </div>
            {!isNaN(Number.parseFloat(totalDays)) && (
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">New Available:</span>
                <span className="font-bold text-primary">{newAvailable.toFixed(1)} days</span>
              </div>
            )}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This will update the employee's available leave balance. This action will be logged for audit purposes.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
