-- Supabase Schema for Electrical Fault Reports Manager

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUMs
CREATE TYPE user_role AS ENUM ('admin', 'sector_user');
CREATE TYPE form_status AS ENUM ('draft', 'printed', 'signed', 'closed');

-- 1. Sectors Table
CREATE TABLE sectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    feeders TEXT[] DEFAULT '{}',
    transformer_numbers TEXT[] DEFAULT '{}',
    stations TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users Table (Extends auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'sector_user',
    sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Fault Forms Table
CREATE TABLE fault_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_number VARCHAR(100) NOT NULL UNIQUE,
    sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    day VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    feeder VARCHAR(255) NOT NULL,
    transformer_number VARCHAR(255) NOT NULL,
    station VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    work_order_number VARCHAR(255) NOT NULL,
    fault_details TEXT NOT NULL,
    vehicles_used TEXT,
    obstacles_problems TEXT,
    technical_staff TEXT NOT NULL,
    status form_status NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Materials Used Table
CREATE TABLE materials_used (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES fault_forms(id) ON DELETE CASCADE,
    index_number INTEGER NOT NULL,
    details TEXT NOT NULL,
    quantity NUMERIC NOT NULL
);

-- 5. Materials Returned Table
CREATE TABLE materials_returned (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES fault_forms(id) ON DELETE CASCADE,
    index_number INTEGER NOT NULL,
    details TEXT NOT NULL,
    quantity NUMERIC NOT NULL
);

-- 6. Fault Images Table
CREATE TABLE fault_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES fault_forms(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    file_path TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Signed Forms Table
CREATE TABLE signed_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES fault_forms(id) ON DELETE CASCADE,
    pdf_url TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    form_id UUID REFERENCES fault_forms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fault_forms_updated_at
    BEFORE UPDATE ON fault_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique form number
CREATE OR REPLACE FUNCTION generate_form_number()
RETURNS TRIGGER AS $$
DECLARE
    sector_code VARCHAR(50);
    next_num INTEGER;
    formatted_num VARCHAR(10);
BEGIN
    SELECT code INTO sector_code FROM sectors WHERE id = NEW.sector_id;
    
    -- Get the max number for this sector
    SELECT COALESCE(MAX(CAST(SUBSTRING(form_number FROM LENGTH(sector_code) + 2) AS INTEGER)), 0) + 1
    INTO next_num
    FROM fault_forms
    WHERE sector_id = NEW.sector_id;
    
    formatted_num := LPAD(next_num::TEXT, 5, '0');
    NEW.form_number := sector_code || '-' || formatted_num;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_form_number
    BEFORE INSERT ON fault_forms
    FOR EACH ROW
    WHEN (NEW.form_number IS NULL)
    EXECUTE FUNCTION generate_form_number();

-- Function to notify admins on new form or signed form
CREATE OR REPLACE FUNCTION notify_admin()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
BEGIN
    IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'fault_forms' THEN
        FOR admin_id IN SELECT id FROM users WHERE role = 'admin' LOOP
            INSERT INTO notifications (user_id, message, form_id)
            VALUES (admin_id, 'تم إنشاء نموذج عطل جديد: ' || NEW.form_number, NEW.id);
        END LOOP;
    ELSIF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'signed_forms' THEN
        FOR admin_id IN SELECT id FROM users WHERE role = 'admin' LOOP
            INSERT INTO notifications (user_id, message, form_id)
            VALUES (admin_id, 'تم رفع نموذج موقع جديد', NEW.form_id);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER notify_admin_new_form
    AFTER INSERT ON fault_forms
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin();

CREATE TRIGGER notify_admin_signed_form
    AFTER INSERT ON signed_forms
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin();


-- ROW LEVEL SECURITY (RLS)

ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fault_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_returned ENABLE ROW LEVEL SECURITY;
ALTER TABLE fault_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE signed_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin without recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role user_role;
BEGIN
    SELECT role INTO user_role FROM users WHERE id = auth.uid();
    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's sector
CREATE OR REPLACE FUNCTION get_user_sector()
RETURNS UUID AS $$
DECLARE
    user_sector_id UUID;
BEGIN
    SELECT sector_id INTO user_sector_id FROM users WHERE id = auth.uid();
    RETURN user_sector_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sectors Policies
CREATE POLICY "Admins can do all on sectors" ON sectors FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Everyone can read sectors" ON sectors FOR SELECT USING (TRUE);

-- Users Policies
CREATE POLICY "Admins can do all on users" ON users FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Users can read their own profile" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Fault Forms Policies
CREATE POLICY "Admins can do all on fault_forms" ON fault_forms FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Sector users can read their sector forms" ON fault_forms FOR SELECT USING (sector_id = get_user_sector());
CREATE POLICY "Sector users can insert their sector forms" ON fault_forms FOR INSERT WITH CHECK (sector_id = get_user_sector() AND created_by = auth.uid());
CREATE POLICY "Sector users can update their sector forms" ON fault_forms FOR UPDATE USING (sector_id = get_user_sector() AND created_by = auth.uid()) WITH CHECK (sector_id = get_user_sector() AND created_by = auth.uid());

-- Materials Used Policies
CREATE POLICY "Admins can do all on materials_used" ON materials_used FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Sector users can read their sector materials" ON materials_used FOR SELECT USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can insert their sector materials" ON materials_used FOR INSERT WITH CHECK (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can update their sector materials" ON materials_used FOR UPDATE USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
) WITH CHECK (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can delete their sector materials" ON materials_used FOR DELETE USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);

-- Materials Returned Policies
CREATE POLICY "Admins can do all on materials_returned" ON materials_returned FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Sector users can read their sector returned materials" ON materials_returned FOR SELECT USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can insert their sector returned materials" ON materials_returned FOR INSERT WITH CHECK (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can update their sector returned materials" ON materials_returned FOR UPDATE USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
) WITH CHECK (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can delete their sector returned materials" ON materials_returned FOR DELETE USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);

-- Fault Images Policies
CREATE POLICY "Admins can do all on fault_images" ON fault_images FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Sector users can read their sector images" ON fault_images FOR SELECT USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can insert their sector images" ON fault_images FOR INSERT WITH CHECK (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can delete their sector images" ON fault_images FOR DELETE USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);

-- Signed Forms Policies
CREATE POLICY "Admins can do all on signed_forms" ON signed_forms FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Sector users can read their sector signed forms" ON signed_forms FOR SELECT USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can insert their sector signed forms" ON signed_forms FOR INSERT WITH CHECK (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);

-- Notifications Policies
CREATE POLICY "Users can read their own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Create Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('fault-images', 'fault-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('signed-forms', 'signed-forms', true) ON CONFLICT DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('fault-images', 'signed-forms'));

CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    bucket_id IN ('fault-images', 'signed-forms')
);

CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    bucket_id IN ('fault-images', 'signed-forms')
) WITH CHECK (
    auth.role() = 'authenticated' AND 
    bucket_id IN ('fault-images', 'signed-forms')
);

CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE USING (
    auth.role() = 'authenticated' AND 
    bucket_id IN ('fault-images', 'signed-forms')
);
