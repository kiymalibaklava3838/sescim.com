import { describe, it, expect } from 'vitest'
import {
  slugifyCampaign,
  normalizeFlashMeta,
  DEFAULT_SESCIM_HAFTASI_META,
} from '../flash-campaign'

describe('flash-campaign helpers', () => {
  it('slugifies Turkish campaign names cleanly for banner URLs', () => {
    expect(slugifyCampaign('Kara Cuma')).toBe('kara-cuma')
    expect(slugifyCampaign('Yılbaşı İndirimi!')).toBe('yilbasi-indirimi')
    expect(slugifyCampaign('  Şahane Öğrenci Fırsatı 2026  ')).toBe('sahane-ogrenci-firsati-2026')
    expect(slugifyCampaign('Özel Gün & Çılgın İndirim')).toBe('ozel-gun-cilgin-indirim')
    expect(slugifyCampaign('')).toBe('ozel-kampanya')
  })

  it('defaults missing or sescim_haftasi metadata to Sescim Haftası', () => {
    expect(normalizeFlashMeta(null)).toEqual(DEFAULT_SESCIM_HAFTASI_META)
    expect(normalizeFlashMeta(undefined)).toEqual(DEFAULT_SESCIM_HAFTASI_META)
    expect(normalizeFlashMeta({ kampanya_tipi: 'sescim_haftasi' })).toEqual(DEFAULT_SESCIM_HAFTASI_META)
  })

  it('normalizes custom campaign metadata and clamps fields safely', () => {
    const res = normalizeFlashMeta({
      kampanya_tipi: 'ozel',
      kampanya_adi: 'Kara Cuma 2026',
      rozet_metni: 'KARA CUMA',
      rozet_rengi: 'black',
      rozet_ikonu: 'flame',
      yuzde_goster: true,
      urun_sayfasinda_sayac: false,
      vurgu_metni: 'Sınırlı stok!',
    })

    expect(res.kampanya_tipi).toBe('ozel')
    expect(res.kampanya_slug).toBe('kara-cuma-2026')
    expect(res.rozet_metni).toBe('KARA CUMA')
    expect(res.rozet_rengi).toBe('black')
    expect(res.rozet_ikonu).toBe('flame')
    expect(res.urun_sayfasinda_sayac).toBe(false)
  })

  it('falls back to safe color and icon when invalid values are provided', () => {
    const res = normalizeFlashMeta({
      kampanya_tipi: 'ozel',
      kampanya_adi: 'Test Kampanya',
      rozet_rengi: 'invalid-color' as any,
      rozet_ikonu: 'invalid-icon' as any,
    })

    expect(res.rozet_rengi).toBe('black')
    expect(res.rozet_ikonu).toBe('flame')
    expect(res.kampanya_slug).toBe('test-kampanya')
  })
})
