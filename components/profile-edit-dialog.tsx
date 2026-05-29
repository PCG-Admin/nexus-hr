"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { type User } from "@/lib/auth"

const SA_LANGUAGES = ["Afrikaans","English","isiNdebele","isiXhosa","isiZulu","Sepedi","Sesotho","Setswana","siSwati","Tshivenda","Xitsonga"]

export type ProfileAuditEntry = {
  id: string
  timestamp: string
  changedByName: string
  changes: { label: string; from: string | null; to: string | null }[]
}

type ProfileEditDialogProps = {
  user: User
  isOpen: boolean
  onClose: () => void
  onSave: (updates: Partial<User>) => Promise<void>
}

const EDITABLE_FIELDS: { key: keyof User; label: string }[] = [
  { key: "phone",                        label: "Mobile Number" },
  { key: "personalEmail",                label: "Personal Email" },
  { key: "address",                      label: "Street Address" },
  { key: "city",                         label: "City" },
  { key: "postalCode",                   label: "Postal Code" },
  { key: "postalAddress",                label: "Postal Address" },
  { key: "emergencyContactName",         label: "Emergency Contact Name" },
  { key: "emergencyContactPhone",        label: "Emergency Contact Phone" },
  { key: "emergencyContactRelationship", label: "Emergency Contact Relationship" },
  { key: "gender",                       label: "Gender" },
  { key: "maritalStatus",                label: "Marital Status" },
  { key: "language",                     label: "Home Language" },
  { key: "numberOfDependants",           label: "Number of Dependants" },
  { key: "spouseName",                   label: "Spouse / Partner Name" },
]

