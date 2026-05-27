-- ============================================================
-- MIGRATION 030 — Performance Management v2
-- Adds: monthly check-in flow, annual GM approval flow
-- New statuses: acknowledged, gm_approved
-- New columns: employee_acknowledged_at, manager_checkin_notes,
--              gm_reviewer_id/name/notes/approved_at,
--              manager_reviewer_name, hr_reviewer_name
-- Seeds initial performance cycles
-- ============================================================

-- 1. Extend the status CHECK constraint
ALTER TABLE public.performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_status_check;

ALTER TABLE public.performance_reviews
  ADD CONSTRAINT performance_reviews_status_check
  CHECK (status IN (
    'draft',
    'submitted',
    'manager_reviewed',
    'hr_approved',
    'acknowledged',
    'gm_approved'
  ));

-- 2. Monthly check-in columns
ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS employee_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manager_checkin_notes    TEXT;

-- 3. GM approval columns (annual flow)
ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS gm_reviewer_id           UUID        REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS gm_reviewer_name         TEXT,
  ADD COLUMN IF NOT EXISTS gm_notes                 TEXT,
  ADD COLUMN IF NOT EXISTS gm_approved_at           TIMESTAMPTZ;

-- 4. Denormalised reviewer names (avoids complex multi-FK joins on client)
ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS manager_reviewer_name    TEXT,
  ADD COLUMN IF NOT EXISTS hr_reviewer_name         TEXT;

-- 5. Seed performance cycles (safe — skip if name already exists)
INSERT INTO public.performance_cycles (name, type, start_date, end_date, year, is_active)
SELECT v.name, v.type, v.start_date, v.end_date, v.year, v.is_active
FROM (VALUES
  ('Q1 2026 (Jan–Mar)',   'quarterly'::text, '2026-01-01'::date, '2026-03-31'::date, 2026, FALSE),
  ('Q2 2026 (Apr–Jun)',   'quarterly'::text, '2026-04-01'::date, '2026-06-30'::date, 2026, TRUE),
  ('H1 2026 (Jan–Jun)',   'biannual'::text,  '2026-01-01'::date, '2026-06-30'::date, 2026, FALSE),
  ('May 2026 Check-in',   'monthly'::text,   '2026-05-01'::date, '2026-05-31'::date, 2026, TRUE),
  ('Annual Review 2026',  'annual'::text,    '2026-01-01'::date, '2026-12-31'::date, 2026, FALSE)
) AS v(name, type, start_date, end_date, year, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.performance_cycles pc WHERE pc.name = v.name
);
