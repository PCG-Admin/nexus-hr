-- ============================================================
-- Employee audit table — tracks every profile field change
-- Stores: who changed, when, what field, previous value, new value
-- ============================================================

CREATE TABLE IF NOT EXISTS public.employee_audit (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  actor_id    UUID        NOT NULL REFERENCES public.employees(id),
  actor_name  TEXT        NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changes     JSONB       NOT NULL DEFAULT '[]'
);

ALTER TABLE public.employee_audit ENABLE ROW LEVEL SECURITY;

-- HR managers and system admins can read audit entries
DROP POLICY IF EXISTS "hr_admin_read_employee_audit" ON public.employee_audit;
CREATE POLICY "hr_admin_read_employee_audit"
  ON public.employee_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = auth.uid()
      AND e.role IN ('hr_manager', 'system_admin')
    )
  );

-- Authenticated service layer can insert
DROP POLICY IF EXISTS "authenticated_insert_employee_audit" ON public.employee_audit;
CREATE POLICY "authenticated_insert_employee_audit"
  ON public.employee_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for fast per-employee lookups
CREATE INDEX IF NOT EXISTS employee_audit_employee_id_idx
  ON public.employee_audit (employee_id, timestamp DESC);
