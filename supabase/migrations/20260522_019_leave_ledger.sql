-- ============================================================
-- Leave Immutable Ledger
-- Every status transition on a leave request is permanently
-- recorded here. No UPDATE or DELETE policies — append only.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leave_ledger (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id  UUID        NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  actor_id          UUID        NOT NULL,
  actor_name        TEXT        NOT NULL,
  action            TEXT        NOT NULL,
  from_status       TEXT,
  to_status         TEXT        NOT NULL,
  notes             TEXT,
  days_requested    INTEGER,
  start_date        DATE,
  end_date          DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leave_ledger_request_idx ON public.leave_ledger (leave_request_id, created_at);

ALTER TABLE public.leave_ledger ENABLE ROW LEVEL SECURITY;

-- Employee sees ledger for their own requests
CREATE POLICY "leave_ledger_select_own"
  ON public.leave_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leave_requests
      WHERE id = leave_ledger.leave_request_id
        AND user_id = auth.uid()
    )
  );

-- Line manager sees ledger for direct reports
CREATE POLICY "leave_ledger_select_manager"
  ON public.leave_ledger FOR SELECT
  USING (
    public.my_role() = 'line_manager'
    AND EXISTS (
      SELECT 1 FROM public.leave_requests lr
      JOIN public.employees e ON e.id = lr.user_id
      WHERE lr.id = leave_ledger.leave_request_id
        AND e.manager_id = auth.uid()
    )
  );

-- HR, executive, admin see all
CREATE POLICY "leave_ledger_select_hr"
  ON public.leave_ledger FOR SELECT
  USING (public.my_role() IN ('hr_manager', 'executive', 'system_admin'));

-- Any authenticated user can insert (service writes entries on status changes)
CREATE POLICY "leave_ledger_insert"
  ON public.leave_ledger FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- No UPDATE or DELETE policies — table is append-only by design
