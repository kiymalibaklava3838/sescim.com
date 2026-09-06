import { describe, it, expect } from 'vitest'
import { matchesCategory, calculateCouponDiscount, normalizeCategoryText } from './coupon-helper'

describe('coupon-helper', () => {
  describe('normalizeCategoryText', () => {
    it('normalizes Turkish characters and lowercase', () => {
      expect(normalizeCategoryText('IŞIK Sistemleri')).toBe('isik sistemleri')
      expect(normalizeCategoryText('Hoparlörler & Mikser')).toBe('hoparlorler & mixer')
    })
  })

  describe('matchesCategory', () => {
    it('matches everything when target category is null, undefined, or "tum"', () => {
      expect(matchesCategory('tum', { kategori: 'Ses Sistemleri' })).toBe(true)
      expect(matchesCategory('', { kategori: 'Işık Sistemleri' })).toBe(true)
      expect(matchesCategory(null, { kategori: 'Mikrofonlar' })).toBe(true)
    })

    it('matches microphone category correctly without false-matching other audio items', () => {
      const micItem = {
        kategori: 'Ses Sistemleri (Pro Audio)',
        alt_kategori: 'Mikrofonlar',
        ad: 'Shure SM58 Dinamik Vokal Mikrofonu'
      }
      const speakerItem = {
        kategori: 'Ses Sistemleri (Pro Audio)',
        alt_kategori: 'Hoparlörler',
        ad: 'JBL EON 715 Aktif Kabin Hoparlör'
      }

      expect(matchesCategory('Mikrofon Sistemleri', micItem)).toBe(true)
      expect(matchesCategory('Mikrofon Sistemleri', speakerItem)).toBe(false)
    })

    it('matches Mixer & Amfi correctly with mikser variations', () => {
      const mixerItem = {
        kategori: 'Ses Sistemleri',
        alt_kategori: 'Mikserler ve Kontrol',
        ad: 'Yamaha MG10XU Mikser'
      }
      expect(matchesCategory('Mixer & Amfi', mixerItem)).toBe(true)
    })

    it('matches Işık Sistemleri correctly', () => {
      const lightItem = {
        kategori: 'Işık Sistemleri (Pro Lighting)',
        alt_kategori: 'Robot Işıklar',
        ad: 'Beam 230 7R Moving Head'
      }
      expect(matchesCategory('Işık Sistemleri', lightItem)).toBe(true)
    })
  })

  describe('calculateCouponDiscount', () => {
    const items = [
      { id: '1', ad: 'Shure SM58', kategori: 'Ses Sistemleri', alt_kategori: 'Mikrofonlar', adet: 1, fiyat: 4000 },
      { id: '2', ad: 'JBL Hoparlör', kategori: 'Ses Sistemleri', alt_kategori: 'Hoparlörler', adet: 1, fiyat: 10000 }
    ]

    it('applies percentage discount to all items when category is tum', () => {
      const kupon = {
        kod: 'SESCIM10',
        indirim_tipi: 'yuzde',
        indirim_miktari: 10,
        kategori: 'tum'
      }
      const res = calculateCouponDiscount(kupon, items, 14000)
      expect(res.discount).toBe(1400) // %10 of 14,000 TL
      expect(res.hasCategoryRestriction).toBe(false)
    })

    it('applies percentage discount ONLY to matching category items', () => {
      const kupon = {
        kod: 'MIC10',
        indirim_tipi: 'yuzde',
        indirim_miktari: 10,
        kategori: 'Mikrofon Sistemleri'
      }
      const res = calculateCouponDiscount(kupon, items, 14000)
      expect(res.discount).toBe(400) // %10 of 4,000 TL mic only, NOT 14,000 TL
      expect(res.eligibleItemsCount).toBe(1)
      expect(res.eligibleSubtotal).toBe(4000)
      expect(res.error).toBeUndefined()
    })

    it('blocks coupon if cart does not have any items from the restricted category', () => {
      const kupon = {
        kod: 'ISIK15',
        indirim_tipi: 'yuzde',
        indirim_miktari: 15,
        kategori: 'Işık Sistemleri'
      }
      const res = calculateCouponDiscount(kupon, items, 14000)
      expect(res.discount).toBe(0)
      expect(res.error).toBeDefined()
      expect(res.error).toContain('yalnızca "Işık Sistemleri" kategorisindeki ürünlerde geçerlidir')
    })

    it('caps fixed discount to eligible category item total', () => {
      const kupon = {
        kod: 'MIC5000',
        indirim_tipi: 'sabit',
        indirim_miktari: 5000,
        kategori: 'Mikrofon Sistemleri'
      }
      // Mic is only 4000 TL, so max discount is 4000 TL, not 5000 TL
      const res = calculateCouponDiscount(kupon, items, 14000)
      expect(res.discount).toBe(4000)
    })

    it('enforces min_tutar', () => {
      const kupon = {
        kod: 'BIGORDER',
        indirim_tipi: 'yuzde',
        indirim_miktari: 20,
        min_tutar: 20000
      }
      const res = calculateCouponDiscount(kupon, items, 14000)
      expect(res.discount).toBe(0)
      expect(res.error).toContain('en az 20.000 ₺')
    })
  })
})
