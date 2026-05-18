-- Insert BCEA compliant leave types for South Africa
INSERT INTO leave_types (name, description, default_days_per_year, accrual_type, requires_documentation, color) VALUES
('Annual Leave', 'Paid annual leave as per BCEA - minimum 21 consecutive days per year or 1 day per 17 days worked', 21, 'annual', FALSE, '#10b981'),
('Sick Leave', 'Paid sick leave - 30 days per 3-year cycle (1 day per 26 days worked in first 6 months)', 10, 'annual', TRUE, '#ef4444'),
('Family Responsibility Leave', 'Paid leave for family matters - 3 days per year (after 4 months employment)', 3, 'annual', FALSE, '#f59e0b'),
('Maternity Leave', 'Unpaid maternity leave - 4 consecutive months', 120, 'fixed', TRUE, '#ec4899'),
('Parental Leave', 'Parental leave - 10 consecutive days (paid if in service for 12+ months)', 10, 'fixed', TRUE, '#8b5cf6'),
('Study Leave', 'Leave for educational purposes (company policy)', 5, 'annual', TRUE, '#3b82f6'),
('Unpaid Leave', 'Unpaid leave for personal reasons', 0, 'fixed', FALSE, '#6b7280')
ON CONFLICT (name) DO NOTHING;
