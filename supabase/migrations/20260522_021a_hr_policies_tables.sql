-- ============================================================
-- BATCH A — Tables & indexes
-- Run this first. Must complete before 021b.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hr_policies (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  description      TEXT,
  category         TEXT        NOT NULL DEFAULT 'General',
  file_url         TEXT        NOT NULL,
  file_name        TEXT        NOT NULL,
  version          INTEGER     NOT NULL DEFAULT 1,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  is_archived      BOOLEAN     NOT NULL DEFAULT FALSE,
  visibility       TEXT        NOT NULL DEFAULT 'all'
                               CHECK (visibility IN ('all', 'management', 'hr_only')),
  uploaded_by      UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  uploaded_by_name TEXT        NOT NULL DEFAULT 'System',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hr_policies_category_idx ON public.hr_policies (category, is_archived);

-- Acknowledgement audit trail — immutable once created (UNIQUE prevents duplicate acks)
CREATE TABLE IF NOT EXISTS public.hr_policy_acknowledgements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id   UUID        NOT NULL REFERENCES public.hr_policies(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (policy_id, user_id)
);
