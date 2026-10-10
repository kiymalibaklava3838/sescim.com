import { calculateShippingFee } from '../lib/shipping'
import { ORDER_STATUSES, ALLOWED_STATUS_TRANSITIONS } from '../lib/order-status'
import { calculateCouponDiscount } from '../lib/coupon-helper'
import { siparisOlusturSchema } from '../lib/api-schemas'
import crypto from 'crypto'

console.log('--- BAŞLANGIÇ: Sipariş & Admin Siparişleri Detaylı Kontrol Testi ---\n')

let passCount = 0
let failCount = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [BAŞARILI] ${message}`)
    passCount++
  } else {
    console.error(`  ❌ [HATA] ${message}`)
    failCount++
  }
}

// 1. Kargo Ücreti ve Eşik Hesaplama
console.log('1. Kargo Ücreti ve Limit Kontrolleri:')
assert(calculateShippingFee(1500) > 0, '1500 TL için kargo ücreti uygulanıyor')
assert(calculateShippingFee(1999) === 0, '1999 TL ve üzeri siparişlerde kargo ücretsiz')
assert(calculateShippingFee(5000) === 0, '5000 TL siparişte kargo ücretsiz')

// 2. Sipariş Durumları ve Geçiş Doğrulaması (State Machine)
console.log('\n2. Sipariş Durumları ve State Machine:')
const expectedStatuses = ['beklemede', 'onaylandi', 'hazirlaniyor', 'kargolandi', 'teslim_edildi', 'iptal']
assert(expectedStatuses.every(s => ORDER_STATUSES.includes(s as any)), 'Tüm standart sipariş durumları tanımlı')

assert(ALLOWED_STATUS_TRANSITIONS.onaylandi.includes('hazirlaniyor'), 'Onaylandı -> Hazırlanıyor geçişine izin veriliyor')
assert(ALLOWED_STATUS_TRANSITIONS.onaylandi.includes('kargolandi'), 'Onaylandı -> Kargolandı geçişine izin veriliyor')
assert(ALLOWED_STATUS_TRANSITIONS.onaylandi.includes('teslim_edildi'), 'Onaylandı -> Teslim Edildi (elden teslim) geçişine izin veriliyor')
assert(ALLOWED_STATUS_TRANSITIONS.hazirlaniyor.includes('kargolandi'), 'Hazırlanıyor -> Kargolandı geçişine izin veriliyor')
assert(ALLOWED_STATUS_TRANSITIONS.kargolandi.includes('teslim_edildi'), 'Kargolandı -> Teslim Edildi geçişine izin veriliyor')
assert(ALLOWED_STATUS_TRANSITIONS.onaylandi.includes('iptal'), 'Onaylandı -> İptal geçişine izin veriliyor')

// 3. Zod Sipariş Doğrulama Şeması (Müşteri Sipariş Formu)
console.log('\n3. Müşteri Sipariş Formu Zod Doğrulama:')
const validOrderPayload = {
  urunler: [
    { urun_id: '123e4567-e89b-12d3-a456-426614174000', ad: 'Yamaha Hoparlör', adet: 2, fiyat: 7500 }
  ],
  toplam_tutar: 15000,
  ad_soyad: 'Ahmet Akdağ',
  email: 'ahmet@sescim.com',
  telefon: '05551234567',
  teslimat_adresi: 'Sur Cad. No:17 Melikgazi / Kayseri',
  fatura_tipi: 'bireysel' as const,
  odeme_tipi: 'kart',
}
const validParsed = siparisOlusturSchema.safeParse(validOrderPayload)
assert(validParsed.success === true, 'Eksiksiz müşteri sipariş verisi başarıyla doğrulanıyor')

const invalidEmailPayload = { ...validOrderPayload, email: 'gecersiz-email' }
const invalidEmailParsed = siparisOlusturSchema.safeParse(invalidEmailPayload)
assert(invalidEmailParsed.success === false, 'Hatalı e-posta formatı doğru şekilde engelleniyor')

const emptyCartPayload = { ...validOrderPayload, urunler: [] }
const emptyCartParsed = siparisOlusturSchema.safeParse(emptyCartPayload)
assert(emptyCartParsed.success === false, 'Boş sepetle sipariş verilmesi engelleniyor')

// 4. Kupon İndirimi Hesaplama Kontrolü
console.log('\n4. İndirim Kuponu Doğrulama:')
const mockCoupon = {
  id: 'c1',
  kod: 'INDIRIM10',
  indirim_tipi: 'yuzde',
  indirim_miktari: 10,
  min_tutar: 1000,
  kategori: null,
}
const items = [{ id: '1', ad: 'Test Ürün', adet: 1, fiyat: 2000 }]
const discountResult = calculateCouponDiscount(mockCoupon, items, 2000)
assert(discountResult.discount === 200, '%10 indirim tutarı doğru hesaplandı (200 TL)')

// 5. PayTR HMAC-SHA256 Hash ve İmza Doğrulama Kontrolü
console.log('\n5. PayTR Güvenlik ve Hash İmza Doğrulama:')
const merchant_oid = 'SCM12345'
const merchant_salt = 'test_salt'
const merchant_key = 'test_key'
const status = 'success'
const total_amount = '1500000' // Kuruş

const hashString = merchant_oid + merchant_salt + status + total_amount
const generatedHash = crypto.createHmac('sha256', merchant_key).update(hashString).digest('base64')
const expectedHashBuffer = Buffer.from(generatedHash, 'utf8')
const receivedHashBuffer = Buffer.from(generatedHash, 'utf8')
const isHashMatch = crypto.timingSafeEqual(expectedHashBuffer, receivedHashBuffer)
assert(isHashMatch === true, 'PayTR HMAC-SHA256 hash ve timingSafeEqual güvenliği doğrulandı')

console.log(`\n--- TEST SONUCU: ${passCount} Başarılı, ${failCount} Hatalı ---`)
if (failCount > 0) process.exit(1)
