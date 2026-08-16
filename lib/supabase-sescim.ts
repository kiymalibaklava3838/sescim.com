import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createSescimServerClient() {
  const url = process.env.SESCIM_SUPABASE_URL
  const key = process.env.SESCIM_SERVICE_ROLE_KEY
  if (!url || !key) {
    return null
  }
  return createSupabaseClient(url, key)
}

export function createSescimBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SESCIM_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SESCIM_SUPABASE_ANON_KEY
  if (!url || !key) {
    return null
  }
  return createSupabaseClient(url, key)
}
