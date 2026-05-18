-- ============================================================
-- 1. Fix Annual Leave: 21 → 15 days, switch to monthly accrual
-- ============================================================
UPDATE leave_types
SET
  default_days_per_year = 15,
  accrual_type = 'monthly',
  description = 'Paid annual leave - 15 days per year accrued at 1.25 days per month',
  updated_at = NOW()
WHERE name = 'Annual Leave';

-- ============================================================
-- 2. Add last_accrued_at to leave_balances
--    Tracks when accrual last ran so we never double-accrue
-- ============================================================
ALTER TABLE leave_balances
  ADD COLUMN IF NOT EXISTS last_accrued_at TIMESTAMPTZ;

-- ============================================================
-- 3. Prorate existing 2026 Annual Leave balances
--    Sets total_days = months elapsed × 1.25, capped at 15
--    Sets last_accrued_at so the cron won't re-run this month
-- ============================================================
UPDATE leave_balances lb
SET
  total_days = LEAST(
    ROUND(CAST(EXTRACT(MONTH FROM CURRENT_DATE) * 1.25 AS NUMERIC), 2),
    15
  ),
  last_accrued_at = NOW(),
  updated_at = NOW()
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND lb.leave_type_id = (
    SELECT id FROM leave_types WHERE name = 'Annual Leave'
  );

-- ============================================================
-- 4. run_monthly_accrual() — called by the cron each month
--    Adds 1.25 days to every employee's annual leave balance,
--    capped at default_days_per_year. Skips if already ran
--    this calendar month.
-- ============================================================
CREATE OR REPLACE FUNCTION run_monthly_accrual()
RETURNS TABLE(processed INT, skipped INT, message TEXT) AS $$
DECLARE
  balance_rec   RECORD;
  max_days      NUMERIC;
  processed_ct  INT := 0;
  skipped_ct    INT := 0;
  current_year  INT := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  FOR balance_rec IN
    SELECT lb.id, lb.total_days, lb.last_accrued_at, lt.default_days_per_year
    FROM leave_balances lb
    JOIN leave_types lt ON lt.id = lb.leave_type_id
    WHERE lb.year = current_year
      AND lt.accrual_type = 'monthly'
  LOOP
    -- Skip if already accrued in the current calendar month
    IF balance_rec.last_accrued_at IS NOT NULL
      AND EXTRACT(MONTH FROM balance_rec.last_accrued_at) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR  FROM balance_rec.last_accrued_at) = current_year
    THEN
      skipped_ct := skipped_ct + 1;
      CONTINUE;
    END IF;

    -- Skip if already at the cap
    IF balance_rec.total_days >= balance_rec.default_days_per_year THEN
      skipped_ct := skipped_ct + 1;
      CONTINUE;
    END IF;

    UPDATE leave_balances
    SET
      total_days     = LEAST(
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
