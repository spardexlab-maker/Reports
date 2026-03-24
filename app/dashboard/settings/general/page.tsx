import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import VehiclesManagement from "@/components/settings/vehicles-management"
import MaterialsManagement from "@/components/settings/materials-management"
import CrewManagement from "@/components/settings/crew-management"
import SettingsClient from "./settings-client"
import DatabaseSetupChecker from "@/components/settings/database-setup-checker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const metadata: Metadata = {
  title: "الإعدادات العامة | نظام إدارة بلاغات الأعطال",
  description: "إدارة الآليات والمواد المستخدمة",
}

export const dynamic = "force-dynamic"

export default async function GeneralSettingsPage() {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  if (!supabaseAdmin) {
    return <div className="p-8 text-center text-destructive">خطأ: لا يمكن الاتصال بقاعدة البيانات الإدارية.</div>
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role !== "admin" && user.email !== "admin@system.local") {
    redirect("/dashboard")
  }

  const [vehiclesRes, materialsRes, crewRes] = await Promise.all([
    supabase.from("vehicles").select("*").order("name"),
    supabase.from("materials_catalog").select("*").order("name"),
    supabase.from("crew_members").select("*").order("name")
  ])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">الإعدادات العامة</h2>
      </div>

      <DatabaseSetupChecker />
      
      <Tabs defaultValue="vehicles" className="space-y-4" dir="rtl">
        <TabsList>
          <TabsTrigger value="vehicles">الآليات المستخدمة</TabsTrigger>
          <TabsTrigger value="materials">المواد المستخدمة</TabsTrigger>
          <TabsTrigger value="crew">الطاقم الفني</TabsTrigger>
          <TabsTrigger value="logos">الشعارات (Logos)</TabsTrigger>
        </TabsList>
        <TabsContent value="vehicles" className="space-y-4">
          <VehiclesManagement initialVehicles={vehiclesRes.data || []} />
        </TabsContent>
        <TabsContent value="materials" className="space-y-4">
          <MaterialsManagement initialMaterials={materialsRes.data || []} />
        </TabsContent>
        <TabsContent value="crew" className="space-y-4">
          <CrewManagement initialCrew={crewRes.data || []} />
        </TabsContent>
        <TabsContent value="logos" className="space-y-4">
          <SettingsClient />
        </TabsContent>
      </Tabs>
    </div>
  )
}
