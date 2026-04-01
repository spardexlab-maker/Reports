import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Printer, Upload, CheckCircle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import FormActions from "@/components/forms/form-actions"
import { Profile, FaultForm, MaterialUsed, MaterialReturned, FaultImage, SignedForm } from "@/lib/types"

export const metadata: Metadata = {
  title: "تفاصيل البلاغ | نظام إدارة بلاغات الأعطال",
  description: "عرض تفاصيل بلاغ العطل",
}

export const dynamic = "force-dynamic"

export default async function FormDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const id = (await params).id

  const supabaseAdmin = createAdminClient()
  if (!supabaseAdmin) {
    return <div className="p-8 text-center text-destructive">خطأ: لا يمكن الاتصال بقاعدة البيانات الإدارية.</div>
  }

  const [profileResult, formResult] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("role, sector_id")
      .eq("id", user.id)
      .maybeSingle(),
    supabaseAdmin
      .from("fault_forms")
      .select(`
        *,
        sectors(name, code),
        materials_used(*),
        materials_returned(*),
        fault_images(*),
        signed_forms(*),
        vehicles_used_log(*),
        crew_used_log(*)
      `)
      .eq("id", id)
      .maybeSingle()
  ])

  const profile = profileResult.data as Profile | null
  const form = formResult.data as FaultForm | null

  let sectorName = ""
  if (form) {
    sectorName = Array.isArray(form.sectors) ? (form.sectors[0]?.name || "") : (form.sectors?.name || "")
    if (!sectorName && form.sector_id) {
      const { data: sectorData } = await supabaseAdmin
        .from("sectors")
        .select("name")
        .eq("id", form.sector_id)
        .single()
      if (sectorData) {
        sectorName = sectorData.name
      }
    }
    // Attach sectorName to form object for use in FormActions and printForm
    form.resolved_sector_name = sectorName
  }

  const isAdmin = profile?.role === "admin" || user.email === "admin@system.local"

  if (!form) {
    notFound()
  }

  // Check permissions
  if (!isAdmin && profile?.sector_id !== form.sector_id) {
    notFound()
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/forms">
            <Button variant="outline" size="icon">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">
            بلاغ رقم: {form.form_number}
          </h2>
        </div>
        <FormActions 
          form={form} 
          isAdmin={isAdmin} 
          materialsUsed={form.materials_used || []} 
          materialsReturned={form.materials_returned || []}
          canEdit={isAdmin || profile?.sector_id === form.sector_id}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">القطاع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{sectorName}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">التاريخ والوقت</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{form.date} {form.time}</div>
            <p className="text-xs text-muted-foreground">{form.day}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">رقم أمر العمل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{form.work_order_number}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">رقم الشكوى</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{form.complaint_number || "-"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {form.status === 'draft' && <span className="text-slate-500">مسودة</span>}
              {form.status === 'printed' && <span className="text-blue-500">مطبوع</span>}
              {form.status === 'signed' && <span className="text-yellow-500">موقع</span>}
              {form.status === 'closed' && <span className="text-green-500">مغلق</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>موقع العطل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-4 border-b pb-2">
              <div className="font-semibold">المغذي:</div>
              <div className="col-span-2">{form.feeder}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b pb-2">
              <div className="font-semibold">رقم المحول:</div>
              <div className="col-span-2">{form.transformer_number}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b pb-2">
              <div className="font-semibold">المحطة:</div>
              <div className="col-span-2">{form.station}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b pb-2">
              <div className="font-semibold">العنوان:</div>
              <div className="col-span-2">{form.address}</div>
            </div>
            {form.latitude !== null && form.longitude !== null && form.latitude !== undefined && form.longitude !== undefined && (
              <div className="mt-4 space-y-2">
                <div className="rounded-md overflow-hidden border h-80 shadow-sm relative group">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://maps.google.com/maps?q=${form.latitude},${form.longitude}&z=15&output=embed`}
                    allowFullScreen
                  />
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${form.latitude},${form.longitude}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-white/90 backdrop-blur-sm text-blue-600 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm border flex items-center gap-2"
                    >
                      الفتح في خرائط Google
                    </a>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground text-left opacity-50" dir="ltr">
                  {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تفاصيل العطل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="whitespace-pre-wrap">{form.fault_details}</p>
            </div>
            {form.fault_duration && (
              <div className="grid grid-cols-3 gap-4 border-t pt-4">
                <div className="font-semibold">وقت الاستغراق:</div>
                <div className="col-span-2">{form.fault_duration}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>المواد المصروفة</CardTitle>
          </CardHeader>
          <CardContent>
            {form.materials_used && form.materials_used.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">م</TableHead>
                    <TableHead>التفاصيل</TableHead>
                    <TableHead className="w-[100px]">الكمية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.materials_used.map((item: MaterialUsed) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.index_number}</TableCell>
                      <TableCell>{item.details}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد مواد مصروفة</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>المواد المرتجعة</CardTitle>
          </CardHeader>
          <CardContent>
            {form.materials_returned && form.materials_returned.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">م</TableHead>
                    <TableHead>التفاصيل</TableHead>
                    <TableHead className="w-[100px]">الكمية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.materials_returned.map((item: MaterialReturned) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.index_number}</TableCell>
                      <TableCell>{item.details}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد مواد مرتجعة</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات إضافية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">السيارات المستخدمة:</h4>
            {form.vehicles_used_log && form.vehicles_used_log.length > 0 ? (
              <ul className="list-disc list-inside text-muted-foreground">
                {form.vehicles_used_log.map((v: any) => (
                  <li key={v.id}>{v.vehicle_name} ({v.hours} ساعة)</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">{form.vehicles_used || "لا يوجد"}</p>
            )}
          </div>
          <div>
            <h4 className="font-semibold mb-1">الطاقم الفني:</h4>
            {form.crew_used_log && form.crew_used_log.length > 0 ? (
              <ul className="list-disc list-inside text-muted-foreground">
                {form.crew_used_log.map((c: any) => (
                  <li key={c.id}>{c.crew_name} ({c.hours} ساعة)</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground whitespace-pre-wrap">{form.technical_staff || "لا يوجد"}</p>
            )}
          </div>
          <div>
            <h4 className="font-semibold mb-1">المعوقات والمشاكل:</h4>
            <p className="text-muted-foreground">{form.obstacles_problems || "لا يوجد"}</p>
          </div>
        </CardContent>
      </Card>

      {form.fault_images && form.fault_images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>صور العطل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {form.fault_images.map((image: FaultImage) => (
                <a key={image.id} href={image.image_url} target="_blank" rel="noopener noreferrer" className="relative block border rounded-md overflow-hidden hover:opacity-80 transition-opacity h-32">
                  <Image
                    src={image.image_url}
                    alt={image.description || "صورة العطل"}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {form.signed_forms && form.signed_forms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>النماذج الموقعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {form.signed_forms.map((signed: SignedForm) => (
                <div key={signed.id} className="flex items-center justify-between border p-3 rounded-md">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 ml-2" />
                    <span>نموذج موقع ({new Date(signed.created_at).toLocaleDateString('ar-EG')})</span>
                  </div>
                  <a href={signed.pdf_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      عرض الملف
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
