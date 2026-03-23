import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import SectorForm from "@/components/sectors/sector-form"

export const metadata: Metadata = {
  title: "إدارة القطاعات | نظام إدارة بلاغات الأعطال",
  description: "إدارة القطاعات",
}

export const dynamic = "force-dynamic"

export default async function SectorsPage() {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  if (!supabaseAdmin) {
    return <div className="p-8 text-center text-destructive">خطأ: لا يمكن الاتصال بقاعدة البيانات الإدارية. يرجى مراجعة إعدادات SUPABASE_SERVICE_ROLE_KEY.</div>
  }

  // Fetch user, profile and initial data
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error("Auth error in sectors page:", err)
  }

  if (!user) {
    redirect("/login")
  }

  const [{ data: profile }, { data: sectors }] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single(),
    supabaseAdmin
      .from("sectors")
      .select("*")
      .order("created_at", { ascending: false })
  ])

  const isAdmin = profile?.role === "admin" || user.email === "admin@system.local"
  
  if (!isAdmin) {
    redirect("/dashboard")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">إدارة القطاعات</h2>
        <SectorForm />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>القطاعات الحالية</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم القطاع</TableHead>
                <TableHead>الرمز</TableHead>
                <TableHead>الوصف / التفاصيل</TableHead>
                <TableHead>المحطات / المغذيات</TableHead>
                <TableHead>تاريخ الإضافة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectors?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    لا توجد قطاعات
                  </TableCell>
                </TableRow>
              ) : (
                sectors?.map((sector: any) => (
                  <TableRow key={sector.id}>
                    <TableCell className="font-medium">{sector.name}</TableCell>
                    <TableCell>{sector.code}</TableCell>
                    <TableCell>{sector.description || "-"}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div><span className="font-bold">المحطات:</span> {sector.stations?.length || 0}</div>
                        <div><span className="font-bold">المغذيات:</span> {sector.feeders?.length || 0}</div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(sector.created_at).toLocaleDateString('ar-EG')}</TableCell>
                    <TableCell className="text-left">
                      <SectorForm sector={sector} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
