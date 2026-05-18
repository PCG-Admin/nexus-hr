-- Enable RLS on all tables
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Leave Types: Everyone can read
DROP POLICY IF EXISTS "Anyone can read leave types" ON leave_types;
CREATE POLICY "Anyone can read leave types" ON leave_types
  FOR SELECT TO authenticated USING (true);

-- Leave Balances: Users can read their own
DROP POLICY IF EXISTS "Users can read own balances" ON leave_balances;
CREATE POLICY "Users can read own balances" ON leave_balances
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Managers and admins can read all balances
DROP POLICY IF EXISTS "Managers can read all balances" ON leave_balances;
CREATE POLICY "Managers can read all balances" ON leave_balances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Leave Requests: Users can read their own
DROP POLICY IF EXISTS "Users can read own requests" ON leave_requests;
CREATE POLICY "Users can read own requests" ON leave_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can insert their own requests
DROP POLICY IF EXISTS "Users can insert own requests" ON leave_requests;
CREATE POLICY "Users can insert own requests" ON leave_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Managers can read requests from their team
DROP POLICY IF EXISTS "Managers can read team requests" ON leave_requests;
CREATE POLICY "Managers can read team requests" ON leave_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'admin')
    )
  );

-- Managers can update requests (approve/reject)
DROP POLICY IF EXISTS "Managers can update requests" ON leave_requests;
CREATE POLICY "Managers can update requests" ON leave_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'admin')
    )
  );
