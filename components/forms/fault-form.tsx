"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import Image from "next/image"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const materialSchema = z.object({
  details: z.string().min(1, "التفاصيل مطلوبة"),
  quantity: z.number().min(1, "الكمية مطلوبة"),
})

const formSchema = z.object({
  sector_id: z.string().uuid("القطاع مطلوب"),
  day: z.string().min(1, "اليوم مطلوب"),
  date: z.string().min(1, "التاريخ مطلوب"),
  time: z.string().min(1, "الوقت مطلوب"),
  feeder: z.string().min(1, "المغذي مطلوب"),
  transformer_number: z.string().min(1, "رقم المحول مطلوب"),
  station: z.string().min(1, "المحطة مطلوبة"),
  address: z.string().min(1, "العنوان مطلوب"),
  work_order_number: z.string().min(1, "رقم أمر العمل مطلوب"),
  fault_details: z.string().min(1, "تفاصيل العطل مطلوبة"),
  vehicles_used: z.string().optional(),
  obstacles_problems: z.string().optional(),
  technical_staff: z.string().min(1, "الطاقم الفني مطلوب"),
  materials_used: z.array(materialSchema).optional(),
  materials_returned: z.array(materialSchema).optional(),
})

import { Profile, FaultForm as FaultFormType, Sector, Vehicle, MaterialCatalog, FaultImage } from "@/lib/types"

interface FaultFormProps {
  userSectorId?: string | null
  sectors: Sector[]
  vehicles: Vehicle[]
  materials: MaterialCatalog[]
  isAdmin: boolean
  initialData?: FaultFormType
}

