import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'
import { sendEmail } from '@/lib/send-email'
import { iadeTalebiAlindiHTML, iadeDurumGuncellendiHTML } from '@/lib/email'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@sescim.com'
const ALLOWED_STATUSES = ['inceleniyor', 'onaylandi', 'reddedildi', 'tamamlandi'] as const
type ReturnStatus = (typeof ALLOWED_STATUSES)[number]

export interface NormalizedReturnRequest {
  id: string
  siparis_id: string
  siparis_no: string
  user_id: string | null
  talep_tipi: 'iade' | 'degisim'
  iade_kodu: string
  kargo_iade_kodu: string
  kargo_firmasi: string
  sebep: string
  aciklama: string
  iban: string | null
  durum: ReturnStatus
  admin_notu: string
  urunler: any[]
  ad_soyad: string
  email: string
  telefon: string
  created_at: string
  updated_at?: string
}

async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { user: null, isAdmin: false }
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return { user: null, isAdmin: false }

  const db = supabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return { user: null, isAdmin: false }

  const { data: adminRow } = await db
    .from('site_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return { user, isAdmin: !!adminRow }
}

/**
 * destek_talepleri tablosundaki JSON veya eski düz metin kayıtları standart
 * NormalizedReturnRequest yapısına dönüştürür.
 */
