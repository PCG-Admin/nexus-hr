-- ============================================================
-- RLS BATCH 2 — leave_types + leave_balances policies
-- ============================================================

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_types_select"
  ON public.leave_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "leave_types_insert"
  ON public.leave_types FOR INSERT
  WITH CHECK (public.my_role() IN ('hr_manager', 'system_admin'));

CREATE POLICY "leave_types_update"
  ON public.leave_types FOR UPDATE
  USING (public.my_role() IN ('hr_manager', 'system_admin'));

CREATE POLICY "leave_types_delete"
  ON public.leave_types FOR DELETE
  USING (public.my_role() IN ('hr_manager', 'system_admin'));

-- ──────────────────────────────────────────────────────────

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- Employees see their own balance; managers/HR/exec/admin see all
CREATE POLICY "leave_balances_select"
  ON public.leave_balances FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.my_role() IN ('line_manager', 'hr_manager', 'executive', 'system_admin')
  );

CREATE POLICY "leave_balances_insert"
  ON public.leave_balances FOR INSERT
  WITH CHECK (public.my_role() IN ('hr_manager', 'system_admin'));

CREATE POLICY "leave_balances_update"
  ON public.leave_balances FOR UPDATE
  USING (public.my_role() IN ('hr_manager', 'system_admin'));

CREATE POLICY "leave_balances_delete"
  ON public.leave_balances FOR DELETE
  USING (public.my_role() IN ('hr_manager', 'system_admin'));
