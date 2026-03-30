"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import Image from "next/image"
import { Loader2, Plus, Trash2, CheckCircle } from "lucide-react"

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

const vehicleLogSchema = z.object({
  vehicle_name: z.string().min(1, "الآلية مطلوبة"),
  hours: z.number().min(0, "الساعات مطلوبة"),
})

const crewLogSchema = z.object({
  crew_name: z.string().min(1, "عضو الطاقم مطلوب"),
  hours: z.number().min(0, "الساعات مطلوبة"),
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
  complaint_number: z.string().min(1, "رقم الشكوى مطلوب"),
  fault_details: z.string().min(1, "تفاصيل العطل مطلوبة"),
  fault_duration: z.string().optional(),
  location_link: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  vehicles_used: z.string().optional(),
  obstacles_problems: z.string().optional(),
  technical_staff: z.string().optional(),
  materials_used: z.array(materialSchema).optional(),
  materials_returned: z.array(materialSchema).optional(),
  vehicles_used_log: z.array(vehicleLogSchema).optional(),
  crew_used_log: z.array(crewLogSchema).optional(),
})

import { Profile, FaultForm as FaultFormType, Sector, Vehicle, MaterialCatalog, FaultImage, CrewMember } from "@/lib/types"
import { extractCoordinatesFromUrl } from "@/lib/location-utils"

interface FaultFormProps {
  userSectorId?: string | null
  sectors: Sector[]
  vehicles: Vehicle[]
  materials: MaterialCatalog[]
  crewMembers: CrewMember[]
  isAdmin: boolean
  initialData?: FaultFormType
}

