-- Comprehensive RLS Fix for all tables
-- This script ensures that both Admins and Sector Users have correct permissions.

-- 1. Fix fault_forms policies
DROP POLICY IF EXISTS "Admins can do all on fault_forms" ON fault_forms;
DROP POLICY IF EXISTS "Sector users can read their sector forms" ON fault_forms;
DROP POLICY IF EXISTS "Sector users can insert their sector forms" ON fault_forms;
DROP POLICY IF EXISTS "Sector users can update their sector forms" ON fault_forms;

CREATE POLICY "Admins can do all on fault_forms" ON fault_forms FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Sector users can read their sector forms" ON fault_forms FOR SELECT USING (sector_id = get_user_sector());
CREATE POLICY "Sector users can insert their sector forms" ON fault_forms FOR INSERT WITH CHECK (sector_id = get_user_sector() AND created_by = auth.uid());
CREATE POLICY "Sector users can update their sector forms" ON fault_forms FOR UPDATE USING (sector_id = get_user_sector() AND created_by = auth.uid()) WITH CHECK (sector_id = get_user_sector() AND created_by = auth.uid());

-- 2. Fix materials_used policies
DROP POLICY IF EXISTS "Admins can do all on materials_used" ON materials_used;
DROP POLICY IF EXISTS "Sector users can read their sector materials" ON materials_used;
DROP POLICY IF EXISTS "Sector users can insert their sector materials" ON materials_used;
DROP POLICY IF EXISTS "Sector users can update their sector materials" ON materials_used;
DROP POLICY IF EXISTS "Sector users can delete their sector materials" ON materials_used;

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

-- 3. Fix materials_returned policies
DROP POLICY IF EXISTS "Admins can do all on materials_returned" ON materials_returned;
DROP POLICY IF EXISTS "Sector users can read their sector returned materials" ON materials_returned;
DROP POLICY IF EXISTS "Sector users can insert their sector returned materials" ON materials_returned;
DROP POLICY IF EXISTS "Sector users can update their sector returned materials" ON materials_returned;
DROP POLICY IF EXISTS "Sector users can delete their sector returned materials" ON materials_returned;

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

-- 4. Fix fault_images policies
DROP POLICY IF EXISTS "Admins can do all on fault_images" ON fault_images;
DROP POLICY IF EXISTS "Sector users can read their sector images" ON fault_images;
DROP POLICY IF EXISTS "Sector users can insert their sector images" ON fault_images;
DROP POLICY IF EXISTS "Sector users can delete their sector images" ON fault_images;

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

-- 5. Fix signed_forms policies
DROP POLICY IF EXISTS "Admins can do all on signed_forms" ON signed_forms;
DROP POLICY IF EXISTS "Sector users can read their sector signed forms" ON signed_forms;
DROP POLICY IF EXISTS "Sector users can insert their sector signed forms" ON signed_forms;

CREATE POLICY "Admins can do all on signed_forms" ON signed_forms FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Sector users can read their sector signed forms" ON signed_forms FOR SELECT USING (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
CREATE POLICY "Sector users can insert their sector signed forms" ON signed_forms FOR INSERT WITH CHECK (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
