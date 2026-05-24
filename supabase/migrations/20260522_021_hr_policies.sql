-- ============================================================
-- HR Policy Repository
-- Stores company policies, agreements and forms with scoped
-- employee access. Acknowledgements provide audit evidence
-- for CCMA compliance (prove employee received the document).
-- Archive-only — no DELETE policy by design.
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

-- Acknowledgement audit trail — immutable once created
CREATE TABLE IF NOT EXISTS public.hr_policy_acknowledgements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id   UUID        NOT NULL REFERENCES public.hr_policies(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (policy_id, user_id)
);

ALTER TABLE public.hr_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_policy_acknowledgements ENABLE ROW LEVEL SECURITY;

-- HR/admin see everything; others see only what is scoped to their role
CREATE POLICY "hr_policies_select"
  ON public.hr_policies FOR SELECT
  USING (
    public.my_role() IN ('hr_manager', 'system_admin')
    OR (
      is_archived = FALSE AND is_active = TRUE
      AND (
        visibility = 'all'
        OR (visibility = 'management' AND public.my_role() IN ('line_manager', 'executive'))
      )
    )
  );

CREATE POLICY "hr_policies_insert"
  ON public.hr_policies FOR INSERT
  WITH CHECK (public.my_role() IN ('hr_manager', 'system_admin'));

CREATE POLICY "hr_policies_update"
  ON public.hr_policies FOR UPDATE
  USING (public.my_role() IN ('hr_manager', 'system_admin'));

-- No DELETE policy — archive only

-- Acknowledgements
CREATE POLICY "hr_policy_ack_insert"
  ON public.hr_policy_acknowledgements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "hr_policy_ack_select_own"
  ON public.hr_policy_acknowledgements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "hr_policy_ack_select_hr"
  ON public.hr_policy_acknowledgements FOR SELECT
  USING (public.my_role() IN ('hr_manager', 'system_admin'));

-- Storage bucket for uploaded policy documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hr-policies',
  'hr-policies',
  TRUE,
  10485760,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "hr_policies_storage_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hr-policies' AND auth.role() = 'authenticated');

CREATE POLICY "hr_policies_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hr-policies' AND public.my_role() IN ('hr_manager', 'system_admin'));

-- ── Seed existing PDFs from public/forms/ ───────────────────────────────────
INSERT INTO public.hr_policies (title, description, category, file_url, file_name, version, visibility, uploaded_by_name)
VALUES
  (
    'Staff Information Sheet',
    'Employee personal, banking and emergency contact information — required for all new employees',
    'Onboarding',
    '/forms/Staff Information Sheet 1.pdf',
    'Staff Information Sheet 1.pdf',
    1, 'all', 'System'
  ),
  (
    'EEA1 Employment Equity Form',
    'SA Employment Equity Act statutory form — required by law for all new employees',
    'Onboarding',
    '/forms/1. EEA 1 (1) 1.pdf',
    '1. EEA 1 (1) 1.pdf',
    1, 'all', 'System'
  ),
  (
    'Welcome Letter Template',
    'Standard welcome letter issued to new employees before their start date',
    'Onboarding',
    '/forms/WELCOME LETTER TEMPLATE.pdf',
    'WELCOME LETTER TEMPLATE.pdf',
    1, 'hr_only', 'System'
  ),
  (
    'Starter & Leaver Form',
    'IT and systems provisioning form — sent to IT for all new starters and leavers',
    'Onboarding',
    '/forms/XLN STARTER AND LEAVER FORM_MASTER.pdf',
    'XLN STARTER AND LEAVER FORM_MASTER.pdf',
    1, 'hr_only', 'System'
  ),
  (
    'Probationary Period Tracking Form',
    'Tracks line manager check-ins and probation decisions across the 3-month probation period',
    'Probation',
    '/forms/PROBATIONARY PERIOD TRACKING FORM.pdf',
    'PROBATIONARY PERIOD TRACKING FORM.pdf',
    1, 'management', 'System'
  ),
  (
    'Acknowledgement of Debt',
    'Employee acknowledgement of a debt owed to the company',
    'HR Agreements',
    '/forms/ACKNOWLEDGEMENT OF DEBT.pdf',
    'ACKNOWLEDGEMENT OF DEBT.pdf',
    1, 'all', 'System'
  ),
  (
    'Emergency Assistance Loan Agreement',
    'Agreement for emergency financial assistance provided by the company',
    'HR Agreements',
    '/forms/EMERGENCY ASSISTANCE LOAN AGREEMENT.pdf',
    'EMERGENCY ASSISTANCE LOAN AGREEMENT.pdf',
    1, 'all', 'System'
  ),
  (
    'Salary Advance Authorisation',
    'Authorisation form for salary advance requests',
    'HR Agreements',
    '/forms/SALARY ADVANCE AUTHORISATION AGREEMENT.pdf',
    'SALARY ADVANCE AUTHORISATION AGREEMENT.pdf',
    1, 'all', 'System'
  ),
  (
    'Personal Travel Booking Facility',
    'Agreement for use of the company personal travel booking facility benefit',
    'HR Agreements',
    '/forms/PERSONAL TRAVEL BOOKING FACILITY AGREEMENT.pdf',
    'PERSONAL TRAVEL BOOKING FACILITY AGREEMENT.pdf',
    1, 'all', 'System'
  ),
  (
    'Employee Exit & Offboarding Form',
    'Checklist and process form for employee exit and offboarding',
    'Offboarding',
    '/forms/EMPLOYEE EXIT AND OFFBOARDING FORM.pdf',
    'EMPLOYEE EXIT AND OFFBOARDING FORM.pdf',
    1, 'management', 'System'
  ),
  (
    'Settlement Agreement Upon Termination',
    'Settlement agreement form for use upon termination of employment',
    'Offboarding',
    '/forms/SETTLEMENT AGREEMENT UPON TERMINATION.pdf',
    'SETTLEMENT AGREEMENT UPON TERMINATION.pdf',
    1, 'hr_only', 'System'
  )
ON CONFLICT DO NOTHING;
