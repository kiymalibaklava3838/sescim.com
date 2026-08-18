    import { createBrowserClient } from '@supabase/ssr'
    import { createClient as createSupabaseClient } from '@supabase/supabase-js'

    // Tek bir instance tutacak değişken
    let supabaseInstance: any = null

    export function createClient() {
      // Eğer daha önce oluşturulmadıysa oluştur, oluşturulduysa mevcut olanı dön
      if (!supabaseInstance) {
        supabaseInstance = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
      }
      return supabaseInstance
    }

    // Admin clients (Server-side ONLY)
    export const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : null

    export const akdagAdmin = process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL && process.env.AKDAG_SERVICE_ROLE_KEY
      ? createSupabaseClient(process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL, process.env.AKDAG_SERVICE_ROLE_KEY)
      : null