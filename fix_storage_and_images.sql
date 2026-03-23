-- 1. Add missing file_path column to fault_images
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fault_images' AND column_name='file_path') THEN
        ALTER TABLE fault_images ADD COLUMN file_path TEXT;
    END IF;
END $$;

-- 2. Ensure storage schema permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- 3. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- 5. Re-create robust storage policies
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

-- 6. Update fault_images policies to be more robust
DROP POLICY IF EXISTS "Sector users can insert their sector images" ON fault_images;
CREATE POLICY "Sector users can insert their sector images" ON fault_images FOR INSERT WITH CHECK (
    form_id IN (SELECT id FROM fault_forms WHERE sector_id = get_user_sector())
);
