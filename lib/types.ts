// lib/types.ts — single source of truth

export type GrievanceStatus =
  | 'PENDING' | 'AI_VERIFIED' | 'ROUTED'
  | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED' | 'REJECTED'

export type Department = 'PWD' | 'JAL_SHAKTI' | 'DISCOM' | 'GENERAL'

export type Severity = 'Low' | 'Medium' | 'High'

export type Category = 'Roads' | 'Water Supply' | 'Electricity' | 'Others'

export interface Grievance {
  id: string
  grievance_id: string
  citizen_name: string
  citizen_phone: string
  latitude: number
  longitude: number
  category: Category
  description: string
  image_url: string | null
  ai_category: Category | null
  ai_severity: Severity | null
  ai_confidence: number | null
  ai_summary: string | null
  department_id: Department | null
  department_name: string | null
  deadline: string | null
  status: GrievanceStatus
  is_high_priority: boolean
  escalation_level: number
  citizen_mood: 'frustrated' | 'unhappy' | 'patient' | null
  master_ticket_id: string | null
  is_duplicate: boolean
  after_image_url: string | null
  location_verified: boolean
  resolved_at: string | null
  address_text: string | null
  address_city: string | null
  address_pincode: string | null
  created_at: string
  updated_at: string
}

export interface GrievanceHistory {
  id: string
  grievance_id: string
  event: string
  actor: string
  metadata: Record<string, unknown> | null
  created_at: string
}
