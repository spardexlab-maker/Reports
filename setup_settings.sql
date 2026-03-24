-- إنشاء جدول الإعدادات العامة
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- تفعيل سياسات الأمان (RLS)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بقراءة الإعدادات (لكي تظهر في صفحة تسجيل الدخول)
CREATE POLICY "Allow public read access to settings" ON public.settings FOR SELECT USING (true);

-- السماح للآدمن فقط بتعديل الإعدادات
CREATE POLICY "Allow admin write access to settings" ON public.settings FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
);

-- إدخال القيم الافتراضية
INSERT INTO public.settings (key, value) VALUES ('main_logo', 'https://i.imgur.com/WIyQapD.png') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.settings (key, value) VALUES ('partner_logo', '') ON CONFLICT (key) DO NOTHING;

-- إنشاء حاوية التخزين للشعارات (إذا لم تكن موجودة)
INSERT INTO storage.buckets (id, name, public) VALUES ('public_assets', 'public_assets', true) ON CONFLICT (id) DO NOTHING;

-- سياسات الأمان لحاوية التخزين
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'public_assets');

CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'public_assets' AND auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
);

CREATE POLICY "Admin Update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'public_assets' AND auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
);

CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'public_assets' AND auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
);
