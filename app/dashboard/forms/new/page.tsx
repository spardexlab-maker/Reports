import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import FaultForm from "@/components/forms/fault-form"

export const metadata: Metadata = {
  title: "إنشاء بلاغ عطل | نظام إدارة بلاغات الأعطال",
  description: "إنشاء نموذج بلاغ عطل جديد",
}

export const dynamic = "force-dynamic"

export default async function NewFormPage() {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [{ data: profile }, { data: sectors }, { data: vehicles }, { data: materials }] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("role, sector_id, sectors(name, code)")
      .eq("id", user.id)
      .single(),
    supabaseAdmin?.from("sectors").select("*") || supabase.from("sectors").select("*"),
    supabase.from("vehicles").select("*").order("name"),
    supabase.from("materials_catalog").select("*").order("name")
  ])

  const isAdmin = profile?.role === "admin" || user.email === "admin@system.local"

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">إنشاء بلاغ عطل جديد</h2>
      </div>
      <FaultForm 
        userSectorId={profile?.sector_id} 
        sectors={sectors || []} 
        vehicles={vehicles || []}
        materials={materials || []}
        isAdmin={isAdmin} 
      />
    </div>
  )
}
