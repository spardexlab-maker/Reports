-- Fix RLS policies for materials_used
DROP POLICY IF EXISTS "Sector users can read their sector materials" ON materials_used;
DROP POLICY IF EXISTS "Sector users can insert their sector materials" ON materials_used;
DROP POLICY IF EXISTS "Sector users can update their sector materials" ON materials_used;
DROP POLICY IF EXISTS "Sector users can delete their sector materials" ON materials_used;

CREATE POLICY "Sector users can read their sector materials" ON materials_used FOR SELECT USING (
    EXISTS (SELECT 1 FROM fault_forms WHERE id = form_id AND sector_id = get_user_sector())
);
CREATE POLICY "Sector users can insert their sector materials" ON materials_used FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM fault_forms WHERE id = form_id AND sector_id = get_user_sector())
);
CREATE POLICY "Sector users can update their sector materials" ON materials_used FOR UPDATE USING (
    EXISTS (SELECT 1 FROM fault_forms WHERE id = form_id AND sector_id = get_user_sector())
);
CREATE POLICY "Sector users can delete their sector materials" ON materials_used FOR DELETE USING (
    EXISTS (SELECT 1 FROM fault_forms WHERE id = form_id AND sector_id = get_user_sector())
);

-- Fix RLS policies for materials_returned
DROP POLICY IF EXISTS "Sector users can read their sector returned materials" ON materials_returned;
DROP POLICY IF EXISTS "Sector users can insert their sector returned materials" ON materials_returned;
DROP POLICY IF EXISTS "Sector users can update their sector returned materials" ON materials_returned;
DROP POLICY IF EXISTS "Sector users can delete their sector returned materials" ON materials_returned;

CREATE POLICY "Sector users can read their sector returned materials" ON materials_returned FOR SELECT USING (
    EXISTS (SELECT 1 FROM fault_forms WHERE id = form_id AND sector_id = get_user_sector())
);
CREATE POLICY "Sector users can insert their sector returned materials" ON materials_returned FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM fault_forms WHERE id = form_id AND sector_id = get_user_sector())
);
CREATE POLICY "Sector users can update their sector returned materials" ON materials_returned FOR UPDATE USING (
    EXISTS (SELECT 1 FROM fault_forms WHERE id = form_id AND sector_id = get_user_sector())
);
CREATE POLICY "Sector users can delete their sector returned materials" ON materials_returned FOR DELETE USING (
    EXISTS (SELECT 1 FROM fault_forms WHERE id = form_id AND sector_id = get_user_sector())
);

-- Fix RLS policies for fault_images
DROP POLICY IF EXISTS "Sector users can read their sector images" ON fault_images;
DROP POLICY IF EXISTS "Sector users can insert their sector images" ON fault_images;

CREATE POLICY "Sector users can read their sector images" ON fault_images FOR SELECT USING (
    EXISTS (SELECT 1 FROM fault_forms WHERE id = form_id AND sector_id = get_user_sector())
);
CREATE POLICY "Sector users can insert their sector images" ON fault_images FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM fault_forms WHERE id = form_id AND sector_id = get_user_sector())
);

-- Add description column to fault_images if it doesn't exist
ALTER TABLE fault_images ADD COLUMN IF NOT EXISTS description TEXT;

-- Fix RLS policies for signed_forms
DROP POLICY IF EXISTS "Sector users can read their sector signed forms" ON signed_forms;
DROP POLICY IF EXISTS "Sector users can insert their sector signed forms" ON signed_forms;

CREATE POLICY "Sector users can read their sector signed forms" ON signed_forms FOR SELECT USING (
    EXISTS (SELECT 1 FROM fault_forms WHERE id = form_id AND sector_id = get_user_sector())
);
CREATE POLICY "Sector users can insert their sector signed forms" ON signed_forms FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM fault_forms WHERE id = form_id AND sector_id = get_user_sector())
);
