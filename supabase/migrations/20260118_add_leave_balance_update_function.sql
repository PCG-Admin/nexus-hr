-- Function to calculate used days from approved leave requests
-- This counts days that have actually passed (not future days)
CREATE OR REPLACE FUNCTION calculate_used_leave_days(
  p_user_id UUID,
  p_leave_type_id UUID,
  p_year INT
) RETURNS INT AS $$
DECLARE
  total_used INT := 0;
  leave_record RECORD;
  start_dt DATE;
  end_dt DATE;
  today_dt DATE := CURRENT_DATE;
  days_elapsed INT;
BEGIN
  -- Loop through all approved leave requests for this user/type/year
  FOR leave_record IN
    SELECT start_date, end_date, days_requested
    FROM leave_requests
    WHERE user_id = p_user_id
      AND leave_type_id = p_leave_type_id
      AND status = 'approved'
      AND EXTRACT(YEAR FROM start_date) = p_year
  LOOP
    start_dt := leave_record.start_date;
    end_dt := leave_record.end_date;

    -- Only count if the leave has started
    IF start_dt <= today_dt THEN
      -- Calculate days elapsed (from start to min(end_date, today))
      IF end_dt <= today_dt THEN
        -- Leave period is complete
        days_elapsed := leave_record.days_requested;
      ELSE
        -- Leave is in progress - count days from start to today (inclusive)
        days_elapsed := (today_dt - start_dt) + 1;
      END IF;

      total_used := total_used + days_elapsed;
    END IF;
  END LOOP;

  RETURN total_used;
END;
$$ LANGUAGE plpgsql;

-- Function to update all leave balances based on approved requests
CREATE OR REPLACE FUNCTION update_all_leave_balances() RETURNS void AS $$
DECLARE
  balance_record RECORD;
  calculated_used INT;
BEGIN
  -- Loop through all leave balances for the current year
  FOR balance_record IN
    SELECT id, user_id, leave_type_id, year
    FROM leave_balances
    WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
  LOOP
    -- Calculate the used days for this balance
    calculated_used := calculate_used_leave_days(
      balance_record.user_id,
      balance_record.leave_type_id,
      balance_record.year
    );

    -- Update the balance if it has changed
    UPDATE leave_balances
    SET used_days = calculated_used,
        updated_at = NOW()
    WHERE id = balance_record.id
      AND used_days != calculated_used;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column to leave_balances if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_balances' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE leave_balances ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;
