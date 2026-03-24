-- 1. Create crew_members table
CREATE TABLE IF NOT EXISTS crew_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Create crew_used_log table
CREATE TABLE IF NOT EXISTS crew_used_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID REFERENCES fault_forms(id) ON DELETE CASCADE,
  crew_name TEXT NOT NULL,
  hours DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Create settings table (for logos)
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS on new tables
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_used_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crew_members
CREATE POLICY "Allow public read access to crew_members" ON crew_members FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to crew_members" ON crew_members FOR ALL USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

-- RLS Policies for crew_used_log
CREATE POLICY "Allow users to read crew_used_log" ON crew_used_log FOR SELECT USING (true);
CREATE POLICY "Allow users to insert/update crew_used_log" ON crew_used_log FOR ALL USING (true);

-- RLS Policies for settings
CREATE POLICY "Allow public read access to settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to settings" ON settings FOR ALL USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

-- Insert default rows for logos if they don't exist
INSERT INTO settings (key, value) VALUES ('main_logo', '') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('partner_logo', '') ON CONFLICT (key) DO NOTHING;

-- Create storage bucket for public assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('public_assets', 'public_assets', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for public_assets bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'public_assets');
CREATE POLICY "Admin Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'public_assets' AND auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admin Update" ON storage.objects FOR UPDATE USING (bucket_id = 'public_assets' AND auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE USING (bucket_id = 'public_assets' AND auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
