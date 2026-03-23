"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  Settings,
  BarChart3,
  Building2,
  Image as ImageIcon,
  FileSignature
} from "lucide-react"

interface DashboardNavProps {
  isAdmin: boolean
  isSidebar?: boolean
}

export default function DashboardNav({ isAdmin, isSidebar = false }: DashboardNavProps) {
  const pathname = usePathname()

  const items = [
    {
      title: "لوحة التحكم",
      href: "/dashboard",
      icon: LayoutDashboard,
      show: true,
    },
    {
      title: "الاستمارات",
      href: "/dashboard/forms",
      icon: FileText,
      show: true,
    },
    {
      title: "إنشاء استمارة",
      href: "/dashboard/forms/new",
      icon: PlusCircle,
      show: true,
    },
    {
      title: "التقارير",
      href: "/dashboard/reports",
      icon: BarChart3,
      show: true,
    },
    {
      title: "الإعدادات",
      href: "#",
      icon: Settings,
      show: isAdmin,
      isHeader: true,
    },
    {
      title: "إدارة القطاعات",
      href: "/dashboard/sectors",
      icon: Building2,
      show: isAdmin,
      isSubItem: true,
    },
    {
      title: "إدارة المستخدمين",
      href: "/dashboard/users",
      icon: Users,
      show: isAdmin,
      isSubItem: true,
    },
    {
      title: "الإعدادات العامة",
      href: "/dashboard/settings/general",
      icon: Settings,
      show: isAdmin,
      isSubItem: true,
    },
  ]

  if (!isSidebar) {
    return (
      <nav className="hidden md:flex items-center space-x-4 space-x-reverse">
        {items
          .filter((item) => item.show && !item.isHeader)
          .map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="ml-1 h-4 w-4" />
                {item.title}
              </Link>
            )
          })}
      </nav>
    )
  }

  return (
    <nav className="grid items-start gap-2">
      {items
        .filter((item) => item.show)
        .map((item) => {
          if (item.isHeader) {
            return (
              <div key={item.title} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                {item.title}
              </div>
            )
          }
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                pathname === item.href ? "bg-accent" : "transparent",
                item.isSubItem && "mr-4"
              )}
            >
              <Icon className="ml-2 h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          )
        })}
    </nav>
  )
}
