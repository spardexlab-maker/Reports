"use client"

import * as React from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface CrewManagementProps {
  initialCrew: any[]
}

export default function CrewManagement({ initialCrew }: CrewManagementProps) {
  const [crew, setCrew] = React.useState(initialCrew)
  const [newName, setNewName] = React.useState("")
  const [isAdding, setIsAdding] = React.useState(false)
  const { toast } = useToast()

  const handleAdd = async () => {
    if (!newName.trim()) return
    setIsAdding(true)
    try {
      const response = await fetch("/api/settings/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      
      setCrew([...crew, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName("")
      toast({ title: "تمت الإضافة بنجاح" })
    } catch (error: any) {
      let message = error.message
      if (message.includes("schema cache") || message.includes("42P01")) {
        message = "جدول 'crew_members' غير موجود في قاعدة البيانات. يرجى مراجعة قسم 'إعداد قاعدة البيانات' في أعلى الصفحة."
      }
      toast({ title: "خطأ في الإضافة", description: message, variant: "destructive" })
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا العضو من الطاقم الفني؟")) return
    try {
      const response = await fetch(`/api/settings/crew?id=${id}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }
      setCrew(crew.filter(c => c.id !== id))
      toast({ title: "تم الحذف بنجاح" })
    } catch (error: any) {
      toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة الطاقم الفني</CardTitle>
        <CardDescription>أضف أو احذف أعضاء الطاقم الفني الذين يظهرون في نماذج البلاغات</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="اسم العضو الجديد..." 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={isAdding || !newName.trim()}>
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />}
            إضافة
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم العضو</TableHead>
                <TableHead className="text-left w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crew.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                    لا يوجد أعضاء مضافين حالياً
                  </TableCell>
                </TableRow>
              ) : (
                crew.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
