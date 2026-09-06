/**
 * Sescim.com Fiyatlandırma ve Ürün Veri Güvenliği Kural Motoru
 * 
 * Fiyat Hiyerarşisi:
 * 1. Özel Sescim Fiyatı (sescim_fiyat) tanımlıysa kesinlikle geçerlidir.
 * 2. Özel Sescim Fiyatı tanımlı değilse Akdağ Elektronik liste satış fiyatı (fiyat) geçerlidir.
 * 3. Bayi fiyatı (bayi_fiyati) son kullanıcı B2C platformunda ASLA kullanılmaz ve istemciye sızdırılmaz.
 */

export interface ProductPricingInput {
  fiyat?: number | null
  sescim_fiyat?: number | null
  sescim_indirimli_fiyat?: number | null
  para_birimi?: string | null
}

/**
 * Ürünün son kullanıcıya uygulanacak net geçerli liste fiyatını döner.
 */
export function getEffectivePrice(product: ProductPricingInput): number {
  if (
    product.sescim_fiyat !== null &&
    product.sescim_fiyat !== undefined &&
    !isNaN(Number(product.sescim_fiyat)) &&
    Number(product.sescim_fiyat) > 0
  ) {
    return Number(product.sescim_fiyat)
  }
  return Number(product.fiyat || 0)
}

/**
 * Ürünün varsa Sescim indirimli satış fiyatını döner.
 */
export function getEffectiveDiscountPrice(product: ProductPricingInput): number | null {
  if (
    product.sescim_indirimli_fiyat !== null &&
    product.sescim_indirimli_fiyat !== undefined &&
    !isNaN(Number(product.sescim_indirimli_fiyat)) &&
    Number(product.sescim_indirimli_fiyat) > 0
  ) {
    return Number(product.sescim_indirimli_fiyat)
  }
  return null
}

/**
 * Son kullanıcıya giden ürün nesnesinden bayi maliyet ve toptan bilgilerini temizler.
 */
export function sanitizeProductForClient<T extends Record<string, any>>(product: T): T {
  if (!product) return product
  const sanitized = { ...product }
  delete sanitized.bayi_fiyati
  delete sanitized.bayi_para_birimi
  return sanitized
}
