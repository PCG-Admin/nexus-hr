-- ============================================================
-- Fix: scope line_manager access to direct reports only
-- Previously line_manager role could SELECT and UPDATE any request.
-- Now both policies check manager_id = auth.uid() on the employee row.
-- ============================================================

-- SELECT: employee sees own, line manager sees direct reports only,
--         HR/exec/admin see all
DROP POLICY IF EXISTS "leave_requests_select" ON public.leave_requests;
CREATE POLICY "leave_requests_select"
  ON public.leave_requests FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.my_role() IN ('hr_manager', 'executive', 'system_admin')
    OR (
      public.my_role() = 'line_manager'
      AND EXISTS (
        SELECT 1 FROM public.employees
        WHERE id = leave_requests.user_id
          AND manager_id = auth.uid()
      )
    )
  );

-- UPDATE: employee edits own pending, line manager approves/rejects
--         direct reports only, HR/admin act on any
DROP POLICY IF EXISTS "leave_requests_update" ON public.leave_requests;
CREATE POLICY "leave_requests_update"
  ON public.leave_requests FOR UPDATE
  USING (
    (user_id = auth.uid() AND status = 'pending')
    OR public.my_role() IN ('hr_manager', 'system_admin')
    OR (
      public.my_role() = 'line_manager'
      AND EXISTS (
        SELECT 1 FROM public.employees
        WHERE id = leave_requests.user_id
          AND manager_id = auth.uid()
      )
    )
  );
