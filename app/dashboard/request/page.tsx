"use client"

import type React from "react"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { NavHeader } from "@/components/nav-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CalendarDays, AlertCircle, Upload, FileText, X } from "lucide-react"
import { format } from "date-fns"
import {
  getLeaveTypes,
  getLeaveBalances,
  submitLeaveRequest,
  uploadDocument,
  type LeaveType,
  type LeaveBalance,
} from "@/lib/supabase/leave-service"

const DEMO_TYPES: LeaveType[] = [
  { id: "demo-annual",    name: "Annual Leave",            defaultDays: 15,  requiresDocumentation: false, color: null },
  { id: "demo-sick",      name: "Sick Leave",              defaultDays: 10,  requiresDocumentation: true,  color: null },
  { id: "demo-family",    name: "Family Responsibility",   defaultDays: 3,   requiresDocumentation: false, color: null },
  { id: "demo-maternity", name: "Maternity Leave",         defaultDays: 120, requiresDocumentation: true,  color: null },
  { id: "demo-parental",  name: "Parental Leave",          defaultDays: 10,  requiresDocumentation: false, color: null },
]

const DEMO_BALANCES: LeaveBalance[] = [
  { id: "demo-1", userId: "", leaveTypeId: "demo-annual",    leaveTypeName: "Annual Leave",          totalDays: 15,  usedDays: 0, availableDays: 15,  year: new Date().getFullYear(), color: null },
  { id: "demo-2", userId: "", leaveTypeId: "demo-sick",      leaveTypeName: "Sick Leave",            totalDays: 10,  usedDays: 0, availableDays: 10,  year: new Date().getFullYear(), color: null },
  { id: "demo-3", userId: "", leaveTypeId: "demo-family",    leaveTypeName: "Family Responsibility", totalDays: 3,   usedDays: 0, availableDays: 3,   year: new Date().getFullYear(), color: null },
  { id: "demo-4", userId: "", leaveTypeId: "demo-maternity", leaveTypeName: "Maternity Leave",       totalDays: 120, usedDays: 0, availableDays: 120, year: new Date().getFullYear(), color: null },
  { id: "demo-5", userId: "", leaveTypeId: "demo-parental",  leaveTypeName: "Parental Leave",        totalDays: 10,  usedDays: 0, availableDays: 10,  year: new Date().getFullYear(), color: null },
]
import { getPublicHolidayDates, countWorkingDays } from "@/lib/supabase/holiday-service"

