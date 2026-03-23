import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import FaultForm from "@/components/forms/fault-form"

export const metadata: Metadata = {
  title: "تعديل البلاغ | نظام إدارة بلاغات الأعطال",
  description: "تعديل بلاغ العطل",
}

export const dynamic = "force-dynamic"

export default async function EditFormPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  if (!supabaseAdmin) {
    return <div className="p-8 text-center text-destructive">خطأ: لا يمكن الاتصال بقاعدة البيانات الإدارية.</div>
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const id = (await params).id

  const [{ data: profile }, { data: form }, { data: sectors }, { data: vehicles }, { data: materials }] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("role, sector_id")
      .eq("id", user.id)
      .maybeSingle(),
    supabaseAdmin
      .from("fault_forms")
      .select(`
        *,
        materials_used(*),
        materials_returned(*),
        fault_images(*)
      `)
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin.from("sectors").select("*"),
    supabase.from("vehicles").select("*").order("name"),
    supabase.from("materials_catalog").select("*").order("name")
  ])

  if (!form) {
    notFound()
  }

  const isAdmin = profile?.role === "admin" || user.email === "admin@system.local"

  // Check permissions: Only sector users can edit their own forms, and only if it's a draft
  // Admins can edit anything
  const isOwner = profile?.sector_id === form.sector_id;
  const isDraft = form.status === "draft";

  if (!isAdmin && (!isOwner || !isDraft)) {
    redirect(`/dashboard/forms/${id}`)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">تعديل البلاغ ({form.form_number})</h2>
      </div>

      <FaultForm 
        userSectorId={profile?.sector_id} 
        sectors={sectors || []} 
        vehicles={vehicles || []}
        materials={materials || []}
        isAdmin={isAdmin}
        initialData={form}
      />
    </div>
  )
}
