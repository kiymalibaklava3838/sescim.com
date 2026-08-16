    import { createBrowserClient } from '@supabase/ssr'

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