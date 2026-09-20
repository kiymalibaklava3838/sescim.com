import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'
import { sendEmail } from '@/lib/send-email'

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!(await rateLimit(`bulten:${ip}`, 6, 60 * 60_000))) {
      return NextResponse.json(
        { error: 'Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyiniz.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Lütfen geçerli bir e-posta adresi giriniz.' },
        { status: 400 }
      )
    }

    const db = supabaseAdmin()

    // 1. Veritabanına kaydet
    try {
      await db.from('bulten_aboneleri').upsert(
        { email, ip_adresi: ip, aktif: true, updated_at: new Date().toISOString() },
        { onConflict: 'email' }
      )
    } catch (dbErr) {
      console.warn('[Bülten API] Veritabanı kaydı atlandı (Tablo henüz hazır olmayabilir):', dbErr)
    }

    // 2. Kupon kodunu dön
    return NextResponse.json({
      success: true,
      coupon: 'SESCIM5',
      message: 'Bülten aboneliğiniz başarıyla tamamlandı. Hoş geldin indirim kuponunuz hazır!'
    })
  } catch (err: any) {
    console.error('Bülten kayıt hatası:', err)
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 })
  }
}
