-- ============================================================
-- BATCH B — RLS policies + storage bucket
-- Run after 021a. Tables must already exist.
-- ============================================================

ALTER TABLE public.hr_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_policy_acknowledgements ENABLE ROW LEVEL SECURITY;

-- HR/admin see everything; others see only active, non-archived docs scoped to their role
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

-- No DELETE policy — archive only (CCMA compliance: documents must be retained)

-- Acknowledgements: employees insert their own; HR can read all
CREATE POLICY "hr_policy_ack_insert"
  ON public.hr_policy_acknowledgements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "hr_policy_ack_select_own"
  ON public.hr_policy_acknowledgements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "hr_policy_ack_select_hr"
  ON public.hr_policy_acknowledgements FOR SELECT
  USING (public.my_role() IN ('hr_manager', 'system_admin'));

-- Storage bucket for uploaded policy documents (10 MB max, PDF/Word/Image)
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
