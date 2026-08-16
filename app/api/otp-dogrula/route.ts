import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!(await rateLimit(`otp:${ip}`, 10, 60 * 60_000))) {
      return NextResponse.json({ error: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.' }, { status: 429 })
    }

    const { email, token } = await req.json()

    if (!email || !token || token.length !== 8) {
      return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // OTP kodunu doğrula ve oturumu başlat
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    })

    if (error || !data.session) {
      return NextResponse.json({ error: 'Kod hatalı veya süresi dolmuş. Lütfen tekrar deneyin.' }, { status: 400 })
    }

    // Access token'ı client'a döndür — client bu token ile şifre güncelleyecek
    return NextResponse.json({
      success: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
