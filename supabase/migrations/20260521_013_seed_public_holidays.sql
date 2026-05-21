-- ============================================================
-- SEED BATCH 2 — South African public holidays 2025 + 2026
-- ============================================================

INSERT INTO public.public_holidays (name, date, year) VALUES

  -- 2025
  ('New Year''s Day',        '2025-01-01', 2025),
  ('Human Rights Day',       '2025-03-21', 2025),
  ('Good Friday',            '2025-04-18', 2025),
  ('Family Day',             '2025-04-21', 2025),
  ('Freedom Day',            '2025-04-27', 2025),
  ('Workers'' Day',          '2025-05-01', 2025),
  ('Youth Day',              '2025-06-16', 2025),
  ('National Women''s Day',  '2025-08-09', 2025),
  ('Heritage Day',           '2025-09-24', 2025),
  ('Day of Reconciliation',  '2025-12-16', 2025),
  ('Christmas Day',          '2025-12-25', 2025),
  ('Day of Goodwill',        '2025-12-26', 2025),

  -- 2026
  ('New Year''s Day',        '2026-01-01', 2026),
  ('Human Rights Day',       '2026-03-21', 2026),
  ('Good Friday',            '2026-04-03', 2026),
  ('Family Day',             '2026-04-06', 2026),
  ('Freedom Day',            '2026-04-27', 2026),
  ('Workers'' Day',          '2026-05-01', 2026),
  ('Youth Day',              '2026-06-16', 2026),
  ('National Women''s Day',  '2026-08-10', 2026),
  ('Heritage Day',           '2026-09-24', 2026),
  ('Day of Reconciliation',  '2026-12-16', 2026),
  ('Christmas Day',          '2026-12-25', 2026),
  ('Day of Goodwill',        '2026-12-26', 2026)

ON CONFLICT (date) DO NOTHING;
