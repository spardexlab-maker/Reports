import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSignature, Download } from "lucide-react"

export const metadata: Metadata = {
  title: "الاستمارات الموقعة | نظام إدارة بلاغات الأعطال",
  description: "عرض الاستمارات الموقعة المرفوعة",
}

export default async function SignedFormsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, sector_id")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "admin" || user.email === "admin@system.local"

  let query = supabase
    .from("signed_forms")
    .select("*, fault_forms(form_number, sector_id, sectors(name))")
    .order("created_at", { ascending: false })

  if (!isAdmin && profile?.sector_id) {
    query = query.eq("fault_forms.sector_id", profile.sector_id)
  }

  const { data: signedForms } = await query

  // Filter out null fault_forms (due to inner join behavior with eq on related table)
  const filteredForms = isAdmin ? signedForms : signedForms?.filter(form => form.fault_forms !== null)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">الاستمارات الموقعة</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredForms?.length === 0 ? (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            لا توجد استمارات موقعة
          </div>
        ) : (
          (filteredForms as any[])?.map((form) => (
            <Card key={form.id} className="overflow-hidden">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <FileSignature className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">رقم الاستمارة: {form.fault_forms?.form_number}</p>
                    <p className="text-sm text-muted-foreground">
                      القطاع: {(Array.isArray(form.fault_forms?.sectors) ? form.fault_forms?.sectors[0]?.name : form.fault_forms?.sectors?.name) || "غير معروف"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(form.created_at).toLocaleString("ar-EG")}
                    </p>
                  </div>
                </div>
                <a
                  href={form.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                  title="تحميل الاستمارة"
                >
                  <Download className="h-5 w-5" />
                </a>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
