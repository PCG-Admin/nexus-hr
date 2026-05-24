-- Performance review audit trail — lifecycle events for every review
CREATE TABLE IF NOT EXISTS public.performance_audit (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id     UUID        REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  employee_id   UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name TEXT,
  actor_id      UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  actor_name    TEXT        NOT NULL,
  action        TEXT        NOT NULL
                            CHECK (action IN ('created','draft_saved','submitted','manager_reviewed','hr_approved')),
  from_status   TEXT,
  to_status     TEXT,
  cycle_name    TEXT,
  notes         TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_audit_review     ON public.performance_audit (review_id);
CREATE INDEX IF NOT EXISTS idx_perf_audit_employee   ON public.performance_audit (employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_audit_timestamp  ON public.performance_audit (timestamp DESC);

ALTER TABLE public.performance_audit ENABLE ROW LEVEL SECURITY;

-- Employees see their own review's audit trail
CREATE POLICY "employee_sees_own_perf_audit"
  ON public.performance_audit FOR SELECT
  USING (employee_id = auth.uid());

-- Managers, HR, admin see all
CREATE POLICY "managers_see_all_perf_audit"
  ON public.performance_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = auth.uid()
        AND role IN ('line_manager','hr_manager','system_admin')
    )
  );

-- Any authenticated user can insert
CREATE POLICY "authenticated_insert_perf_audit"
  ON public.performance_audit FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
