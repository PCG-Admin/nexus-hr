"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, ExternalLink, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import {
  getEmployeeDocuments,
  uploadEmployeeDocument,
  getDocumentSignedUrl,
  deleteEmployeeDocument,
  type EmployeeDoc,
} from "@/lib/supabase/document-service"
import { format } from "date-fns"

const SLOTS = [
  { type: "copy_of_id",         label: "Copy of ID",         description: "SA ID document or passport" },
  { type: "proof_of_residence", label: "Proof of Residence", description: "Not older than 3 months" },
  { type: "proof_of_banking",   label: "Proof of Banking",   description: "Bank-stamped letter or statement" },
  { type: "proof_of_tax",       label: "Proof of Tax",       description: "SARS IT150 or tax certificate" },
]

type Props = {
  employeeId: string
  uploadedById: string
  canDelete?: boolean
}

export function EmployeeDocumentSlots({ employeeId, uploadedById, canDelete = false }: Props) {
  const [docs, setDocs]           = useState<EmployeeDoc[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [viewing, setViewing]     = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const fileInputRef              = useRef<HTMLInputElement>(null)
  const pendingType               = useRef<string | null>(null)

  useEffect(() => {
    getEmployeeDocuments(employeeId).then(setDocs)
  }, [employeeId])

  const docByType = (type: string) => docs.find(d => d.documentType === type)

  const handleUploadClick = (type: string) => {
    setError(null)
    pendingType.current = type
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const type = pendingType.current
    if (!file || !type) return
    e.target.value = ""

    if (file.size > 10 * 1024 * 1024) {
      setError("File exceeds 10 MB limit.")
      return
    }

    setError(null)
    setUploading(type)
    const result = await uploadEmployeeDocument(employeeId, type, file, uploadedById)
    if (result.success) {
      const updated = await getEmployeeDocuments(employeeId)
      setDocs(updated)
    } else {
      setError(result.error ?? "Upload failed. Please try again.")
    }
    setUploading(null)
  }

  const handleView = async (storagePath: string) => {
    setViewing(storagePath)
    const url = await getDocumentSignedUrl(storagePath)
    setViewing(null)
    if (url) window.open(url, "_blank")
    else setError("Could not generate view link. Please try again.")
  }

  const handleDelete = async (doc: EmployeeDoc) => {
    const result = await deleteEmployeeDocument(doc.id, doc.fileUrl)
    if (result.success) {
      setDocs(prev => prev.filter(d => d.id !== doc.id))
    } else {
      setError(result.error ?? "Delete failed.")
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {SLOTS.map(slot => {
        const doc         = docByType(slot.type)
        const isUploading = uploading === slot.type
        const isViewing   = viewing === doc?.fileUrl

        return (
          <div key={slot.type} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${doc ? "bg-emerald-100" : "bg-muted"}`}>
              {doc
                ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                : <FileText className="w-4 h-4 text-muted-foreground" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{slot.label}</p>
                {doc
                  ? <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300 bg-emerald-50">Uploaded</Badge>
                  : <Badge variant="outline" className="text-xs text-muted-foreground">Missing</Badge>
                }
              </div>
              {doc
                ? <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {doc.fileName ?? "document"} · {format(new Date(doc.createdAt), "d MMM yyyy")}
                  </p>
                : <p className="text-xs text-muted-foreground mt-0.5">{slot.description}</p>
              }
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {doc && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={isViewing}
                  onClick={() => handleView(doc.fileUrl)}
                >
                  {isViewing
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <ExternalLink className="w-3 h-3" />
                  }
                  View
                </Button>
              )}
              {canDelete && doc && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(doc)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant={doc ? "outline" : "default"}
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={isUploading}
                onClick={() => handleUploadClick(slot.type)}
              >
                {isUploading
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Upload className="w-3 h-3" />
                }
                {isUploading ? "Uploading…" : doc ? "Replace" : "Upload"}
              </Button>
            </div>
          </div>
        )
      })}

      <p className="text-xs text-muted-foreground px-1">
        Accepted formats: PDF, JPG, PNG · Max 10 MB per file
      </p>
    </div>
  )
}
