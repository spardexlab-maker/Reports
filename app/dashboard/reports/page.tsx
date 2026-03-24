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

  const profileResult = await supabaseAdmin
    .from("users")
    .select("role, sector_id")
    .eq("id", user.id)
    .maybeSingle()
  const profile = profileResult.data as Profile | null

  const isAdmin = profile?.role === "admin" || user.email === "admin@system.local"

  // Fetch all sectors for filtering (using admin client to ensure they appear)
  const sectorsResult = await supabaseAdmin
    .from("sectors")
    .select("*")
    .order("name")
  const sectors = (sectorsResult.data || []) as Sector[]

  // Fetch all materials for filtering
  const materialsCatalogResult = await supabaseAdmin
    .from("materials_catalog")
    .select("*")
    .order("name")
  const materialsCatalog = (materialsCatalogResult.data || []) as MaterialCatalog[]

  // Use admin client for the main query to ensure joined sector names are fetched
  let query = supabaseAdmin.from("fault_forms").select("*, sectors(name)")
  
  if (!isAdmin && profile?.sector_id) {
    query = query.eq("sector_id", profile.sector_id)
  }

  const formsResult = await query
  const forms = (formsResult.data || []) as FaultForm[]

  // Fetch all materials used for these forms
  const formIds = forms.map((f: FaultForm) => f.id)
  let materialsUsed: MaterialUsed[] = []
  let vehiclesUsedLog: any[] = []
  let crewUsedLog: any[] = []
  
  if (formIds.length > 0) {
    const [materialsDataResult, vehiclesLogResult, crewLogResult] = await Promise.all([
      supabaseAdmin.from("materials_used").select("*").in("form_id", formIds),
      supabaseAdmin.from("vehicles_used_log").select("*").in("form_id", formIds),
      supabaseAdmin.from("crew_used_log").select("*").in("form_id", formIds)
    ])
    materialsUsed = (materialsDataResult.data || []) as MaterialUsed[]
    vehiclesUsedLog = vehiclesLogResult.data || []
    crewUsedLog = crewLogResult.data || []
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">التقارير والإحصائيات التفصيلية</h2>
      </div>

      <DetailedReports 
        forms={forms || []} 
        materialsUsed={materialsUsed}
        vehiclesUsedLog={vehiclesUsedLog}
        crewUsedLog={crewUsedLog}
        sectors={sectors || []}
        materialsCatalog={materialsCatalog || []}
        isAdmin={isAdmin}
        userSectorId={profile?.sector_id ?? undefined}
      />
    </div>
  )
}
