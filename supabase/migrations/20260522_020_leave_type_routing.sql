-- ============================================================
-- Leave Type Routing Configuration
-- Adds per-leave-type approval routing and document requirements.
-- requires_manager_approval: false → skips line manager, goes direct to HR
-- requires_document: true → document upload is mandatory on submission
-- ============================================================

ALTER TABLE public.leave_types
  ADD COLUMN IF NOT EXISTS requires_manager_approval BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS requires_document         BOOLEAN NOT NULL DEFAULT FALSE;

-- Sensible defaults per BCEA leave type
UPDATE public.leave_types SET requires_manager_approval = TRUE,  requires_document = FALSE WHERE name = 'Annual Leave';
UPDATE public.leave_types SET requires_manager_approval = FALSE, requires_document = FALSE WHERE name = 'Sick Leave';
UPDATE public.leave_types SET requires_manager_approval = FALSE, requires_document = FALSE WHERE name = 'Family Responsibility';
UPDATE public.leave_types SET requires_manager_approval = FALSE, requires_document = TRUE  WHERE name = 'Maternity Leave';
UPDATE public.leave_types SET requires_manager_approval = FALSE, requires_document = TRUE  WHERE name = 'Parental Leave';
