-- ============================================================
-- RLS BATCH 3 — leave_requests policies
-- ============================================================

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Employees see their own requests; managers/HR/exec/admin see all
CREATE POLICY "leave_requests_select"
  ON public.leave_requests FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.my_role() IN ('line_manager', 'hr_manager', 'executive', 'system_admin')
  );

-- Any authenticated employee can submit a leave request for themselves
CREATE POLICY "leave_requests_insert"
  ON public.leave_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Employee can edit their own request only while still pending;
-- line managers and HR can update status (approve/reject)
CREATE POLICY "leave_requests_update"
  ON public.leave_requests FOR UPDATE
  USING (
    (user_id = auth.uid() AND status = 'pending')
    OR public.my_role() IN ('line_manager', 'hr_manager', 'system_admin')
  );

-- Employee can cancel their own pending request; HR/admin can delete any
CREATE POLICY "leave_requests_delete"
  ON public.leave_requests FOR DELETE
  USING (
    (user_id = auth.uid() AND status = 'pending')
    OR public.my_role() IN ('hr_manager', 'system_admin')
  );
