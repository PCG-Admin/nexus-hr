-- ============================================================
-- MIGRATION 034 — Employee extended fields + employee_documents table
-- These columns and the table were added directly to production DB
-- without migration files. This migration captures them properly
-- for version control and environment reproducibility.
-- ============================================================

-- ── Extended employee columns ─────────────────────────────────────────────────

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS postal_address          TEXT,
  ADD COLUMN IF NOT EXISTS passport_number         TEXT,
  ADD COLUMN IF NOT EXISTS gender                  TEXT CHECK (gender IN ('male','female','non_binary','prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS marital_status          TEXT CHECK (marital_status IN ('single','married','divorced','widowed','other')),
  ADD COLUMN IF NOT EXISTS language                TEXT,
  ADD COLUMN IF NOT EXISTS number_of_dependants    INTEGER,
  ADD COLUMN IF NOT EXISTS spouse_name             TEXT,
  ADD COLUMN IF NOT EXISTS tax_number              TEXT,
  ADD COLUMN IF NOT EXISTS tax_office              TEXT,
  ADD COLUMN IF NOT EXISTS bank_name               TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch_code        TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number     TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_type       TEXT CHECK (bank_account_type IN ('cheque','savings','transmission')),
  ADD COLUMN IF NOT EXISTS bank_account_holder_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_relationship TEXT,
  ADD COLUMN IF NOT EXISTS eea_group               TEXT CHECK (eea_group IN ('african','coloured','indian_asian','white','foreign_national')),
  ADD COLUMN IF NOT EXISTS eea_has_disability      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS eea_disability_description TEXT;

-- ── employee_documents table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.employee_documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type TEXT        NOT NULL CHECK (document_type IN ('copy_of_id','proof_of_residence','proof_of_banking','proof_of_tax')),
  file_url      TEXT        NOT NULL,
  file_name     TEXT,
  uploaded_by   UUID        REFERENCES public.employees(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, document_type)
);

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- HR managers and system admins can read all employee documents
CREATE POLICY "employee_documents_select"
  ON public.employee_documents FOR SELECT
  USING (
    employee_id = auth.uid()
    OR public.my_role() IN ('hr_manager', 'system_admin')
  );

CREATE POLICY "employee_documents_insert"
  ON public.employee_documents FOR INSERT
  WITH CHECK (public.my_role() IN ('hr_manager', 'system_admin'));

CREATE POLICY "employee_documents_update"
  ON public.employee_documents FOR UPDATE
  USING (public.my_role() IN ('hr_manager', 'system_admin'));

CREATE POLICY "employee_documents_delete"
  ON public.employee_documents FOR DELETE
  USING (public.my_role() IN ('hr_manager', 'system_admin'));

-- ── employee-documents storage bucket ────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "employee_documents_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'employee-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.my_role() IN ('hr_manager', 'system_admin')
    )
  );

CREATE POLICY "employee_documents_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND public.my_role() IN ('hr_manager', 'system_admin')
  );

CREATE POLICY "employee_documents_storage_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'employee-documents'
    AND public.my_role() IN ('hr_manager', 'system_admin')
  );
