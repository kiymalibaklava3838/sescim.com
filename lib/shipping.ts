/**
 * sescim.com — Merkezi Kargo & Lojistik Modülü
 * Tüm kargo hesaplama, takip ve firma tanımları tek merkezden yönetilir.
 */

export interface CarrierDefinition {
  id: string
  code: string
  name: string
  icon: string
  aliases: string[]
  track: (encodedNo: string) => string
}

/**
 * Tek Doğruluk Kaynağı: Desteklenen Tüm Kargo Firmaları
 */
export const CARRIER_REGISTRY: Record<string, CarrierDefinition> = {
  HEPSIJET: {
    id: 'hepsijet',
    code: 'HEPSIJET',
    name: 'HepsiJet',
    icon: '⚡',
    aliases: ['hepsijet', 'hepsi jet', 'hepsijet kargo'],
    track: (no) => `https://www.hepsijet.com/gonderi-takibi/${no}`,
  },
  YURTICI: {
    id: 'yurtici',
    code: 'YURTICI',
    name: 'Yurtiçi Kargo',
    icon: '🏢',
    aliases: ['yurtici', 'yurtiçi', 'yurtiçi kargo', 'yurtici kargo', 'yk'],
    track: (no) => `https://yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${no}`,
  },
  ARAS: {
    id: 'aras',
    code: 'ARAS',
    name: 'Aras Kargo',
    icon: '📦',
    aliases: ['aras', 'aras kargo'],
    track: (no) => `https://www.araskargo.com.tr/kargo-takip?KargoTakipNo=${no}`,
  },
  MNG: {
    id: 'mng',
    code: 'MNG',
    name: 'MNG Kargo',
    icon: '🚚',
    aliases: ['mng', 'mng kargo'],
    track: (no) => `https://kargotakip.mngkargo.com.tr/?takipNo=${no}`,
  },
  SURAT: {
    id: 'surat',
    code: 'SURAT',
    name: 'Sürat Kargo',
    icon: '📦',
    aliases: ['surat', 'sürat', 'surat kargo', 'sürat kargo'],
    track: (no) => `https://www.suratkargo.com.tr/KargoSorgulama/Index?durum=1&barkod=${no}`,
  },
  PTT: {
    id: 'ptt',
    code: 'PTT',
    name: 'PTT Kargo',
    icon: '📮',
    aliases: ['ptt', 'ptt kargo'],
    track: (no) => `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${no}`,
  },
  KOLAYGELSIN: {
    id: 'kolaygelsin',
    code: 'KOLAYGELSIN',
    name: 'KolayGelsin',
    icon: '🚚',
    aliases: ['kolaygelsin', 'kolay gelsin', 'kolay gelsin kargo'],
    track: (no) => `https://esube.kolaygelsin.com/shipment-tracking?trackingNumber=${no}`,
  },
} as const

export const SHIPPING_CONFIG = {
  // Ücretsiz Kargo Eşiği (TL)
  FREE_SHIPPING_THRESHOLD: 1999,

  // Standart Kargo Ücreti (TL) - 1.999 ₺ altı siparişler için
  STANDARD_SHIPPING_FEE: 149,

  // İade Anlaşmalı Kargo ve Kod
  RETURN_SHIPPING_CARRIER: 'Yurtiçi Kargo',
  RETURN_AGREEMENT_CODE: '452918231',

  // Varsayılan Gönderi Kargo Firması
  DEFAULT_CARRIER: 'HepsiJet',

  // Anlaşmalı/Desteklenen Firmalar Listesi
  CARRIERS: Object.values(CARRIER_REGISTRY).map(c => ({
    id: c.id,
    name: c.name,
    trackingUrl: c.track,
  })),

  // Gönderici Kurumsal Bilgileri (Kargo Fişi / Etiket İçin)
  SENDER: {
    title: 'Mustafa Akdağ - Akdağ Elektronik',
    brand: 'SESCİM.COM',
    address: 'Cumhuriyet Mah. Sur Cad. No:17/A Melikgazi',
    city: 'KAYSERİ',
    phone: '0850 305 38 70',
    taxOffice: 'Erciyes Vergi Dairesi',
    taxNo: '0200327808',
  },
}

