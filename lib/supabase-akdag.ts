import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAkdagServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL!,
    process.env.AKDAG_SERVICE_ROLE_KEY!
  )
}

export function createAkdagBrowserClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_AKDAG_SUPABASE_ANON_KEY!
  )
}
