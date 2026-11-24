import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

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

    const body = await req.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Lütfen geçerli bir e-posta adresi giriniz.' },
        { status: 400 }
      )
    }

    const db = supabaseAdmin()
    const nowIso = new Date().toISOString()

    // 1. Veritabanına kaydet (bulten_aboneleri yoksa mevcut destek_talepleri tablosuna güvenli yedekle)
    let saved = false
    try {
      const { error: bErr } = await db.from('bulten_aboneleri').upsert(
        { email, ip_adresi: ip, aktif: true, updated_at: nowIso },
        { onConflict: 'email' }
      )
      if (!bErr) saved = true
    } catch {}

    if (!saved) {
      try {
        const { data: existing } = await db
          .from('destek_talepleri')
          .select('id')
          .eq('konu', '[BULTEN] E-posta Aboneliği')
          .ilike('email', email)
          .limit(1)

        if (!existing || existing.length === 0) {
          await db.from('destek_talepleri').insert([
            {
              ad_soyad: 'Bülten Abonesi',
              email,
              telefon: '',
              konu: '[BULTEN] E-posta Aboneliği',
              mesaj: JSON.stringify({
                type: 'sescim_newsletter_v1',
                email,
                ip,
                subscribed_at: nowIso,
              }),
              durum: 'acik',
              created_at: nowIso,
            },
          ])
        }
      } catch (fallbackErr) {
        console.warn('[Bülten API] Fallback kayıt uyarısı:', fallbackErr)
      }
    }

    // 2. Veritabanında aktif ve herkese açık (ozel_mi = false) bir kupon varsa dinamik olarak dön
    let activeCouponCode: string | null = null
    try {
      const { data: coupons } = await db
        .from('kuponlar')
        .select('kod, gecerlilik_tarihi, max_kullanim, kullanim_sayisi')
        .eq('aktif', true)
        .or('ozel_mi.is.null,ozel_mi.eq.false')
        .order('created_at', { ascending: false })
        .limit(5)

      const validCoupon = (coupons || []).find((c: any) => {
        if (c.gecerlilik_tarihi && new Date(c.gecerlilik_tarihi).getTime() < Date.now()) return false
        if (c.max_kullanim && (c.kullanim_sayisi || 0) >= c.max_kullanim) return false
        return Boolean(c.kod)
      })
      if (validCoupon) {
        activeCouponCode = String(validCoupon.kod).trim().toUpperCase()
      }
    } catch {}

    return NextResponse.json({
      success: true,
      coupon: activeCouponCode,
      message: activeCouponCode
        ? 'Bülten aboneliğiniz başarıyla tamamlandı. Güncel indirim kuponunuz hazır!'
        : 'Bülten aboneliğiniz başarıyla tamamlandı. Fırsatlar ve kampanyalardan ilk siz haberdar olacaksınız!',
    })
  } catch (err: any) {
    console.error('Bülten kayıt hatası:', err)
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 })
  }
}
