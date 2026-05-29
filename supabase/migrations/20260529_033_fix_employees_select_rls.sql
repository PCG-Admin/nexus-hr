-- ============================================================
-- MIGRATION 033 — Fix employees SELECT RLS for executive role
-- auth.uid() returns null for some JWT sessions (executive);
-- add my_role() fallback so all app roles can always read employees
-- ============================================================

DROP POLICY IF EXISTS "employees_select" ON public.employees;

CREATE POLICY "employees_select"
  ON public.employees FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    OR public.my_role() IN ('employee', 'line_manager', 'hr_manager', 'executive', 'system_admin')
  );
