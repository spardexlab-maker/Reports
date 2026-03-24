import { Metadata } from "next"
import Image from "next/image"
import LoginForm from "@/components/auth/login-form"
import { AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "تسجيل الدخول | مدير تقارير الأعطال الكهربائية",
  description: "تسجيل الدخول إلى مدير تقارير الأعطال الكهربائية",
}

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let mainLogo = "https://i.imgur.com/WIyQapD.png"
  let partnerLogo = ""

  if (isConfigured) {
    try {
      const supabase = await createClient()
      const { data: settings } = await supabase.from('settings').select('*')
      if (settings) {
        const dbMain = settings.find(s => s.key === 'main_logo')?.value
        const dbPartner = settings.find(s => s.key === 'partner_logo')?.value
        if (dbMain) mainLogo = dbMain
        if (dbPartner) partnerLogo = dbPartner
      }
    } catch (e) {
      console.error("Error fetching logos:", e)
    }
  }

  return (
    <div className="flex-1 w-full flex">
      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 bg-white">
        <div className="w-full max-w-sm space-y-8">
          {!isConfigured && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-start space-x-3 space-x-reverse">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-yellow-800">تنبيه: النظام غير مهيأ</h3>
                <p className="text-xs text-yellow-700 mt-1">
                  يرجى إضافة مفاتيح Supabase في إعدادات التطبيق لكي يعمل تسجيل الدخول.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-6 mb-6">
              {partnerLogo && (
                <>
                  <div className="w-24 h-24 relative">
                    <Image src={partnerLogo} alt="شعار الشريك" fill className="object-contain" priority referrerPolicy="no-referrer" />
                  </div>
                  <div className="h-16 w-px bg-slate-200"></div>
                </>
              )}
              <div className="w-24 h-24 relative">
                <Image src={mainLogo} alt="شعار النظام" fill className="object-contain" priority referrerPolicy="no-referrer" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
              مدير تقارير الأعطال الكهربائية
            </h1>
            <p className="text-sm text-slate-500">
              أدخل بيانات الاعتماد الخاصة بك للوصول إلى لوحة التحكم
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100">
            <LoginForm />
          </div>
          
          <p className="text-center text-xs text-slate-400 mt-8">
            &copy; {new Date().getFullYear()} نظام إدارة الأعطال. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>

      {/* Left Side - Image/Branding */}
      <div className="hidden lg:flex flex-1 relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-blue-600/20 z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40" />
        
        <div className="relative z-20 flex flex-col justify-center items-start p-16 h-full w-full">
          <div className="max-w-xl">
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              نظام متطور لإدارة ومتابعة الأعطال الكهربائية بكفاءة عالية
            </h2>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              يوفر النظام بيئة متكاملة لتسجيل، تتبع، وتحليل بلاغات الأعطال الكهربائية لضمان سرعة الاستجابة وجودة الخدمة المقدمة للمواطنين.
            </p>
            
            <div className="grid grid-cols-2 gap-6 mt-12">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/10">
                <div className="text-3xl font-bold text-white mb-2">100%</div>
                <div className="text-sm text-slate-300">دقة في تتبع البلاغات</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/10">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-sm text-slate-300">متابعة مستمرة للأعطال</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

