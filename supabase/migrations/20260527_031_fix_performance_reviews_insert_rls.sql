-- ============================================================
-- MIGRATION 031 — Fix performance_reviews INSERT policy
-- Allows line managers to create reviews for their direct reports
-- (needed for monthly check-ins and creating review shells)
-- ============================================================

DROP POLICY IF EXISTS "performance_reviews_insert" ON public.performance_reviews;

CREATE POLICY "performance_reviews_insert"
  ON public.performance_reviews FOR INSERT
  WITH CHECK (
    -- Employee creates their own review
    employee_id = auth.uid()
    -- HR/admin can create for anyone
    OR public.my_role() IN ('hr_manager', 'system_admin')
    -- Line manager can create reviews for their direct reports
    OR (
      public.my_role() = 'line_manager'
      AND EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = employee_id
          AND e.manager_id = auth.uid()
      )
    )
  );
