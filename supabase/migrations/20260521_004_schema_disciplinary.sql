-- ============================================================
-- SCHEMA BATCH 4 — disciplinary_records + disciplinary_audit + immutability trigger
-- ============================================================

CREATE TABLE IF NOT EXISTS public.disciplinary_records (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL
                            CHECK (type IN ('verbal_warning','written_warning','final_warning','dismissal')),
  incident_date DATE        NOT NULL,
  hearing_date  DATE,
  description   TEXT        NOT NULL,
  outcome       TEXT,
  status        TEXT        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','finalised')),
  document_url  TEXT,
  created_by    UUID        NOT NULL REFERENCES public.employees(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.disciplinary_audit (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id   UUID        NOT NULL REFERENCES public.disciplinary_records(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL,
  actor_id    UUID        NOT NULL REFERENCES public.employees(id),
  actor_name  TEXT        NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changes     JSONB       NOT NULL DEFAULT '[]'
);

-- DB-level guard: once a record is finalised it cannot be edited (SOW FR-DIS-04)
CREATE OR REPLACE FUNCTION public.prevent_finalised_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'finalised' THEN
    RAISE EXCEPTION 'Finalised disciplinary records cannot be edited';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER no_edit_after_finalise
  BEFORE UPDATE ON public.disciplinary_records
  FOR EACH ROW EXECUTE FUNCTION public.prevent_finalised_edit();
