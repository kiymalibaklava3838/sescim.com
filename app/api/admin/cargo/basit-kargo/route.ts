import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  createBasitKargoOrder,
  getCarrierQuotes,
  getAccountBalance,
  cancelBarcode,
  BasitKargoError,
} from '@/lib/basit-kargo'
import { updateOrderStatus } from '@/lib/order-status'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

const ALLOWED_SHIP_STATUSES = ['beklemede', 'onaylandi', 'hazirlaniyor']

/**
 * Gelen isteğin yetkili site adminine ait olduğunu doğrular.
 */
async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return false

  const db = supabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return false

  const { data } = await db
    .from('site_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return !!data
}

/**
 * GET: Fiyat teklifleri ve bakiye sorgulama
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await verifyAdmin(req))) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const rawDesi = searchParams.get('desi') || '3'
    const desiNum = parseFloat(rawDesi)
    const desi = Number.isFinite(desiNum) && desiNum > 0 ? desiNum : 3

    const [quotes, balance] = await Promise.all([
      getCarrierQuotes(desi).catch(e => {
        console.warn('[basit-kargo] Fiyat teklif hatası:', e.message)
        return []
      }),
      getAccountBalance().catch(e => {
        console.warn('[basit-kargo] Bakiye sorgu hatası:', e.message)
        return 0
      }),
    ])

    return NextResponse.json({ quotes, balance })
  } catch (err: any) {
    if (err instanceof BasitKargoError) {
      return NextResponse.json({ error: err.userMessage }, { status: 502 })
    }
    console.error('[basit-kargo] GET hatası:', err)
    return NextResponse.json({ error: 'Kargo bilgileri sorgulanamadı' }, { status: 500 })
  }
}

/**
 * POST: Kargo oluşturma veya iptal
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Yetki Doğrulama
    if (!(await verifyAdmin(req))) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Geçersiz JSON gövdesi' }, { status: 400 })
    }

    const { action = 'create', orderId, handlerCode = 'HEPSIJET', desi = 3, barcode } = body

    // 2. Girdi & İşlem Türü Doğrulama
    if (action !== 'create' && action !== 'cancel') {
      return NextResponse.json(
        { error: `Geçersiz işlem: "${action}". Sadece 'create' veya 'cancel' desteklenir.` },
        { status: 400 }
      )
    }

    const db = supabaseAdmin()

    // ──────────────────────────────────────────
    // İŞLEM: CANCEL (Kargo Barkodunu İptal Et)
    // ──────────────────────────────────────────
    if (action === 'cancel') {
      const cleanBarcode = String(barcode || '').trim()
      if (!cleanBarcode) {
        return NextResponse.json({ error: 'İptal için barkod numarası zorunludur' }, { status: 400 })
      }

      // Basit Kargo API iptal çağrısı
      await cancelBarcode(cleanBarcode)

      // Veritabanındaki sipariş kaydını geri al
      let orderQuery = db.from('siparisler').select('id, notlar, durum')
      if (orderId) {
        orderQuery = orderQuery.eq('id', orderId)
      } else {
        orderQuery = orderQuery.eq('kargo_takip_no', cleanBarcode)
      }

      const { data: targetOrder } = await orderQuery.maybeSingle()

      if (targetOrder) {
        const existingNotes = targetOrder.notlar ? `${targetOrder.notlar}\n` : ''
        const updatedNotes = `${existingNotes}[Kargo Barkodu İptal Edildi: ${cleanBarcode} - ${new Date().toLocaleString('tr-TR')}]`

        await db
          .from('siparisler')
          .update({
            kargo_takip_no: null,
            durum: targetOrder.durum === 'kargolandi' ? 'hazirlaniyor' : targetOrder.durum,
            notlar: updatedNotes,
          })
          .eq('id', targetOrder.id)
      }

      return NextResponse.json({
        success: true,
        message: 'Kargo barkodu başarıyla iptal edildi ve bakiye hesabınıza iade edildi.',
      })
    }

    // ──────────────────────────────────────────
    // İŞLEM: CREATE (Yeni Kargo Sevk & Barkod)
    // ──────────────────────────────────────────
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Geçerli bir orderId zorunludur' }, { status: 400 })
    }

    const safeDesi = Number(desi)
    if (!Number.isFinite(safeDesi) || safeDesi <= 0) {
      return NextResponse.json({ error: 'Desi değeri 0\'dan büyük geçerli bir sayı olmalıdır' }, { status: 400 })
    }

    // 3. Siparişi ve durumunu kontrol et
    const { data: siparis, error: orderErr } = await db
      .from('siparisler')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderErr || !siparis) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
    }

    // 4. İdempotency & Çift Tıklama Koruması
    if (siparis.kargo_takip_no) {
      return NextResponse.json(
        {
          error: `Bu siparişe zaten kargo takip numarası (${siparis.kargo_takip_no}) atanmış. Mükerrer kargo açılamaz.`,
          barcode: siparis.kargo_takip_no,
        },
        { status: 409 }
      )
    }

    // 5. Durum Geçiş Kontrolü
    if (!ALLOWED_SHIP_STATUSES.includes(siparis.durum)) {
      return NextResponse.json(
        { error: `"${siparis.durum}" durumundaki bir sipariş kargoya verilemez.` },
        { status: 400 }
      )
    }

    // 6. Sipariş Kalemlerini Oku
    const { data: kalemler } = await db
      .from('siparis_kalemleri')
      .select('urun_adi, adet')
      .eq('siparis_id', orderId)

    const items = (kalemler || []).map((k: any) => ({
      ad: k.urun_adi,
      adet: Number(k.adet || 1),
    }))

    // 7. Basit Kargo API Çağrısı
    const shipmentRes = await createBasitKargoOrder({
      siparisNo: siparis.siparis_no || orderId,
      adSoyad: siparis.ad_soyad,
      telefon: siparis.telefon,
      email: siparis.email,
      adres: siparis.teslimat_adresi,
      toplamTutar: siparis.toplam_tutar,
      handlerCode: String(handlerCode).trim(),
      desi: safeDesi,
      kalemler: items,
    })

    let carrierName = shipmentRes.shipmentInfo?.handler?.name || handlerCode
    if (!carrierName || carrierName === 'ECONOMIC' || carrierName === 'FAST') {
      carrierName = 'HepsiJet'
    }
    const newBarcode = shipmentRes.barcode
    const basitKargoId = shipmentRes.id

    // 8. Merkezi Durum Güncellemesi (State Machine, Atomik Kilit, Stok ve E-posta)
    const updateResult = await updateOrderStatus({
      orderId,
      newStatus: 'kargolandi',
      kargo_takip_no: newBarcode,
      kargo_firmasi: carrierName,
      auditNote: `[Basit Kargo ID: ${basitKargoId} | Barkod: ${newBarcode} | Taşıyıcı: ${carrierName}]`,
      updatedBy: 'admin (basit-kargo-dispatch)',
    })

    // Eğer veritabanı güncellemesi başarısız olduysa:
    // Basit Kargo'daki kargo kodunu iptal ederek kullanıcının bakiyesini geri al (Rollback)
    if (!updateResult.success) {
      console.warn(`[basit-kargo] DB güncellenemedi (${updateResult.error})! Güvenlik için barkod (${newBarcode}) iptal ediliyor...`)
      try {
        await cancelBarcode(newBarcode)
        return NextResponse.json(
          {
            error: `Kargo oluşturuldu ancak veritabanına kaydedilemedi (${updateResult.error}). Bakiye kaybını önlemek amacıyla kargo otomatik iptal edildi. Lütfen tekrar deneyin.`,
          },
          { status: 500 }
        )
      } catch (rollbackErr: any) {
        console.error('[basit-kargo] Rollback iptal çağrısı da başarısız:', rollbackErr)
        return NextResponse.json(
          {
            error: `KRİTİK: Kargo barkodu (${newBarcode}) oluşturuldu fakat veritabanı kaydedilemedi ve otomatik iptal edilemedi. Lütfen Basit Kargo panelinizi kontrol edin.`,
            barcode: newBarcode,
            basitKargoId,
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      barcode: newBarcode,
      basitKargoId,
      handlerName: carrierName,
      shipmentFee: shipmentRes.priceInfo?.shipmentFee,
      totalCost: shipmentRes.priceInfo?.totalCost,
    })
  } catch (err: any) {
    if (err instanceof BasitKargoError) {
      console.error('[basit-kargo] BasitKargoError:', err.status, err.path, err.rawBody)
      return NextResponse.json({ error: err.userMessage }, { status: 502 })
    }

    console.error('[basit-kargo] Beklenmeyen hata:', err)
    return NextResponse.json(
      { error: err.message || 'Kargo siparişi oluşturulurken bir hata oluştu' },
      { status: 500 }
    )
  }
}
