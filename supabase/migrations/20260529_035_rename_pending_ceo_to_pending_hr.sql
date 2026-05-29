-- ============================================================
-- MIGRATION 035 — Rename status value pending_ceo -> pending_hr
-- Safe to re-run (idempotent)
-- ============================================================

-- Step 1: Migrate existing data first (before constraint is re-applied)
UPDATE public.leave_requests
SET    status = 'pending_hr'
WHERE  status = 'pending_ceo';

-- Step 2: Drop the old CHECK constraint (auto-named by PostgreSQL from the
--         inline CHECK in migration 003).  Use IF EXISTS so re-runs are safe.
ALTER TABLE public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_status_check;

-- Step 3: Add the new CHECK constraint with the corrected status list.
--         Guard with a DO block so re-running does not error if the constraint
--         already exists with this exact definition.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint c
    JOIN   pg_class      t ON t.oid = c.conrelid
    JOIN   pg_namespace  n ON n.oid = t.relnamespace
    WHERE  n.nspname   = 'public'
      AND  t.relname   = 'leave_requests'
      AND  c.conname   = 'leave_requests_status_check'
  ) THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT leave_requests_status_check
      CHECK (status IN ('pending', 'pending_hr', 'approved', 'rejected', 'cancelled'));
  END IF;
END;
$$;
