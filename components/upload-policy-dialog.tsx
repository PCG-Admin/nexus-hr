"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, FileText, X, Loader2 } from "lucide-react"
import { uploadPolicy } from "@/lib/supabase/policy-service"

const CATEGORIES = [
  "Onboarding",
  "Probation",
  "HR Agreements",
  "Offboarding",
  "Leave",
  "Performance",
  "Disciplinary",
  "General",
]

interface UploadPolicyDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  uploaderId: string
  uploaderName: string
}

export function UploadPolicyDialog({
  isOpen,
  onClose,
  onSuccess,
  uploaderId,
  uploaderName,
}: UploadPolicyDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [visibility, setVisibility] = useState<"all" | "management" | "hr_only">("all")
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setTitle("")
    setDescription("")
    setCategory("")
    setCustomCategory("")
    setVisibility("all")
    setFile(null)
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "))
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !file) { setError("Title and file are required."); return }
    const resolvedCategory = category === "__custom__" ? customCategory.trim() : category
    if (!resolvedCategory) { setError("Please select or enter a category."); return }

    setIsUploading(true)
    setError(null)

    const result = await uploadPolicy(
      file,
      { title: title.trim(), description: description.trim(), category: resolvedCategory, visibility },
      { id: uploaderId, name: uploaderName }
    )

    setIsUploading(false)
    if (!result.success) { setError(result.error ?? "Upload failed."); return }
    reset()
    onSuccess()
  }

  const visibilityLabel: Record<string, string> = {
    all: "All employees",
    management: "Management only (Line Managers & Executives)",
    hr_only: "HR only (not visible to employees)",
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Policy / Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File drop zone */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-6 h-6 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium truncate max-w-xs">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-2 text-muted-foreground"
                  onClick={e => { e.stopPropagation(); setFile(null) }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to select a file</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, Word, JPEG or PNG — max 10MB</p>
              </>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="policy-title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="policy-title"
              placeholder="e.g. Annual Leave Policy 2026"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="policy-desc">Description</Label>
            <Textarea
              id="policy-desc"
              placeholder="Brief description of what this document covers…"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Category + Visibility row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value="__custom__">Other (custom)…</SelectItem>
                </SelectContent>
              </Select>
              {category === "__custom__" && (
                <Input
                  className="mt-1.5"
                  placeholder="Enter category name"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Visibility <span className="text-destructive">*</span></Label>
              <Select value={visibility} onValueChange={v => setVisibility(v as "all" | "management" | "hr_only")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  <SelectItem value="management">Management only</SelectItem>
                  <SelectItem value="hr_only">HR only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visibility hint */}
          <p className="text-xs text-muted-foreground -mt-1">
            Visibility: {visibilityLabel[visibility]}
          </p>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isUploading || !file || !title.trim()}>
            {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4 mr-2" /> Upload</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
