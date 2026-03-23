export interface Sector {
  id: string
  name: string
  code?: string
}

export interface Profile {
  role: string
  sector_id: string | null
}

export interface FaultForm {
  id: string
  form_number: string
  sector_id: string
  status: string
  date: string
  station: string
  feeder?: string
  sectors?: { name: string; code?: string } | { name: string; code?: string }[]
}

export interface MaterialUsed {
  id?: string
  form_id?: string
  details: string
  quantity?: number
}

export interface MaterialCatalog {
  id: string
  name: string
  unit?: string
}
