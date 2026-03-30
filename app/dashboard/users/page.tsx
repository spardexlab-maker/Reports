import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Edit } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import UserForm from "@/components/users/user-form"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "إدارة المستخدمين | نظام إدارة بلاغات الأعطال",
  description: "إدارة المستخدمين",
}

export const dynamic = "force-dynamic"

export default async function UsersPage() {
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
    console.error("Auth error in users page:", err)
  }

  if (!user) {
    redirect("/login")
  }

  const [{ data: profile }, { data: usersData }, { data: sectors }] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(),
    supabaseAdmin
      .from("users")
      .select("id, role, sector_id, full_name, created_at, sectors(name)")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("sectors").select("*")
  ])

  // Fetch emails from auth.admin.listUsers() since they are not in the public.users table
  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
  
  const users = usersData?.map((u: any) => {
    const authUser = authUsers.find((au: any) => au.id === u.id)
    return {
      ...u,
      email: authUser?.email || "-"
    }
  })

  const isAdmin = profile?.role === "admin" || user.email === "admin@system.local"
  
  if (!isAdmin) {
    redirect("/dashboard")
  }

  const isServiceRoleConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {!isServiceRoleConfigured && (
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-start space-x-3 space-x-reverse mb-6">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-destructive">تنبيه: مفتاح الخدمة غير مهيأ</h3>
            <p className="text-xs text-destructive/80 mt-1">
              يجب إضافة SUPABASE_SERVICE_ROLE_KEY في الإعدادات لكي تتمكن من إنشاء حسابات للمستخدمين.
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">إدارة المستخدمين</h2>
        <UserForm sectors={sectors || []} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المستخدمين الحاليين</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>اسم المستخدم</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>القطاع</TableHead>
                <TableHead>تاريخ الإضافة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    لا يوجد مستخدمين
                  </TableCell>
                </TableRow>
              ) : (
                users?.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell>{u.email?.split("@")[0] || "-"}</TableCell>
                    <TableCell>{u.role === 'admin' ? 'مدير' : 'مستخدم قطاع'}</TableCell>
                    <TableCell>{(Array.isArray(u.sectors) ? u.sectors[0]?.name : u.sectors?.name) || '-'}</TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString('ar-EG')}</TableCell>
                    <TableCell className="text-left">
                      <UserForm 
                        sectors={sectors || []} 
                        initialData={u} 
                        trigger={
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        }
                      />
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
