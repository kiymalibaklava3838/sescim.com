import { createServerSupabaseClient } from './supabase-server'

export interface StoreBanner {
  id: string
  title?: string | null
  subtitle?: string | null
  image_url: string
  link_url?: string | null
  is_active: boolean
  sort_order: number
  created_at?: string
}

export interface ParsedBannerSlide {
  id: string
  title: string
  subtitle: string
  description: string
  ctaText: string
  ctaLink: string | null
  image: string
  isActive: boolean
  sortOrder: number
  showOverlay?: boolean
  showButton?: boolean
}

export const DEFAULT_HERO_SLIDES: ParsedBannerSlide[] = [
  {
    id: 'default-1',
    image: 'https://images.unsplash.com/photo-1598488035114-1e7584102c7b?auto=format&fit=crop&q=80&w=2000',
    title: 'Profesyonel Stüdyo Ekipmanları',
    subtitle: 'Yeni Sezon',
    description: 'En iyi ses kalitesi için dünyanın önde gelen markalarından stüdyo monitörleri ve mikrofonlar.',
    ctaText: 'Hemen Keşfet',
    ctaLink: '/urunler/studyo-ekipmanlari',
    isActive: true,
    sortOrder: 1,
    showOverlay: true,
    showButton: true,
  },
  {
    id: 'default-2',
    image: 'https://images.unsplash.com/photo-1511671782633-d5a33f4a38fb?auto=format&fit=crop&q=80&w=2000',
    title: 'Sahnenin Yıldızı Siz Olun',
    subtitle: 'DJ Ekipmanları',
    description: 'Performansınızı zirveye taşıyacak profesyonel DJ setup ve aksesuarları.',
    ctaText: 'Ürünleri Gör',
    ctaLink: '/urunler/dj-ekipmanlari',
    isActive: true,
    sortOrder: 2,
    showOverlay: true,
    showButton: true,
  },
  {
    id: 'default-3',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&q=80&w=2000',
    title: 'Kusursuz Sahne ve Işık',
    subtitle: 'Fırsatları Yakala',
    description: 'Görkemli sahneler için truss sistemleri, robot ışıklar ve daha fazlası.',
    ctaText: 'Fırsatları İncele',
    ctaLink: '/urunler/isik-sistemleri',
    isActive: true,
    sortOrder: 3,
    showOverlay: true,
    showButton: true,
  },
]

export function parseBannerContent(banner: StoreBanner): ParsedBannerSlide {
  let subtitle = ''
  let description = ''
  let ctaText = ''
  let showOverlay: boolean | undefined = undefined
  let showButton: boolean | undefined = undefined

  if (banner.subtitle) {
    try {
      const parsed = JSON.parse(banner.subtitle)
      if (parsed && typeof parsed === 'object') {
        subtitle = parsed.subtitle || ''
        description = parsed.description || ''
        ctaText = (parsed.button_text ?? parsed.buttonText ?? parsed.ctaText ?? '').trim()
        if (typeof parsed.show_overlay === 'boolean') showOverlay = parsed.show_overlay
        else if (typeof parsed.showOverlay === 'boolean') showOverlay = parsed.showOverlay
        if (typeof parsed.show_button === 'boolean') showButton = parsed.show_button
        else if (typeof parsed.showButton === 'boolean') showButton = parsed.showButton
      } else {
        subtitle = String(banner.subtitle)
      }
    } catch {
      subtitle = String(banner.subtitle)
    }
  }

  const hasAnyText = Boolean(banner.title?.trim() || subtitle.trim() || description.trim())

  // Karartma varsayılanı: Belirtilmemişse metin varsa true, metin yoksa saf grafik için false
  const finalShowOverlay = showOverlay !== undefined ? showOverlay : hasAnyText

  // Buton varsayılanı: Belirtilmemişse buton metni girilmişse ve showButton açıkça false değilse true
  const finalShowButton = showButton !== undefined ? showButton : Boolean(ctaText && ctaText.trim())

  return {
    id: banner.id,
    title: banner.title || '',
    subtitle,
    description,
    ctaText,
    ctaLink: banner.link_url || null,
    image: banner.image_url,
    isActive: banner.is_active,
    sortOrder: banner.sort_order ?? 0,
    showOverlay: finalShowOverlay,
    showButton: finalShowButton,
  }
}

export function packBannerSubtitle(
  subtitle: string,
  description: string,
  buttonText: string,
  options?: { showOverlay?: boolean; showButton?: boolean }
): string {
  return JSON.stringify({
    subtitle: (subtitle || '').trim(),
    description: (description || '').trim(),
    button_text: (buttonText || '').trim(),
    show_overlay: options?.showOverlay ?? false,
    show_button: options?.showButton ?? false,
  })
}

export async function getActiveBanners(): Promise<StoreBanner[]> {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) return []
    
    const { data, error } = await supabase
      .from('store_banners')
      .select('id, image_url, title, subtitle, link_url, is_active, created_at, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Banners alınamadı:', error)
      return []
    }

    return (data || []) as StoreBanner[]
  } catch (err) {
    console.error('Error in getActiveBanners:', err)
    return []
  }
}

export async function getActiveParsedBanners(): Promise<ParsedBannerSlide[]> {
  const raw = await getActiveBanners()
  if (!raw || raw.length === 0) return []
  return raw.map(b => parseBannerContent(b))
}

export async function getAllBannersAdmin(supabase: any): Promise<StoreBanner[]> {
  const { data, error } = await supabase
    .from('store_banners')
    .select('id, image_url, title, subtitle, link_url, is_active, created_at, sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Admin bannerlar alınamadı:', error)
    return []
  }

  return (data || []) as StoreBanner[]
}
