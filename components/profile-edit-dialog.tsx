"use client"

import { useState, useEffect } from "react"
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

type ProfileEditDialogProps = {
  user: User
  isOpen: boolean
  onClose: () => void
  onSave: (updates: Partial<User>) => Promise<void>
}

export function ProfileEditDialog({ user, isOpen, onClose, onSave }: ProfileEditDialogProps) {
  const [formData, setFormData] = useState({
    phone: "",
    personalEmail: "",
    address: "",
    city: "",
    postalCode: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
  })
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        phone: user.phone ?? "",
        personalEmail: user.personalEmail ?? "",
        address: user.address ?? "",
        city: user.city ?? "",
        postalCode: user.postalCode ?? "",
        emergencyContactName: user.emergencyContactName ?? "",
        emergencyContactPhone: user.emergencyContactPhone ?? "",
        emergencyContactRelationship: user.emergencyContactRelationship ?? "",
      })
      setError("")
      setSaved(false)
    }
  }, [user, isOpen])

  const handleSave = async () => {
    setError("")
    setIsSaving(true)
    try {
      await onSave({
        phone: formData.phone || null,
        personalEmail: formData.personalEmail || null,
        address: formData.address || null,
        city: formData.city || null,
        postalCode: formData.postalCode || null,
        emergencyContactName: formData.emergencyContactName || null,
        emergencyContactPhone: formData.emergencyContactPhone || null,
        emergencyContactRelationship: formData.emergencyContactRelationship || null,
      })
      setSaved(true)
      setTimeout(onClose, 800)
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit My Profile</DialogTitle>
          <DialogDescription>
            Update your contact details and emergency contact information.
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
                <Label htmlFor="phone">Mobile Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+27 82 000 0000"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="personalEmail">Personal Email</Label>
                <Input
                  id="personalEmail"
                  type="email"
                  value={formData.personalEmail}
                  onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                  placeholder="yourname@gmail.com"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Address</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="12 Oak Street, Sandton"
                  disabled={isSaving}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Johannesburg"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="2196"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Emergency Contact</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="emergencyContactName">Full Name</Label>
                <Input
                  id="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  placeholder="Contact full name"
                  disabled={isSaving}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactPhone">Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    placeholder="+27 71 000 0000"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                  <Select
                    value={formData.emergencyContactRelationship}
                    onValueChange={(v) => setFormData({ ...formData, emergencyContactRelationship: v })}
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
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
