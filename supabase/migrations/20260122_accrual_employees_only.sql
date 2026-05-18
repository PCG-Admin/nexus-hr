-- ============================================================
-- 1. Reset admin/manager annual leave back to 21 days
--    Employees keep their prorated 15-day accrual balance
-- ============================================================
UPDATE leave_balances lb
SET
  total_days      = 21,
  last_accrued_at = NULL,
  updated_at      = NOW()
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND lb.leave_type_id = (
    SELECT id FROM leave_types WHERE name = 'Annual Leave'
  )
  AND lb.user_id IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'manager')
  );

-- ============================================================
-- 2. Update run_monthly_accrual to only process employees
--    Admins and managers are excluded — their balance is fixed
-- ============================================================
CREATE OR REPLACE FUNCTION run_monthly_accrual()
RETURNS TABLE(processed INT, skipped INT, message TEXT) AS $$
DECLARE
  balance_rec   RECORD;
  processed_ct  INT := 0;
  skipped_ct    INT := 0;
  current_year  INT := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  FOR balance_rec IN
    SELECT lb.id, lb.total_days, lb.last_accrued_at, lt.default_days_per_year
    FROM leave_balances lb
    JOIN leave_types lt ON lt.id = lb.leave_type_id
    JOIN profiles p     ON p.id  = lb.user_id
    WHERE lb.year = current_year
      AND lt.accrual_type = 'monthly'
      AND p.role = 'employee'
  LOOP
    -- Skip if already accrued this calendar month
    IF balance_rec.last_accrued_at IS NOT NULL
      AND EXTRACT(MONTH FROM balance_rec.last_accrued_at) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR  FROM balance_rec.last_accrued_at) = current_year
    THEN
      skipped_ct := skipped_ct + 1;
      CONTINUE;
    END IF;

    -- Skip if already at cap
    IF balance_rec.total_days >= balance_rec.default_days_per_year THEN
      skipped_ct := skipped_ct + 1;
      CONTINUE;
    END IF;

    UPDATE leave_balances
    SET
      total_days      = LEAST(
                          ROUND(CAST(total_days + 1.25 AS NUMERIC), 2),
                          balance_rec.default_days_per_year
                        ),
      last_accrued_at = NOW(),
      updated_at      = NOW()
    WHERE id = balance_rec.id;

    processed_ct := processed_ct + 1;
  END LOOP;

  RETURN QUERY SELECT
    processed_ct,
    skipped_ct,
    FORMAT('Accrual complete: %s processed, %s skipped', processed_ct, skipped_ct);
END;
$$ LANGUAGE plpgsql;
