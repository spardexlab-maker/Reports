import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = createAdminClient()
    if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 500 })

    const { data: profile } = await supabaseAdmin.from("users").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin" && user.email !== "admin@system.local") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name } = body

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from("crew_members")
      .insert({ name })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = createAdminClient()
    if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 500 })

    const { data: profile } = await supabaseAdmin.from("users").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin" && user.email !== "admin@system.local") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 })

    const { error } = await supabaseAdmin
      .from("crew_members")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