function parseDestekRow(row: any): NormalizedReturnRequest {
  let meta: any = null
  if (typeof row.mesaj === 'string' && row.mesaj.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(row.mesaj)
      if (parsed && typeof parsed === 'object') {
        meta = parsed
      }
    } catch {
      // Düz metin fallback
    }
  }

  if (meta && meta.type === 'sescim_return_v1') {
    const validStatus: ReturnStatus = ALLOWED_STATUSES.includes(meta.durum)
      ? meta.durum
      : 'inceleniyor'
    return {
      id: row.id,
      siparis_id: meta.siparis_id || '',
      siparis_no: meta.siparis_no || '',
      user_id: row.user_id || meta.user_id || null,
      talep_tipi: meta.talep_tipi === 'degisim' ? 'degisim' : 'iade',
      iade_kodu: meta.iade_kodu || `SES-IADE-${String(row.id).slice(0, 6).toUpperCase()}`,
      kargo_iade_kodu: meta.kargo_iade_kodu || '',
      kargo_firmasi: meta.kargo_firmasi || 'Basit Kargo',
      sebep: meta.sebep || 'Belirtilmedi',
      aciklama: meta.aciklama || '',
      iban: meta.iban || null,
      durum: validStatus,
      admin_notu: meta.admin_notu || '',
      urunler: Array.isArray(meta.urunler) ? meta.urunler : [],
      ad_soyad: row.ad_soyad || meta.ad_soyad || '',
      email: row.email || meta.email || '',
      telefon: row.telefon || meta.telefon || '',
      created_at: row.created_at,
      updated_at: meta.updated_at || row.created_at,
    }
  }

  // Eski düz metin kayıtlar için geriye dönük çözümleme
  const konu = String(row.konu || '')
  const mesaj = String(row.mesaj || '')
  const isDegisim = konu.toUpperCase().includes('[DEGISIM]')
  const siparisMatch = konu.match(/#([^\s(]+)/)
  const kodMatch = konu.match(/\((SES-IADE-[^)]+)\)/) || mesaj.match(/İade Kodu:\s*([^\n]+)/)
  const sebepMatch = mesaj.match(/Sebep:\s*([^\n]+)/)
  const aciklamaMatch = mesaj.match(/Açıklama:\s*([^\n]+)/)
  const ibanMatch = mesaj.match(/IBAN:\s*([^\n]+)/)

  const legacyStatusMap: Record<string, ReturnStatus> = {
    acik: 'inceleniyor',
    inceleniyor: 'inceleniyor',
    onaylandi: 'onaylandi',
    reddedildi: 'reddedildi',
    tamamlandi: 'tamamlandi',
    kapali: 'tamamlandi',
  }

  return {
    id: row.id,
    siparis_id: '',
    siparis_no: siparisMatch ? siparisMatch[1].trim() : '',
    user_id: row.user_id || null,
    talep_tipi: isDegisim ? 'degisim' : 'iade',
    iade_kodu: kodMatch ? kodMatch[1].trim() : `SES-IADE-${String(row.id).slice(0, 6).toUpperCase()}`,
    kargo_iade_kodu: '',
    kargo_firmasi: 'Basit Kargo',
    sebep: sebepMatch ? sebepMatch[1].trim() : 'Belirtilmedi',
    aciklama: aciklamaMatch ? aciklamaMatch[1].trim() : mesaj,
    iban: ibanMatch && ibanMatch[1].trim() !== 'Yok' ? ibanMatch[1].trim() : null,
    durum: legacyStatusMap[String(row.durum || 'acik').toLowerCase()] || 'inceleniyor',
    admin_notu: '',
    urunler: [],
    ad_soyad: row.ad_soyad || '',
    email: row.email || '',
    telefon: row.telefon || '',
    created_at: row.created_at,
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!(await rateLimit(`iade:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 })
  }

  try {
    // 1. Zorunlu Oturum Doğrulaması
    const { user, isAdmin } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json(
        { error: 'İade veya değişim talebi oluşturmak için üye girişi yapmanız gerekmektedir.' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const {
      siparis_id,
      siparis_no,
      talep_tipi = 'iade',
      sebep,
      aciklama,
      iban,
      urunler = [],
      ad_soyad,
      email,
      telefon,
    } = body

    if (!siparis_id && !siparis_no) {
      return NextResponse.json({ error: 'Sipariş numarası gereklidir.' }, { status: 400 })
    }

    if (!sebep || typeof sebep !== 'string' || !sebep.trim()) {
      return NextResponse.json({ error: 'Lütfen iade/değişim sebebini belirtin.' }, { status: 400 })
    }

    const cleanTip: 'iade' | 'degisim' = talep_tipi === 'degisim' ? 'degisim' : 'iade'
    const db = supabaseAdmin()

    // 2. Siparişi Doğrula ve Sahiplik (IDOR) Kontrolü Yap
    let query = db.from('siparisler').select('*')
    if (siparis_id) query = query.eq('id', siparis_id)
    else query = query.eq('siparis_no', siparis_no)

    const { data: order, error: orderErr } = await query.single()
    if (orderErr || !order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 })
    }

    const userEmail = (user.email || '').trim().toLowerCase()
    const orderEmail = (order.email || '').trim().toLowerCase()
    const isOwner = order.user_id === user.id || (userEmail && orderEmail && userEmail === orderEmail)

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Bu sipariş için iade/değişim talebi oluşturma yetkiniz bulunmuyor.' },
        { status: 403 }
      )
    }

    if (!['kargolandi', 'teslim_edildi', 'tamamlandi'].includes(order.durum)) {
      return NextResponse.json(
        { error: 'Yalnızca kargolanmış veya teslim edilmiş siparişler için iade/değişim talebi açılabilir.' },
        { status: 400 }
      )
    }

    // 3. Mükerrer Aktif Talep Kontrolü
    const { data: existingRows } = await db
      .from('destek_talepleri')
      .select('*')
      .or('konu.ilike.%[IADE]%,konu.ilike.%[DEGISIM]%')
      .eq('user_id', user.id)

    const existingForOrder = (existingRows || [])
      .map(parseDestekRow)
      .find(
        (r) =>
          (r.siparis_id === order.id || r.siparis_no === order.siparis_no) &&
          r.durum !== 'reddedildi'
      )

    if (existingForOrder) {
      return NextResponse.json(
        {
          error: `Bu sipariş için zaten aktif bir ${existingForOrder.talep_tipi === 'degisim' ? 'değişim' : 'iade'} talebiniz (${existingForOrder.iade_kodu}) bulunmaktadır.`,
          existing: existingForOrder,
        },
        { status: 409 }
      )
    }

    // 4. Benzersiz İade / Değişim Takip Kodu Oluştur
    const randomSuffix = Math.floor(100000 + Math.random() * 900000)
    const iadeKodu = `SES-${cleanTip === 'degisim' ? 'DEG' : 'IADE'}-${randomSuffix}`
    const nowIso = new Date().toISOString()

    const structuredPayload = {
      type: 'sescim_return_v1',
      siparis_id: order.id,
      siparis_no: order.siparis_no,
      user_id: user.id,
      talep_tipi: cleanTip,
      iade_kodu: iadeKodu,
      kargo_iade_kodu: '',
      kargo_firmasi: 'Basit Kargo',
      sebep: sebep.trim(),
      aciklama: (aciklama || '').trim(),
      iban: cleanTip === 'iade' && iban ? String(iban).trim() : null,
      durum: 'inceleniyor' as ReturnStatus,
      admin_notu: '',
      urunler: Array.isArray(urunler) ? urunler : [],
      ad_soyad: (ad_soyad || order.ad_soyad || '').trim(),
      email: (email || order.email || user.email || '').trim(),
      telefon: (telefon || order.telefon || '').trim(),
      updated_at: nowIso,
    }

    const { data: insertedRow, error: insertErr } = await db
      .from('destek_talepleri')
      .insert([
        {
          user_id: user.id,
          ad_soyad: structuredPayload.ad_soyad,
          email: structuredPayload.email,
          telefon: structuredPayload.telefon,
          konu: `[${cleanTip === 'degisim' ? 'DEGISIM' : 'IADE'}] Sipariş #${order.siparis_no} (${iadeKodu})`,
          mesaj: JSON.stringify(structuredPayload),
          durum: 'inceleniyor',
          created_at: nowIso,
        },
      ])
      .select()
      .single()

    if (insertErr || !insertedRow) {
      console.error('[api/iade] Kayıt hatası:', insertErr)
      return NextResponse.json({ error: 'Talep veritabanına kaydedilemedi.' }, { status: 500 })
    }

    const normalized = parseDestekRow(insertedRow)

    // 5. Müşteriye ve Mağaza Adminine Bilgilendirme E-postası Gönder
    const tipLabel = cleanTip === 'degisim' ? 'Değişim' : 'İade'
    try {
      if (structuredPayload.email) {
        await sendEmail(
          structuredPayload.email,
          `${iadeKodu} Nolu ${tipLabel} Talebiniz Alındı | sescim.com`,
          iadeTalebiAlindiHTML({
            siparis_no: order.siparis_no,
            ad_soyad: structuredPayload.ad_soyad,
            iade_kodu: iadeKodu,
            kargo_kodu: null,
            kargo_firmasi: 'Basit Kargo',
            talep_tipi: cleanTip,
          })
        )
      }

      // Admin bildirimi
      await sendEmail(
        ADMIN_EMAIL,
        `[YENİ ${tipLabel.toUpperCase()} TALEBİ] Sipariş #${order.siparis_no} (${iadeKodu})`,
        `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px">
            <h2 style="color:#DA291C;margin-top:0">Yeni ${tipLabel} Talebi Oluşturuldu</h2>
            <p><strong>Talep Kodu:</strong> ${iadeKodu}</p>
            <p><strong>Sipariş No:</strong> #${order.siparis_no}</p>
            <p><strong>Müşteri:</strong> ${structuredPayload.ad_soyad} (${structuredPayload.telefon} / ${structuredPayload.email})</p>
            <p><strong>Sebep:</strong> ${structuredPayload.sebep}</p>
            ${structuredPayload.aciklama ? `<p><strong>Açıklama:</strong> ${structuredPayload.aciklama}</p>` : ''}
            ${structuredPayload.iban ? `<p><strong>IBAN:</strong> ${structuredPayload.iban}</p>` : ''}
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
            <p style="font-size:13px;color:#475569">
              Admin panelindeki <strong>İade &amp; Değişim</strong> sekmesinden talebi onaylayıp Basit Kargo iade gönderim kodunu müşteriye iletebilirsiniz.
            </p>
          </div>
        `
      )
    } catch (mailErr) {
      console.error('[api/iade] E-posta bildirim hatası:', mailErr)
    }

    return NextResponse.json({
      success: true,
      iade_kodu: iadeKodu,
      kargo_firmasi: 'Basit Kargo',
      kargo_kodu: '',
      talep: normalized,
      message: `${tipLabel} talebiniz alındı. Onay sonrası anlaşmalı kargo gönderim kodunuz Hesabım sayfanızda paylaşılacaktır.`,
    })
  } catch (error: any) {
    console.error('[api/iade] POST hatası:', error)
    return NextResponse.json({ error: error.message || 'İade talebi oluşturulamadı' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user, isAdmin } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const siparisId = searchParams.get('siparis_id')
    const db = supabaseAdmin()

    let query = db
      .from('destek_talepleri')
      .select('*')
      .or('konu.ilike.%[IADE]%,konu.ilike.%[DEGISIM]%')
      .order('created_at', { ascending: false })

    // Normal üye SADECE kendi taleplerini görebilir (IDOR koruması)
    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query
    if (error) {
      console.error('[api/iade] GET hatası:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let list = (data || []).map(parseDestekRow)
    if (siparisId) {
      list = list.filter((item) => item.siparis_id === siparisId)
    }

    return NextResponse.json(list)
  } catch (error: any) {
    console.error('[api/iade] GET beklenmeyen hata:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { isAdmin } = await getAuthenticatedUser(req)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { id, durum, admin_notu, kargo_iade_kodu, kargo_firmasi } = body

    if (!id || !durum || !ALLOWED_STATUSES.includes(durum)) {
      return NextResponse.json({ error: 'Geçerli ID ve durum gereklidir.' }, { status: 400 })
    }

    const db = supabaseAdmin()
    const { data: existingRow, error: fetchErr } = await db
      .from('destek_talepleri')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !existingRow) {
      return NextResponse.json({ error: 'İade/değişim talebi bulunamadı.' }, { status: 404 })
    }

    const current = parseDestekRow(existingRow)
    const nowIso = new Date().toISOString()

    const updatedMeta = {
      type: 'sescim_return_v1',
      siparis_id: current.siparis_id,
      siparis_no: current.siparis_no,
      user_id: current.user_id,
      talep_tipi: current.talep_tipi,
      iade_kodu: current.iade_kodu,
      kargo_iade_kodu:
        kargo_iade_kodu !== undefined ? String(kargo_iade_kodu).trim() : current.kargo_iade_kodu,
      kargo_firmasi:
        kargo_firmasi !== undefined && String(kargo_firmasi).trim()
          ? String(kargo_firmasi).trim()
          : current.kargo_firmasi || 'Basit Kargo',
      sebep: current.sebep,
      aciklama: current.aciklama,
      iban: current.iban,
      durum: durum as ReturnStatus,
      admin_notu: admin_notu !== undefined ? String(admin_notu).trim() : current.admin_notu,
      urunler: current.urunler,
      ad_soyad: current.ad_soyad,
      email: current.email,
      telefon: current.telefon,
      updated_at: nowIso,
    }

    const { data: updatedRow, error: updateErr } = await db
      .from('destek_talepleri')
      .update({
        durum,
        mesaj: JSON.stringify(updatedMeta),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateErr || !updatedRow) {
      return NextResponse.json({ error: updateErr?.message || 'Güncelleme başarısız.' }, { status: 400 })
    }

    const normalized = parseDestekRow(updatedRow)

    // Müşteriye durum güncelleme e-postası gönder
    try {
      if (normalized.email) {
        const tipLabel = normalized.talep_tipi === 'degisim' ? 'Değişim' : 'İade'
        await sendEmail(
          normalized.email,
          `${normalized.iade_kodu} Nolu ${tipLabel} Talebiniz Güncellendi | sescim.com`,
          iadeDurumGuncellendiHTML({
            siparis_no: normalized.siparis_no,
            ad_soyad: normalized.ad_soyad,
            iade_kodu: normalized.iade_kodu,
            durum: normalized.durum,
            talep_tipi: normalized.talep_tipi,
            kargo_kodu: normalized.kargo_iade_kodu,
            kargo_firmasi: normalized.kargo_firmasi,
            admin_notu: normalized.admin_notu,
          })
        )
      }
    } catch (mailErr) {
      console.error('[api/iade] Durum güncelleme mail hatası:', mailErr)
    }

    return NextResponse.json({ success: true, data: normalized })
  } catch (error: any) {
    console.error('[api/iade] PATCH hatası:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
