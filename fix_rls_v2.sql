-- Fix RLS policies for materials_used
DROP POLICY IF EXISTS "Sector users can read their sector materials" ON materials_used;
DROP POLICY IF EXISTS "Sector users can insert their sector materials" ON materials_used;
DROP POLICY IF EXISTS "Sector users can update their sector materials" ON materials_used;
DROP POLICY IF EXISTS "Sector users can delete their sector materials" ON materials_used;

CREATE POLICY "Sector users can read their sector materials" ON materials_used FOR SELECT USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can insert their sector materials" ON materials_used FOR INSERT WITH CHECK (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can update their sector materials" ON materials_used FOR UPDATE USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can delete their sector materials" ON materials_used FOR DELETE USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);

-- Fix RLS policies for materials_returned
DROP POLICY IF EXISTS "Sector users can read their sector returned materials" ON materials_returned;
DROP POLICY IF EXISTS "Sector users can insert their sector returned materials" ON materials_returned;
DROP POLICY IF EXISTS "Sector users can update their sector returned materials" ON materials_returned;
DROP POLICY IF EXISTS "Sector users can delete their sector returned materials" ON materials_returned;

CREATE POLICY "Sector users can read their sector returned materials" ON materials_returned FOR SELECT USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can insert their sector returned materials" ON materials_returned FOR INSERT WITH CHECK (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can update their sector returned materials" ON materials_returned FOR UPDATE USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can delete their sector returned materials" ON materials_returned FOR DELETE USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);

-- Fix RLS policies for fault_images
DROP POLICY IF EXISTS "Sector users can read their sector images" ON fault_images;
DROP POLICY IF EXISTS "Sector users can insert their sector images" ON fault_images;

CREATE POLICY "Sector users can read their sector images" ON fault_images FOR SELECT USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can insert their sector images" ON fault_images FOR INSERT WITH CHECK (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);

-- Fix RLS policies for signed_forms
DROP POLICY IF EXISTS "Sector users can read their sector signed forms" ON signed_forms;
DROP POLICY IF EXISTS "Sector users can insert their sector signed forms" ON signed_forms;

CREATE POLICY "Sector users can read their sector signed forms" ON signed_forms FOR SELECT USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can insert their sector signed forms" ON signed_forms FOR INSERT WITH CHECK (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
