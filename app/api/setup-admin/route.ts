import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Missing admin client" }, { status: 500 })
    }

    const email = "Admin@system.local"
    const password = "Admin1243**"
    const fullName = "مدير النظام"

    // 1. Check if user exists in auth.users
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    let userId = existingUsers.users.find((u: any) => u.email === email)?.id

    if (!userId) {
      // 2. Create user in auth.users
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }
      
      userId = newUser.user.id
    } else {
      // Update password just in case
      await supabaseAdmin.auth.admin.updateUserById(userId, { password })
    }

    // 3. Check if user exists in public.users
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!profile) {
      // 4. Create user in public.users
      const { error: insertError } = await supabaseAdmin.from("users").insert({
        id: userId,
        full_name: fullName,
        role: "admin",
      })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    } else {
      // Update role to admin just in case
      await supabaseAdmin.from("users").update({ role: "admin" }).eq("id", userId)
    }

    return NextResponse.json({ success: true, message: "Admin account created successfully. You can now login with Admin / Admin1243**" })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
