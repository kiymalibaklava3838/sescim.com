import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { updateOrderStatus } from '@/lib/order-status'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

/**
 * Webhook güvenliği: Ortam değişkeninde BASIT_KARGO_WEBHOOK_SECRET tanımlıysa
 * gelen x-webhook-secret veya query token'ını zaman saldırılarına (timing attack)
 * karşı güvenli şekilde doğrular.
 */
function verifyWebhookSignature(req: NextRequest): boolean {
  const secret = process.env.BASIT_KARGO_WEBHOOK_SECRET
  if (!secret) {
    // Secret tanımlanmamışsa isteğe izin verilir (opsiyonel yapılandırma)
    return true
  }

  const incomingSecret =
    req.headers.get('x-webhook-secret') ||
    req.headers.get('x-api-key') ||
    req.nextUrl.searchParams.get('secret') ||
    req.headers.get('authorization')?.replace('Bearer ', '').trim()

  if (!incomingSecret) return false

  try {
    const a = Buffer.from(incomingSecret)
    const b = Buffer.from(secret)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Webhook Kimlik Doğrulama
    if (!verifyWebhookSignature(req)) {
      return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 })
    }

    let payload: any
    try {
      payload = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Geçersiz JSON gövdesi' }, { status: 400 })
    }

    // 2. Girdi Doğrulama ve Tip Dönüşümleri (Güvenli string dönüşümü)
    const rawOrderNo = payload.orderNumber !== undefined ? String(payload.orderNumber) : ''
    const cleanOrderNo = rawOrderNo.replace('#', '').trim()
    const cleanBarcode = payload.barcode !== undefined ? String(payload.barcode).trim() : ''
    const statusUpper = String(payload.status || '').trim().toUpperCase()

    if (!cleanBarcode && !cleanOrderNo) {
      return NextResponse.json({ success: false, error: 'Barkod veya sipariş numarası zorunludur' }, { status: 400 })
    }

    // 3. KVKK / Gizlilik Uyumlu Loglama (Sadece operasyonel alanlar, adres/telefon loglanmaz)
    console.log('[basit-kargo-webhook] Event:', {
      orderNo: cleanOrderNo,
      barcode: cleanBarcode,
      status: statusUpper,
    })

    const db = supabaseAdmin()

    // 4. Enjeksiyonsuz, Parametreli Sipariş Sorgusu (Ayrı güvenli .eq() sorguları)
    let siparis: any = null

    if (cleanBarcode) {
      const { data } = await db
        .from('siparisler')
        .select('id, siparis_no, email, ad_soyad, durum, kargo_takip_no, kargo_firmasi, notlar')
        .eq('kargo_takip_no', cleanBarcode)
        .maybeSingle()
      siparis = data
    }

    if (!siparis && cleanOrderNo) {
      const { data } = await db
        .from('siparisler')
        .select('id, siparis_no, email, ad_soyad, durum, kargo_takip_no, kargo_firmasi, notlar')
        .eq('siparis_no', cleanOrderNo)
        .maybeSingle()
      siparis = data
    }

    if (!siparis) {
      console.warn('[basit-kargo-webhook] Eşleşen sipariş bulunamadı:', { cleanBarcode, cleanOrderNo })
      // Webhook sağlayıcısının tekrar tekrar denemesini önlemek için 200 dönülür
      return NextResponse.json({ success: true, warning: 'Sipariş bulunamadı, yok sayıldı' })
    }

    const carrierName = payload.handler?.name || siparis.kargo_firmasi || 'HepsiJet'
    const trackingNo = cleanBarcode || siparis.kargo_takip_no || ''

    // ──────────────────────────────────────────
    // 5. DURUM GEÇİŞLERİ & ATOMİK GÜNCELLEMELER (Yarış & Çift Mail Koruması)
    // ──────────────────────────────────────────

    if (statusUpper === 'DELIVERED') {
      const res = await updateOrderStatus({
        orderId: siparis.id,
        newStatus: 'teslim_edildi',
        kargo_firmasi: carrierName,
        kargo_takip_no: trackingNo,
        updatedBy: 'webhook (Basit Kargo - DELIVERED)',
      })

      if (!res.success && res.statusCode !== 409) {
        console.error('[basit-kargo-webhook] Durum güncelleme hatası (DELIVERED):', res.error)
        return NextResponse.json({ success: false, error: res.error }, { status: res.statusCode || 500 })
      }
    } else if (statusUpper === 'SHIPPED' || statusUpper === 'IN_TRANSIT') {
      const res = await updateOrderStatus({
        orderId: siparis.id,
        newStatus: 'kargolandi',
        kargo_firmasi: carrierName,
        kargo_takip_no: trackingNo,
        updatedBy: `webhook (Basit Kargo - ${statusUpper})`,
      })

      if (!res.success && res.statusCode !== 409) {
        console.error('[basit-kargo-webhook] Durum güncelleme hatası (SHIPPED):', res.error)
        return NextResponse.json({ success: false, error: res.error }, { status: res.statusCode || 500 })
      }
    } else if (statusUpper === 'RETURNED' || statusUpper === 'CANCELLED' || statusUpper === 'UNDELIVERED') {
      // İade veya teslim edilememe durumunda audit kaydı düş
      await updateOrderStatus({
        orderId: siparis.id,
        auditNote: `[Kargo Durum Uyarısı (${statusUpper}): Barkod ${trackingNo}]`,
        updatedBy: 'webhook (Basit Kargo)',
      })
      console.warn(`[basit-kargo-webhook] Dikkat gerektiren kargo durumu: ${statusUpper} (Sipariş: ${siparis.siparis_no})`)
    }

    return NextResponse.json({ success: true, processed: true })
  } catch (err: any) {
    console.error('[basit-kargo-webhook] Beklenmeyen hata:', err)
    return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 })
  }
}
