import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, FileText, CheckCircle } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "الإشعارات | نظام إدارة بلاغات الأعطال",
  description: "عرض الإشعارات",
}

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const supabaseAdmin = createAdminClient()
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "admin" || user.email === "admin@system.local"
  
  if (!isAdmin) {
    redirect("/dashboard")
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  // Mark all as read
  if (notifications && notifications.some(n => !n.is_read)) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">الإشعارات</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>أحدث الإشعارات</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد إشعارات جديدة
            </div>
          ) : (
            <div className="space-y-4">
              {notifications?.map((notification) => (
                <Link 
                  href={`/dashboard/forms/${notification.form_id}`} 
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors hover:bg-muted/50 ${!notification.is_read ? 'bg-muted/30 border-primary/20' : ''}`}
                >
                  <div className="mt-1">
                    {notification.type === 'new_form' ? (
                      <FileText className="h-5 w-5 text-blue-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium leading-none">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground pt-2">
                      {new Date(notification.created_at).toLocaleString('ar-EG')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
