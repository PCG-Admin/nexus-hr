-- ============================================================
-- SCHEMA BATCH 6 — performance_cycles + performance_reviews tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.performance_cycles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  type       TEXT        NOT NULL CHECK (type IN ('monthly','quarterly','biannual','annual')),
  start_date DATE        NOT NULL,
  end_date   DATE        NOT NULL,
  year       INTEGER     NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id            UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  cycle_id               UUID        NOT NULL REFERENCES public.performance_cycles(id),
  status                 TEXT        NOT NULL DEFAULT 'draft'
                                     CHECK (status IN ('draft','submitted','manager_reviewed','hr_approved')),
  kpis                   JSONB       NOT NULL DEFAULT '[]',
  employee_notes         TEXT,
  submitted_at           TIMESTAMPTZ,
  manager_reviewer_id    UUID        REFERENCES public.employees(id),
  manager_notes          TEXT,
  manager_reviewed_at    TIMESTAMPTZ,
  hr_reviewer_id         UUID        REFERENCES public.employees(id),
  hr_notes               TEXT,
  hr_approved_at         TIMESTAMPTZ,
  incentive_gate_cleared BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, cycle_id)
);
