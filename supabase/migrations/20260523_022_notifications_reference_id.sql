-- Add reference_id to notifications — links a notification back to the
-- originating record (leave_request id, policy id, etc.) for deep-linking.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS reference_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();
