import { describe, it, expect } from 'vitest'
import {
  calculateShippingFee,
  getCarrierTrackingUrl,
  CARRIER_REGISTRY,
  SHIPPING_CONFIG,
  BASIT_KARGO_HANDLERS,
} from '@/lib/shipping'
import {
  ALLOWED_STATUS_TRANSITIONS,
  ORDER_STATUSES,
} from '@/lib/order-status'

describe('Shipping Module (lib/shipping.ts)', () => {
  describe('calculateShippingFee', () => {
    it('returns standard shipping fee for orders below 1999 TL', () => {
      expect(calculateShippingFee(0)).toBe(SHIPPING_CONFIG.STANDARD_SHIPPING_FEE)
      expect(calculateShippingFee(500)).toBe(SHIPPING_CONFIG.STANDARD_SHIPPING_FEE)
      expect(calculateShippingFee(1998.99)).toBe(SHIPPING_CONFIG.STANDARD_SHIPPING_FEE)
    })

    it('returns 0 TL (free shipping) for orders at or above 1999 TL', () => {
      expect(calculateShippingFee(1999)).toBe(0)
      expect(calculateShippingFee(2500)).toBe(0)
      expect(calculateShippingFee(10000)).toBe(0)
    })

    it('handles negative, NaN, and invalid numeric inputs safely', () => {
      expect(calculateShippingFee(-50)).toBe(SHIPPING_CONFIG.STANDARD_SHIPPING_FEE)
      expect(calculateShippingFee(NaN)).toBe(SHIPPING_CONFIG.STANDARD_SHIPPING_FEE)
      expect(calculateShippingFee(Infinity)).toBe(SHIPPING_CONFIG.STANDARD_SHIPPING_FEE)
    })
  })

  describe('getCarrierTrackingUrl', () => {
    it('returns null for empty or whitespace-only tracking numbers', () => {
      expect(getCarrierTrackingUrl('HepsiJet', '')).toBeNull()
      expect(getCarrierTrackingUrl('HepsiJet', '   ')).toBeNull()
      expect(getCarrierTrackingUrl('HepsiJet', null as any)).toBeNull()
      expect(getCarrierTrackingUrl('HepsiJet', undefined as any)).toBeNull()
    })

    it('returns null for unknown carriers instead of sending to wrong destination', () => {
      expect(getCarrierTrackingUrl('Bilinmeyen Kargo', '12345678')).toBeNull()
      expect(getCarrierTrackingUrl('', '12345678')).toBeNull()
      expect(getCarrierTrackingUrl(undefined, '12345678')).toBeNull()
    })

    it('encodes tracking numbers containing special characters correctly', () => {
      const url = getCarrierTrackingUrl('HepsiJet', 'HJ123?45# &')
      expect(url).toBe('https://www.hepsijet.com/gonderi-takibi/HJ123%3F45%23%20%26')
    })

    it('matches HepsiJet by code, name, and aliases (case insensitive & Turkish chars)', () => {
      expect(getCarrierTrackingUrl('HepsiJet', 'HJ123')).toBe('https://www.hepsijet.com/gonderi-takibi/HJ123')
      expect(getCarrierTrackingUrl('HEPSIJET', 'HJ123')).toBe('https://www.hepsijet.com/gonderi-takibi/HJ123')
      expect(getCarrierTrackingUrl('hepsi jet', 'HJ123')).toBe('https://www.hepsijet.com/gonderi-takibi/HJ123')
    })

    it('matches Yurtiçi Kargo with Turkish characters and ASCII equivalents', () => {
      expect(getCarrierTrackingUrl('Yurtiçi Kargo', 'YK123')).toBe('https://yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=YK123')
      expect(getCarrierTrackingUrl('Yurtici Kargo', 'YK123')).toBe('https://yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=YK123')
      expect(getCarrierTrackingUrl('YURTICI', 'YK123')).toBe('https://yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=YK123')
    })

    it('matches Aras, MNG, Sürat, PTT, KolayGelsin accurately', () => {
      expect(getCarrierTrackingUrl('Aras Kargo', '123')).toBe('https://www.araskargo.com.tr/kargo-takip?KargoTakipNo=123')
      expect(getCarrierTrackingUrl('MNG Kargo', '123')).toBe('https://kargotakip.mngkargo.com.tr/?takipNo=123')
      expect(getCarrierTrackingUrl('Sürat Kargo', '123')).toBe('https://www.suratkargo.com.tr/KargoSorgulama/Index?durum=1&barkod=123')
      expect(getCarrierTrackingUrl('PTT Kargo', '123')).toBe('https://gonderitakip.ptt.gov.tr/Track/Verify?q=123')
      expect(getCarrierTrackingUrl('KolayGelsin', '123')).toBe('https://esube.kolaygelsin.com/shipment-tracking?trackingNumber=123')
    })
  })

  describe('BASIT_KARGO_HANDLERS', () => {
    it('contains valid handlers derived from CARRIER_REGISTRY plus auto meta handlers', () => {
      const codes = BASIT_KARGO_HANDLERS.map(h => h.code)
      expect(codes).toContain('HEPSIJET')
      expect(codes).toContain('ECONOMIC')
      expect(codes).toContain('FAST')
      expect(codes).toContain('SURAT')
      expect(codes).toContain('KOLAYGELSIN')
      expect(codes).toContain('ARAS')
      expect(codes).toContain('PTT')
      expect(codes).toContain('YURTICI')
    })
  })
})

describe('Order State Machine (lib/order-status.ts)', () => {
  it('defines valid status transitions', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.beklemede).toContain('onaylandi')
    expect(ALLOWED_STATUS_TRANSITIONS.beklemede).toContain('hazirlaniyor')
    expect(ALLOWED_STATUS_TRANSITIONS.beklemede).toContain('iptal')

    expect(ALLOWED_STATUS_TRANSITIONS.onaylandi).toContain('hazirlaniyor')
    expect(ALLOWED_STATUS_TRANSITIONS.onaylandi).toContain('kargolandi')
    expect(ALLOWED_STATUS_TRANSITIONS.onaylandi).toContain('iptal')

    expect(ALLOWED_STATUS_TRANSITIONS.hazirlaniyor).toContain('kargolandi')
    expect(ALLOWED_STATUS_TRANSITIONS.hazirlaniyor).toContain('iptal')

    expect(ALLOWED_STATUS_TRANSITIONS.kargolandi).toContain('teslim_edildi')
    expect(ALLOWED_STATUS_TRANSITIONS.kargolandi).toContain('iptal')

    // Disallowed transitions
    expect(ALLOWED_STATUS_TRANSITIONS.kargolandi).not.toContain('beklemede')
    expect(ALLOWED_STATUS_TRANSITIONS.teslim_edildi).not.toContain('beklemede')
    expect(ALLOWED_STATUS_TRANSITIONS.teslim_edildi).not.toContain('hazirlaniyor')
  })

  it('covers all standard order statuses', () => {
    expect(ORDER_STATUSES).toEqual([
      'beklemede',
      'onaylandi',
      'hazirlaniyor',
      'kargolandi',
      'teslim_edildi',
      'iptal',
    ])
  })
})
