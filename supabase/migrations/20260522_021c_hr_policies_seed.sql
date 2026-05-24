-- ============================================================
-- BATCH C — Seed data (existing PDFs from public/forms/)
-- Run after 021b. Safe to re-run — ON CONFLICT DO NOTHING.
-- ============================================================

-- Onboarding
INSERT INTO public.hr_policies (title, description, category, file_url, file_name, version, visibility, uploaded_by_name)
VALUES (
  'Staff Information Sheet',
  'Employee personal, banking and emergency contact information — required for all new employees',
  'Onboarding', '/forms/Staff Information Sheet 1.pdf', 'Staff Information Sheet 1.pdf',
  1, 'all', 'System'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.hr_policies (title, description, category, file_url, file_name, version, visibility, uploaded_by_name)
VALUES (
  'EEA1 Employment Equity Form',
  'SA Employment Equity Act statutory form — required by law for all new employees',
  'Onboarding', '/forms/1. EEA 1 (1) 1.pdf', '1. EEA 1 (1) 1.pdf',
  1, 'all', 'System'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.hr_policies (title, description, category, file_url, file_name, version, visibility, uploaded_by_name)
VALUES (
  'Welcome Letter Template',
  'Standard welcome letter issued to new employees before their start date',
  'Onboarding', '/forms/WELCOME LETTER TEMPLATE.pdf', 'WELCOME LETTER TEMPLATE.pdf',
  1, 'hr_only', 'System'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.hr_policies (title, description, category, file_url, file_name, version, visibility, uploaded_by_name)
VALUES (
  'Starter & Leaver Form',
  'IT and systems provisioning form — sent to IT for all new starters and leavers',
  'Onboarding', '/forms/XLN STARTER AND LEAVER FORM_MASTER.pdf', 'XLN STARTER AND LEAVER FORM_MASTER.pdf',
  1, 'hr_only', 'System'
)
ON CONFLICT DO NOTHING;

-- Probation
INSERT INTO public.hr_policies (title, description, category, file_url, file_name, version, visibility, uploaded_by_name)
VALUES (
  'Probationary Period Tracking Form',
  'Tracks line manager check-ins and probation decisions across the 3-month probation period',
  'Probation', '/forms/PROBATIONARY PERIOD TRACKING FORM.pdf', 'PROBATIONARY PERIOD TRACKING FORM.pdf',
  1, 'management', 'System'
)
ON CONFLICT DO NOTHING;

-- HR Agreements
INSERT INTO public.hr_policies (title, description, category, file_url, file_name, version, visibility, uploaded_by_name)
VALUES (
  'Acknowledgement of Debt',
  'Employee acknowledgement of a debt owed to the company',
  'HR Agreements', '/forms/ACKNOWLEDGEMENT OF DEBT.pdf', 'ACKNOWLEDGEMENT OF DEBT.pdf',
  1, 'all', 'System'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.hr_policies (title, description, category, file_url, file_name, version, visibility, uploaded_by_name)
VALUES (
  'Emergency Assistance Loan Agreement',
  'Agreement for emergency financial assistance provided by the company',
  'HR Agreements', '/forms/EMERGENCY ASSISTANCE LOAN AGREEMENT.pdf', 'EMERGENCY ASSISTANCE LOAN AGREEMENT.pdf',
  1, 'all', 'System'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.hr_policies (title, description, category, file_url, file_name, version, visibility, uploaded_by_name)
VALUES (
  'Salary Advance Authorisation',
  'Authorisation form for salary advance requests',
  'HR Agreements', '/forms/SALARY ADVANCE AUTHORISATION AGREEMENT.pdf', 'SALARY ADVANCE AUTHORISATION AGREEMENT.pdf',
  1, 'all', 'System'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.hr_policies (title, description, category, file_url, file_name, version, visibility, uploaded_by_name)
VALUES (
  'Personal Travel Booking Facility',
  'Agreement for use of the company personal travel booking facility benefit',
  'HR Agreements', '/forms/PERSONAL TRAVEL BOOKING FACILITY AGREEMENT.pdf', 'PERSONAL TRAVEL BOOKING FACILITY AGREEMENT.pdf',
  1, 'all', 'System'
)
ON CONFLICT DO NOTHING;

-- Offboarding
INSERT INTO public.hr_policies (title, description, category, file_url, file_name, version, visibility, uploaded_by_name)
VALUES (
  'Employee Exit & Offboarding Form',
  'Checklist and process form for employee exit and offboarding',
  'Offboarding', '/forms/EMPLOYEE EXIT AND OFFBOARDING FORM.pdf', 'EMPLOYEE EXIT AND OFFBOARDING FORM.pdf',
  1, 'management', 'System'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.hr_policies (title, description, category, file_url, file_name, version, visibility, uploaded_by_name)
VALUES (
  'Settlement Agreement Upon Termination',
  'Settlement agreement form for use upon termination of employment',
  'Offboarding', '/forms/SETTLEMENT AGREEMENT UPON TERMINATION.pdf', 'SETTLEMENT AGREEMENT UPON TERMINATION.pdf',
  1, 'hr_only', 'System'
)
ON CONFLICT DO NOTHING;
