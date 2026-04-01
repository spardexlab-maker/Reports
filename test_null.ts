import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: sectors } = await supabase.from('sectors').select('id').limit(1);
  const sectorId = sectors?.[0]?.id || '123e4567-e89b-12d3-a456-426614174000';

  const { data, error } = await supabase.from('fault_forms').insert({
    sector_id: sectorId,
    day: 'Monday',
    date: '2023-01-01',
    time: '12:00',
    feeder: 'Feeder 1',
    transformer_number: 'TR-1',
    station: 'Station 1',
    address: 'Address 1',
    work_order_number: 'WO-123',
    complaint_number: null,
    fault_details: 'Details',
    technical_staff: 'Staff',
    status: 'draft',
    created_by: '123e4567-e89b-12d3-a456-426614174000',
  });
  console.log('Error:', error);
}

run();
