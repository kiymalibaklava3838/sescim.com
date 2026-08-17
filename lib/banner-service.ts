import { createServerSupabaseClient } from './supabase-server'

export interface StoreBanner {
  id: string
  title?: string
  subtitle?: string
  image_url: string
  link_url?: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export async function getActiveBanners(): Promise<StoreBanner[]> {
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

  return data as StoreBanner[]
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

  return data as StoreBanner[]
}
