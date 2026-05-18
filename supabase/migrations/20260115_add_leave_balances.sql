-- Add leave balances for all users for the current year
-- This creates a balance entry for each leave type for each user

INSERT INTO leave_balances (user_id, leave_type_id, total_days, used_days, year)
SELECT
  p.id as user_id,
  lt.id as leave_type_id,
  lt.default_days_per_year as total_days,
  0 as used_days,
  2025 as year
FROM profiles p
CROSS JOIN leave_types lt
WHERE NOT EXISTS (
  SELECT 1 FROM leave_balances lb
  WHERE lb.user_id = p.id
  AND lb.leave_type_id = lt.id
  AND lb.year = 2025
);
