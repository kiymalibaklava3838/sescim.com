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
  },
]

export function parseBannerContent(banner: StoreBanner): ParsedBannerSlide {
  let subtitle = ''
  let description = ''
  let ctaText = 'Hemen Keşfet'

  if (banner.subtitle) {
    try {
      const parsed = JSON.parse(banner.subtitle)
      if (parsed && typeof parsed === 'object') {
        subtitle = parsed.subtitle || ''
        description = parsed.description || ''
        ctaText = parsed.button_text || parsed.buttonText || parsed.ctaText || 'Hemen Keşfet'
      } else {
        subtitle = String(banner.subtitle)
      }
    } catch {
      subtitle = String(banner.subtitle)
    }
  }

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
  }
}

export function packBannerSubtitle(subtitle: string, description: string, buttonText: string): string {
  return JSON.stringify({
    subtitle: (subtitle || '').trim(),
    description: (description || '').trim(),
    button_text: (buttonText || '').trim() || 'Hemen Keşfet',
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
