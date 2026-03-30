import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error selecting from notifications:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in notifications:', Object.keys(data[0]));
  } else {
    // If no data, try to select a non-existent column to see the error
    const { error: error2 } = await supabase
      .from('notifications')
      .select('type')
      .limit(1);
    if (error2) {
      console.log('Column "type" does not exist.');
    } else {
      console.log('Column "type" exists.');
    }
  }
}

checkColumns();
