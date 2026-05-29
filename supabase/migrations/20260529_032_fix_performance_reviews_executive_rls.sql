-- ============================================================
-- MIGRATION 032 — Fix performance_reviews UPDATE policy
-- Add executive role so GM can run gmApprove() on annual reviews
-- ============================================================

DROP POLICY IF EXISTS "performance_reviews_update" ON public.performance_reviews;

CREATE POLICY "performance_reviews_update"
  ON public.performance_reviews FOR UPDATE
  USING (
    -- Employee can update their own review (save draft, submit)
    employee_id = auth.uid()
    -- Managers can add ratings; HR can approve; executive can GM-approve
    OR public.my_role() IN ('line_manager', 'hr_manager', 'executive', 'system_admin')
  );