export default function FaultForm({ userSectorId, sectors, vehicles, materials, crewMembers, isAdmin, initialData }: FaultFormProps) {
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
      complaint_number: initialData?.complaint_number || "",
      fault_details: initialData?.fault_details || "",
      fault_duration: initialData?.fault_duration || "",
      location_link: initialData?.location_link || "",
      latitude: initialData?.latitude || null,
      longitude: initialData?.longitude || null,
      vehicles_used: initialData?.vehicles_used || "",
      obstacles_problems: initialData?.obstacles_problems || "",
      technical_staff: initialData?.technical_staff || "",
      materials_used: (initialData?.materials_used && initialData.materials_used.length > 0) ? (initialData.materials_used as { details: string; quantity: number }[]) : [{ details: "", quantity: 1 }],
      materials_returned: (initialData?.materials_returned && initialData.materials_returned.length > 0) ? (initialData.materials_returned as { details: string; quantity: number }[]) : [{ details: "", quantity: 1 }],
      vehicles_used_log: (initialData?.vehicles_used_log && initialData.vehicles_used_log.length > 0) ? (initialData.vehicles_used_log as { vehicle_name: string; hours: number }[]) : [],
      crew_used_log: (initialData?.crew_used_log && initialData.crew_used_log.length > 0) ? (initialData.crew_used_log as { crew_name: string; hours: number }[]) : [],
    },
  })

  const selectedSectorId = form.watch("sector_id")
  const selectedSector = sectors.find(s => s.id === selectedSectorId)
  const locationLink = form.watch("location_link")
  const lat = form.watch("latitude")
  const lng = form.watch("longitude")
  const [isResolvingLocation, setIsResolvingLocation] = React.useState(false)

  // Resolve location link when it changes
  React.useEffect(() => {
    async function resolveLocation() {
      if (!locationLink) {
        form.setValue("latitude", null)
        form.setValue("longitude", null)
        return
      }
      
      setIsResolvingLocation(true)
      try {
        const coords = await extractCoordinatesFromUrl(locationLink)
        if (coords) {
          form.setValue("latitude", coords.lat)
          form.setValue("longitude", coords.lng)
        } else {
          // Could not resolve, maybe clear or leave as is
          form.setValue("latitude", null)
          form.setValue("longitude", null)
        }
      } catch (error) {
        console.error("Failed to resolve location:", error)
      } finally {
        setIsResolvingLocation(false)
      }
    }

    const timer = setTimeout(() => {
      resolveLocation()
    }, 1000) // Debounce

    return () => clearTimeout(timer)
  }, [locationLink, form])

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

  const { fields: vehicleFields, append: appendVehicle, remove: removeVehicle } = useFieldArray({
    control: form.control,
    name: "vehicles_used_log",
  })

  const { fields: crewFields, append: appendCrew, remove: removeCrew } = useFieldArray({
    control: form.control,
    name: "crew_used_log",
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
            complaint_number: values.complaint_number,
            fault_details: values.fault_details,
            fault_duration: values.fault_duration,
            location_link: values.location_link,
            latitude: values.latitude,
            longitude: values.longitude,
            vehicles_used: values.vehicles_used,
            obstacles_problems: values.obstacles_problems,
            technical_staff: values.technical_staff,
          })
          .eq("id", formId)

        if (formError) throw formError

        // Log the edit for admins
        const { data: admins } = await supabase
          .from("users")
          .select("id")
          .eq("role", "admin")

        if (admins && admins.length > 0) {
          const changedFields: string[] = []
          const fieldLabels: Record<string, string> = {
            feeder: "المغذي",
            transformer_number: "رقم المحولة",
            station: "المحطة",
            address: "العنوان",
            work_order_number: "رقم أمر العمل",
            complaint_number: "رقم الشكوى",
            fault_details: "تفاصيل العطل",
            fault_duration: "مدة العطل",
            obstacles_problems: "المعوقات والمشاكل",
            technical_staff: "الكادر الفني",
          }

          Object.keys(fieldLabels).forEach((key) => {
            if (values[key as keyof typeof values] !== initialData[key as keyof typeof initialData]) {
              changedFields.push(fieldLabels[key])
            }
          })

          const changesText = changedFields.length > 0 
            ? ` (تعديل: ${changedFields.join("، ")})`
            : ""

          const notifications = admins.map((admin) => ({
            user_id: admin.id,
            title: "تعديل استمارة",
            message: `قام المستخدم ${userData.user.email} بتعديل الاستمارة رقم ${initialData.form_number}${initialData.status === 'printed' ? ' (بعد الطباعة)' : ''}${changesText}`,
            type: "edit_form",
            form_id: formId,
          }))
          await supabase.from("notifications").insert(notifications)
        }

        // Delete existing materials and logs
        await supabase.from("materials_used").delete().eq("form_id", formId)
        await supabase.from("materials_returned").delete().eq("form_id", formId)
        await supabase.from("vehicles_used_log").delete().eq("form_id", formId)
        await supabase.from("crew_used_log").delete().eq("form_id", formId)
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
            complaint_number: values.complaint_number,
            fault_details: values.fault_details,
            fault_duration: values.fault_duration,
            location_link: values.location_link,
            latitude: values.latitude,
            longitude: values.longitude,
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

      // Insert vehicles used log
      if (values.vehicles_used_log && values.vehicles_used_log.length > 0) {
        const vehiclesData = values.vehicles_used_log.map((v) => ({
          form_id: formId,
          vehicle_name: v.vehicle_name,
          hours: v.hours,
        })).filter(v => v.vehicle_name.trim() !== "")

        if (vehiclesData.length > 0) {
          const { error: vehiclesError } = await supabase.from("vehicles_used_log").insert(vehiclesData)
          if (vehiclesError) throw vehiclesError
        }
      }

      // Insert crew used log
      if (values.crew_used_log && values.crew_used_log.length > 0) {
        const crewData = values.crew_used_log.map((c) => ({
          form_id: formId,
          crew_name: c.crew_name,
          hours: c.hours,
        })).filter(c => c.crew_name.trim() !== "")

        if (crewData.length > 0) {
          const { error: crewError } = await supabase.from("crew_used_log").insert(crewData)
          if (crewError) throw crewError
        }
      }

      toast({
        title: initialData ? "تم التحديث بنجاح" : "تم الحفظ بنجاح",
        description: initialData ? "تم تحديث بيانات البلاغ بنجاح." : "تم إنشاء بلاغ العطل بنجاح.",
      })

      router.push(`/dashboard/forms/${formId}`)
    } catch (error: any) {
      console.error("Form submission error details:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: error
      })
      
      let message = error?.message || "حدث خطأ أثناء حفظ البلاغ."
      
      // Check for missing columns or tables
      if (
        message.includes("schema cache") || 
        message.includes("42P01") || 
        message.includes("42703") || // undefined_column
        (error?.code === "42703")
      ) {
        message = "هناك نقص في أعمدة أو جداول قاعدة البيانات (ربما حقول الموقع أو وقت الاستغراق). يرجى مراجعة الإعدادات العامة وتشغيل كود SQL المحدث."
      } else if (error?.code === "23505") {
        // Unique constraint violation
        if (message.includes("work_order_number")) {
          message = "رقم أمر العمل هذا موجود مسبقاً، يرجى استخدام رقم فريد."
        } else if (message.includes("complaint_number")) {
          message = "رقم الشكوى هذا موجود مسبقاً، يرجى استخدام رقم فريد."
        } else {
          message = "يوجد حقل مكرر يجب أن يكون فريداً (رقم العمل أو رقم الشكوى)."
        }
      }
      
      toast({
        title: "خطأ في الحفظ",
        description: message,
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
            <FormField
              control={form.control}
              name="location_link"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>رابط الموقع (Google Maps)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="الصق رابط خرائط جوجل هنا..." {...field} disabled={isLoading} />
                      {isResolvingLocation && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                  {locationLink && !isResolvingLocation && !lat && (
                    <p className="text-xs text-amber-600 mt-1 font-medium">
                      لم نتمكن من استخراج الإحداثيات من هذا الرابط. يرجى التأكد من أنه رابط صالح لخرائط جوجل.
                    </p>
                  )}
                  {lat && lng && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          تم استخراج الإحداثيات بنجاح
                        </p>
                        <p className="text-[10px] text-muted-foreground" dir="ltr">
                          {lat.toFixed(6)}, {lng.toFixed(6)}
                        </p>
                      </div>
                      <div className="rounded-md overflow-hidden border">
                        <iframe 
                          width="100%" 
                          height="250" 
                          src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`} 
                          frameBorder="0" 
                          scrolling="no" 
                          marginHeight={0} 
                          marginWidth={0}
                          title="موقع العطل"
                        ></iframe>
                      </div>
                    </div>
                  )}
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تفاصيل العطل</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
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
              name="complaint_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الشكوى</FormLabel>
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
                <FormItem className="md:col-span-2">
                  <FormLabel>تفاصيل العطل</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fault_duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>وقت استغراق العطل</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: ساعتين و نصف، 45 دقيقة..." {...field} disabled={isLoading} />
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

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>الآليات المستخدمة</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendVehicle({ vehicle_name: "", hours: 1 })}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4 ml-2" />
                إضافة آلية
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {vehicleFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4">
                  <FormField
                    control={form.control}
                    name={`vehicles_used_log.${index}.vehicle_name`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>الآلية</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger disabled={isLoading}>
                              <SelectValue placeholder="اختر الآلية..." />
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
                    name={`vehicles_used_log.${index}.hours`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel>الساعات</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.5"
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
                    onClick={() => removeVehicle(index)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>الطاقم الفني</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendCrew({ crew_name: "", hours: 1 })}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4 ml-2" />
                إضافة عضو
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {crewFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4">
                  <FormField
                    control={form.control}
                    name={`crew_used_log.${index}.crew_name`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>عضو الطاقم</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger disabled={isLoading}>
                              <SelectValue placeholder="اختر العضو..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {crewMembers.map((c) => (
                              <SelectItem key={c.id} value={c.name}>
                                {c.name}
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
                    name={`crew_used_log.${index}.hours`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel>الساعات</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.5"
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
                    onClick={() => removeCrew(index)}
                    disabled={isLoading}
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
