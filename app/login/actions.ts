"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return { error: "إعدادات النظام غير مكتملة (Missing environment variables). يرجى مراجعة الإعدادات." }
    }

    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    const username = (formData.get("username") as string).trim()
    const password = formData.get("password") as string
    
    // If the username is already an email, use it. Otherwise, append the domain.
    const email = username.includes('@') ? username : `${username}@system.local`

    console.log(`Attempting login for: ${email}`)

    // Clear any existing stale session to avoid "Refresh Token Not Found" errors
    await supabase.auth.signOut()

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error(`Login error for ${email}:`, error.message)
      // If it's a refresh token error, it might be a stale session. 
      // We can try to sign out first to clear cookies, but signInWithPassword should usually handle it.
      return { error: error.message === "Invalid login credentials" ? "اسم المستخدم أو كلمة المرور غير صحيحة" : error.message }
    }

    console.log(`Auth success for ${email}, User ID: ${authData.user.id}`)
    console.log(`Checking profile with admin client for ID: ${authData.user.id}...`)

    // Check if user has a profile in the users table using ADMIN client to bypass RLS
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("role, full_name")
      .eq("id", authData.user.id)
      .maybeSingle()

    if (profileError) {
      console.error(`Profile database error for ${email}:`, profileError.message)
      return { error: `خطأ في قاعدة البيانات: ${profileError.message}` }
    }

    if (!profile) {
      console.error(`No profile record found in 'users' table for ID: ${authData.user.id}`)
      
      // Let's try to see what IS in the table to debug
      const { data: allUsers } = await supabaseAdmin.from("users").select("id, full_name").limit(5)
      console.log("Sample users in DB:", allUsers)

      // If no profile exists, sign out and return error
      await supabase.auth.signOut()
      return { error: "لم يتم العثور على ملف تعريف لهذا المستخدم في قاعدة البيانات. يرجى الضغط على زر 'تهيئة النظام' أولاً والتأكد من نجاح العملية." }
    }

    console.log(`Login successful for ${email}, Name: ${profile.full_name}, Role: ${profile.role}`)
    return { success: true }
  } catch (err: any) {
    console.error("Unexpected login error:", err)
    return { error: `حدث خطأ غير متوقع: ${err.message || "فشل الاتصال بالخادم"}` }
  }
}
