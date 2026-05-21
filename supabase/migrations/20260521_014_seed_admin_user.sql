-- ============================================================
-- SEED BATCH 3 — Initial admin employee record
--
-- NOTE: The auth.users row must be created first via Supabase Auth dashboard
-- or supabaseAdmin.auth.admin.createUser() before running this insert.
-- The UUID below matches the auth user created during initial setup.
--
-- Credentials: admin@nexushr.com / password123
-- Auth UUID:   8db3d35f-5212-4117-91de-836ddd5cd60f
-- ============================================================

INSERT INTO public.employees (
  id,
  email,
  first_name,
  last_name,
  employee_number,
  role,
  department,
  grade,
  hire_date,
  is_active
)
VALUES (
  '8db3d35f-5212-4117-91de-836ddd5cd60f',
  'admin@nexushr.com',
  'Asmah',
  'Yaseen',
  'EMP001',
  'system_admin',
  'Administration',
  5,
  '2021-01-01',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Leave balances for admin user (full allocation, no accrual)
INSERT INTO public.leave_balances (user_id, leave_type_id, total_days, used_days, year)
VALUES
  ('8db3d35f-5212-4117-91de-836ddd5cd60f', '00000000-0000-0000-0000-000000000001', 15,  0, 2026),
  ('8db3d35f-5212-4117-91de-836ddd5cd60f', '00000000-0000-0000-0000-000000000002', 10,  0, 2026),
  ('8db3d35f-5212-4117-91de-836ddd5cd60f', '00000000-0000-0000-0000-000000000003',  3,  0, 2026),
  ('8db3d35f-5212-4117-91de-836ddd5cd60f', '00000000-0000-0000-0000-000000000004', 120, 0, 2026),
  ('8db3d35f-5212-4117-91de-836ddd5cd60f', '00000000-0000-0000-0000-000000000005', 10,  0, 2026)
ON CONFLICT (user_id, leave_type_id, year) DO NOTHING;
