import { createClient } from '@supabase/supabase-js'
import {
  siparisOnaylandiHTML,
  siparisHazirlaniyorHTML,
  siparisKargolandiHTML,
  siparisTeslimEdildiHTML,
  siparisIptalHTML,
} from '@/lib/email'
import { sendEmail } from '@/lib/send-email'
import { restoreSescimStock, deductSescimStock } from '@/lib/product-stock'

export const ORDER_STATUSES = [
  'beklemede',
  'onaylandi',
  'hazirlaniyor',
  'kargolandi',
  'teslim_edildi',
  'iptal',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/**
 * İzin Verilen Durum Geçişleri Tablosu (State Machine)
 * Anlamsız veya çelişkili geçişleri engelleyerek tutarlılık sağlar.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  beklemede: ['onaylandi', 'hazirlaniyor', 'iptal'],
  onaylandi: ['hazirlaniyor', 'kargolandi', 'iptal'],
  hazirlaniyor: ['kargolandi', 'iptal'],
  kargolandi: ['teslim_edildi', 'iptal'],
  teslim_edildi: ['iptal'],
  iptal: ['beklemede', 'hazirlaniyor'],
}

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export interface UpdateOrderStatusParams {
  orderId: string
  newStatus?: OrderStatus
  odeme_durumu?: string
  kargo_takip_no?: string | null
  kargo_firmasi?: string | null
  updatedBy?: string // 'admin' | 'webhook' | vb.
  auditNote?: string // Özel log notu
  skipEmail?: boolean
  forceTransition?: boolean
  dbClient?: any
}

export interface UpdateOrderStatusResult {
  success: boolean
  unchanged?: boolean
  oldStatus?: OrderStatus
  newStatus?: OrderStatus
  order?: any
  emailSent?: boolean
  error?: string
  statusCode?: number
}

/**
 * Lazy Email Jeneratörleri
 * Yalnızca hedeflenen durum için çalışır, gereksiz HTML üretimi yapmaz.
 */
const STATUS_EMAIL_GENERATORS: Record<
  OrderStatus,
  | ((params: {
      siparis_no: string
      ad_soyad: string
      kargo_takip_no?: string
      kargo_firmasi?: string
    }) => { subject: string; html: string })
  | null
> = {
  beklemede: null,
  onaylandi: (p) => ({
    subject: `Siparişiniz Onaylandı — #${p.siparis_no} | sescim.com`,
    html: siparisOnaylandiHTML(p),
  }),
  hazirlaniyor: (p) => ({
    subject: `Siparişiniz Hazırlanıyor — #${p.siparis_no} | sescim.com`,
    html: siparisHazirlaniyorHTML(p),
  }),
  kargolandi: (p) => ({
    subject: `Siparişiniz Kargoya Verildi — #${p.siparis_no} | sescim.com`,
    html: siparisKargolandiHTML(p),
  }),
  teslim_edildi: (p) => ({
    subject: `Siparişiniz Teslim Edildi 🎉 — #${p.siparis_no} | sescim.com`,
    html: siparisTeslimEdildiHTML(p),
  }),
  iptal: (p) => ({
    subject: `Siparişiniz İptal Edildi — #${p.siparis_no} | sescim.com`,
    html: siparisIptalHTML(p),
  }),
}

/**
 * Merkezi Sipariş Durum Güncelleme Servisi
 *
 * Sorumluluklar:
 * 1. State machine ve geçiş doğrulaması
 * 2. Yarış durumlarına (race condition) karşı atomik koşullu güncelleme
 * 3. Çift tıklama ve tekrar çağrılarda çift mail / mükerrer stok engeli
 * 4. Sescim stok artırma/düşürme senkronizasyonu
 * 5. Müşteri durum bildirim e-postaları
 * 6. Kalıcı audit trail (denetim kaydı)
 */
export async function updateOrderStatus(
  params: UpdateOrderStatusParams
): Promise<UpdateOrderStatusResult> {
  const db = params.dbClient || supabaseAdmin()
  const { orderId, newStatus } = params

  if (!orderId) {
    return { success: false, statusCode: 400, error: 'Sipariş ID belirtilmedi' }
  }

  // 1. Mevcut sipariş verilerini oku
  const { data: siparis, error: getErr } = await db
    .from('siparisler')
    .select('id, siparis_no, email, ad_soyad, durum, odeme_durumu, kargo_takip_no, kargo_firmasi, notlar')
    .eq('id', orderId)
    .maybeSingle()

  if (getErr || !siparis) {
    return { success: false, statusCode: 404, error: 'Sipariş bulunamadı' }
  }

  const oldStatus = siparis.durum as OrderStatus

  // 2. Durum Doğrulaması (Validation)
  if (newStatus) {
    if (!ORDER_STATUSES.includes(newStatus)) {
      return { success: false, statusCode: 400, error: `Geçersiz sipariş durumu: "${newStatus}"` }
    }
  }

  const isStatusChanging = !!(newStatus && newStatus !== oldStatus)

  // Durum geçiş tablosu kontrolü
  if (isStatusChanging && !params.forceTransition) {
    const allowed = ALLOWED_STATUS_TRANSITIONS[oldStatus] || []
    if (!allowed.includes(newStatus!)) {
      return {
        success: false,
        statusCode: 409,
        error: `"${oldStatus}" durumundan "${newStatus}" durumuna geçiş yapılamaz. İzin verilenler: ${allowed.join(', ') || 'yok'}`,
      }
    }
  }

  // Değişiklik yoksa erken çık (No-op koruması)
  const isPaymentChanging =
    params.odeme_durumu !== undefined && params.odeme_durumu !== siparis.odeme_durumu
  const isTrackingChanging =
    params.kargo_takip_no !== undefined && params.kargo_takip_no !== siparis.kargo_takip_no
  const isCarrierChanging =
    params.kargo_firmasi !== undefined && params.kargo_firmasi !== siparis.kargo_firmasi

  if (!isStatusChanging && !isPaymentChanging && !isTrackingChanging && !isCarrierChanging && !params.auditNote) {
    return {
      success: true,
      unchanged: true,
      oldStatus,
      newStatus: oldStatus,
      order: siparis,
      emailSent: false,
    }
  }

  // 3. Stok Yönetimi
  if (isStatusChanging) {
    const { data: orderKalemler } = await db
      .from('siparis_kalemleri')
      .select('urun_id, adet')
      .eq('siparis_id', orderId)

    const items = orderKalemler || []

    if (oldStatus !== 'iptal' && newStatus === 'iptal') {
      // Sipariş iptal ediliyor -> stokları iade et
      for (const item of items) {
        if (item.urun_id && item.adet) {
          await restoreSescimStock(db, item.urun_id, item.adet)
        }
      }
    } else if (oldStatus === 'iptal' && newStatus !== 'iptal') {
      // İptal edilen sipariş tekrar aktif ediliyor -> stokları düş
      for (const item of items) {
        if (item.urun_id && item.adet) {
          await deductSescimStock(db, { id: item.urun_id }, item.adet)
        }
      }
    }
  }

  // 4. Güncelleme Verisi ve Denetim Kaydı (Audit Log)
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (isStatusChanging) updateData.durum = newStatus
  if (params.odeme_durumu !== undefined) updateData.odeme_durumu = params.odeme_durumu
  if (params.kargo_takip_no !== undefined) updateData.kargo_takip_no = params.kargo_takip_no
  if (params.kargo_firmasi !== undefined) updateData.kargo_firmasi = params.kargo_firmasi

  const dateStr = new Date().toLocaleString('tr-TR')
  const auditParts: string[] = []

  if (isStatusChanging) {
    auditParts.push(`Durum: ${oldStatus} ➔ ${newStatus}`)
  }
  if (isPaymentChanging) {
    auditParts.push(`Ödeme: ${siparis.odeme_durumu || '-'} ➔ ${params.odeme_durumu}`)
  }
  if (isTrackingChanging && params.kargo_takip_no) {
    auditParts.push(`Takip No: ${params.kargo_takip_no}`)
  }
  if (params.auditNote) {
    auditParts.push(params.auditNote)
  }

  if (auditParts.length > 0) {
    const auditLine = `[${dateStr}] ${auditParts.join(' | ')} (${params.updatedBy || 'Sistem'})`
    updateData.notlar = siparis.notlar ? `${siparis.notlar}\n${auditLine}` : auditLine
  }

  // 5. Atomik Güncelleme (Koşullu Where ile Yarış Koruması)
  let query = db.from('siparisler').update(updateData).eq('id', orderId)
  if (isStatusChanging) {
    query = query.eq('durum', oldStatus)
  }

  const { data: updatedRows, error: updErr } = await query.select()

  if (updErr) {
    console.error('[updateOrderStatus] DB güncelleme hatası:', updErr)
    return { success: false, statusCode: 500, error: updErr.message }
  }

  if (isStatusChanging && (!updatedRows || updatedRows.length === 0)) {
    // Eş zamanlı çakışma (başka bir istek durumu zaten değiştirdi)
    return {
      success: false,
      statusCode: 409,
      error: 'Çakışma: Sipariş durumu eş zamanlı başka bir işlem tarafından güncellendi.',
    }
  }

  const updatedOrder = updatedRows?.[0] || { ...siparis, ...updateData }
  const targetStatus = (newStatus || oldStatus) as OrderStatus
  let emailSent = false

  // 6. Durum Bildirim E-postası (Yalnızca durum değiştiyse ve skipEmail=false ise)
  if (isStatusChanging && !params.skipEmail && siparis.email && siparis.email.includes('@')) {
    const generator = STATUS_EMAIL_GENERATORS[newStatus!]
    if (generator) {
      try {
        const emailContent = generator({
          siparis_no: siparis.siparis_no,
          ad_soyad: siparis.ad_soyad,
          kargo_takip_no: params.kargo_takip_no || siparis.kargo_takip_no || undefined,
          kargo_firmasi: params.kargo_firmasi || siparis.kargo_firmasi || undefined,
        })

        await sendEmail(siparis.email, emailContent.subject, emailContent.html)
        emailSent = true
      } catch (mailErr: any) {
        console.warn(`[updateOrderStatus] E-posta gönderilemedi (${newStatus}):`, mailErr.message)
      }
    }
  }

  return {
    success: true,
    oldStatus,
    newStatus: targetStatus,
    order: updatedOrder,
    emailSent,
  }
}
