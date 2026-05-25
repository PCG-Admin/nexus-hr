-- Restrict access to PII columns: id_number, date_of_birth.
--
-- Column-level REVOKE has no effect when a table-level GRANT exists (PostgreSQL behaviour).
-- Correct approach: revoke the table-level SELECT, then re-grant on safe columns only.
-- INSERT / UPDATE / DELETE grants on the employees table are not affected.

REVOKE SELECT ON public.employees FROM authenticated, anon;

GRANT SELECT (
  id, email, first_name, last_name, employee_number, role, department,
  grade, job_title, employment_type, hire_date, manager_id,
  phone, personal_email, address, city, postal_code,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
  is_active, created_at, updated_at
) ON public.employees TO authenticated;

-- Secure RPC: authenticated users can retrieve only their own PII.
-- SECURITY DEFINER runs as postgres, bypassing the column restriction,
-- but the WHERE clause limits results to auth.uid() only.
CREATE OR REPLACE FUNCTION public.get_my_employee_pii()
RETURNS TABLE (id_number text, date_of_birth date)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id_number, e.date_of_birth
  FROM public.employees e
  WHERE e.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_employee_pii() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_employee_pii() TO authenticated;

NOTIFY pgrst, 'reload schema';
