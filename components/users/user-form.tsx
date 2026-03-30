"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Plus } from "lucide-react"

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
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const formSchema = z.object({
  id: z.string().optional(),
  full_name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل."),
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل."),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل.").optional().or(z.literal("")),
  role: z.enum(["admin", "sector_user"]),
  sector_id: z.string().optional(),
}).refine(data => {
  if (data.role === "sector_user" && !data.sector_id) {
    return false
  }
  return true
}, {
  message: "القطاع مطلوب لمستخدمي القطاعات",
  path: ["sector_id"],
}).refine(data => {
  if (!data.id && !data.password) {
    return false
  }
  return true
}, {
  message: "كلمة المرور مطلوبة للمستخدم الجديد",
  path: ["password"],
})

interface UserFormProps {
  sectors: any[]
  initialData?: any
  trigger?: React.ReactNode
}

export default function UserForm({ sectors, initialData, trigger }: UserFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isOpen, setIsOpen] = React.useState<boolean>(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: initialData?.id || "",
      full_name: initialData?.full_name || "",
      username: initialData?.email?.split("@")[0] || "",
      password: "",
      role: initialData?.role || "sector_user",
      sector_id: initialData?.sector_id || "",
    },
  })

  const role = form.watch("role")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const isEditing = !!initialData
      const response = await fetch("/api/users", {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      let result
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        result = await response.json()
      } else {
        const text = await response.text()
        console.error(`Non-JSON response from /api/users (${isEditing ? 'PATCH' : 'POST'}):`, {
          status: response.status,
          statusText: response.statusText,
          contentType,
          bodyPreview: text.substring(0, 500)
        })
        throw new Error(`استجابة غير متوقعة من الخادم (${response.status} ${response.statusText}). يرجى مراجعة سجلات الخادم.`)
      }

      if (!response.ok) {
        throw new Error(result.error || `حدث خطأ أثناء ${isEditing ? 'تعديل' : 'إضافة'} المستخدم.`)
      }

      toast({
        title: isEditing ? "تم التعديل بنجاح" : "تمت الإضافة بنجاح",
        description: isEditing ? "تم تعديل بيانات المستخدم بنجاح." : "تم إضافة المستخدم الجديد بنجاح.",
      })

      setIsOpen(false)
      if (!isEditing) {
        form.reset()
      }
      router.refresh()
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || `حدث خطأ أثناء ${initialData ? 'تعديل' : 'إضافة'} المستخدم.`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4 ml-2" />
            إضافة مستخدم جديد
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "تعديل مستخدم" : "إضافة مستخدم جديد"}</DialogTitle>
          <DialogDescription>
            {initialData ? "قم بتعديل بيانات المستخدم." : "أدخل بيانات المستخدم الجديد."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم الكامل</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: أحمد محمد" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم المستخدم</FormLabel>
                  <FormControl>
                    <Input placeholder="admin" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كلمة المرور {initialData && "(اتركها فارغة لعدم التغيير)"}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الدور</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الدور" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sector_user">مستخدم قطاع</SelectItem>
                      <SelectItem value="admin">مدير نظام</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {role === "sector_user" && (
              <FormField
                control={form.control}
                name="sector_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>القطاع</FormLabel>
                    <Select
                      disabled={isLoading}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر القطاع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sectors.map((sector) => (
                          <SelectItem key={sector.id} value={sector.id}>
                            {sector.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex justify-end mt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 ml-2 animate-spin" />}
                حفظ
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
