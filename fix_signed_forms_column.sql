-- Fix for missing pdf_url column in signed_forms
DO $$ 
BEGIN 
    -- Check if the table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signed_forms') THEN
        -- Check if the column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'signed_forms' AND column_name = 'pdf_url') THEN
            ALTER TABLE signed_forms ADD COLUMN pdf_url TEXT NOT NULL DEFAULT '';
            -- Remove default after adding if needed, or just leave it if it's fine
            ALTER TABLE signed_forms ALTER COLUMN pdf_url DROP DEFAULT;
        END IF;
    ELSE
        -- Create the table if it doesn't exist (as per schema.sql)
        CREATE TABLE signed_forms (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            form_id UUID NOT NULL REFERENCES fault_forms(id) ON DELETE CASCADE,
            pdf_url TEXT NOT NULL,
            uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;
