import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { paytrTokenSchema } from '@/lib/api-schemas'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'
import { getSiteUrl } from '@/lib/site-url'

const PAYTR_MERCHANT_ID = process.env.PAYTR_MERCHANT_ID!
const PAYTR_MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY!
const PAYTR_MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT!

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!(await rateLimit(`paytr:${ip}`, 20, 60_000))) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen bir dakika sonra deneyin.' }, { status: 429 })
    }

    if (!PAYTR_MERCHANT_ID || !PAYTR_MERCHANT_KEY || !PAYTR_MERCHANT_SALT) {
      return NextResponse.json({ error: 'Ödeme yapılandırması eksik' }, { status: 503 })
    }

    const raw = await req.json()
    const parsed = paytrTokenSchema.safeParse(raw)
    if (!parsed.success) {
      console.error('[paytr] Zod validation error:', parsed.error.format())
      const firstIssue = parsed.error.issues[0]
      const field = firstIssue?.path?.join('.') || 'veri'
      const msg = firstIssue?.message || 'Geçersiz veri'
      return NextResponse.json({ 
        error: `Ödeme verisi geçersiz (${field}: ${msg})`, 
        details: parsed.error.flatten() 
      }, { status: 400 })
    }

    const { siparis_no, tutar, ad_soyad, email, telefon, urunler } = parsed.data
    const user_ip = ip

    // Güvenlik: Sipariş tutarını veritabanından çek ve doğrula (İstemci fiyat manipülasyonu engeli)
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: dbSiparis, error: siparisErr } = await supabaseAdmin
      .from('siparisler')
      .select('id, toplam_tutar, email, ad_soyad, telefon, durum, odeme_durumu, teslimat_adresi')
      .eq('siparis_no', siparis_no)
      .single()

    if (siparisErr || !dbSiparis) {
      return NextResponse.json({ error: 'Sipariş kaydı bulunamadı.' }, { status: 404 })
    }

    if (dbSiparis.odeme_durumu === 'odendi') {
      return NextResponse.json({ error: 'Bu siparişin ödemesi zaten alınmıştır.' }, { status: 400 })
    }

    // Gerçek ve onaylı veritabanı tutarı kullanılır
    const gercekTutar = Number(dbSiparis.toplam_tutar)
    const tutarKurus = Math.round(gercekTutar * 100).toString()

    const musteriEmail = dbSiparis.email || email
    const musteriAdSoyad = dbSiparis.ad_soyad || ad_soyad
    const musteriTelefon = dbSiparis.telefon || telefon

    const siteUrl = getSiteUrl()

    // Sipariş kalemlerini veritabanından al veya istek gövdesindeki doğrulanmış ürünleri kullan
    const { data: dbKalemler } = await supabaseAdmin
      .from('siparis_kalemleri')
      .select('urun_adi, adet, birim_fiyat')
      .eq('siparis_id', dbSiparis.id)

    const finalUrunler = (dbKalemler && dbKalemler.length > 0)
      ? dbKalemler.map((k: any) => ({ ad: k.urun_adi, adet: k.adet, fiyat: k.birim_fiyat }))
      : urunler

    const itemsSum = finalUrunler.reduce((sum: number, u: any) => sum + (Number(u.fiyat || 0) * Number(u.adet || 1)), 0)

    let basketArray: [string, string, number][] = []
    if (Math.abs(itemsSum - gercekTutar) < 0.05) {
      basketArray = finalUrunler.map((u: any) => [
        String(u.ad || 'Ürün').slice(0, 100).replace(/[^\w\s\-\.\,\(\)çğıöşüÇĞİÖŞÜ]/gi, ''),
        Number(u.fiyat).toFixed(2),
        Number(u.adet || 1)
      ])
    } else {
      // Kargo ücreti veya kupon indirimi varsa PayTR'ın "sepet tutarı uyuşmuyor" hatası vermemesi için
      const ozet = finalUrunler.map((u: any) => `${u.ad} (x${u.adet})`).join(', ').slice(0, 90)
      basketArray = [
        [`${ozet || 'Sipariş Bedeli'}`, gercekTutar.toFixed(2), 1]
      ]
    }

    const sepetIcerik = JSON.stringify(basketArray)
    const sepetBase64 = Buffer.from(sepetIcerik).toString('base64')

    const test_mode = process.env.PAYTR_TEST_MODE === '1' ? '1' : '0'

    // PayTR kuralı: merchant_oid sadece alfanümerik olmalıdır, özel karakter (örn: tire '-') içeremez
    const merchant_oid = siparis_no.replace(/[^a-zA-Z0-9]/g, '')

    const hashStr = [
      PAYTR_MERCHANT_ID,
      user_ip,
      merchant_oid,
      musteriEmail,
      tutarKurus,
      sepetBase64,
      '0', // no_installment
      '0', // max_installment
      'TL',
      test_mode,
      PAYTR_MERCHANT_SALT,
    ].join('')

    const paytrToken = crypto.createHmac('sha256', PAYTR_MERCHANT_KEY).update(hashStr).digest('base64')

    const params = new URLSearchParams({
      merchant_id: PAYTR_MERCHANT_ID,
      user_ip,
      merchant_oid,
      email: musteriEmail,
      payment_amount: tutarKurus,
      paytr_token: paytrToken,
      user_basket: sepetBase64,
      user_address: dbSiparis.teslimat_adresi || 'Türkiye',
      debug_on: '1',
      no_installment: '0',
      max_installment: '0',
      user_name: musteriAdSoyad,
      user_phone: musteriTelefon || '',
      merchant_ok_url: `${siteUrl}/odeme/basarili`,
      merchant_fail_url: `${siteUrl}/odeme/hata`,
      timeout_limit: '30',
      currency: 'TL',
      test_mode,
      lang: 'tr',
    })

    const paytrRes = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const paytrData = await paytrRes.json()

    if (paytrData.status !== 'success') {
      return NextResponse.json({ error: paytrData.reason || 'PayTR token alınamadı' }, { status: 400 })
    }

    return NextResponse.json({ token: paytrData.token })
  } catch (e) {
    console.error('PayTR hata:', e)
    return NextResponse.json({ error: 'Ödeme sistemi hatası' }, { status: 500 })
  }
}
