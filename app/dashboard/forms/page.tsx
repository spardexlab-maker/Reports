import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Profile, FaultForm, Sector } from "@/lib/types"

export const metadata: Metadata = {
  title: "البلاغات | نظام إدارة بلاغات الأعطال",
  description: "قائمة بلاغات الأعطال",
}

export const dynamic = "force-dynamic"

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const supabaseAdmin = createAdminClient()
  if (!supabaseAdmin) {
    return <div className="p-8 text-center text-destructive">خطأ: لا يمكن الاتصال بقاعدة البيانات الإدارية.</div>
  }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role, sector_id")
    .eq("id", user.id)
    .maybeSingle() as { data: Profile | null }

  const isAdmin = profile?.role === "admin" || user.email === "admin@system.local"
  const q = (await searchParams).q || ""

  // Use admin client to bypass RLS for sector names while keeping data filtered
  let query = supabaseAdmin
    .from("fault_forms")
    .select("*, sectors(name, code)")
    .order("created_at", { ascending: false })

  if (!isAdmin && profile?.sector_id) {
    query = query.eq("sector_id", profile.sector_id)
  }

  if (q) {
    query = query.or(`form_number.ilike.%${q}%,station.ilike.%${q}%,feeder.ilike.%${q}%`)
  }

  const [{ data: forms }, { data: sectors }] = await Promise.all([
    query as Promise<{ data: FaultForm[] | null }>,
    supabaseAdmin.from("sectors").select("id, name") as Promise<{ data: Sector[] | null }>
  ])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">البلاغات</h2>
        <Link href="/dashboard/forms/new">
          <Button>
            <Plus className="mr-2 h-4 w-4 ml-2" />
            إنشاء بلاغ جديد
          </Button>
        </Link>
      </div>

      <div className="flex items-center py-4">
        <form className="flex w-full max-w-sm items-center space-x-2 space-x-reverse">
          <Input
            name="q"
            type="search"
            placeholder="بحث برقم البلاغ، المحطة، المغذي..."
            defaultValue={q}
          />
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم البلاغ</TableHead>
              <TableHead>القطاع</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>المحطة</TableHead>
              <TableHead>المغذي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  لا توجد بلاغات
                </TableCell>
              </TableRow>
            ) : (
              forms?.map((form: FaultForm) => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium">{form.form_number}</TableCell>
                  <TableCell>
                    {Array.isArray(form.sectors)
                      ? form.sectors[0]?.name
                      : form.sectors?.name || 
                        sectors?.find((s: Sector) => s.id === form.sector_id)?.name || 
                        ""}
                  </TableCell>
                  <TableCell>{form.date}</TableCell>
                  <TableCell>{form.station}</TableCell>
                  <TableCell>{form.feeder}</TableCell>
                  <TableCell>
                    {form.status === 'draft' && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-800">مسودة</span>}
                    {form.status === 'printed' && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">مطبوع</span>}
                    {form.status === 'signed' && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800">موقع</span>}
                    {form.status === 'closed' && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800">مغلق</span>}
                  </TableCell>
                  <TableCell className="text-left">
                    <Link href={`/dashboard/forms/${form.id}`}>
                      <Button variant="outline" size="sm">
                        عرض التفاصيل
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
