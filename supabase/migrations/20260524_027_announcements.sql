-- Business Announcements Engine
-- One-way publishing: HR/admin creates, employees receive
-- Supports targeting by department or grade, scheduling, and auto-expiry

CREATE TABLE IF NOT EXISTS public.announcements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT 'general'
                              CHECK (category IN ('general','hr','operations','it','finance','safety')),
  target_type     TEXT        NOT NULL DEFAULT 'all'
                              CHECK (target_type IN ('all','department','grade')),
  target_values   TEXT[]      NOT NULL DEFAULT '{}',
  is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  scheduled_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_by      UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  created_by_name TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_published  ON public.announcements (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_scheduled  ON public.announcements (scheduled_at) WHERE is_published = FALSE;
CREATE INDEX IF NOT EXISTS idx_announcements_expires    ON public.announcements (expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Employees see published, non-expired announcements
CREATE POLICY "employees_see_published_announcements"
  ON public.announcements FOR SELECT
  USING (
    is_published = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid())
  );

-- HR managers and system admins see everything (including drafts/scheduled)
CREATE POLICY "hr_admin_see_all_announcements"
  ON public.announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = auth.uid() AND role IN ('hr_manager','system_admin')
    )
  );

-- HR managers and system admins can create/update/delete
CREATE POLICY "hr_admin_manage_announcements"
  ON public.announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = auth.uid() AND role IN ('hr_manager','system_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = auth.uid() AND role IN ('hr_manager','system_admin')
    )
  );
