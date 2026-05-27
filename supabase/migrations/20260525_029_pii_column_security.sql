-- PII column security: restrict access to id_number and date_of_birth.
--
-- DEFERRED: Column-level restriction in Supabase/PostgREST requires moving PII
-- to a separate table (employee_pii) with strict RLS. The column-level REVOKE/GRANT
-- approach breaks select("*") in the app.
--
-- Current state: SELECT on employees restored to full access.
-- get_my_employee_pii() RPC is in place for future use.
-- Fix must be completed before real employee PII is populated in production.

-- Secure RPC: authenticated users retrieve only their own PII.
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
