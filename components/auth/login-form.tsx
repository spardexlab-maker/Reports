"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Database } from "lucide-react"

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
import { login } from "@/app/login/actions"

const formSchema = z.object({
  username: z.string().min(3, {
    message: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل.",
  }),
  password: z.string().min(6, {
    message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
  }),
})

export default function LoginForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    const formData = new FormData()
    formData.append("username", values.username)
    formData.append("password", values.password)

    const result = await login(formData)

    if (result?.error) {
      setIsLoading(false)
      return toast({
        title: "خطأ في تسجيل الدخول",
        description: result.error,
        variant: "destructive",
      })
    }

    if (result?.success) {
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "جاري تحويلك إلى لوحة التحكم...",
      })
      
      // Use window.location.href for a full reload to ensure middleware sees the new session
      // Adding a cache-busting query param just in case
      setTimeout(() => {
        window.location.href = "/dashboard?t=" + Date.now()
      }, 500)
    }
  }

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <FormLabel>كلمة المرور</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            تسجيل الدخول
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">أو</span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full" 
            onClick={async () => {
              setIsLoading(true)
              try {
                const res = await fetch('/api/setup')
                const data = await res.json()
                if (res.ok) {
                  toast({
                    title: "تمت تهيئة النظام",
                    description: "تم إنشاء الحسابات الافتراضية بنجاح. يمكنك الآن تسجيل الدخول.",
                  })
                } else {
                  throw new Error(data.error || "فشلت التهيئة")
                }
              } catch (err: any) {
                toast({
                  title: "خطأ في التهيئة",
                  description: err.message,
                  variant: "destructive",
                })
              } finally {
                setIsLoading(false)
              }
            }}
            disabled={isLoading}
          >
            <Database className="ml-2 h-4 w-4" />
            تهيئة قاعدة البيانات (لأول مرة)
          </Button>
        </form>
      </Form>
    </div>
  )
}
