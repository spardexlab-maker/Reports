import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. Delete all data from tables (in reverse dependency order)
    const tables = [
      'notifications',
      'signed_forms',
      'fault_images',
      'materials_returned',
      'materials_used',
      'fault_forms',
      'users',
      'sectors'
    ]

    for (const table of tables) {
      // Use 'id' which exists in all tables as a UUID primary key
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      
      if (error) {
        // If table doesn't exist, it's fine for a fresh setup
        if (error.message.includes('schema cache') || error.code === '42P01') {
          console.log(`Table ${table} does not exist yet, skipping.`)
        } else {
          console.error(`Error deleting from ${table}:`, error.message)
        }
      } else {
        console.log(`Deleted all rows from ${table}`)
      }
    }

    // 2. Delete all Auth Users
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      console.error('Error listing users:', listError.message)
    } else {
      for (const user of listData.users) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
        if (deleteError) {
          console.error(`Error deleting auth user ${user.id}: ${user.email}`, deleteError.message)
        } else {
          console.log(`Deleted auth user: ${user.email}`)
        }
      }
    }

    // 3. Create Admin User
    const adminEmail = 'admin@system.local'
    const adminPassword = 'Admin12345'
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: `Failed to create admin auth user: ${authError.message}` }, { status: 500 })
    }

    const userId = authData.user.id

    // Create the admin profile in public.users
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        full_name: 'مدير النظام العام',
        role: 'admin',
        sector_id: null,
      })

    if (dbError) {
      return NextResponse.json({ error: `Failed to create admin profile: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      message: 'تم تصفير النظام بنجاح وإنشاء حساب أدمن جديد.',
      adminAccount: {
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
