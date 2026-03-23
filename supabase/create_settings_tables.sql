-- Create vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create materials_catalog table
CREATE TABLE IF NOT EXISTS public.materials_catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT, -- Optional unit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicles
CREATE POLICY "Allow public read access for vehicles"
ON public.vehicles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins to manage vehicles"
ON public.vehicles FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- RLS Policies for materials_catalog
CREATE POLICY "Allow public read access for materials_catalog"
ON public.materials_catalog FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins to manage materials_catalog"
ON public.materials_catalog FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    )
);