/**
 * Türkçe ve özel karakterleri arındırarak güvenli eşleştirme anahtarı üretir.
 */
function normalizeCarrierString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Sepet veya sipariş ara toplamına göre kargo ücretini hesaplar.
 * Subtotal: İndirim ve kuponlar düşüldükten sonraki sepet ara toplam tutarıdır.
 * Negatif, NaN veya float hassasiyet hatalarına karşı korumalıdır.
 */
export function calculateShippingFee(subtotal: number): number {
  if (typeof subtotal !== 'number' || !Number.isFinite(subtotal) || subtotal < 0) {
    return SHIPPING_CONFIG.STANDARD_SHIPPING_FEE
  }
  const roundedSubtotal = Math.round(subtotal * 100) / 100
  if (roundedSubtotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) {
    return 0
  }
  return SHIPPING_CONFIG.STANDARD_SHIPPING_FEE
}

/**
 * Kargo firması ve takip numarasına göre resmi sorgulama bağlantısı döndürür.
 * trackingNo encodeURIComponent ile güvenli hale getirilir.
 * Eşleşmeyen ya da bilinmeyen firmalarda yanıltıcı yönlendirme yapmamak için null döner.
 */
export function getCarrierTrackingUrl(carrier?: string | null, trackingNo?: string | null): string | null {
  if (!trackingNo) return null
  const cleanNo = trackingNo.trim()
  if (!cleanNo) return null
  const encodedNo = encodeURIComponent(cleanNo)

  if (!carrier) return null

  const norm = normalizeCarrierString(carrier)
  if (!norm) return null

  for (const c of Object.values(CARRIER_REGISTRY)) {
    if (
      normalizeCarrierString(c.id) === norm ||
      normalizeCarrierString(c.code) === norm ||
      normalizeCarrierString(c.name) === norm ||
      c.aliases.some(alias => normalizeCarrierString(alias) === norm)
    ) {
      return c.track(encodedNo)
    }
  }

  // Bilinmeyen firmada başka bir firmanın sayfasına yönlendirmek yerine null dönülür
  return null
}

/**
 * Basit Kargo API Entegrasyon Seçenekleri (Admin Seçim Menüsü)
 * CARRIER_REGISTRY'den türetilmiştir + Meta modlar eklenmiştir.
 */
export const BASIT_KARGO_HANDLERS = [
  { code: CARRIER_REGISTRY.HEPSIJET.code, name: `${CARRIER_REGISTRY.HEPSIJET.name} (Önerilen)`, icon: CARRIER_REGISTRY.HEPSIJET.icon },
  { code: 'ECONOMIC', name: 'En Uygun Taşıyıcı (Otomatik)', icon: '💰' },
  { code: 'FAST', name: 'En Hızlı Taşıyıcı (Otomatik)', icon: '🚀' },
  { code: CARRIER_REGISTRY.SURAT.code, name: CARRIER_REGISTRY.SURAT.name, icon: CARRIER_REGISTRY.SURAT.icon },
  { code: CARRIER_REGISTRY.KOLAYGELSIN.code, name: CARRIER_REGISTRY.KOLAYGELSIN.name, icon: CARRIER_REGISTRY.KOLAYGELSIN.icon },
  { code: CARRIER_REGISTRY.ARAS.code, name: CARRIER_REGISTRY.ARAS.name, icon: CARRIER_REGISTRY.ARAS.icon },
  { code: CARRIER_REGISTRY.PTT.code, name: CARRIER_REGISTRY.PTT.name, icon: CARRIER_REGISTRY.PTT.icon },
  { code: CARRIER_REGISTRY.YURTICI.code, name: CARRIER_REGISTRY.YURTICI.name, icon: CARRIER_REGISTRY.YURTICI.icon },
] as const
