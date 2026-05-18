-- Drop first because return type changed from INT to NUMERIC
DROP FUNCTION IF EXISTS calculate_used_leave_days(UUID, UUID, INTEGER);

-- Fix: count ALL approved leave days (including future approved leave)
-- Previously only counted elapsed days which meant future-approved leave
-- didn't show as deducted until the leave dates actually passed.
CREATE OR REPLACE FUNCTION calculate_used_leave_days(
  p_user_id UUID,
  p_leave_type_id UUID,
  p_year INT
) RETURNS NUMERIC AS $$
DECLARE
  total_used NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(days_requested), 0)
  INTO total_used
  FROM leave_requests
  WHERE user_id        = p_user_id
    AND leave_type_id  = p_leave_type_id
    AND status         = 'approved'
    AND EXTRACT(YEAR FROM start_date) = p_year;

  RETURN total_used;
END;
$$ LANGUAGE plpgsql;
