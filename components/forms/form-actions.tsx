"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Printer, Upload, CheckCircle, Loader2, Edit } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { printForm } from "@/lib/print-form"

import { Profile, FaultForm, MaterialUsed, MaterialReturned } from "@/lib/types"

interface FormActionsProps {
  form: FaultForm
  isAdmin: boolean
  materialsUsed?: MaterialUsed[]
  materialsReturned?: MaterialReturned[]
  canEdit?: boolean
}

export default function FormActions({ form, isAdmin, materialsUsed, materialsReturned, canEdit }: FormActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [isPrinting, setIsPrinting] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [isClosing, setIsClosing] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [isUploadOpen, setIsUploadOpen] = React.useState(false)

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      await printForm(form, materialsUsed || [], materialsReturned || [])
      
      if (form.status === 'draft') {
        const { error } = await supabase
          .from('fault_forms')
          .update({ status: 'printed' })
          .eq('id', form.id)
          
        if (error) throw error
        
        toast({
          title: "تم تحديث الحالة",
          description: "تم تغيير حالة البلاغ إلى مطبوع.",
        })
        router.refresh()
      }
    } catch (error: any) {
      console.error("Print error:", error)
      toast({
        title: "خطأ في الطباعة",
        description: error.message || "حدث خطأ غير متوقع أثناء الطباعة.",
        variant: "destructive",
      })
    } finally {
      setIsPrinting(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    
    setIsUploading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error("User not authenticated")

      const fileExt = file.name.split('.').pop()
      const fileName = `${form.form_number}-${Math.random()}.${fileExt}`
      const filePath = `${form.sector_id}/${fileName}`

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('signed-forms')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('signed-forms')
        .getPublicUrl(filePath)

      // Insert record
      const { error: insertError } = await supabase
        .from('signed_forms')
        .insert({
          form_id: form.id,
          pdf_url: publicUrl,
          uploaded_by: userData.user.id
        })

      if (insertError) throw insertError

      // Update form status
      if (form.status !== 'closed') {
        const { error: updateError } = await supabase
          .from('fault_forms')
          .update({ status: 'signed' })
          .eq('id', form.id)

        if (updateError) throw updateError
      }

      toast({
        title: "تم الرفع بنجاح",
        description: "تم رفع النموذج الموقع بنجاح.",
      })
      
      setIsUploadOpen(false)
      setFile(null)
      router.refresh()
    } catch (error: any) {
      console.error(error)
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء رفع الملف.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = async () => {
    setIsClosing(true)
    try {
      const { error } = await supabase
        .from('fault_forms')
        .update({ status: 'closed' })
        .eq('id', form.id)
        
      if (error) throw error
      
      toast({
        title: "تم الإغلاق",
        description: "تم إغلاق البلاغ بنجاح.",
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إغلاق البلاغ.",
        variant: "destructive",
      })
    } finally {
      setIsClosing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {canEdit && form.status === 'draft' && (
        <Link href={`/dashboard/forms/${form.id}/edit`}>
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4 ml-2" />
            تعديل
          </Button>
        </Link>
      )}

      <Button variant="outline" onClick={handlePrint} disabled={isPrinting}>
        {isPrinting ? <Loader2 className="mr-2 h-4 w-4 ml-2 animate-spin" /> : <Printer className="mr-2 h-4 w-4 ml-2" />}
        طباعة
      </Button>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" disabled={form.status === 'closed'}>
            <Upload className="mr-2 h-4 w-4 ml-2" />
            رفع النموذج الموقع
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>رفع النموذج الموقع</DialogTitle>
            <DialogDescription>
              قم برفع نسخة PDF من النموذج بعد توقيعه.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pdf" className="text-right">
                ملف PDF
              </Label>
              <Input
                id="pdf"
                type="file"
                accept=".pdf,image/*"
                className="col-span-3"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 ml-2 animate-spin" />}
              رفع الملف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isAdmin && form.status !== 'closed' && (
        <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={handleClose} disabled={isClosing}>
          {isClosing ? <Loader2 className="mr-2 h-4 w-4 ml-2 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4 ml-2" />}
          إغلاق البلاغ
        </Button>
      )}
    </div>
  )
}
