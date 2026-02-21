import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let client: SupabaseClient | null = null

if (url && anonKey) {
  try {
    client = createClient(url, anonKey)
  } catch {
    client = null
  }
}

export function getSupabase(): SupabaseClient | null {
  return client
}

export const SUPABASE_ENABLED = Boolean(client)
