-- Create public holidays table
CREATE TABLE IF NOT EXISTS public_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  year INTEGER NOT NULL GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)::INTEGER) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS public_holidays_date_idx ON public_holidays(date);
CREATE INDEX IF NOT EXISTS public_holidays_year_idx ON public_holidays(year);

ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read public holidays (needed for day count on request form)
CREATE POLICY "Authenticated users can read public holidays"
  ON public_holidays FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can add holidays
CREATE POLICY "Admins can insert public holidays"
  ON public_holidays FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can delete holidays
CREATE POLICY "Admins can delete public holidays"
  ON public_holidays FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed 2026 South African public holidays
INSERT INTO public_holidays (name, date) VALUES
  ('New Year''s Day',          '2026-01-01'),
  ('Human Rights Day',         '2026-03-23'), -- 21 Mar falls on Sat → Mon 23 observed
  ('Good Friday',              '2026-04-03'),
  ('Family Day',               '2026-04-06'), -- Monday after Easter
  ('Freedom Day',              '2026-04-27'),
  ('Workers'' Day',            '2026-05-01'),
  ('Youth Day',                '2026-06-16'),
  ('National Women''s Day',    '2026-08-10'), -- 9 Aug falls on Sun → Mon 10 observed
  ('Heritage Day',             '2026-09-24'),
  ('Day of Reconciliation',    '2026-12-16'),
  ('Christmas Day',            '2026-12-25'),
  ('Day of Goodwill',          '2026-12-26')
ON CONFLICT (date) DO NOTHING;
