import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'
import { sendEmail } from '@/lib/send-email'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

// Yurtiçi Kargo Sescim İade Anlaşma Kodu
const YURTICI_IADE_KODU = '452918231'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!(await rateLimit(`iade:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Çok fazla istek' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const {
      siparis_id,
      siparis_no,
      user_id,
      talep_tipi = 'iade', // 'iade' | 'degisim'
      sebep,
      aciklama,
      iban,
      urunler = [],
      ad_soyad,
      email,
      telefon,
    } = body

    if (!siparis_id && !siparis_no) {
      return NextResponse.json({ error: 'Sipariş numarası gereklidir' }, { status: 400 })
    }

    if (!sebep) {
      return NextResponse.json({ error: 'Lütfen iade/değişim sebebini belirtin' }, { status: 400 })
    }

    const db = supabaseAdmin()

    // 1. Siparişi doğrula
    let query = db.from('siparisler').select('*')
    if (siparis_id) query = query.eq('id', siparis_id)
    else query = query.eq('siparis_no', siparis_no)

    const { data: order, error: orderErr } = await query.single()
    if (orderErr || !order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
    }

    // 2. Benzersiz İade Takip Kodu oluştur
    const randomSuffix = Math.floor(100000 + Math.random() * 900000)
    const iadeKodu = `SES-IADE-${randomSuffix}`

    const talepRecord = {
      siparis_id: order.id,
      siparis_no: order.siparis_no,
      user_id: user_id || order.user_id,
      talep_tipi,
      iade_kodu: iadeKodu,
      kargo_iade_kodu: YURTICI_IADE_KODU,
      kargo_firmasi: 'Yurtiçi Kargo',
      sebep,
      aciklama: aciklama || '',
      iban: iban || null,
      durum: 'inceleniyor', // 'inceleniyor' | 'onaylandi' | 'reddedildi' | 'tamamlandi'
      urunler,
      ad_soyad: ad_soyad || order.ad_soyad,
      email: email || order.email,
      telefon: telefon || order.telefon,
      created_at: new Date().toISOString(),
    }

    // 3. Veritabanına kaydet (siparis_iadeleri tablosu yoksa destek_talepleri veya metadata'ya fallback)
    let saveSuccess = false
    try {
      const { error: insertErr } = await db.from('siparis_iadeleri').insert([talepRecord])
      if (!insertErr) saveSuccess = true
    } catch {
      // Tablo henüz yoksa alternatif
    }

    if (!saveSuccess) {
      // Destek talebi olarak kaydet
      await db.from('destek_talepleri').insert([{
        user_id: user_id || order.user_id,
        ad_soyad: talepRecord.ad_soyad,
        email: talepRecord.email,
        telefon: talepRecord.telefon,
        konu: `[${talep_tipi.toUpperCase()}] Sipariş #${order.siparis_no} (${iadeKodu})`,
        mesaj: `Talep: ${talep_tipi}\nSebep: ${sebep}\nAçıklama: ${aciklama}\nIBAN: ${iban || 'Yok'}\nİade Kodu: ${iadeKodu}\nKargo Kodu: ${YURTICI_IADE_KODU}\nÜrünler: ${JSON.stringify(urunler)}`,
        durum: 'acik',
        created_at: new Date().toISOString(),
      }])
    }

    // 4. Müşteriye ve admine bilgilendirme e-postası gönder
    try {
      if (talepRecord.email) {
        await sendEmail(
          talepRecord.email,
          `${iadeKodu} Nolu İade / Değişim Talebiniz Alındı | Sescim`,
          `
            <div style="font-family:sans-serif;padding:24px;background:#f8fafc;color:#1e293b">
              <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;padding:32px;border-radius:8px">
                <h2 style="color:#DA291C;margin-top:0">İade &amp; Değişim Talebiniz Alındı</h2>
                <p>Merhaba <strong>${talepRecord.ad_soyad}</strong>,</p>
                <p>#${order.siparis_no} numaralı siparişiniz için oluşturduğunuz talep işleme alınmıştır.</p>
                
                <div style="background:#f1f5f9;border-left:4px solid #DA291C;padding:16px;margin:20px 0">
                  <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:bold">Yurtiçi Kargo İade Anlaşma Kodunuz:</div>
                  <div style="font-size:24px;font-weight:900;color:#0f172a;font-family:monospace;letter-spacing:2px;margin:6px 0">${YURTICI_IADE_KODU}</div>
                  <div style="font-size:12px;color:#475569">Sescim Takip Kodu: <strong>${iadeKodu}</strong></div>
                </div>

                <h3>Kargo Gönderim Talimatı:</h3>
                <ol style="line-height:1.8;color:#334155">
                  <li>Ürünü orijinal kutusu, garanti belgesi ve tüm aksesuarlarıyla birlikte paketleyiniz.</li>
                  <li>Size en yakın <strong>Yurtiçi Kargo</strong> şubesine gidiniz.</li>
                  <li>Görevliye <strong>${YURTICI_IADE_KODU}</strong> nolu Sescim iade kodumuzu iletiniz.</li>
                  <li>Kargo ücreti ödemeden paketinizi teslim ediniz.</li>
                </ol>

                <p style="color:#64748b;font-size:12px;margin-top:24px">Ürün depomuza ulaşıp teknik kontrolü tamamlandıktan sonra ücret iadeniz / değişiminiz 2 iş günü içinde gerçekleştirilecektir.</p>
              </div>
            </div>
          `
        )
      }
    } catch (mailErr) {
      console.error('İade bilgilendirme mail hatası:', mailErr)
    }

    return NextResponse.json({
      success: true,
      iade_kodu: iadeKodu,
      kargo_firmasi: 'Yurtiçi Kargo',
      kargo_kodu: YURTICI_IADE_KODU,
      message: 'İade talebiniz oluşturuldu. Yurtiçi Kargo anlaşma kodunuz ekranınıza yansıtıldı.',
    })
  } catch (error: any) {
    console.error('İade oluşturma API hatası:', error)
    return NextResponse.json({ error: error.message || 'İade talebi oluşturulamadı' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const siparisId = searchParams.get('siparis_id')
    const db = supabaseAdmin()

    let query = db.from('siparis_iadeleri').select('*').order('created_at', { ascending: false })

    if (userId) query = query.eq('user_id', userId)
    if (siparisId) query = query.eq('siparis_id', siparisId)

    const { data, error } = await query

    if (error) {
      // Eğer tablo yoksa destek_talepleri'nden çek
      const { data: destekData } = await db
        .from('destek_talepleri')
        .select('*')
        .ilike('konu', '%[IADE]%')
        .order('created_at', { ascending: false })
      return NextResponse.json(destekData || [])
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, durum, admin_notu } = body

    if (!id || !durum) {
      return NextResponse.json({ error: 'ID ve durum gereklidir' }, { status: 400 })
    }

    const db = supabaseAdmin()
    const { data, error } = await db
      .from('siparis_iadeleri')
      .update({ durum, admin_notu, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
