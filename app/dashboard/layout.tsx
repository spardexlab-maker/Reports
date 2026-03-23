import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import DashboardNav from "@/components/dashboard/nav"
import UserNav from "@/components/dashboard/user-nav"
import LogoutButton from "@/components/dashboard/logout-button"
import { Bell } from "lucide-react"
import Link from "next/link"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  if (!supabaseAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">خطأ في تهيئة النظام</h1>
          <p>يرجى التأكد من إضافة SUPABASE_SERVICE_ROLE_KEY في الإعدادات.</p>
        </div>
      </div>
    )
  }

  // Fetch user and handle potential auth errors
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error("Auth error in dashboard layout:", err)
  }

  if (!user) {
    redirect("/login")
  }

  // Fetch profile and unread notifications
  const [{ data: profile }, { count: unreadCountResult }] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
  ])

  const isAdmin = profile?.role === "admin" || user.email === "admin@system.local"
  const unreadCount = unreadCountResult || 0

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold">نظام إدارة بلاغات الأعطال</span>
            <DashboardNav isAdmin={isAdmin} />
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link href="/dashboard/notifications" className="relative p-2 rounded-full hover:bg-muted transition-colors">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <UserNav user={{ name: profile?.full_name || user.email || "مستخدم", email: user.email || "", role: isAdmin ? "admin" : (profile?.role || "sector_user") }} />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          <div className="h-full py-6 pr-6 lg:py-8">
            <DashboardNav isAdmin={isAdmin} isSidebar />
          </div>
        </aside>
        <main className="flex w-full flex-col overflow-hidden py-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