function buildAuditChanges(user: User, formData: Record<string, string>): ProfileAuditEntry["changes"] {
  return EDITABLE_FIELDS
    .map(({ key, label }) => {
      const prev = (user[key] != null ? String(user[key]) : null)
      const next = formData[key]?.trim() || null
      return prev !== next ? { label, from: prev, to: next } : null
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
}

export function ProfileEditDialog({ user, isOpen, onClose, onSave }: ProfileEditDialogProps) {
  const [formData, setFormData] = useState({
    phone: "", personalEmail: "", address: "", city: "", postalCode: "", postalAddress: "",
    emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "",
    gender: "", maritalStatus: "", language: "", numberOfDependants: "", spouseName: "",
  })
  const [langIsOther, setLangIsOther] = useState(false)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user && isOpen) {
      const lang = user.language ?? ""
      setLangIsOther(!!lang && !SA_LANGUAGES.includes(lang))
      setFormData({
        phone:                        user.phone                        ?? "",
        personalEmail:                user.personalEmail                ?? "",
        address:                      user.address                      ?? "",
        city:                         user.city                         ?? "",
        postalCode:                   user.postalCode                   ?? "",
        postalAddress:                user.postalAddress                ?? "",
        emergencyContactName:         user.emergencyContactName         ?? "",
        emergencyContactPhone:        user.emergencyContactPhone        ?? "",
        emergencyContactRelationship: user.emergencyContactRelationship ?? "",
        gender:                       user.gender                       ?? "",
        maritalStatus:                user.maritalStatus                ?? "",
        language:                     lang,
        numberOfDependants:           user.numberOfDependants != null ? String(user.numberOfDependants) : "",
        spouseName:                   user.spouseName                   ?? "",
      })
      setError("")
      setSaved(false)
    }
  }, [user, isOpen])

  const handleSave = async () => {
    setError("")

    const missing: string[] = []
    if (!formData.phone.trim())                missing.push("Mobile Number")
    if (!formData.emergencyContactName.trim()) missing.push("Emergency Contact Name")
    if (!formData.emergencyContactPhone.trim())missing.push("Emergency Contact Phone")

    if (missing.length > 0) {
      setError(`Required fields missing: ${missing.join(", ")}`)
      return
    }

    const changes = buildAuditChanges(user, formData)

    setIsSaving(true)
    try {
      await onSave({
        phone:                        formData.phone                        || null,
        personalEmail:                formData.personalEmail                || null,
        address:                      formData.address                      || null,
        city:                         formData.city                         || null,
        postalCode:                   formData.postalCode                   || null,
        postalAddress:                formData.postalAddress                || null,
        emergencyContactName:         formData.emergencyContactName         || null,
        emergencyContactPhone:        formData.emergencyContactPhone        || null,
        emergencyContactRelationship: formData.emergencyContactRelationship || null,
        gender:                       formData.gender                       || null,
        maritalStatus:                formData.maritalStatus                || null,
        language:                     formData.language                     || null,
        numberOfDependants:           formData.numberOfDependants ? parseInt(formData.numberOfDependants) : null,
        spouseName:                   formData.spouseName                   || null,
      })

      if (changes.length > 0) {
        // Write to DB for admin audit trail
        try {
          const supabase = createClient()
          await (supabase as any).from('employee_audit').insert({
            employee_id: user.id,
            actor_id:    user.id,
            actor_name:  `${user.firstName} ${user.lastName}`,
            changes,
          })
        } catch { /* non-fatal */ }

        // Also keep localStorage for employee's own profile history display
        const entry: ProfileAuditEntry = {
          id:            `pa-${Date.now()}`,
          timestamp:     new Date().toISOString(),
          changedByName: `${user.firstName} ${user.lastName}`,
          changes,
        }
        const storageKey = `profile-audit-${user.id}`
        const existing: ProfileAuditEntry[] = JSON.parse(localStorage.getItem(storageKey) ?? "[]")
        localStorage.setItem(storageKey, JSON.stringify([entry, ...existing].slice(0, 50)))
      }

      setSaved(true)
      setTimeout(onClose, 800)
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit My Profile</DialogTitle>
          <DialogDescription>
            Update your contact details, address, and personal information. Fields marked * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert className="border-emerald-300 bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription>Profile updated successfully.</AlertDescription>
            </Alert>
          )}

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile Number <span className="text-red-500">*</span></Label>
                <Input id="phone" value={formData.phone} onChange={set("phone")} placeholder="+27 82 000 0000" disabled={isSaving} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="personalEmail">Personal Email</Label>
                <Input id="personalEmail" type="email" value={formData.personalEmail} onChange={set("personalEmail")} placeholder="yourname@gmail.com" disabled={isSaving} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Address</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="address">Street / Physical Address</Label>
                <Input id="address" value={formData.address} onChange={set("address")} placeholder="12 Oak Street, Sandton" disabled={isSaving} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={formData.city} onChange={set("city")} placeholder="Johannesburg" disabled={isSaving} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input id="postalCode" value={formData.postalCode} onChange={set("postalCode")} placeholder="2196" disabled={isSaving} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postalAddress">Postal Address (if different)</Label>
                <Input id="postalAddress" value={formData.postalAddress} onChange={set("postalAddress")} placeholder="PO Box 1234, Sandton, 2146" disabled={isSaving} />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Emergency Contact</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="emergencyContactName">Full Name <span className="text-red-500">*</span></Label>
                <Input id="emergencyContactName" value={formData.emergencyContactName} onChange={set("emergencyContactName")} placeholder="Contact full name" disabled={isSaving} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactPhone">Phone <span className="text-red-500">*</span></Label>
                  <Input id="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={set("emergencyContactPhone")} placeholder="+27 71 000 0000" disabled={isSaving} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                  <Select value={formData.emergencyContactRelationship} onValueChange={v => setFormData(p => ({ ...p, emergencyContactRelationship: v }))} disabled={isSaving}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Partner">Partner</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Child">Child</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Personal */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personal Details</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={formData.gender} onValueChange={v => setFormData(p => ({ ...p, gender: v }))} disabled={isSaving}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Marital Status</Label>
                  <Select value={formData.maritalStatus} onValueChange={v => setFormData(p => ({ ...p, maritalStatus: v }))} disabled={isSaving}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Home Language</Label>
                <Select
                  value={langIsOther ? "__other__" : (formData.language || "")}
                  onValueChange={(v) => {
                    if (v === "__other__") { setLangIsOther(true); setFormData(p => ({ ...p, language: "" })) }
                    else { setLangIsOther(false); setFormData(p => ({ ...p, language: v })) }
                  }}
                  disabled={isSaving}
                >
                  <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                  <SelectContent>
                    {SA_LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    <SelectItem value="__other__">Other (International)</SelectItem>
                  </SelectContent>
                </Select>
                {langIsOther && (
                  <Input
                    placeholder="Enter home language"
                    value={formData.language}
                    onChange={e => setFormData(p => ({ ...p, language: e.target.value }))}
                    disabled={isSaving}
                    className="mt-1.5"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="numberOfDependants">Number of Dependants</Label>
                  <Input id="numberOfDependants" type="number" min="0" value={formData.numberOfDependants} onChange={set("numberOfDependants")} placeholder="0" disabled={isSaving} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="spouseName">Spouse / Partner Name</Label>
                  <Input id="spouseName" value={formData.spouseName} onChange={set("spouseName")} placeholder="Full name" disabled={isSaving} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
