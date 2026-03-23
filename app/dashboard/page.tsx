import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, CheckCircle, Clock, AlertTriangle, Building2, Package, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import ReportsCharts from "@/components/reports/reports-charts"

export const metadata: Metadata = {
  title: "لوحة التحكم | نظام إدارة بلاغات الأعطال",
  description: "لوحة التحكم لنظام إدارة بلاغات الأعطال",
}

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  // Fetch user, profile and initial stats
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error("Auth error in dashboard page:", err)
  }

  if (!user) {
    return null
  }

  if (!supabaseAdmin) {
    return <div className="p-8 text-center text-destructive">خطأ: لا يمكن الاتصال بقاعدة البيانات الإدارية.</div>
  }

  const [profileResult, formsResult, sectorsResult] = await Promise.all([
    supabaseAdmin.from("users").select("role, sector_id").eq("id", user.id).single(),
    supabaseAdmin.from("fault_forms").select("*, sectors(name)", { count: "exact" }),
    supabaseAdmin.from("sectors").select("id, name")
  ])

  const profile = profileResult.data
  const isAdmin = profile?.role === "admin" || user.email === "admin@system.local"
  
  let forms = formsResult.data
  let totalForms = formsResult.count
  const sectors = sectorsResult.data || []

  // Filter forms if not admin
  if (!isAdmin && profile?.sector_id) {
    forms = forms?.filter(f => f.sector_id === profile.sector_id) || []
    totalForms = forms.length
  }

  const draftForms = forms?.filter((f) => f.status === "draft").length || 0
  const printedForms = forms?.filter((f) => f.status === "printed").length || 0
  const signedForms = forms?.filter((f) => f.status === "signed").length || 0
  const closedForms = forms?.filter((f) => f.status === "closed").length || 0

  // Admin specific stats
  let topMaterial = "لا يوجد"
  let sectorCounts: Record<string, number> = {}
  let statusData: any[] = []
  let sectorData: any[] = []
  let dateData: any[] = []

  if (isAdmin) {
    const { data: materials } = await supabase.from("materials_used").select("details")
    if (materials && materials.length > 0) {
      const counts: Record<string, number> = {}
      materials.forEach(m => {
        counts[m.details] = (counts[m.details] || 0) + 1
      })
      topMaterial = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b)
    }

    forms?.forEach((form) => {
      const sectorName = form.sectors?.name || 
                         (Array.isArray(form.sectors) ? form.sectors[0]?.name : "") || 
                         sectors.find(s => s.id === form.sector_id)?.name ||
                         "غير معروف"
      sectorCounts[sectorName] = (sectorCounts[sectorName] || 0) + 1
    })

    const sCounts = { draft: 0, printed: 0, signed: 0, closed: 0 }
    const dCounts: Record<string, number> = {}

    forms?.forEach((form) => {
      if (form.status in sCounts) sCounts[form.status as keyof typeof sCounts]++
      dCounts[form.date] = (dCounts[form.date] || 0) + 1
    })

    statusData = [
      { name: "مسودة", value: sCounts.draft },
      { name: "مطبوع", value: sCounts.printed },
      { name: "موقع", value: sCounts.signed },
      { name: "مغلق", value: sCounts.closed },
    ]

    sectorData = Object.entries(sectorCounts).map(([name, value]) => ({ name, value }))

    dateData = Object.entries(dCounts)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-30)
      .map(([date, count]) => ({ date, count }))
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">لوحة التحكم</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              إجمالي الأعطال
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalForms || 0}</div>
          </CardContent>
        </Card>
        
        {isAdmin ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  القطاعات النشطة
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(sectorCounts).length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  أكثر مادة استخدام
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold truncate" title={topMaterial}>{topMaterial}</div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">مسودات</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{draftForms}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">بانتظار الإغلاق (موقعة)</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{signedForms}</div>
              </CardContent>
            </Card>
          </>
        )}
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              مغلقة
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedForms}</div>
          </CardContent>
        </Card>
      </div>
      
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-2 mt-8">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                إدارة القطاعات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                إضافة وتعديل القطاعات، تحديد الرموز، وإضافة تفاصيل كل قطاع.
              </p>
              <Link href="/dashboard/sectors">
                <Button className="w-full">انتقال إلى إدارة القطاعات</Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                إدارة المستخدمين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                إنشاء حسابات جديدة للقطاعات، تعيين كلمات المرور، وإدارة صلاحيات الوصول.
              </p>
              <Link href="/dashboard/users">
                <Button className="w-full">انتقال إلى إدارة المستخدمين</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {isAdmin && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">الرسوم البيانية (كافة القطاعات)</h3>
          <ReportsCharts 
            statusData={statusData} 
            sectorData={sectorData} 
            dateData={dateData} 
            isAdmin={isAdmin} 
          />
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>أحدث الاستمارات</CardTitle>
            <Link href="/dashboard/forms" className="text-sm text-primary hover:underline">
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {forms?.slice(0, 5).map((form) => (
                <div key={form.id} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{form.form_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {form.date} - {form.station}
                    </p>
                  </div>
                  <div className="mr-auto font-medium">
                    {form.status === 'draft' && <span className="text-slate-500">مسودة</span>}
                    {form.status === 'printed' && <span className="text-blue-500">مطبوع</span>}
                    {form.status === 'signed' && <span className="text-yellow-500">موقع</span>}
                    {form.status === 'closed' && <span className="text-green-500">مغلق</span>}
                  </div>
                </div>
              ))}
              {(!forms || forms.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد استمارات حديثة</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
