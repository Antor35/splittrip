import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Trip {
  id: string
  name: string
  code: string
  description?: string
  base_currency: string
  created_at: string
}

export interface Member {
  id: string
  trip_id: string
  name: string
  joined_at: string
}

export interface Expense {
  id: string
  trip_id: string
  title: string
  amount: number
  currency: string
  category: string
  paid_by_id: string
  paid_by_name?: string
  shared_with: string[]   // array of member IDs
  receipt_url?: string
  notes?: string
  created_at: string
  members?: Member[]
}
