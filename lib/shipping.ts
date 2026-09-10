/**
 * sescim.com — Merkezi Kargo & Lojistik Modülü
 * Tüm kargo hesaplama, takip ve firma tanımları tek merkezden yönetilir.
 */

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

  // Anlaşmalı/Desteklenen Firmalar
  CARRIERS: [
    {
      id: 'hepsijet',
      name: 'HepsiJet',
      trackingUrl: (no: string) => `https://www.hepsijet.com/gonderi-takibi/${no}`,
    },
    {
      id: 'yurtici',
      name: 'Yurtiçi Kargo',
      trackingUrl: (no: string) => `https://yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${no}`,
    },
    {
      id: 'aras',
      name: 'Aras Kargo',
      trackingUrl: (no: string) => `https://www.araskargo.com.tr/kargo-takip?KargoTakipNo=${no}`,
    },
    {
      id: 'mng',
      name: 'MNG Kargo',
      trackingUrl: (no: string) => `https://kargotakip.mngkargo.com.tr/?takipNo=${no}`,
    },
    {
      id: 'surat',
      name: 'Sürat Kargo',
      trackingUrl: (no: string) => `https://www.suratkargo.com.tr/KargoSorgulama/Index?durum=1&barkod=${no}`,
    },
    {
      id: 'ptt',
      name: 'PTT Kargo',
      trackingUrl: (no: string) => `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${no}`,
    },
  ] as const,

  // Gönderici Kurumsal Bilgileri (Kargo Fişi / Etiket İçin)
  SENDER: {
    title: 'Akdağ Elektronik ve Ses Sistemleri San. Tic. Ltd. Şti.',
    brand: 'SESCİM.COM',
    address: 'Cumhuriyet Mah. Sur Cad. No:17/A Melikgazi',
    city: 'KAYSERİ',
    phone: '+90 (352) 231 69 15',
    taxOffice: 'Mimarsinan V.D.',
    taxNo: '023 000 0000',
  }
}

/**
 * Sepet veya sipariş ara toplamına göre kargo ücretini hesaplar.
 * Mağaza teslimat seçeneği bulunmamaktadır, tüm teslimatlar kargo iledir.
 */
export function calculateShippingFee(subtotal: number): number {
  if (subtotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) {
    return 0
  }
  return SHIPPING_CONFIG.STANDARD_SHIPPING_FEE
}

/**
 * Kargo firması ve takip numarasına göre resmi sorgulama bağlantısı döndürür.
 */
export function getCarrierTrackingUrl(carrier?: string, trackingNo?: string): string {
  if (!trackingNo) return '#'
  const c = (carrier || '').toLowerCase()
  
  if (c.includes('hepsijet')) return `https://www.hepsijet.com/gonderi-takibi/${trackingNo}`
  if (c.includes('yurtiçi') || c.includes('yurtici')) return `https://yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${trackingNo}`
  if (c.includes('aras')) return `https://www.araskargo.com.tr/kargo-takip?KargoTakipNo=${trackingNo}`
  if (c.includes('mng')) return `https://kargotakip.mngkargo.com.tr/?takipNo=${trackingNo}`
  if (c.includes('ptt')) return `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${trackingNo}`
  if (c.includes('sürat') || c.includes('surat')) return `https://www.suratkargo.com.tr/KargoSorgulama/Index?durum=1&barkod=${trackingNo}`
  
  return `https://yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${trackingNo}`
}
