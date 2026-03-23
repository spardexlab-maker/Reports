"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { signOut } from "@/app/logout/action"

export default function LogoutButton() {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={() => signOut()}
    >
      <LogOut className="h-4 w-4 ml-2" />
      خروج
    </Button>
  )
}
