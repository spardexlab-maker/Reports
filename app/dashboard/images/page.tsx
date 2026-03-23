import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

export const metadata: Metadata = {
  title: "الصور | نظام إدارة بلاغات الأعطال",
  description: "عرض صور الأعطال المرفقة",
}

export default async function ImagesPage() {
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
    .from("fault_images")
    .select("*, fault_forms(form_number, sector_id, sectors(name))")
    .order("created_at", { ascending: false })

  if (!isAdmin && profile?.sector_id) {
    query = query.eq("fault_forms.sector_id", profile.sector_id)
  }

  const { data: images } = await query

  // Filter out null fault_forms (due to inner join behavior with eq on related table)
  const filteredImages = isAdmin ? images : images?.filter(img => img.fault_forms !== null)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">الصور المرفقة</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredImages?.length === 0 ? (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            لا توجد صور مرفقة
          </div>
        ) : (
          filteredImages?.map((image) => (
            <Card key={image.id} className="overflow-hidden">
              <div className="relative aspect-video">
                <Image
                  src={image.image_url}
                  alt={`صورة لعطل ${image.fault_forms?.form_number}`}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <CardContent className="p-4">
                <p className="font-semibold">رقم الاستمارة: {image.fault_forms?.form_number}</p>
                <p className="text-sm text-muted-foreground">
                  القطاع: {image.fault_forms?.sectors?.name || "غير معروف"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(image.created_at).toLocaleString("ar-EG")}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
