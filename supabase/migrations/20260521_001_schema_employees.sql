-- ============================================================
-- SCHEMA BATCH 1 — employees table + my_role() security function
-- ============================================================

CREATE TABLE IF NOT EXISTS public.employees (
  id                             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                          TEXT        NOT NULL UNIQUE,
  first_name                     TEXT        NOT NULL,
  last_name                      TEXT        NOT NULL,
  employee_number                TEXT        UNIQUE,
  role                           TEXT        NOT NULL DEFAULT 'employee'
                                             CHECK (role IN ('employee','line_manager','hr_manager','executive','system_admin')),
  department                     TEXT,
  grade                          INTEGER,
  job_title                      TEXT,
  employment_type                TEXT        CHECK (employment_type IN ('permanent','fixed_term','probation')),
  hire_date                      DATE,
  manager_id                     UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  phone                          TEXT,
  personal_email                 TEXT,
  address                        TEXT,
  city                           TEXT,
  postal_code                    TEXT,
  emergency_contact_name         TEXT,
  emergency_contact_phone        TEXT,
  emergency_contact_relationship TEXT,
  id_number                      TEXT,
  date_of_birth                  DATE,
  is_active                      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security-definer function so RLS policies can call it without recursion
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.employees WHERE id = auth.uid()
$$;
