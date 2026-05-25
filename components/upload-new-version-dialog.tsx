"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, X, Loader2, ArrowRight } from "lucide-react"
import { uploadNewVersion, type HRPolicy } from "@/lib/supabase/policy-service"

interface UploadNewVersionDialogProps {
  policy: HRPolicy | null
  onClose: () => void
  onSuccess: () => void
  uploaderId: string
  uploaderName: string
}

export function UploadNewVersionDialog({
  policy,
  onClose,
  onSuccess,
  uploaderId,
  uploaderName,
}: UploadNewVersionDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => { setFile(null); setError(null) }

  const handleClose = () => { reset(); onClose() }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleSubmit = async () => {
    if (!file || !policy) return
    setIsUploading(true)
    setError(null)
    const result = await uploadNewVersion(policy, file, { id: uploaderId, name: uploaderName })
    setIsUploading(false)
    if (!result.success) { setError(result.error ?? "Upload failed."); return }
    reset()
    onSuccess()
  }

  if (!policy) return null

  return (
    <Dialog open={!!policy} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Document summary */}
          <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1">
            <p className="text-sm font-medium">{policy.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">{policy.category}</Badge>
              <span className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">v{policy.version}</span>
                <ArrowRight className="w-3 h-3" />
                <span className="font-semibold text-primary">v{policy.version + 1}</span>
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The current version will be archived. Employees who already acknowledged v{policy.version} will be prompted to acknowledge v{policy.version + 1}.
          </p>

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
                  <p className="text-sm font-medium truncate max-w-sm">{file.name}</p>
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
                <p className="text-sm text-muted-foreground">Click to select the new file</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, Word, JPEG or PNG — max 10MB</p>
              </>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isUploading || !file}>
            {isUploading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</>
              : <><Upload className="w-4 h-4 mr-2" /> Publish v{policy.version + 1}</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
