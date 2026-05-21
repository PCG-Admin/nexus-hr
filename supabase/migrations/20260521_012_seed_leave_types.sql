-- ============================================================
-- SEED BATCH 1 — Leave types (fixed UUIDs for predictable FK references)
-- ============================================================

INSERT INTO public.leave_types (id, name, default_days, color, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Annual Leave',          15,  '#4CAF50', TRUE),
  ('00000000-0000-0000-0000-000000000002', 'Sick Leave',            10,  '#F44336', TRUE),
  ('00000000-0000-0000-0000-000000000003', 'Family Responsibility',  3,  '#FF9800', TRUE),
  ('00000000-0000-0000-0000-000000000004', 'Maternity Leave',       120, '#E91E63', TRUE),
  ('00000000-0000-0000-0000-000000000005', 'Parental Leave',         10, '#2196F3', TRUE)
ON CONFLICT (id) DO NOTHING;
