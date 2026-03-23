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

interface MaterialsManagementProps {
  initialMaterials: any[]
}

export default function MaterialsManagement({ initialMaterials }: MaterialsManagementProps) {
  const [materials, setMaterials] = React.useState(initialMaterials)
  const [newName, setNewName] = React.useState("")
  const [isAdding, setIsAdding] = React.useState(false)
  const { toast } = useToast()

  const handleAdd = async () => {
    if (!newName.trim()) return
    setIsAdding(true)
    try {
      const response = await fetch("/api/settings/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      
      setMaterials([...materials, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName("")
      toast({ title: "تمت الإضافة بنجاح" })
    } catch (error: any) {
      toast({ title: "خطأ في الإضافة", description: error.message, variant: "destructive" })
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المادة؟")) return
    try {
      const response = await fetch(`/api/settings/materials?id=${id}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }
      setMaterials(materials.filter(m => m.id !== id))
      toast({ title: "تم الحذف بنجاح" })
    } catch (error: any) {
      toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة المواد</CardTitle>
        <CardDescription>أضف أو احذف المواد التي تظهر في نماذج البلاغات</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="اسم المادة الجديدة..." 
            className="flex-1"
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
                <TableHead className="text-right">اسم المادة</TableHead>
                <TableHead className="text-left w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                    لا توجد مواد مضافة حالياً
                  </TableCell>
                </TableRow>
              ) : (
                materials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(material.id)}
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
