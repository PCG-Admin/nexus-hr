-- ============================================================
-- SCHEMA BATCH 3 — leave_requests table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id       UUID         NOT NULL REFERENCES public.leave_types(id),
  start_date          DATE         NOT NULL,
  end_date            DATE         NOT NULL,
  days_requested      NUMERIC(5,1) NOT NULL,
  reason              TEXT,
  status              TEXT         NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','pending_ceo','approved','rejected','cancelled')),
  is_override         BOOLEAN      NOT NULL DEFAULT FALSE,
  reviewer_id         UUID         REFERENCES public.employees(id),
  reviewer_notes      TEXT,
  reviewed_at         TIMESTAMPTZ,
  manager_reviewer_id UUID         REFERENCES public.employees(id),
  manager_reviewed_at TIMESTAMPTZ,
  document_url        TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
