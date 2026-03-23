# نظام إدارة بلاغات الأعطال الكهربائية

نظام متكامل لإدارة ومتابعة بلاغات الأعطال الكهربائية بكفاءة عالية، مبني باستخدام Next.js و Supabase.

## الميزات الرئيسية
- واجهة مستخدم باللغة العربية (RTL)
- لوحة تحكم مخصصة للمدير ومستخدمي القطاعات
- إدارة البلاغات (إنشاء، تعديل، طباعة، إغلاق)
- إدارة القطاعات والمستخدمين
- رسوم بيانية وإحصائيات
- رفع الصور والاستمارات الموقعة

## المتطلبات الأساسية
- Node.js (الإصدار 18 أو أحدث)
- حساب في Supabase

## خطوات التشغيل

1. **تثبيت الحزم:**
   ```bash
   npm install
   ```

2. **إعداد متغيرات البيئة:**
   قم بنسخ ملف `.env.example` إلى `.env.local` وأضف مفاتيح Supabase الخاصة بك:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

3. **إعداد قاعدة البيانات (Supabase):**
   قم بتشغيل السكربت التالي في SQL Editor في لوحة تحكم Supabase الخاص بك لإنشاء الجداول والسياسات والبيانات التجريبية.

   ```sql
   -- 1. Create Tables
   CREATE TABLE sectors (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       name TEXT NOT NULL,
       code TEXT NOT NULL UNIQUE,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   CREATE TABLE users (
       id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
       full_name TEXT NOT NULL,
       role TEXT NOT NULL CHECK (role IN ('admin', 'sector_user')),
       sector_id UUID REFERENCES sectors(id),
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   CREATE TABLE fault_forms (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       form_number TEXT NOT NULL UNIQUE,
       date DATE NOT NULL,
       station TEXT NOT NULL,
       feeder TEXT NOT NULL,
       fault_type TEXT NOT NULL,
       fault_location TEXT NOT NULL,
       distance TEXT,
       fault_time TIME NOT NULL,
       return_time TIME NOT NULL,
       duration TEXT NOT NULL,
       repair_details TEXT NOT NULL,
       sector_id UUID REFERENCES sectors(id) NOT NULL,
       created_by UUID REFERENCES users(id) NOT NULL,
       status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'printed', 'signed', 'closed')),
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   CREATE TABLE materials_used (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       form_id UUID REFERENCES fault_forms(id) ON DELETE CASCADE,
       details TEXT NOT NULL,
       quantity INTEGER NOT NULL,
       unit TEXT NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   CREATE TABLE materials_returned (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       form_id UUID REFERENCES fault_forms(id) ON DELETE CASCADE,
       details TEXT NOT NULL,
       quantity INTEGER NOT NULL,
       unit TEXT NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   CREATE TABLE fault_images (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       form_id UUID REFERENCES fault_forms(id) ON DELETE CASCADE,
       image_url TEXT NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   CREATE TABLE signed_forms (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       form_id UUID REFERENCES fault_forms(id) ON DELETE CASCADE,
       file_url TEXT NOT NULL,
       uploaded_by UUID REFERENCES users(id),
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- 2. Storage Buckets
   insert into storage.buckets (id, name, public) values ('fault-images', 'fault-images', true);
   insert into storage.buckets (id, name, public) values ('signed-forms', 'signed-forms', true);

   -- 3. Row Level Security (RLS)
   ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE fault_forms ENABLE ROW LEVEL SECURITY;
   ALTER TABLE materials_used ENABLE ROW LEVEL SECURITY;
   ALTER TABLE materials_returned ENABLE ROW LEVEL SECURITY;
   ALTER TABLE fault_images ENABLE ROW LEVEL SECURITY;
   ALTER TABLE signed_forms ENABLE ROW LEVEL SECURITY;

   -- Helper Functions
   CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
   BEGIN
     RETURN EXISTS (
       SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE OR REPLACE FUNCTION get_user_sector() RETURNS UUID AS $$
   DECLARE
     user_sector_id UUID;
   BEGIN
     SELECT sector_id INTO user_sector_id FROM users WHERE id = auth.uid();
     RETURN user_sector_id;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   -- Policies
   -- Sectors
   CREATE POLICY "Admins can do everything on sectors" ON sectors FOR ALL USING (is_admin());
   CREATE POLICY "Anyone can view sectors" ON sectors FOR SELECT USING (true);

   -- Users
   CREATE POLICY "Admins can do everything on users" ON users FOR ALL USING (is_admin());
   CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);

   -- Fault Forms
   CREATE POLICY "Admins can view all forms" ON fault_forms FOR SELECT USING (is_admin());
   CREATE POLICY "Admins can update all forms" ON fault_forms FOR UPDATE USING (is_admin());
   CREATE POLICY "Admins can delete all forms" ON fault_forms FOR DELETE USING (is_admin());
   CREATE POLICY "Sector users can view their sector forms" ON fault_forms FOR SELECT USING (sector_id = get_user_sector());
   CREATE POLICY "Sector users can insert forms for their sector" ON fault_forms FOR INSERT WITH CHECK (sector_id = get_user_sector() AND created_by = auth.uid());
   CREATE POLICY "Sector users can update their draft forms" ON fault_forms FOR UPDATE USING (sector_id = get_user_sector() AND status = 'draft');

   -- Materials Used
   CREATE POLICY "Admins can view all materials used" ON materials_used FOR SELECT USING (is_admin());
   CREATE POLICY "Sector users can view materials for their sector" ON materials_used FOR SELECT USING (EXISTS (SELECT 1 FROM fault_forms WHERE id = materials_used.form_id AND sector_id = get_user_sector()));
   CREATE POLICY "Sector users can insert materials for their forms" ON materials_used FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM fault_forms WHERE id = materials_used.form_id AND sector_id = get_user_sector()));
   CREATE POLICY "Sector users can update materials for their draft forms" ON materials_used FOR UPDATE USING (EXISTS (SELECT 1 FROM fault_forms WHERE id = materials_used.form_id AND sector_id = get_user_sector() AND status = 'draft'));
   CREATE POLICY "Sector users can delete materials for their draft forms" ON materials_used FOR DELETE USING (EXISTS (SELECT 1 FROM fault_forms WHERE id = materials_used.form_id AND sector_id = get_user_sector() AND status = 'draft'));
   CREATE POLICY "Admins can do everything on materials used" ON materials_used FOR ALL USING (is_admin());

   -- Materials Returned
   CREATE POLICY "Admins can view all materials returned" ON materials_returned FOR SELECT USING (is_admin());
   CREATE POLICY "Sector users can view materials returned for their sector" ON materials_returned FOR SELECT USING (EXISTS (SELECT 1 FROM fault_forms WHERE id = materials_returned.form_id AND sector_id = get_user_sector()));
   CREATE POLICY "Sector users can insert materials returned for their forms" ON materials_returned FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM fault_forms WHERE id = materials_returned.form_id AND sector_id = get_user_sector()));
   CREATE POLICY "Sector users can update materials returned for their draft forms" ON materials_returned FOR UPDATE USING (EXISTS (SELECT 1 FROM fault_forms WHERE id = materials_returned.form_id AND sector_id = get_user_sector() AND status = 'draft'));
   CREATE POLICY "Sector users can delete materials returned for their draft forms" ON materials_returned FOR DELETE USING (EXISTS (SELECT 1 FROM fault_forms WHERE id = materials_returned.form_id AND sector_id = get_user_sector() AND status = 'draft'));
   CREATE POLICY "Admins can do everything on materials returned" ON materials_returned FOR ALL USING (is_admin());

   -- Fault Images
   CREATE POLICY "Admins can view all images" ON fault_images FOR SELECT USING (is_admin());
   CREATE POLICY "Sector users can view images for their sector" ON fault_images FOR SELECT USING (EXISTS (SELECT 1 FROM fault_forms WHERE id = fault_images.form_id AND sector_id = get_user_sector()));
   CREATE POLICY "Sector users can insert images for their forms" ON fault_images FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM fault_forms WHERE id = fault_images.form_id AND sector_id = get_user_sector()));
   CREATE POLICY "Sector users can delete images for their draft forms" ON fault_images FOR DELETE USING (EXISTS (SELECT 1 FROM fault_forms WHERE id = fault_images.form_id AND sector_id = get_user_sector() AND status = 'draft'));
   CREATE POLICY "Admins can do everything on images" ON fault_images FOR ALL USING (is_admin());

   -- Signed Forms
   CREATE POLICY "Admins can view all signed forms" ON signed_forms FOR SELECT USING (is_admin());
   CREATE POLICY "Sector users can view signed forms for their sector" ON signed_forms FOR SELECT USING (EXISTS (SELECT 1 FROM fault_forms WHERE id = signed_forms.form_id AND sector_id = get_user_sector()));
   CREATE POLICY "Sector users can insert signed forms for their forms" ON signed_forms FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM fault_forms WHERE id = signed_forms.form_id AND sector_id = get_user_sector()));
   CREATE POLICY "Admins can do everything on signed forms" ON signed_forms FOR ALL USING (is_admin());

   -- Storage Policies
   CREATE POLICY "Images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'fault-images');
   CREATE POLICY "Anyone can upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fault-images');
   CREATE POLICY "Signed forms are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'signed-forms');
   CREATE POLICY "Anyone can upload signed forms" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'signed-forms');

   -- 4. Seed Data (Run this AFTER creating users in Supabase Auth)
   -- Insert Sectors
   INSERT INTO sectors (name, code) VALUES 
   ('قطاع المركز', 'CEN'),
   ('قطاع الخارجي', 'EXT'),
   ('قطاع تموز', 'TMZ'),
   ('قطاع الزهراء', 'ZHR');

   -- Note: You must create users in Supabase Auth first, then link them in the users table.
   -- Example (replace UUIDs with actual Auth user IDs):
   -- INSERT INTO users (id, full_name, role, sector_id) VALUES 
   -- ('auth-uuid-for-admin', 'مدير النظام', 'admin', null),
   -- ('auth-uuid-for-center', 'مستخدم المركز', 'sector_user', (SELECT id FROM sectors WHERE code = 'CEN'));
   ```

4. **تشغيل خادم التطوير:**
   ```bash
   npm run dev
   ```

5. **بيانات الدخول التجريبية:**
   يجب إنشاء المستخدمين في Supabase Auth أولاً (باستخدام البريد الإلكتروني admin@system.local وكلمة المرور Admin12345 للمدير، و center@system.local للمستخدمين)، ثم ربطهم في جدول `users`.
   
   - **المدير:** `admin` / `Admin12345`
   - **مستخدم قطاع المركز:** `center` / `Test12345`
   - **مستخدم قطاع الخارجي:** `external` / `Test12345`
   - **مستخدم قطاع تموز:** `tamoz` / `Test12345`
   - **مستخدم قطاع الزهراء:** `zahraa` / `Test12345`
