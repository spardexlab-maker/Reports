export interface Sector {
  id: string
  name: string
  code: string
  description?: string
  feeders?: string[]
  transformer_numbers?: string[]
  stations?: string[]
  created_at?: string
}

export interface Profile {
  id: string
  role: "admin" | "sector_user"
  sector_id: string | null
  full_name: string
  created_at?: string
}

export type FormStatus = "draft" | "printed" | "signed" | "closed"

export interface FaultForm {
  id: string
  form_number: string
  sector_id: string
  day: string
  date: string
  time: string
  feeder: string
  transformer_number: string
  station: string
  address: string
  work_order_number: string
  fault_details: string
  vehicles_used?: string | null
  obstacles_problems?: string | null
  technical_staff: string
  status: FormStatus
  created_by: string
  created_at: string
  updated_at: string
  
  // Relations
  sectors?: Sector | Sector[]
  materials_used?: MaterialUsed[]
  materials_returned?: MaterialReturned[]
  fault_images?: FaultImage[]
  signed_forms?: SignedForm[]
  vehicles_used_log?: VehicleUsedLog[]
  crew_used_log?: CrewUsedLog[]
  
  // Client-side helper
  resolved_sector_name?: string
}

export interface MaterialUsed {
  id: string
  form_id: string
  index_number: number
  details: string
  quantity: number
}

export interface MaterialReturned {
  id: string
  form_id: string
  index_number: number
  details: string
  quantity: number
}

export interface FaultImage {
  id: string
  form_id: string
  image_url: string
  file_path?: string | null
  description?: string | null
  created_at: string
}

export interface SignedForm {
  id: string
  form_id: string
  pdf_url: string
  uploaded_by: string
  created_at: string
}

export interface MaterialCatalog {
  id: string
  name: string
  unit?: string
}

export interface Vehicle {
  id: string
  name: string
  plate_number?: string
  created_at?: string
}

export interface CrewMember {
  id: string
  name: string
  created_at?: string
}

export interface VehicleUsedLog {
  id: string
  form_id: string
  vehicle_name: string
  hours: number
  created_at?: string
}

export interface CrewUsedLog {
  id: string
  form_id: string
  crew_name: string
  hours: number
  created_at?: string
}
