-- Tables for General Settings

-- 1. Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Materials Catalog Table
CREATE TABLE IF NOT EXISTS materials_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    unit VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_catalog ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read for vehicles" ON vehicles FOR SELECT USING (true);
CREATE POLICY "Allow admin manage vehicles" ON vehicles FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

CREATE POLICY "Allow public read for materials_catalog" ON materials_catalog FOR SELECT USING (true);
CREATE POLICY "Allow admin manage materials_catalog" ON materials_catalog FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Insert some initial data
INSERT INTO vehicles (name) VALUES 
('رافعة سلة'),
('سيارة دفع رباعي'),
('شاحنة نقل'),
('ونش')
ON CONFLICT (name) DO NOTHING;

INSERT INTO materials_catalog (name, unit) VALUES 
('كابل 120 ملم', 'متر'),
('كابل 70 ملم', 'متر'),
('قاطع دورة 100 أمبير', 'عدد'),
('عازل خزفي', 'عدد'),
('محول 250 ك.ف.أ', 'عدد')
ON CONFLICT (name) DO NOTHING;
