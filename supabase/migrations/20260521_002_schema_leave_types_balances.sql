-- ============================================================
-- SCHEMA BATCH 2 — leave_types + leave_balances tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leave_types (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL UNIQUE,
  default_days INTEGER     NOT NULL,
  color        TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leave_balances (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID           NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID           NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  total_days    NUMERIC(5,1)   NOT NULL DEFAULT 0,
  used_days     NUMERIC(5,1)   NOT NULL DEFAULT 0,
  year          INTEGER        NOT NULL,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, leave_type_id, year)
);
