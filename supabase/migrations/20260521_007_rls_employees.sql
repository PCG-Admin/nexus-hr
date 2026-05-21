-- ============================================================
-- RLS BATCH 1 — employees table policies
-- ============================================================

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all employee records (needed for dropdowns, manager lookups, etc.)
CREATE POLICY "employees_select"
  ON public.employees FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only HR managers and system admins can create new employee records
CREATE POLICY "employees_insert"
  ON public.employees FOR INSERT
  WITH CHECK (public.my_role() IN ('hr_manager', 'system_admin'));

-- Employees can update their own row (contact fields); HR/admin can update any row
CREATE POLICY "employees_update"
  ON public.employees FOR UPDATE
  USING (id = auth.uid() OR public.my_role() IN ('hr_manager', 'system_admin'));

-- Only system admins can hard-delete employees
CREATE POLICY "employees_delete"
  ON public.employees FOR DELETE
  USING (public.my_role() = 'system_admin');
