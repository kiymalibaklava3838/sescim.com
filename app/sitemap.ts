import { MetadataRoute } from 'next'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { HIERARCHY_DATA } from '@/lib/categories'
import { getSiteUrl } from '@/lib/site-url'

// Category slugs collector
function collectCategorySlugs(node: any, path: string = ''): string[] {
  const currentPath = `${path}/${node.slug}`
  let urls = [currentPath]
  if (node.children) {
    node.children.forEach((child: any) => {
      urls = urls.concat(collectCategorySlugs(child, currentPath))
    })
  }
  return urls
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  const supabase = await createAkdagServerClient()

  // 1. Static Pages
  const staticPages = [
    '',
    '/hakkimizda',
    '/iletisim',
    '/karsilastir',
    '/sepet',
    '/yeni-gelenler',
    '/firsatlar',
    '/kampanyalar',
    '/outlet',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // 2. Dynamic Categories
  const categoryUrls: string[] = []
  HIERARCHY_DATA.forEach((ana) => {
    categoryUrls.push(...collectCategorySlugs(ana, '/urunler'))
  })

  const categorySitemap = categoryUrls.map((url) => ({
    url: `${baseUrl}${url}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

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
    priority: 0.8,
    ...(product.fotograflar?.[0] ? { images: [product.fotograflar[0]] } : {})
  }))

  return [...staticPages, ...categorySitemap, ...productSitemap]
}