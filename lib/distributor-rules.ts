/**
 * Distribütör Kuralları & İnternette Satışı / Fiyat Gösterimi Yasak Olan Markalar
 * 
 * Bu markalar için distribütör sözleşmeleri gereği internet ortamında doğrudan
 * fiyat gösterimi ve sepete ekleme yapılamaz. 
 * Müşteri "Fiyat Teklifi İçin Bize Ulaşın" butonuna yönlendirilir.
 * 
 * Ayrıca bu ürünler Google Merchant, Cimri ve Akakçe feed'lerine ASLA gönderilmez.
 */

// Distribütör sözleşmesi gereği internette fiyatı gösterilemeyen markalar
export const RESTRICTED_BRANDS: string[] = [
  'GOLD AUDIO',
  'WÖLLER',
  'ROXTONE',
  'JIASOUND',
  'PROTONE',
]

/**
 * Bir markanın distribütör kısıtlaması kapsamında olup olmadığını kontrol eder.
 */
export function isBrandRestricted(brand?: string | null): boolean {
  if (!brand) return false
  const clean = brand.trim().toUpperCase()
  return RESTRICTED_BRANDS.some((b) => b.toUpperCase() === clean)
}

/**
 * Bir ürünün marka veya ürün bazında "Fiyat Teklifi / Fiyat Sorunuz" kapsamında olup olmadığını döner.
 */
export function isQuoteOnlyProduct(params: {
  marka?: string | null
  fiyat_sorunuz?: boolean | null
}): boolean {
  // 1. Ürün düzeyinde manuel olarak 'Fiyat Sorunuz' aktif edilmişse
  if (params.fiyat_sorunuz === true) {
    return true
  }

  // 2. Marka düzeyinde distribütör yasağı varsa
  if (isBrandRestricted(params.marka)) {
    return true
  }

  return false
}