export default function RequestLeavePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [leaveTypeId, setLeaveTypeId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")
  const [daysRequested, setDaysRequested] = useState(0)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [document, setDocument] = useState<File | null>(null)
  const [documentPreview, setDocumentPreview] = useState<string>("")

  const [availableTypes, setAvailableTypes] = useState<LeaveType[]>([])
  const [userBalances, setUserBalances] = useState<LeaveBalance[]>([])
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set())
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    async function loadData() {
      if (!user) return

      setIsLoadingData(true)

      const dbReady = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))
      if (!dbReady) {
        setAvailableTypes(DEMO_TYPES)
        setUserBalances(DEMO_BALANCES)
        setIsLoadingData(false)
        return
      }

      try {
        const currentYear = new Date().getFullYear()
        const [types, balances, holidays] = await Promise.all([
          getLeaveTypes(),
          getLeaveBalances(user.id),
          getPublicHolidayDates(currentYear, currentYear + 1),
        ])
        setAvailableTypes(types.length > 0 ? types : DEMO_TYPES)
        setUserBalances(balances.length > 0 ? balances : DEMO_BALANCES)
        setHolidayDates(holidays)
      } catch (err) {
        setAvailableTypes(DEMO_TYPES)
        setUserBalances(DEMO_BALANCES)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [user])

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      if (end >= start) {
        const days = countWorkingDays(start, end, holidayDates)
        setDaysRequested(days)
        setError("")
      } else {
        setError("End date must be after start date")
        setDaysRequested(0)
      }
    }
  }, [startDate, endDate, holidayDates])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB")
        return
      }

      const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
      if (!validTypes.includes(file.type)) {
        setError("Only PDF, JPG, and PNG files are allowed")
        return
      }

      setDocument(file)
      setDocumentPreview(file.name)
      setError("")
    }
  }

  const handleRemoveFile = () => {
    setDocument(null)
    setDocumentPreview("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    if (!user) {
      setError("You must be logged in to submit a request")
      setIsSubmitting(false)
      return
    }

    if (!leaveTypeId || !startDate || !endDate) {
      setError("Please fill in all required fields")
      setIsSubmitting(false)
      return
    }

    if (daysRequested <= 0) {
      setError("Please select valid dates")
      setIsSubmitting(false)
      return
    }

    // Insufficient balance is non-blocking per SOW — surfaces as a warning (handled in UI),
    // not a hard rejection. Request proceeds with an override flag visible to the approver.

    const selectedType = availableTypes.find((t) => t.id === leaveTypeId)
    if (selectedType?.requiresDocumentation && !document) {
      setError(`${selectedType.name} requires supporting documentation (e.g., medical certificate)`)
      setIsSubmitting(false)
      return
    }

    try {
      let documentUrl: string | undefined

      // Upload document if provided
      if (document) {
        const uploadResult = await uploadDocument(document, user.id)
        if (!uploadResult.success) {
          // Don't fail the request if document upload fails, just log it
          console.error('Document upload failed:', uploadResult.error)
        } else {
          documentUrl = uploadResult.url
        }
      }

      // Submit the leave request
      const result = await submitLeaveRequest({
        userId: user.id,
        userRole: user.role,
        leaveTypeId,
        startDate,
        endDate,
        daysRequested,
        reason: reason || undefined,
        documentUrl,
        employeeName: `${user.firstName} ${user.lastName}`,
      })

      if (!result.success) {
        setError(result.error || 'Failed to submit leave request')
        setIsSubmitting(false)
        return
      }

      setSuccess(true)
      setIsSubmitting(false)

      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (err) {
      console.error('Error submitting request:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  const selectedBalance = userBalances.find((b) => b.leaveTypeId === leaveTypeId)
  const selectedType = availableTypes.find((t) => t.id === leaveTypeId)
  const hasInsufficientBalance = !!(selectedBalance && daysRequested > 0 && selectedBalance.availableDays < daysRequested)

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavHeader />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CalendarDays className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold">Leave Request Submitted!</h2>
                <p className="text-muted-foreground">
                  Your leave request has been submitted successfully and is awaiting manager approval.
                </p>
                <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => router.push("/dashboard")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Request Leave</CardTitle>
              <CardDescription>Submit a new leave request for manager approval</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading leave types...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="leaveType">
                      Leave Type <span className="text-destructive">*</span>
                    </Label>
                    <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                      <SelectTrigger id="leaveType">
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                            {type.requiresDocumentation && " *"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedBalance && (
                      <p className="text-sm text-muted-foreground">
                        Available: {selectedBalance.availableDays} of {selectedBalance.totalDays} days
                      </p>
                    )}
                    {selectedType?.requiresDocumentation && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          This leave type requires supporting documentation
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">
                        Start Date <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={format(new Date(), "yyyy-MM-dd")}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">
                        End Date <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || format(new Date(), "yyyy-MM-dd")}
                        required
                      />
                    </div>
                  </div>

                  {daysRequested > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium">
                        Total Business Days: <span className="text-lg font-bold ml-2">{daysRequested}</span>
                      </p>
                    </div>
                  )}

                  {hasInsufficientBalance && (
                    <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-sm">
                        <strong>Balance Override:</strong> You have {selectedBalance?.availableDays} day{selectedBalance?.availableDays === 1 ? "" : "s"} available but are requesting {daysRequested} days. You can still submit — your manager will be notified and can authorise the override.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Provide a brief reason for your leave request..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document">
                      Supporting Document{" "}
                      {selectedType?.requiresDocumentation && <span className="text-destructive">*</span>}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Upload medical certificates, proof of emergency, or other supporting documents (PDF, JPG, PNG - Max
                      5MB)
                    </p>

                    {!documentPreview ? (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                        <Input
                          id="document"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Label htmlFor="document" className="cursor-pointer">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium">Click to upload or drag and drop</p>
                          <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 5MB</p>
                        </Label>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
                        <FileText className="w-8 h-8 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{documentPreview}</p>
                          <p className="text-xs text-muted-foreground">
                            {document ? (document.size / 1024).toFixed(2) + " KB" : ""}
                          </p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>BCEA Compliance Notice:</strong> All leave requests are subject to BCEA regulations. Your
                      manager will review and approve based on operational requirements and legal compliance.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      className={`flex-1 ${hasInsufficientBalance ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : hasInsufficientBalance ? "Submit Override Request" : "Submit Request"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
