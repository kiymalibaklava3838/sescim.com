import { describe, it, expect } from 'vitest'
import { parseBannerContent, packBannerSubtitle, StoreBanner } from '../banner-service'

describe('banner-service', () => {
  it('parses banner with packed JSON subtitle correctly and suppresses raw JSON display', () => {
    const rawBanner: StoreBanner = {
      id: 'test-1',
      title: null,
      subtitle: JSON.stringify({
        subtitle: '',
        description: '',
        button_text: 'Hemen Keşfet',
        show_overlay: false,
        show_button: false,
        mobile_image_url: 'https://example.com/mobile.jpg',
      }),
      image_url: 'https://example.com/desktop.jpg',
      link_url: '/urunler/yamaha-mgx',
      is_active: true,
      sort_order: 1,
    }

    const parsed = parseBannerContent(rawBanner)

    expect(parsed.title).toBe('')
    expect(parsed.subtitle).toBe('')
    expect(parsed.description).toBe('')
    expect(parsed.ctaText).toBe('Hemen Keşfet')
    expect(parsed.ctaLink).toBe('/urunler/yamaha-mgx')
    expect(parsed.showOverlay).toBe(false)
    expect(parsed.showButton).toBe(false)
    expect(parsed.mobileImage).toBe('https://example.com/mobile.jpg')
    expect(parsed.image).toBe('https://example.com/desktop.jpg')
  })

  it('sanitizes accidental raw JSON string in title, subtitle, or description', () => {
    const rawBanner: StoreBanner = {
      id: 'test-2',
      title: '{"malformed": "json"}',
      subtitle: '{"invalid": "leak"}',
      image_url: 'https://example.com/img.jpg',
      link_url: null,
      is_active: true,
      sort_order: 2,
    }

    const parsed = parseBannerContent(rawBanner)

    expect(parsed.title).toBe('')
    expect(parsed.subtitle).toBe('')
    expect(parsed.description).toBe('')
  })

  it('retains legitimate plain text subtitle when not packed as JSON', () => {
    const rawBanner: StoreBanner = {
      id: 'test-3',
      title: 'Stüdyo Kulaklıkları',
      subtitle: 'Yeni Sezon',
      image_url: 'https://example.com/headphone.jpg',
      link_url: '/urunler/kulakliklar',
      is_active: true,
      sort_order: 3,
    }

    const parsed = parseBannerContent(rawBanner)

    expect(parsed.title).toBe('Stüdyo Kulaklıkları')
    expect(parsed.subtitle).toBe('Yeni Sezon')
    expect(parsed.showOverlay).toBe(true)
  })

  it('packs and unpacks roundtrip options properly', () => {
    const packed = packBannerSubtitle('Özel Fırsat', 'Kaçırılmayacak indirimler', 'Satın Al', {
      showOverlay: true,
      showButton: true,
      mobile_image_url: 'https://example.com/mob.jpg',
    })

    const rawBanner: StoreBanner = {
      id: 'test-4',
      title: 'Kampanya',
      subtitle: packed,
      image_url: 'https://example.com/desk.jpg',
      link_url: '/kampanyalar',
      is_active: true,
      sort_order: 1,
    }

    const parsed = parseBannerContent(rawBanner)

    expect(parsed.subtitle).toBe('Özel Fırsat')
    expect(parsed.description).toBe('Kaçırılmayacak indirimler')
    expect(parsed.ctaText).toBe('Satın Al')
    expect(parsed.showOverlay).toBe(true)
    expect(parsed.showButton).toBe(true)
    expect(parsed.mobileImage).toBe('https://example.com/mob.jpg')
  })
})
