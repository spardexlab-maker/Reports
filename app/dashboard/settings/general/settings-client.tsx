"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Upload, Image as ImageIcon, Trash2 } from "lucide-react"
import Image from "next/image"

export default function SettingsClient() {
  const [mainLogo, setMainLogo] = useState<string>("")
  const [partnerLogo, setPartnerLogo] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [uploadingMain, setUploadingMain] = useState(false)
  const [uploadingPartner, setUploadingPartner] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*')
      if (error) throw error
      
      if (data) {
        const main = data.find(s => s.key === 'main_logo')?.value
        const partner = data.find(s => s.key === 'partner_logo')?.value
        if (main) setMainLogo(main)
        if (partner) setPartnerLogo(partner)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: 'main_logo' | 'partner_logo') => {
    try {
      if (!e.target.files || e.target.files.length === 0) {
        return
      }
      
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${key}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      if (key === 'main_logo') setUploadingMain(true)
      else setUploadingPartner(true)

      // Upload image
      const { error: uploadError } = await supabase.storage
        .from('public_assets')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public_assets')
        .getPublicUrl(filePath)

      // Save to settings table
      const { error: dbError } = await supabase
        .from('settings')
        .upsert({ key, value: publicUrl })

      if (dbError) throw dbError

      // Update local state
      if (key === 'main_logo') setMainLogo(publicUrl)
      else setPartnerLogo(publicUrl)

      toast({
        title: "تم الحفظ بنجاح",
        description: "تم تحديث الشعار بنجاح.",
      })
    } catch (error: any) {
      let message = error.message || "حدث خطأ أثناء رفع الشعار."
      if (message.includes("schema cache") || message.includes("42P01")) {
        message = "جدول 'settings' غير موجود في قاعدة البيانات. يرجى مراجعة قسم 'إعداد قاعدة البيانات' في أعلى الصفحة."
      }
      toast({
        variant: "destructive",
        title: "خطأ في الرفع",
        description: message,
      })
    } finally {
      if (key === 'main_logo') setUploadingMain(false)
      else setUploadingPartner(false)
    }
  }

  const removeLogo = async (key: 'main_logo' | 'partner_logo') => {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key, value: '' })

      if (error) throw error

      if (key === 'main_logo') setMainLogo('')
      else setPartnerLogo('')

      toast({
        title: "تم الحذف",
        description: "تم إزالة الشعار بنجاح.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء إزالة الشعار.",
      })
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>الشعار الرئيسي للنظام</CardTitle>
          <CardDescription>
            هذا الشعار يظهر في صفحة تسجيل الدخول وفي أعلى لوحة التحكم.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-slate-50">
            {mainLogo ? (
              <div className="relative w-40 h-40 mb-4">
                <Image src={mainLogo} alt="الشعار الرئيسي" fill className="object-contain" />
              </div>
            ) : (
              <div className="w-20 h-20 mb-4 rounded-full bg-slate-200 flex items-center justify-center">
                <ImageIcon className="h-10 w-10 text-slate-400" />
              </div>
            )}
            
            <div className="flex gap-2 w-full justify-center">
              <div className="relative">
                <Input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  onChange={(e) => handleUpload(e, 'main_logo')}
                  disabled={uploadingMain}
                />
                <Button disabled={uploadingMain} variant="outline" className="gap-2">
                  {uploadingMain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {mainLogo ? 'تغيير الشعار' : 'رفع الشعار'}
                </Button>
              </div>
              {mainLogo && (
                <Button variant="destructive" size="icon" onClick={() => removeLogo('main_logo')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>شعار الشريك / الجهة</CardTitle>
          <CardDescription>
            شعار إضافي يظهر بجانب الشعار الرئيسي (اختياري).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-slate-50">
            {partnerLogo ? (
              <div className="relative w-40 h-40 mb-4">
                <Image src={partnerLogo} alt="شعار الشريك" fill className="object-contain" />
              </div>
            ) : (
              <div className="w-20 h-20 mb-4 rounded-full bg-slate-200 flex items-center justify-center">
                <ImageIcon className="h-10 w-10 text-slate-400" />
              </div>
            )}
            
            <div className="flex gap-2 w-full justify-center">
              <div className="relative">
                <Input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  onChange={(e) => handleUpload(e, 'partner_logo')}
                  disabled={uploadingPartner}
                />
                <Button disabled={uploadingPartner} variant="outline" className="gap-2">
                  {uploadingPartner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {partnerLogo ? 'تغيير الشعار' : 'رفع الشعار'}
                </Button>
              </div>
              {partnerLogo && (
                <Button variant="destructive" size="icon" onClick={() => removeLogo('partner_logo')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
