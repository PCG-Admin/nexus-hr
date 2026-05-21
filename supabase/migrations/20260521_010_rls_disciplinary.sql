-- ============================================================
-- RLS BATCH 4 — disciplinary_records + disciplinary_audit policies
-- ============================================================

ALTER TABLE public.disciplinary_records ENABLE ROW LEVEL SECURITY;

-- Employees can only see their own records; managers/HR/admin can see all
CREATE POLICY "disciplinary_records_select"
  ON public.disciplinary_records FOR SELECT
  USING (
    employee_id = auth.uid()
    OR public.my_role() IN ('line_manager', 'hr_manager', 'system_admin')
  );

-- Line managers and above can raise disciplinary records
CREATE POLICY "disciplinary_records_insert"
  ON public.disciplinary_records FOR INSERT
  WITH CHECK (public.my_role() IN ('line_manager', 'hr_manager', 'system_admin'));

-- Only HR and system admin can update (DB trigger blocks edits once finalised)
CREATE POLICY "disciplinary_records_update"
  ON public.disciplinary_records FOR UPDATE
  USING (public.my_role() IN ('hr_manager', 'system_admin'));

-- Only system admin can hard-delete records
CREATE POLICY "disciplinary_records_delete"
  ON public.disciplinary_records FOR DELETE
  USING (public.my_role() = 'system_admin');

-- ──────────────────────────────────────────────────────────

ALTER TABLE public.disciplinary_audit ENABLE ROW LEVEL SECURITY;

-- Audit log is read-only for managers/HR/admin — employees cannot see it
CREATE POLICY "disciplinary_audit_select"
  ON public.disciplinary_audit FOR SELECT
  USING (public.my_role() IN ('line_manager', 'hr_manager', 'system_admin'));

-- Audit entries are written by the app when a record is created/updated
CREATE POLICY "disciplinary_audit_insert"
  ON public.disciplinary_audit FOR INSERT
  WITH CHECK (public.my_role() IN ('line_manager', 'hr_manager', 'system_admin'));
