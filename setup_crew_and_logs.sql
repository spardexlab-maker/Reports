-- 1. Create crew_members table for the settings
CREATE TABLE IF NOT EXISTS public.crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to crew_members" ON public.crew_members FOR SELECT USING (true);
CREATE POLICY "Allow admin write access to crew_members" ON public.crew_members FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
);

-- 2. Create vehicles_used_log table for tracking vehicle hours per form
CREATE TABLE IF NOT EXISTS public.vehicles_used_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.fault_forms(id) ON DELETE CASCADE,
  vehicle_name TEXT NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.vehicles_used_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their sector vehicles_used_log" ON public.vehicles_used_log FOR SELECT USING (
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin') OR
  form_id IN (SELECT id FROM public.fault_forms WHERE sector_id = (SELECT sector_id FROM public.users WHERE id = auth.uid()))
);

CREATE POLICY "Allow users to insert vehicles_used_log" ON public.vehicles_used_log FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow users to update their vehicles_used_log" ON public.vehicles_used_log FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin') OR
  form_id IN (SELECT id FROM public.fault_forms WHERE created_by = auth.uid())
);

CREATE POLICY "Allow users to delete their vehicles_used_log" ON public.vehicles_used_log FOR DELETE USING (
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin') OR
  form_id IN (SELECT id FROM public.fault_forms WHERE created_by = auth.uid())
);

-- 3. Create crew_used_log table for tracking crew hours per form
CREATE TABLE IF NOT EXISTS public.crew_used_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.fault_forms(id) ON DELETE CASCADE,
  crew_name TEXT NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.crew_used_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their sector crew_used_log" ON public.crew_used_log FOR SELECT USING (
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin') OR
  form_id IN (SELECT id FROM public.fault_forms WHERE sector_id = (SELECT sector_id FROM public.users WHERE id = auth.uid()))
);

CREATE POLICY "Allow users to insert crew_used_log" ON public.crew_used_log FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow users to update their crew_used_log" ON public.crew_used_log FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin') OR
  form_id IN (SELECT id FROM public.fault_forms WHERE created_by = auth.uid())
);

CREATE POLICY "Allow users to delete their crew_used_log" ON public.crew_used_log FOR DELETE USING (
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin') OR
  form_id IN (SELECT id FROM public.fault_forms WHERE created_by = auth.uid())
);
