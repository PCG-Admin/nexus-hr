-- ============================================================
-- RLS BATCH 5 — notifications, public_holidays, performance tables
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Each user sees only their own notifications
CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Notifications are inserted by the service role (API routes use service key);
-- this policy covers the anon/authed client path (e.g. manager notifying HR)
CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (public.my_role() IN ('line_manager', 'hr_manager', 'system_admin') OR user_id = auth.uid());

-- Users can mark their own notifications read
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────

ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view public holidays (needed for day-count calculations)
CREATE POLICY "public_holidays_select"
  ON public.public_holidays FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "public_holidays_insert"
  ON public.public_holidays FOR INSERT
  WITH CHECK (public.my_role() IN ('hr_manager', 'system_admin'));

CREATE POLICY "public_holidays_update"
  ON public.public_holidays FOR UPDATE
  USING (public.my_role() IN ('hr_manager', 'system_admin'));

CREATE POLICY "public_holidays_delete"
  ON public.public_holidays FOR DELETE
  USING (public.my_role() IN ('hr_manager', 'system_admin'));

-- ──────────────────────────────────────────────────────────

ALTER TABLE public.performance_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "performance_cycles_select"
  ON public.performance_cycles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "performance_cycles_insert"
  ON public.performance_cycles FOR INSERT
  WITH CHECK (public.my_role() IN ('hr_manager', 'system_admin'));

CREATE POLICY "performance_cycles_update"
  ON public.performance_cycles FOR UPDATE
  USING (public.my_role() IN ('hr_manager', 'system_admin'));

CREATE POLICY "performance_cycles_delete"
  ON public.performance_cycles FOR DELETE
  USING (public.my_role() IN ('hr_manager', 'system_admin'));

-- ──────────────────────────────────────────────────────────

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- Employees see their own reviews; managers/HR/exec/admin see all
CREATE POLICY "performance_reviews_select"
  ON public.performance_reviews FOR SELECT
  USING (
    employee_id = auth.uid()
    OR public.my_role() IN ('line_manager', 'hr_manager', 'executive', 'system_admin')
  );

-- Employees submit for themselves; HR/admin can create on behalf of an employee
CREATE POLICY "performance_reviews_insert"
  ON public.performance_reviews FOR INSERT
  WITH CHECK (employee_id = auth.uid() OR public.my_role() IN ('hr_manager', 'system_admin'));

-- Employee can update own draft; managers can add ratings; HR can approve
CREATE POLICY "performance_reviews_update"
  ON public.performance_reviews FOR UPDATE
  USING (
    employee_id = auth.uid()
    OR public.my_role() IN ('line_manager', 'hr_manager', 'system_admin')
  );

CREATE POLICY "performance_reviews_delete"
  ON public.performance_reviews FOR DELETE
  USING (public.my_role() IN ('hr_manager', 'system_admin'));
