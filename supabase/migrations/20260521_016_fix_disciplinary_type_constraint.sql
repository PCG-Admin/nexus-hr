-- Fix disciplinary_records type CHECK constraint.
-- Original only had: verbal_warning, written_warning, final_warning, dismissal
-- Missing: final_written_warning, suspension
-- Also renames final_warning → final_written_warning to match the application.

ALTER TABLE public.disciplinary_records
  DROP CONSTRAINT IF EXISTS disciplinary_records_type_check;

-- Rename any existing 'final_warning' rows to match the new value
UPDATE public.disciplinary_records
  SET type = 'final_written_warning'
  WHERE type = 'final_warning';

ALTER TABLE public.disciplinary_records
  ADD CONSTRAINT disciplinary_records_type_check
  CHECK (type IN ('verbal_warning','written_warning','final_written_warning','suspension','dismissal'));

-- Also add RLS policy for disciplinary_audit so authenticated users can insert
-- (reads are already covered by the existing select policy)
DROP POLICY IF EXISTS "hr_managers_insert_audit" ON public.disciplinary_audit;
CREATE POLICY "hr_managers_insert_audit"
  ON public.disciplinary_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);
