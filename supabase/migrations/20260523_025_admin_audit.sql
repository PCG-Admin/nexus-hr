-- Admin audit log — captures all significant admin actions for compliance trail
CREATE TABLE IF NOT EXISTS public.admin_audit (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  actor_name   TEXT        NOT NULL,
  action       TEXT        NOT NULL,
  entity_type  TEXT        NOT NULL,
  entity_id    TEXT,
  entity_label TEXT,
  changes      JSONB       NOT NULL DEFAULT '[]',
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_timestamp ON public.admin_audit (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor    ON public.admin_audit (actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action   ON public.admin_audit (action);

ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;

-- HR managers and system admins can read all entries
CREATE POLICY "hr_admin_can_read_admin_audit"
  ON public.admin_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = auth.uid() AND role IN ('hr_manager','system_admin')
    )
  );

-- Any authenticated user can insert (actor_id checked at app layer)
CREATE POLICY "authenticated_insert_admin_audit"
  ON public.admin_audit FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
