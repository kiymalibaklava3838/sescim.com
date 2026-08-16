import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sifreSifirlaSchema } from '@/lib/api-schemas'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!(await rateLimit(`sifre:${ip}`, 8, 60 * 60_000))) {
      return NextResponse.json({ error: 'Çok fazla deneme. Daha sonra tekrar deneyin.' }, { status: 429 })
    }

    const raw = await req.json()
    const parsed = sifreSifirlaSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Geçersiz e-posta' }, { status: 400 })
    }

    const { email } = parsed.data

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // OTP akışı: redirectTo gönderilmiyor.
    // Supabase, link yerine 6 haneli doğrulama kodu (OTP) gönderir.
    // Mail içinde hiç farklı domain linki olmadığı için spam filtrelerine takılmaz.
    const { error } = await supabase.auth.resetPasswordForEmail(email)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
