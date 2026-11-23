import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { updateOrderStatus } from '@/lib/order-status'
import { sendEmail } from '@/lib/send-email'
import { iadeDurumGuncellendiHTML } from '@/lib/email'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

async function verifyAdmin(req: NextRequest): Promise<{ isAdmin: boolean; email?: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { isAdmin: false }
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return { isAdmin: false }

  const db = supabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return { isAdmin: false }

  const { data: adminRow } = await db
    .from('site_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return { isAdmin: !!adminRow, email: user.email || undefined }
}

/**
 * Resmi PayTR Para İadesi API Entegrasyonu
 * POST https://www.paytr.com/odeme/iade
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Sadece Yetkili Admin Erişebilir
    const { isAdmin, email: adminEmail } = await verifyAdmin(req)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 })
    }

    const PAYTR_MERCHANT_ID = process.env.PAYTR_MERCHANT_ID
    const PAYTR_MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY
    const PAYTR_MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT

    if (!PAYTR_MERCHANT_ID || !PAYTR_MERCHANT_KEY || !PAYTR_MERCHANT_SALT) {
      return NextResponse.json(
        { error: 'PayTR mağaza anahtarları sunucuda tanımlı değil.' },
        { status: 503 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const {
      siparis_id,
      siparis_no,
      return_amount,
      iade_talep_id,
      cancel_order = true,
      admin_notu = '',
    } = body

    if (!siparis_id && !siparis_no) {
      return NextResponse.json({ error: 'Sipariş ID veya Sipariş No gereklidir.' }, { status: 400 })
    }

    const db = supabaseAdmin()

    // 2. Siparişi Veritabanından Çek ve Doğrula
    let orderQuery = db.from('siparisler').select('*')
    if (siparis_id) orderQuery = orderQuery.eq('id', siparis_id)
    else orderQuery = orderQuery.eq('siparis_no', siparis_no)

    const { data: order, error: orderErr } = await orderQuery.single()
    if (orderErr || !order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 })
    }

    if (order.odeme_tipi !== 'kart') {
      return NextResponse.json(
        { error: 'Bu sipariş Havale/EFT ile ödenmiştir. PayTR kart iadesi yalnızca kredi kartı siparişlerinde yapılabilir.' },
        { status: 400 }
      )
    }

    if (order.odeme_durumu === 'iade_edildi') {
      return NextResponse.json(
        { error: 'Bu sipariş için PayTR para iadesi zaten tamamlanmıştır.' },
        { status: 409 }
      )
    }

    if (order.odeme_durumu !== 'odendi' && order.odeme_durumu !== 'kismi_iade') {
      return NextResponse.json(
        { error: `Siparişin ödeme durumu "${order.odeme_durumu}". Yalnızca tahsil edilmiş (ödenmiş) kart siparişleri iade edilebilir.` },
        { status: 400 }
      )
    }

    const maxAmount = Number(order.toplam_tutar || 0)
    const requestedAmount =
      return_amount !== undefined && return_amount !== null && return_amount !== ''
        ? Number(return_amount)
        : maxAmount

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || requestedAmount > maxAmount + 0.01) {
      return NextResponse.json(
        { error: `Geçersiz iade tutarı. En fazla ${maxAmount.toFixed(2)} TL iade edebilirsiniz.` },
        { status: 400 }
      )
    }

    const isPartial = requestedAmount < maxAmount - 0.01
    const returnAmountStr = requestedAmount.toFixed(2)
    const merchant_oid = String(order.siparis_no).replace(/[^a-zA-Z0-9]/g, '')
    const reference_no = `IADE${Date.now()}`.slice(0, 32)

    // 3. PayTR İade Token Hesaplama (HMAC-SHA256)
    const hashStr = `${PAYTR_MERCHANT_ID}${merchant_oid}${returnAmountStr}${PAYTR_MERCHANT_SALT}`
    const paytr_token = crypto
      .createHmac('sha256', PAYTR_MERCHANT_KEY)
      .update(hashStr)
      .digest('base64')

    const formData = new URLSearchParams()
    formData.append('merchant_id', PAYTR_MERCHANT_ID)
    formData.append('merchant_oid', merchant_oid)
    formData.append('return_amount', returnAmountStr)
    formData.append('paytr_token', paytr_token)
    formData.append('reference_no', reference_no)

    // 4. PayTR İade API Çağrısı
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    let paytrRes: Response
    try {
      paytrRes = await fetch('https://www.paytr.com/odeme/iade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const paytrJson = await paytrRes.json().catch(() => null)

    if (!paytrRes.ok || !paytrJson || paytrJson.status !== 'success') {
      const errMsg =
        paytrJson?.err_msg ||
        paytrJson?.reason ||
        `PayTR iade isteği reddedildi (HTTP ${paytrRes.status}).`
      console.error('[paytr-iade] PayTR hata:', {
        siparis_no: order.siparis_no,
        merchant_oid,
        returnAmountStr,
        paytrJson,
      })
      return NextResponse.json(
        { error: `PayTR İade Hatası: ${errMsg}`, paytr: paytrJson },
        { status: 502 }
      )
    }

    // 5. Veritabanını Güncelle (Ödeme Durumu + Audit Notu)
    const newPaymentStatus = isPartial ? 'kismi_iade' : 'iade_edildi'
    const refundAuditLine = `[PayTR Para İadesi: ${returnAmountStr} TL | Ref: ${reference_no} | İşlem: ${adminEmail || 'admin'} | ${new Date().toLocaleString('tr-TR')}]`
    const nextNotes = order.notlar ? `${order.notlar}\n${refundAuditLine}` : refundAuditLine

    await db
      .from('siparisler')
      .update({
        odeme_durumu: newPaymentStatus,
        notlar: nextNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    // 6. Tam İade İse Siparişi İptal Edip Stok & Kupon Hakkını Otomatik İade Et
    if (!isPartial && cancel_order && order.durum !== 'iptal') {
      await updateOrderStatus({
        orderId: order.id,
        newStatus: 'iptal',
        auditNote: `PayTR üzerinden ${returnAmountStr} TL tam para iadesi tamamlandı.`,
        updatedBy: `admin-paytr-refund (${adminEmail || 'admin'})`,
      })
    }

    // 7. İlgili İade/İptal Talebi Varsa "Tamamlandı" Olarak İşaretle
    if (iade_talep_id) {
      try {
        const { data: talepRow } = await db
          .from('destek_talepleri')
          .select('*')
          .eq('id', iade_talep_id)
          .single()

        if (talepRow && typeof talepRow.mesaj === 'string' && talepRow.mesaj.trim().startsWith('{')) {
          const parsed = JSON.parse(talepRow.mesaj)
          parsed.durum = 'tamamlandi'
          parsed.admin_notu = admin_notu
            ? `${admin_notu} (${returnAmountStr} TL PayTR kart iadesi yapıldı - Ref: ${reference_no})`
            : `${returnAmountStr} TL tutarındaki ödeme PayTR üzerinden kredi kartınıza iade edilmiştir (Ref: ${reference_no}). Bankanıza bağlı olarak 1-7 iş günü içinde ekstrenize yansır.`
          parsed.paytr_iade_ref = reference_no
          parsed.iade_edilen_tutar = requestedAmount
          parsed.updated_at = new Date().toISOString()

          await db
            .from('destek_talepleri')
            .update({
              durum: 'tamamlandi',
              mesaj: JSON.stringify(parsed),
            })
            .eq('id', iade_talep_id)
        }
      } catch (talepErr) {
        console.warn('[paytr-iade] Talep güncelleme uyarısı:', talepErr)
      }
    }

    // 8. Müşteriye Para İadesi Onay E-postası Gönder
    try {
      if (order.email) {
        await sendEmail(
          order.email,
          `#${order.siparis_no} Siparişiniz İçin ${returnAmountStr} TL Para İadesi Yapıldı | sescim.com`,
          iadeDurumGuncellendiHTML({
            siparis_no: order.siparis_no,
            ad_soyad: order.ad_soyad || 'Müşterimiz',
            iade_kodu: reference_no,
            durum: 'tamamlandi',
            talep_tipi: 'iade',
            admin_notu: `${returnAmountStr} TL tutarındaki ödemeniz PayTR güvencesiyle ödeme yaptığınız kredi kartına iade edilmiştir (Referans No: ${reference_no}). Bankanızın işlem süresine bağlı olarak 1–7 iş günü içerisinde kart ekstrenize yansıyacaktır.${admin_notu ? ` Not: ${admin_notu}` : ''}`,
          })
        )
      }
    } catch (mailErr) {
      console.error('[paytr-iade] Müşteri mail hatası:', mailErr)
    }

    return NextResponse.json({
      success: true,
      reference_no,
      return_amount: returnAmountStr,
      odeme_durumu: newPaymentStatus,
      message: `${returnAmountStr} TL tutarındaki PayTR kart iadesi başarıyla gerçekleştirildi.`,
    })
  } catch (err: any) {
    console.error('[paytr-iade] Beklenmeyen hata:', err)
    return NextResponse.json(
      { error: err.message || 'PayTR iade işlemi sırasında hata oluştu.' },
      { status: 500 }
    )
  }
}
