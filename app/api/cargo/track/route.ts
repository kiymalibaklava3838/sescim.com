import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCarrierTrackingUrl } from '@/lib/shipping'
import { updateOrderStatus } from '@/lib/order-status'

export interface CargoMovement {
  tarih: string
  islem: string
  konum: string
  detay?: string
}

export interface CargoTrackingResponse {
  takip_no: string
  tasiyici_takip_no?: string | null
  firma: string
  durum: string
  durum_kodu: 'hazirlaniyor' | 'yolda' | 'dagitimda' | 'teslim_edildi' | 'sorun'
  tahmini_teslimat?: string
  hareketler: CargoMovement[]
  resmi_takip_url: string | null
  canli_api_mi: boolean
  guncel_siparis_durumu?: string
}

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

const BARCODE_REGEX = /^[A-Za-z0-9\-_]{3,60}$/

function mapBasitKargoStatus(
  bkStatusUpper: string,
  lastState: string
): {
  durumKodu: CargoTrackingResponse['durum_kodu']
  durumMetni: string
} | null {
  const normalizedState = lastState.trim()
  const stateUpper = normalizedState.toUpperCase()

  // Ham İngilizce kodların doğrudan kullanıcıya gösterilmesini engelle
  const isRawCode = /^[A-Z0-9_]+$/.test(normalizedState)
  const cleanTurkishState = normalizedState && !isRawCode ? normalizedState : ''

  if (bkStatusUpper === 'DELIVERED' || bkStatusUpper === 'COMPLETED' || stateUpper.includes('TESLİM EDİLDİ')) {
    return {
      durumKodu: 'teslim_edildi',
      durumMetni: cleanTurkishState || 'Teslim Edildi',
    }
  }

  if (
    bkStatusUpper === 'OUT_FOR_DELIVERY' ||
    bkStatusUpper === 'DISTRIBUTION' ||
    stateUpper.includes('DAĞITIM') ||
    stateUpper.includes('DAGITIM')
  ) {
    return {
      durumKodu: 'dagitimda',
      durumMetni: cleanTurkishState || 'Kargonuz Dağıtımda',
    }
  }

  if (
    bkStatusUpper === 'RETURNING' ||
    bkStatusUpper === 'RETURNED' ||
    bkStatusUpper === 'CANCELLED' ||
    bkStatusUpper === 'UNDELIVERED' ||
    bkStatusUpper === 'PROBLEM' ||
    bkStatusUpper === 'LOST'
  ) {
    const labelMap: Record<string, string> = {
      RETURNING: 'Gönderi İade Sürecinde',
      RETURNED: 'Gönderi İade Edildi',
      CANCELLED: 'Kargo Kaydı İptal Edildi',
      UNDELIVERED: 'Teslim Edilemedi',
      PROBLEM: 'Teslimat Sorunu',
      LOST: 'Kargo İncelemede',
    }
    return {
      durumKodu: 'sorun',
      durumMetni: cleanTurkishState || labelMap[bkStatusUpper] || 'Teslimat Sorunu',
    }
  }

  if (
    bkStatusUpper === 'SHIPPED' ||
    bkStatusUpper === 'IN_TRANSIT' ||
    bkStatusUpper === 'TRANSIT' ||
    bkStatusUpper === 'ACCEPTED' ||
    bkStatusUpper === 'TRANSFER'
  ) {
    return {
      durumKodu: 'yolda',
      durumMetni: cleanTurkishState || 'Kargonuz Taşımada / Yolda',
    }
  }

  if (
    bkStatusUpper === 'NEW' ||
    bkStatusUpper === 'CREATED' ||
    bkStatusUpper === 'READY_TO_SHIP' ||
    bkStatusUpper === 'PREPARING' ||
    bkStatusUpper === 'WAITING'
  ) {
    return {
      durumKodu: 'hazirlaniyor',
      durumMetni: cleanTurkishState || 'Kargo Hazırlandı, Şubeye Teslim Bekleniyor',
    }
  }

  if (cleanTurkishState) {
    return {
      durumKodu: 'yolda',
      durumMetni: cleanTurkishState,
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Geçersiz istek gövdesi.' }, { status: 400 })
    }

    const { firma, takipNo } = body

    if (!takipNo || typeof takipNo !== 'string') {
      return NextResponse.json({ success: false, error: 'Geçerli bir kargo takip numarası gereklidir.' }, { status: 400 })
    }

    const cleanNo = takipNo.trim()
    const cleanFirma = typeof firma === 'string' && firma.trim() ? firma.trim() : 'HepsiJet'

    if (!BARCODE_REGEX.test(cleanNo)) {
      return NextResponse.json({ success: false, error: 'Geçersiz takip numarası formatı.' }, { status: 400 })
    }

    const db = supabaseAdmin()

    // 1. Veritabanından İlgili Siparişi Doğrula (IDOR & Veri Tutarlılığı)
    const { data: siparis } = await db
      .from('siparisler')
      .select('id, user_id, siparis_no, durum, kargo_firmasi, kargo_takip_no, created_at, updated_at')
      .or(`kargo_takip_no.eq.${cleanNo},siparis_no.eq.${cleanNo}`)
      .maybeSingle()

    // İsteğe bağlı kullanıcı oturum doğrulaması
    const authHeader = request.headers.get('Authorization')
    if (authHeader && siparis && siparis.user_id) {
      const token = authHeader.replace('Bearer ', '').trim()
      if (token) {
        const { data: { user } } = await db.auth.getUser(token)
        if (user && user.id !== siparis.user_id) {
          const { data: admin } = await db.from('site_admins').select('user_id').eq('user_id', user.id).maybeSingle()
          if (!admin) {
            return NextResponse.json({ success: false, error: 'Bu kargo gönderisine erişim yetkiniz yok.' }, { status: 403 })
          }
        }
      }
    }

    let liveStatus = ''
    let bkStatusUpper = ''
    let isDelivered = false
    let isOutForDelivery = false
    let isShipped = false
    let isLiveApi = false
    let carrierName = siparis?.kargo_firmasi || cleanFirma
    let handlerShipmentCode: string | null = null
    let handlerTrackingLink: string | null = null
    let shippedTime: string | null = null
    let deliveredTime: string | null = null
    let apiTraces: CargoMovement[] = []

    // 2. Canlı Basit Kargo API Sorgusu
    if (process.env.BASIT_KARGO_API_KEY) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const bkRes = await fetch(`https://basitkargo.com/api/v2/order/barcode/${encodeURIComponent(cleanNo)}`, {
          headers: {
            Authorization: `Bearer ${process.env.BASIT_KARGO_API_KEY}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
          cache: 'no-store',
        })
        clearTimeout(timeoutId)

        if (bkRes.ok) {
          const bkData = await bkRes.json()
          bkStatusUpper = String(bkData.status || '').trim().toUpperCase()
          liveStatus = String(bkData.shipmentInfo?.lastState || '').trim()
          carrierName = bkData.shipmentInfo?.handler?.name || carrierName
          handlerShipmentCode = bkData.shipmentInfo?.handlerShipmentCode
            ? String(bkData.shipmentInfo.handlerShipmentCode).trim()
            : null
          handlerTrackingLink =
            bkData.shipmentInfo?.handlerShipmentTrackingLink ||
            bkData.shipmentInfo?.trackingLink ||
            null
          shippedTime = bkData.shipmentInfo?.shippedTime || null
          deliveredTime = bkData.shipmentInfo?.deliveredTime || null

          isDelivered = bkStatusUpper === 'DELIVERED' || bkStatusUpper === 'COMPLETED'
          isOutForDelivery = bkStatusUpper === 'OUT_FOR_DELIVERY' || bkStatusUpper === 'DISTRIBUTION'
          isShipped =
            isDelivered ||
            isOutForDelivery ||
            bkStatusUpper === 'SHIPPED' ||
            bkStatusUpper === 'IN_TRANSIT' ||
            bkStatusUpper === 'TRANSIT' ||
            bkStatusUpper === 'ACCEPTED'

          // Basit Kargo API'si hareket dizisi (traces / movements) dönerse doğrudan kullan
          const rawTraces = bkData.shipmentInfo?.traces || bkData.traces || bkData.movements
          if (Array.isArray(rawTraces) && rawTraces.length > 0) {
            apiTraces = rawTraces
              .map((t: any) => ({
                tarih: t.time || t.date || t.tarih || new Date().toISOString(),
                islem: t.status || t.description || t.islem || t.state || 'Kargo Hareketi',
                konum: t.location || t.branch || t.konum || carrierName,
                detay: t.detail || t.detay || undefined,
              }))
              .filter((t: CargoMovement) => Boolean(t.islem))
          }

          isLiveApi = true
        }
      } catch (bkErr: any) {
        console.warn('[cargo/track] Basit Kargo API canlı sorgu başarısız:', bkErr.message)
      }
    }

    // 3. Webhook Kaçırıldıysa Veritabanını Otomatik Senkronize Et (Self-Healing)
    let guncelSiparisDurumu = siparis?.durum
    if (isLiveApi && siparis && siparis.durum !== 'iptal') {
      if (isDelivered && siparis.durum !== 'teslim_edildi' && siparis.durum !== 'tamamlandi') {
        const syncRes = await updateOrderStatus({
          orderId: siparis.id,
          newStatus: 'teslim_edildi',
          kargo_firmasi: carrierName,
          kargo_takip_no: cleanNo,
          updatedBy: 'cargo-track-sync (Basit Kargo - DELIVERED)',
        })
        if (syncRes.success) {
          guncelSiparisDurumu = 'teslim_edildi'
        }
      } else if (
        isShipped &&
        (siparis.durum === 'beklemede' || siparis.durum === 'onaylandi' || siparis.durum === 'hazirlaniyor')
      ) {
        const syncRes = await updateOrderStatus({
          orderId: siparis.id,
          newStatus: 'kargolandi',
          kargo_firmasi: carrierName,
          kargo_takip_no: cleanNo,
          updatedBy: `cargo-track-sync (Basit Kargo - ${bkStatusUpper})`,
        })
        if (syncRes.success) {
          guncelSiparisDurumu = 'kargolandi'
        }
      }
    }

    // 4. Resmi Taşıyıcı Takip Linki (Öncelik: Basit Kargo linki -> Taşıyıcı Kodu -> Barkod)
    const trackingUrl =
      handlerTrackingLink || getCarrierTrackingUrl(carrierName, handlerShipmentCode || cleanNo)

    // 5. Gerçek Hareket Listesi İnşası
    let gercekHareketler: CargoMovement[] = []
    const siparisTarih = siparis?.created_at || new Date().toISOString()
    const siparisDurum = guncelSiparisDurumu || (isDelivered ? 'teslim_edildi' : 'kargolandi')

    if (apiTraces.length > 0) {
      gercekHareketler = apiTraces
    } else {
      // 1. Olay: Sipariş Oluşturuldu & Kargo Kaydı Açıldı
      gercekHareketler.push({
        tarih: siparisTarih,
        islem: 'Sipariş Alındı & Kargo Kaydı Oluşturuldu',
        konum: 'Sescim.com',
        detay: `${carrierName} ile sevk edilmek üzere hazırlandı.`,
      })

      // 2. Olay: Kargoya Verildi / Taşımada
      if (siparisDurum === 'kargolandi' || isShipped || isDelivered) {
        const mappedLive = mapBasitKargoStatus(bkStatusUpper, liveStatus)
        gercekHareketler.push({
          tarih: shippedTime || siparis?.updated_at || siparisTarih,
          islem:
            !isDelivered && mappedLive?.durumMetni
              ? mappedLive.durumMetni
              : 'Kargo Taşıyıcı Firmaya Teslim Edildi',
          konum: carrierName,
          detay: handlerShipmentCode
            ? `Taşıyıcı Takip No: ${handlerShipmentCode} (Barkod: ${cleanNo})`
            : `Kargo barkod numarası: ${cleanNo}`,
        })
      }

      // 3. Olay: Dağıtımda
      if (isOutForDelivery && !isDelivered) {
        gercekHareketler.push({
          tarih: siparis?.updated_at || new Date().toISOString(),
          islem: 'Kargonuz Dağıtıma Çıkarıldı',
          konum: `${carrierName} Dağıtım Şubesi`,
          detay: 'Kurye teslimat adresinize doğru yola çıktı.',
        })
      }

      // 4. Olay: Teslim Edildi
      if (isDelivered || siparisDurum === 'teslim_edildi' || siparisDurum === 'tamamlandi') {
        gercekHareketler.push({
          tarih: deliveredTime || siparis?.updated_at || new Date().toISOString(),
          islem: 'Kargo Alıcıya Teslim Edildi',
          konum: 'Teslimat Adresi',
          detay: 'Teslimat başarıyla tamamlandı.',
        })
      }
    }

    // 6. Durum Kodu ve Türkçe Durum Metni Belirleme
    let durumKodu: CargoTrackingResponse['durum_kodu'] = 'yolda'
    let durumMetni = 'Kargonuz Taşımada'

    if (siparisDurum === 'iptal') {
      durumKodu = 'sorun'
      durumMetni = 'Sipariş İptal Edildi'
    } else if (isLiveApi) {
      const mapped = mapBasitKargoStatus(bkStatusUpper, liveStatus)
      if (mapped) {
        durumKodu = mapped.durumKodu
        durumMetni = mapped.durumMetni
      }
    } else if (siparisDurum === 'teslim_edildi' || siparisDurum === 'tamamlandi') {
      durumKodu = 'teslim_edildi'
      durumMetni = 'Teslim Edildi'
    } else if (siparisDurum === 'hazirlaniyor' || siparisDurum === 'onaylandi' || siparisDurum === 'beklemede') {
      durumKodu = 'hazirlaniyor'
      durumMetni = 'Kargo Hazırlanıyor'
    }

    const responsePayload: CargoTrackingResponse = {
      takip_no: cleanNo,
      tasiyici_takip_no: handlerShipmentCode,
      firma: carrierName,
      durum: durumMetni,
      durum_kodu: durumKodu,
      tahmini_teslimat:
        durumKodu === 'teslim_edildi'
          ? 'Teslim Edildi'
          : durumKodu === 'dagitimda'
          ? 'Bugün Teslim Edilecek'
          : '1-3 İş Günü',
      hareketler: gercekHareketler,
      resmi_takip_url: trackingUrl,
      canli_api_mi: isLiveApi,
      guncel_siparis_durumu: guncelSiparisDurumu,
    }

    return NextResponse.json({
      success: true,
      data: responsePayload,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sunucu hatası'
    console.error('[cargo/track] Kargo sorgulama hatası:', message)
    return NextResponse.json(
      { success: false, error: 'Kargo bilgileri sorgulanırken sunucu hatası oluştu.' },
      { status: 500 }
    )
  }
}
