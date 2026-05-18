-- Insert demo users (passwords should be hashed in production)
-- Demo password for all users: "demo123"
INSERT INTO users (email, password_hash, first_name, last_name, employee_number, role, department, hire_date, manager_id) VALUES
-- Admin
('admin@company.co.za', '$2a$10$demo_hash_admin', 'Sarah', 'Johnson', 'EMP001', 'admin', 'Human Resources', '2020-01-15', NULL),

-- Managers
('manager1@company.co.za', '$2a$10$demo_hash_mgr1', 'David', 'Smith', 'EMP002', 'manager', 'Engineering', '2020-03-01', NULL),
('manager2@company.co.za', '$2a$10$demo_hash_mgr2', 'Lisa', 'Williams', 'EMP003', 'manager', 'Marketing', '2020-06-15', NULL),

-- Employees
('john.doe@company.co.za', '$2a$10$demo_hash_emp1', 'John', 'Doe', 'EMP004', 'employee', 'Engineering', '2021-02-01', (SELECT id FROM users WHERE email = 'manager1@company.co.za')),
('jane.smith@company.co.za', '$2a$10$demo_hash_emp2', 'Jane', 'Smith', 'EMP005', 'employee', 'Engineering', '2021-05-10', (SELECT id FROM users WHERE email = 'manager1@company.co.za')),
('mike.brown@company.co.za', '$2a$10$demo_hash_emp3', 'Mike', 'Brown', 'EMP006', 'employee', 'Marketing', '2022-01-20', (SELECT id FROM users WHERE email = 'manager2@company.co.za')),
('emily.davis@company.co.za', '$2a$10$demo_hash_emp4', 'Emily', 'Davis', 'EMP007', 'employee', 'Marketing', '2022-08-15', (SELECT id FROM users WHERE email = 'manager2@company.co.za'))
ON CONFLICT (email) DO NOTHING;

-- Insert leave balances for 2025
INSERT INTO leave_balances (user_id, leave_type, total_days, used_days, available_days, year)
SELECT 
  u.id,
  lt.name,
  lt.default_days_per_year,
  0,
  lt.default_days_per_year,
  2025
FROM users u
CROSS JOIN leave_types lt
WHERE u.role IN ('employee', 'manager')
  AND lt.name IN ('Annual Leave', 'Sick Leave', 'Family Responsibility Leave')
ON CONFLICT (user_id, leave_type, year) DO NOTHING;

-- Insert some demo leave requests
INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, days_requested, reason, status, manager_id)
SELECT 
  (SELECT id FROM users WHERE email = 'john.doe@company.co.za'),
  'Annual Leave',
  '2025-02-10',
  '2025-02-14',
  5,
  'Family vacation',
  'pending',
  (SELECT id FROM users WHERE email = 'manager1@company.co.za');

INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, days_requested, reason, status, manager_id, reviewed_at)
SELECT 
  (SELECT id FROM users WHERE email = 'jane.smith@company.co.za'),
  'Annual Leave',
  '2025-01-20',
  '2025-01-24',
  5,
  'Personal travel',
  'approved',
  (SELECT id FROM users WHERE email = 'manager1@company.co.za'),
  '2025-01-15 10:30:00';

INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, days_requested, reason, status, manager_id, reviewed_at)
SELECT 
  (SELECT id FROM users WHERE email = 'mike.brown@company.co.za'),
  'Sick Leave',
  '2025-01-08',
  '2025-01-09',
  2,
  'Flu',
  'approved',
  (SELECT id FROM users WHERE email = 'manager2@company.co.za'),
  '2025-01-09 14:00:00';
