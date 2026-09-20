import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { iletisimSchema } from '@/lib/api-schemas'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'
import { iletisimAdminHTML } from '@/lib/email'
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
    if (!(await rateLimit(`iletisim:${ip}`, 8, 60 * 60_000))) {
      return NextResponse.json({ error: 'Çok fazla gönderim yaptınız. Lütfen daha sonra tekrar deneyin.' }, { status: 429 })
    }

    const raw = await req.json()
    const parsed = iletisimSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Lütfen tüm zorunlu alanları eksiksiz doldurunuz.' }, { status: 400 })
    }

    const { ad, soyad, telefon, email, konu, mesaj } = parsed.data

    // 1. Veritabanına kaydet (Varsa iletisim_mesajlari tablosu)
    try {
      const db = supabaseAdmin()
      await db.from('iletisim_mesajlari').insert({
        ad,
        soyad: soyad || null,
        telefon: telefon || null,
        email,
        konu: konu || null,
        mesaj,
        created_at: new Date().toISOString()
      })
    } catch (dbErr) {
      console.warn('[İletişim API] Veritabanı kaydı atlandı (Tablo yok veya bağlantı hatası):', dbErr)
    }

    // 2. info@sescim.com adresine e-posta gönderimi (Garanti)
    const adminEmail = process.env.ADMIN_EMAIL || 'info@sescim.com'
    await sendEmail(
      adminEmail,
      `İletişim Formu: ${konu || 'Genel'} — ${ad} ${soyad || ''}`.trim(),
      iletisimAdminHTML({ ad, soyad, telefon, email, konu, mesaj })
    )

    return NextResponse.json({ success: true, message: 'Mesajınız başarıyla iletildi.' })
  } catch (e) {
    console.error('İletişim API Hatası:', e)
    return NextResponse.json({ error: 'Sunucu hatası oluştu. Lütfen tekrar deneyiniz.' }, { status: 500 })
  }
}
