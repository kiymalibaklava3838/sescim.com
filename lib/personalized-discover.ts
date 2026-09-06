'use client'

export interface ViewedProductItem {
  id: string
  slug: string
  name: string
  image: string | null
  price: number | null
  currency: string
  category?: string | null
  timestamp: number
}

const STORAGE_RECENTLY_VIEWED = 'sescim_recently_viewed'
const STORAGE_CATEGORY_AFFINITY = 'sescim_category_affinity'
const STORAGE_EXPLORED_CATEGORIES = 'sescim_explored_categories'

export const DISCOVER_TARGET = 3
export const DISCOVER_COUPON_CODE = 'SESCIM5'

export interface VibeChip {
  id: string
  label: string
  iconName: 'Mic' | 'Music' | 'Headphones' | 'Speaker' | 'Zap' | 'Lightbulb'
  href: string
  tagline: string
}

export const VIBE_CHIPS: VibeChip[] = [
  {
    id: 'studyo',
    label: 'Stüdyo & Podcast',
    iconName: 'Mic',
    href: '/urunler/studyo-ekipmanlari',
    tagline: 'Mikrofon & Ses Kartları'
  },
  {
    id: 'dj',
    label: 'DJ & Sahne',
    iconName: 'Music',
    href: '/urunler/dj-ekipmanlari',
    tagline: 'Mixer & Kontrolcüler'
  },
  {
    id: 'kulaklik',
    label: 'Kulaklık & Monitör',
    iconName: 'Headphones',
    href: '/urunler/kulaklik-monitor',
    tagline: 'Referans Ses Sistemleri'
  },
  {
    id: 'isik',
    label: 'Işık Sistemleri',
    iconName: 'Lightbulb',
    href: '/urunler/isik-sistemleri',
    tagline: 'Moving Head & Lazer'
  },
  {
    id: 'ses',
    label: 'Kafe & Mekan Sesi',
    iconName: 'Speaker',
    href: '/urunler/ses-sistemleri',
    tagline: 'Tavan & Duvar Hoparlörleri'
  },
  {
    id: 'firsatlar',
    label: 'Günün Fırsatları',
    iconName: 'Zap',
    href: '/firsatlar',
    tagline: 'Fiyatı Düşen Canavarlar'
  }
]

export function getRecentlyViewed(): ViewedProductItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_RECENTLY_VIEWED)
    if (!raw) return []
    const list: ViewedProductItem[] = JSON.parse(raw)
    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 8)
  } catch {
    return []
  }
}

export function saveRecentlyViewed(product: ViewedProductItem) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_RECENTLY_VIEWED)
    let list: ViewedProductItem[] = raw ? JSON.parse(raw) : []
    list = list.filter((p) => p.id !== product.id && p.slug !== product.slug)
    list.unshift({ ...product, timestamp: Date.now() })
    if (list.length > 12) list = list.slice(0, 12)
    localStorage.setItem(STORAGE_RECENTLY_VIEWED, JSON.stringify(list))

    // Track category affinity
    if (product.category) {
      recordCategoryExplored(product.category)
    }

    window.dispatchEvent(new CustomEvent('sescim-personalization-updated'))
  } catch (e) {
    console.error('Failed to save recently viewed', e)
  }
}

export function recordCategoryExplored(categoryName: string) {
  if (typeof window === 'undefined' || !categoryName) return
  try {
    // 1. Record affinity counter
    const affRaw = localStorage.getItem(STORAGE_CATEGORY_AFFINITY)
    const affinities: Record<string, number> = affRaw ? JSON.parse(affRaw) : {}
    affinities[categoryName] = (affinities[categoryName] || 0) + 1
    localStorage.setItem(STORAGE_CATEGORY_AFFINITY, JSON.stringify(affinities))

    // 2. Record unique explored categories
    const expRaw = localStorage.getItem(STORAGE_EXPLORED_CATEGORIES)
    const explored: string[] = expRaw ? JSON.parse(expRaw) : []
    if (!explored.includes(categoryName)) {
      explored.push(categoryName)
      localStorage.setItem(STORAGE_EXPLORED_CATEGORIES, JSON.stringify(explored))
    }
  } catch (e) {
    console.error('Failed to record category affinity', e)
  }
}

export function getExploredCategories(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const expRaw = localStorage.getItem(STORAGE_EXPLORED_CATEGORIES)
    return expRaw ? JSON.parse(expRaw) : []
  } catch {
    return []
  }
}

export function getCategoryAffinities(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const affRaw = localStorage.getItem(STORAGE_CATEGORY_AFFINITY)
    return affRaw ? JSON.parse(affRaw) : {}
  } catch {
    return {}
  }
}

export function getTopAffinityCategory(): string | null {
  const affinities = getCategoryAffinities()
  const entries = Object.entries(affinities)
  if (entries.length === 0) return null
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

export function getDiscoverGamification(): {
  count: number
  target: number
  unlocked: boolean
  coupon: string
} {
  const explored = getExploredCategories()
  const count = Math.min(explored.length, DISCOVER_TARGET)
  const unlocked = count >= DISCOVER_TARGET
  return {
    count,
    target: DISCOVER_TARGET,
    unlocked,
    coupon: DISCOVER_COUPON_CODE,
  }
}
