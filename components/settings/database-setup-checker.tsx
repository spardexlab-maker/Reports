"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Copy, Terminal } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function DatabaseSetupChecker() {
  const [status, setStatus] = useState<"loading" | "missing" | "ready">("loading")
  const [missingTables, setMissingTables] = useState<string[]>([])
  const supabase = createClient()
  const { toast } = useToast()

  const checkTables = useCallback(async () => {
    setStatus("loading")
    const tablesToCheck = ["crew_members", "crew_used_log", "vehicles_used_log", "materials_used", "materials_returned", "settings", "notifications"]
    const missing: string[] = []
    const errors: string[] = []

    // Check tables
    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase.from(table).select("count", { count: "exact", head: true }).limit(1)
        if (error) {
          if (error.code === "42P01" || error.message.includes("schema cache")) {
            missing.push(table)
          } else {
            errors.push(`${table}: ${error.message}`)
          }
        }
      } catch (e: any) {
        errors.push(`${table}: ${e.message}`)
      }
    }

    // Check specific columns in fault_forms
    try {
      const { error: colError } = await supabase
        .from("fault_forms")
        .select("fault_duration, location_link, latitude, longitude")
        .limit(1)
      
      if (colError && (colError.code === "42703" || colError.message.includes("column"))) {
        missing.push("أعمدة الموقع في fault_forms")
      }
    } catch (e: any) {
      // Ignore if table doesn't exist (already handled by other checks if needed)
    }

    if (missing.length > 0) {
      setMissingTables(missing)
      setStatus("missing")
    } else if (errors.length > 0) {
      setMissingTables(errors)
      setStatus("missing")
    } else {
      setStatus("ready")
    }
  }, [supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkTables()
  }, [checkTables])

  const handleRefresh = () => {
    checkTables()
  }

  const sqlCode = `-- 1. تفعيل الإضافات اللازمة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1.5 إضافة أعمدة جديدة (وقت الاستغراق، والموقع)
ALTER TABLE public.fault_forms ADD COLUMN IF NOT EXISTS fault_duration VARCHAR(255);
ALTER TABLE public.fault_forms ADD COLUMN IF NOT EXISTS location_link TEXT;
ALTER TABLE public.fault_forms ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.fault_forms ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- 2. جدول أعضاء الطاقم الفني
CREATE TABLE IF NOT EXISTS public.crew_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول سجل ساعات عمل الطاقم
CREATE TABLE IF NOT EXISTS public.crew_used_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES public.fault_forms(id) ON DELETE CASCADE,
    crew_name TEXT NOT NULL,
    hours DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول سجل ساعات عمل الآليات
CREATE TABLE IF NOT EXISTS public.vehicles_used_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES public.fault_forms(id) ON DELETE CASCADE,
    vehicle_name TEXT NOT NULL,
    hours DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. جداول المواد المستخدمة والمعادة
CREATE TABLE IF NOT EXISTS public.materials_used (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES public.fault_forms(id) ON DELETE CASCADE,
    index_number INTEGER,
    details TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.materials_returned (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES public.fault_forms(id) ON DELETE CASCADE,
    index_number INTEGER,
    details TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. جدول التنبيهات
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    form_id UUID REFERENCES public.fault_forms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. جدول الإعدادات
CREATE TABLE IF NOT EXISTS public.settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. تفعيل سياسات الأمان (RLS)
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_used_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles_used_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials_returned ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 9. منح صلاحيات الوصول الكاملة
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated, anon;

-- 10. إنشاء سياسات وصول مفتوحة للبدء
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Full Access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Full Access" ON public.%I FOR ALL USING (true)', t);
    END LOOP;
END $$;

-- 11. إضافة القيم الافتراضية للإعدادات
INSERT INTO public.settings (key, value) VALUES ('main_logo', ''), ('partner_logo', '') 
ON CONFLICT (key) DO NOTHING;

-- 12. تحديث النظام
NOTIFY pgrst, 'reload schema';`

  const copySql = () => {
    navigator.clipboard.writeText(sqlCode)
    toast({ title: "تم نسخ الكود", description: "يمكنك الآن لصقه في Supabase SQL Editor" })
  }

  if (status === "loading" || status === "ready") return null

  return (
    <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200 text-red-900">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="font-bold text-lg mb-2">تنبيه: يلزم إعداد قاعدة البيانات</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>
          يبدو أن بعض الجداول المطلوبة ({missingTables.join(", ")}) غير موجودة في قاعدة البيانات. 
          هذا هو سبب ظهور رسالة الخطأ التي تراها.
        </p>
        <div className="bg-slate-900 text-slate-100 p-4 rounded-md overflow-x-auto text-xs font-mono relative group">
          <pre>{sqlCode}</pre>
          <Button 
            size="sm" 
            variant="secondary" 
            className="absolute top-2 left-2 h-8 w-8 p-0" 
            onClick={copySql}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">خطوات الحل:</p>
          <ol className="list-decimal list-inside text-sm space-y-1">
            <li>انسخ الكود البرمجي أعلاه بالضغط على أيقونة النسخ.</li>
            <li>افتح لوحة تحكم <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-bold">Supabase</a>.</li>
            <li>انتقل إلى <strong>SQL Editor</strong> من القائمة الجانبية.</li>
            <li>الصق الكود واضغط على <strong>Run</strong>.</li>
            <li>بعد الانتهاء، اضغط على زر &quot;تحديث التحقق&quot; أدناه.</li>
          </ol>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2 border-red-300 hover:bg-red-100 text-red-900">
          تحديث التحقق
        </Button>
      </AlertDescription>
    </Alert>
  )
}
