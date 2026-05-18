-- Update leave balances to current year (2026)
UPDATE leave_balances SET year = 2026 WHERE year = 2025;
