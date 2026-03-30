
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error fetching notifications:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Columns in notifications:', Object.keys(data[0]))
  } else {
    // If no data, try to insert a dummy record to see if it fails
    console.log('No notifications found. Attempting to insert a dummy record...')
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        title: 'Test',
        message: 'Test message',
        type: 'test',
        form_id: '00000000-0000-0000-0000-000000000000'
      })
    
    if (insertError) {
      console.error('Insert failed:', insertError.message)
    } else {
      console.log('Insert succeeded. Columns exist.')
    }
  }
}

checkColumns()
