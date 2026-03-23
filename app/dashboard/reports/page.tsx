import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import DetailedReports from "@/components/reports/detailed-reports"
import { Profile, Sector, MaterialCatalog, FaultForm, MaterialUsed } from "@/lib/types"

export const metadata: Metadata = {
  title: "التقارير والإحصائيات | نظام إدارة بلاغات الأعطال",
  description: "التقارير والإحصائيات",
}

export const dynamic = "force-dynamic"

export default async function ReportsPage() {
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

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role, sector_id")
    .eq("id", user.id)
    .maybeSingle() as Promise<{ data: Profile | null }>

  const isAdmin = profile?.role === "admin" || user.email === "admin@system.local"

  // Fetch all sectors for filtering (using admin client to ensure they appear)
  const { data: sectors } = await supabaseAdmin
    .from("sectors")
    .select("*")
    .order("name") as Promise<{ data: Sector[] | null }>

  // Fetch all materials for filtering
  const { data: materialsCatalog } = await supabaseAdmin
    .from("materials_catalog")
    .select("*")
    .order("name") as Promise<{ data: MaterialCatalog[] | null }>

  // Use admin client for the main query to ensure joined sector names are fetched
  let query = supabaseAdmin.from("fault_forms").select("*, sectors(name)")
  
  if (!isAdmin && profile?.sector_id) {
    query = query.eq("sector_id", profile.sector_id)
  }

  const { data: forms } = await query as { data: FaultForm[] | null }

  // Fetch all materials used for these forms
  const formIds = forms?.map((f: FaultForm) => f.id) || []
  let materialsUsed: MaterialUsed[] = []
  
  if (formIds.length > 0) {
    const { data: materialsData } = await supabaseAdmin
      .from("materials_used")
      .select("*")
      .in("form_id", formIds) as { data: MaterialUsed[] | null }
    materialsUsed = materialsData || []
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">التقارير والإحصائيات التفصيلية</h2>
      </div>

      <DetailedReports 
        forms={forms || []} 
        materialsUsed={materialsUsed}
        sectors={sectors || []}
        materialsCatalog={materialsCatalog || []}
        isAdmin={isAdmin}
        userSectorId={profile?.sector_id}
      />
    </div>
  )
}
