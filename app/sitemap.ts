import { MetadataRoute } from 'next'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { HIERARCHY_DATA } from '@/lib/categories'
import { getSiteUrl } from '@/lib/site-url'

// Vercel kotalarını ve sunucu çağrılarını korumak için 24 saat (86400 sn) Edge önbelleği
export const revalidate = 86400

interface CategoryRoute {
  url: string
  depth: number
}

// Category slugs collector with depth calculation
function collectCategoryRoutes(node: any, path: string = '', depth: number = 1): CategoryRoute[] {
  const currentPath = `${path}/${node.slug}`
  let routes: CategoryRoute[] = [{ url: currentPath, depth }]
  if (node.children) {
    node.children.forEach((child: any) => {
      routes = routes.concat(collectCategoryRoutes(child, currentPath, depth + 1))
    })
  }
  return routes
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  const supabase = await createAkdagServerClient()

  // 1. Static Pages & Core Hubs (Prioritized for Google Sitelinks & SERP Hierarchy)
  const staticPages = [
    // Tier 1: Anasayfa
    { route: '', priority: 1.0, changeFrequency: 'daily' as const },
    // Tier 2: Ticari Merkezler & Kampanyalar
    { route: '/urunler', priority: 0.85, changeFrequency: 'daily' as const },
    { route: '/firsatlar', priority: 0.85, changeFrequency: 'daily' as const },
    { route: '/kampanyalar', priority: 0.85, changeFrequency: 'daily' as const },
    { route: '/outlet', priority: 0.85, changeFrequency: 'daily' as const },
    { route: '/yeni-gelenler', priority: 0.85, changeFrequency: 'daily' as const },
    // Tier 3: Kurumsal & İletişim
    { route: '/iletisim', priority: 0.75, changeFrequency: 'monthly' as const },
    { route: '/hakkimizda', priority: 0.70, changeFrequency: 'monthly' as const },
    { route: '/karsilastir', priority: 0.50, changeFrequency: 'monthly' as const },
    // Tier 4: Yasal Sözleşmeler & Politikalar
    { route: '/teslimat-ve-kargo', priority: 0.30, changeFrequency: 'yearly' as const },
    { route: '/iptal-ve-iade', priority: 0.30, changeFrequency: 'yearly' as const },
    { route: '/mesafeli-satis-sozlesmesi', priority: 0.30, changeFrequency: 'yearly' as const },
    { route: '/on-bilgilendirme-formu', priority: 0.30, changeFrequency: 'yearly' as const },
    { route: '/gizlilik-politikasi', priority: 0.30, changeFrequency: 'yearly' as const },
  ].map(({ route, priority, changeFrequency }) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }))

  // 2. Dynamic Categories (Depth-based priority: Top-level hubs = 0.9 for sitelinks, deeper = 0.75 / 0.70)
  const categoryRoutes: CategoryRoute[] = []
  HIERARCHY_DATA.forEach((ana) => {
    categoryRoutes.push(...collectCategoryRoutes(ana, '/urunler', 1))
  })

  const categorySitemap = categoryRoutes.map(({ url, depth }) => {
    let priority = 0.70
    let changeFrequency: 'daily' | 'weekly' = 'weekly'

    if (depth === 1) {
      priority = 0.90
      changeFrequency = 'daily'
    } else if (depth === 2) {
      priority = 0.75
      changeFrequency = 'weekly'
    }

    return {
      url: `${baseUrl}${url}`,
      lastModified: new Date(),
      changeFrequency,
      priority,
    }
  })

  // 3. Products (Hibrit Akdağ + Sescim)
  const sescimDb = await createServerSupabaseClient()
  const [akdagRes, sescimRes] = await Promise.all([
    supabase.from('urunler').select('id, slug, updated_at, fotograflar').limit(50000),
    sescimDb ? sescimDb.from('urunler').select('id, slug, updated_at, fotograflar').limit(5000) : Promise.resolve({ data: [] })
  ])

  const slugMap = new Map<string, any>()
  ;(sescimRes.data || []).forEach((p: any) => { if (p.slug) slugMap.set(p.slug, p) })
  ;(akdagRes.data || []).forEach((p: any) => { if (p.slug && !slugMap.has(p.slug)) slugMap.set(p.slug, p) })
  const products = Array.from(slugMap.values())

  const productSitemap = products.map((product) => ({
    url: `${baseUrl}/urun/${product.slug}`,
    lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.65,
    ...(Array.isArray(product.fotograflar) && product.fotograflar.length > 0 
      ? { images: product.fotograflar.slice(0, 5) } 
      : {})
  }))

  return [...staticPages, ...categorySitemap, ...productSitemap]
}