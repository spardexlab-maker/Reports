"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Plus, Pencil } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const formSchema = z.object({
  name: z.string().min(2, "اسم القطاع يجب أن يكون حرفين على الأقل."),
  code: z.string().min(2, "رمز القطاع يجب أن يكون حرفين على الأقل.").max(10, "رمز القطاع يجب أن لا يتجاوز 10 أحرف."),
  description: z.string().optional(),
  feeders: z.string().optional(),
  transformer_numbers: z.string().optional(),
  stations: z.string().optional(),
})

interface SectorFormProps {
  sector?: any
}

export default function SectorForm({ sector }: SectorFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isOpen, setIsOpen] = React.useState<boolean>(false)

  const isEditing = !!sector

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: sector?.name || "",
      code: sector?.code || "",
      description: sector?.description || "",
      feeders: sector?.feeders?.join(", ") || "",
      transformer_numbers: sector?.transformer_numbers?.join(", ") || "",
      stations: sector?.stations?.join(", ") || "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    const payload = {
      ...values,
      id: sector?.id,
      feeders: values.feeders ? Array.from(new Set(values.feeders.split(",").map(s => s.trim()).filter(Boolean))) : [],
      transformer_numbers: values.transformer_numbers ? Array.from(new Set(values.transformer_numbers.split(",").map(s => s.trim()).filter(Boolean))) : [],
      stations: values.stations ? Array.from(new Set(values.stations.split(",").map(s => s.trim()).filter(Boolean))) : [],
    }

    try {
      const response = await fetch("/api/sectors", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      let result
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        result = await response.json()
      } else {
        const text = await response.text()
        console.error("Non-JSON response from /api/sectors:", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          bodyPreview: text.substring(0, 500)
        })
        throw new Error(`استجابة غير متوقعة من الخادم (${response.status} ${response.statusText}). يرجى مراجعة سجلات الخادم.`)
      }

      if (!response.ok) {
        throw new Error(result.error || `حدث خطأ أثناء ${isEditing ? "تعديل" : "إضافة"} القطاع.`)
      }

      toast({
        title: isEditing ? "تم التعديل بنجاح" : "تمت الإضافة بنجاح",
        description: isEditing ? "تم تعديل بيانات القطاع بنجاح." : "تم إضافة القطاع الجديد بنجاح.",
      })

      setIsOpen(false)
      if (!isEditing) form.reset()
      router.refresh()
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || `حدث خطأ أثناء ${isEditing ? "تعديل" : "إضافة"} القطاع.`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4 ml-2" />
            إضافة قطاع جديد
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "تعديل بيانات القطاع" : "إضافة قطاع جديد"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "قم بتعديل بيانات القطاع الحالي." : "أدخل بيانات القطاع الجديد. تأكد من أن الرمز فريد."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم القطاع</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: قطاع الشمال" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرمز</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: NTH" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>التفاصيل / الوصف</FormLabel>
                  <FormControl>
                    <Input placeholder="تفاصيل إضافية عن القطاع" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-4">تفاصيل الشبكة (قائمة منسدلة في الاستمارة)</h4>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="stations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المحطات</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="أدخل أسماء المحطات مفصولة بفاصلة (مثال: محطة أ، محطة ب)" 
                          {...field} 
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormDescription>افصل بين الأسماء بفاصلة (,)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="feeders"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المغذيات</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="أدخل أسماء المغذيات مفصولة بفاصلة" 
                          {...field} 
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormDescription>افصل بين الأسماء بفاصلة (,)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transformer_numbers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>أرقام المحولات</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="أدخل أرقام المحولات مفصولة بفاصلة" 
                          {...field} 
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormDescription>افصل بين الأرقام بفاصلة (,)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 ml-2 animate-spin" />}
                {isEditing ? "تحديث" : "حفظ"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