export default function FaultForm({ userSectorId, sectors, vehicles, materials, isAdmin, initialData }: FaultFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [images, setImages] = React.useState<File[]>([])
  const [existingImages, setExistingImages] = React.useState<FaultImage[]>(initialData?.fault_images || [])
  const supabase = createClient()
  const defaultSectorId = initialData?.sector_id || userSectorId || (sectors.length > 0 ? sectors[0].id : "")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sector_id: defaultSectorId,
      day: initialData?.day || new Date().toLocaleDateString("ar-EG", { weekday: "long" }),
      date: initialData?.date || new Date().toISOString().split("T")[0],
      time: initialData?.time || new Date().toTimeString().split(" ")[0].substring(0, 5),
      feeder: initialData?.feeder || "",
      transformer_number: initialData?.transformer_number || "",
      station: initialData?.station || "",
      address: initialData?.address || "",
      work_order_number: initialData?.work_order_number || "",
      fault_details: initialData?.fault_details || "",
      vehicles_used: initialData?.vehicles_used || "",
      obstacles_problems: initialData?.obstacles_problems || "",
      technical_staff: initialData?.technical_staff || "",
      materials_used: initialData?.materials_used?.length > 0 ? (initialData.materials_used as { details: string; quantity: number }[]) : [{ details: "", quantity: 1 }],
      materials_returned: initialData?.materials_returned?.length > 0 ? (initialData.materials_returned as { details: string; quantity: number }[]) : [{ details: "", quantity: 1 }],
    },
  })

  const selectedSectorId = form.watch("sector_id")
  const selectedSector = sectors.find(s => s.id === selectedSectorId)

  // Reset dependent fields when sector changes
  React.useEffect(() => {
    if (selectedSectorId && !initialData) {
      form.setValue("feeder", "")
      form.setValue("station", "")
      form.setValue("transformer_number", "")
    }
  }, [selectedSectorId, form, initialData])

  const { fields: usedFields, append: appendUsed, remove: removeUsed } = useFieldArray({
    control: form.control,
    name: "materials_used",
  })

  const { fields: returnedFields, append: appendReturned, remove: removeReturned } = useFieldArray({
    control: form.control,
    name: "materials_returned",
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setImages((prev) => [...prev, ...newFiles])
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = async (imageId: string) => {
    try {
      const { error } = await supabase.from('fault_images').delete().eq('id', imageId)
      if (error) throw error
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch (error) {
      console.error("Error deleting image:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الصورة.",
        variant: "destructive",
      })
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error("User not authenticated")

      let formId = initialData?.id

      if (initialData) {
        // Update form
        const { error: formError } = await supabase
          .from("fault_forms")
          .update({
            sector_id: values.sector_id,
            day: values.day,
            date: values.date,
            time: values.time,
            feeder: values.feeder,
            transformer_number: values.transformer_number,
            station: values.station,
            address: values.address,
            work_order_number: values.work_order_number,
            fault_details: values.fault_details,
            vehicles_used: values.vehicles_used,
            obstacles_problems: values.obstacles_problems,
            technical_staff: values.technical_staff,
          })
          .eq("id", formId)

        if (formError) throw formError

        // Delete existing materials
        await supabase.from("materials_used").delete().eq("form_id", formId)
        await supabase.from("materials_returned").delete().eq("form_id", formId)
      } else {
        // Insert form
        const { data: formResult, error: formError } = await supabase
          .from("fault_forms")
          .insert({
            sector_id: values.sector_id,
            day: values.day,
            date: values.date,
            time: values.time,
            feeder: values.feeder,
            transformer_number: values.transformer_number,
            station: values.station,
            address: values.address,
            work_order_number: values.work_order_number,
            fault_details: values.fault_details,
            vehicles_used: values.vehicles_used,
            obstacles_problems: values.obstacles_problems,
            technical_staff: values.technical_staff,
            created_by: userData.user.id,
            status: "draft",
          })
          .select()
          .single()

        if (formError) throw formError
        formId = formResult.id
      }

      // Upload new images
      if (images.length > 0) {
        for (const [index, file] of images.entries()) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${formId}/${Date.now()}_${index}.${fileExt}`
          
          const { error: uploadError } = await supabase.storage
            .from('fault-images')
            .upload(fileName, file)

          if (uploadError) {
            console.error("Error uploading image to storage:", uploadError)
            throw new Error(`فشل رفع الصورة: ${uploadError.message}`)
          }

          const { data: publicUrlData } = supabase.storage
            .from('fault-images')
            .getPublicUrl(fileName)

          const { error: imageError } = await supabase.from('fault_images').insert({
            form_id: formId,
            image_url: publicUrlData.publicUrl,
            file_path: fileName,
            description: `صورة ${index + 1}`
          })
          if (imageError) {
            console.error("Error inserting image metadata:", imageError)
            throw imageError
          }
        }
      }

      // Insert materials used
      if (values.materials_used && values.materials_used.length > 0) {
        const usedData = values.materials_used.map((m, i) => ({
          form_id: formId,
          index_number: i + 1,
          details: m.details,
          quantity: m.quantity,
        })).filter(m => m.details.trim() !== "")

        if (usedData.length > 0) {
          const { error: usedError } = await supabase.from("materials_used").insert(usedData)
          if (usedError) throw usedError
        }
      }

      // Insert materials returned
      if (values.materials_returned && values.materials_returned.length > 0) {
        const returnedData = values.materials_returned.map((m, i) => ({
          form_id: formId,
          index_number: i + 1,
          details: m.details,
          quantity: m.quantity,
        })).filter(m => m.details.trim() !== "")

        if (returnedData.length > 0) {
          const { error: returnedError } = await supabase.from("materials_returned").insert(returnedData)
          if (returnedError) throw returnedError
        }
      }

      toast({
        title: initialData ? "تم التحديث بنجاح" : "تم الحفظ بنجاح",
        description: initialData ? "تم تحديث بيانات البلاغ بنجاح." : "تم إنشاء بلاغ العطل بنجاح.",
      })

      router.push(`/dashboard/forms/${formId}`)
    } catch (error: any) {
      console.error("Form submission error:", error)
      toast({
        title: "خطأ",
        description: error?.message || "حدث خطأ أثناء حفظ البلاغ.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>الدور الحالي:</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isAdmin ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            {isAdmin ? 'مدير (Admin)' : 'مستخدم قطاع (Sector User)'}
          </span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>معلومات عامة</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FormField
              control={form.control}
              name="sector_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>القطاع</FormLabel>
                  <Select
                    disabled={!isAdmin || isLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر القطاع" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sectors.map((sector) => (
                        <SelectItem key={sector.id} value={sector.id}>
                          {sector.name} ({sector.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اليوم</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>التاريخ</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوقت</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>موقع العطل</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="station"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المحطة</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المحطة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectedSector?.stations && selectedSector.stations.length > 0 ? (
                        Array.from(new Set(selectedSector.stations)).map((station: string, index: number) => (
                          <SelectItem key={`${station}-${index}`} value={station}>
                            {station}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>لا توجد محطات معرفة</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="feeder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المغذي</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المغذي" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectedSector?.feeders && selectedSector.feeders.length > 0 ? (
                        Array.from(new Set(selectedSector.feeders)).map((feeder: string, index: number) => (
                          <SelectItem key={`${feeder}-${index}`} value={feeder}>
                            {feeder}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>لا توجد مغذيات معرفة</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transformer_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم المحول</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر رقم المحول" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectedSector?.transformer_numbers && selectedSector.transformer_numbers.length > 0 ? (
                        Array.from(new Set(selectedSector.transformer_numbers)).map((num: string, index: number) => (
                          <SelectItem key={`${num}-${index}`} value={num}>
                            {num}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>لا توجد أرقام محولات معرفة</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العنوان</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تفاصيل العطل</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <FormField
              control={form.control}
              name="work_order_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم أمر العمل</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fault_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تفاصيل العطل</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>المواد المصروفة</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendUsed({ details: "", quantity: 1 })}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4 ml-2" />
                إضافة مادة
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {usedFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4">
                  <FormField
                    control={form.control}
                    name={`materials_used.${index}.details`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>التفاصيل</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger disabled={isLoading}>
                              <SelectValue placeholder="اختر المادة..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {materials.map((m) => (
                              <SelectItem key={m.id} value={m.name}>
                                {m.name} {m.unit ? `(${m.unit})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`materials_used.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel>الكمية</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : "")}
                            disabled={isLoading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeUsed(index)}
                    disabled={isLoading || usedFields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>المواد المرتجعة</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendReturned({ details: "", quantity: 1 })}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4 ml-2" />
                إضافة مادة
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {returnedFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4">
                  <FormField
                    control={form.control}
                    name={`materials_returned.${index}.details`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>التفاصيل</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger disabled={isLoading}>
                              <SelectValue placeholder="اختر المادة..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {materials.map((m) => (
                              <SelectItem key={m.id} value={m.name}>
                                {m.name} {m.unit ? `(${m.unit})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`materials_returned.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel>الكمية</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : "")}
                            disabled={isLoading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeReturned(index)}
                    disabled={isLoading || returnedFields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>معلومات إضافية</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <FormField
              control={form.control}
              name="vehicles_used"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>السيارات المستخدمة</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={isLoading}>
                        <SelectValue placeholder="اختر السيارة..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.name}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="obstacles_problems"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المعوقات والمشاكل</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="technical_staff"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الطاقم الفني</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>صور العطل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={isLoading}
                  className="max-w-md"
                />
              </div>
              
              {(existingImages.length > 0 || images.length > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {existingImages.map((img) => (
                    <div key={img.id} className="relative group border rounded-md p-2 h-24">
                      <Image
                        src={img.image_url}
                        alt={img.description || "صورة سابقة"}
                        fill
                        className="object-cover rounded-md"
                        referrerPolicy="no-referrer"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeExistingImage(img.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {images.map((file, index) => (
                    <div key={`new-${index}`} className="relative group border rounded-md p-2 h-24">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index}`}
                        fill
                        className="object-cover rounded-md"
                        unoptimized
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 ml-2 animate-spin" />}
            {initialData ? "تحديث البلاغ" : "حفظ البلاغ"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
