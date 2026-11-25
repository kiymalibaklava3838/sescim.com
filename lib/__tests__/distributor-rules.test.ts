import { describe, it, expect } from 'vitest'
import { isQuoteOnlyProduct, isBrandRestricted, RESTRICTED_BRANDS } from '../distributor-rules'

describe('distributor-rules', () => {
  it('correctly identifies restricted brands regardless of case or whitespace', () => {
    expect(isBrandRestricted('GOLD AUDIO')).toBe(true)
    expect(isBrandRestricted('gold audio')).toBe(true)
    expect(isBrandRestricted(' Wöller ')).toBe(true)
    expect(isBrandRestricted('roxtone')).toBe(true)
    expect(isBrandRestricted('JIASOUND')).toBe(true)
    expect(isBrandRestricted('protone')).toBe(true)
    expect(isBrandRestricted('Yamaha')).toBe(false)
    expect(isBrandRestricted('Sennheiser')).toBe(false)
    expect(isBrandRestricted(null)).toBe(false)
    expect(isBrandRestricted(undefined)).toBe(false)
  })

  it('flags products with fiyat_sorunuz: true as quote-only', () => {
    expect(isQuoteOnlyProduct({ fiyat_sorunuz: true })).toBe(true)
    expect(isQuoteOnlyProduct({ marka: 'Yamaha', fiyat_sorunuz: true })).toBe(true)
    expect(isQuoteOnlyProduct({ marka: 'Yamaha', fiyat_sorunuz: false })).toBe(false)
  })

  it('flags restricted brands in marka field as quote-only unless explicitly unlocked via fiyat_acik', () => {
    expect(isQuoteOnlyProduct({ marka: 'Gold Audio', fiyat_sorunuz: false })).toBe(true)
    expect(isQuoteOnlyProduct({ marka: 'ROXTONE' })).toBe(true)
    expect(isQuoteOnlyProduct({ marka: 'WÖLLER' })).toBe(true)
    // Admin açıkça fiyatı açtıysa (fiyat_acik: true) kısıtlı marka olsa da satışa açılır
    expect(isQuoteOnlyProduct({ marka: 'Gold Audio', fiyat_sorunuz: false, fiyat_acik: true })).toBe(false)
    expect(isQuoteOnlyProduct({ ad: 'ROXTONE XLR Kablo', fiyat_sorunuz: false, fiyat_acik: true })).toBe(false)
    // Ancak fiyat_sorunuz: true hâlâ önceliklidir
    expect(isQuoteOnlyProduct({ marka: 'Gold Audio', fiyat_sorunuz: true, fiyat_acik: true })).toBe(true)
  })

  it('flags products where the restricted brand is present in the product title even if marka is empty', () => {
    expect(isQuoteOnlyProduct({
      marka: null,
      ad: 'GOLD AUDIO E-15A 15 inç Aktif Hoparlör'
    })).toBe(true)

    expect(isQuoteOnlyProduct({
      marka: '',
      ad: 'Wöller W-800 Power Mikser'
    })).toBe(true)

    expect(isQuoteOnlyProduct({
      marka: undefined,
      ad: 'Roxtone XLR Erkek - Dişi Mikrofon Kablosu 5M'
    })).toBe(true)

    expect(isQuoteOnlyProduct({
      marka: 'Yamaha',
      ad: 'Yamaha MG10XU Mikser'
    })).toBe(false)
  })
})
