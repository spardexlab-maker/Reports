
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function addColumns() {
  const { error: error1 } = await supabase.rpc('execute_sql', {
    sql: 'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;'
  })
  if (error1) {
    console.error('Error adding title column:', error1)
  } else {
    console.log('Title column added successfully.')
  }

  const { error: error2 } = await supabase.rpc('execute_sql', {
    sql: 'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT;'
  })
  if (error2) {
    console.error('Error adding type column:', error2)
  } else {
    console.log('Type column added successfully.')
  }
}

addColumns()
