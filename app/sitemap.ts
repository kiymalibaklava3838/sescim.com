import { MetadataRoute } from 'next'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
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

  // 3. Products
  const { data: products } = await supabase
    .from('urunler')
    .select('slug, updated_at, fotograflar')
    .limit(50000)

  const productSitemap = (products || [])
    .filter((product) => product.slug)
    .map((product) => ({
      url: `${baseUrl}/urun/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      ...(product.fotograflar?.[0] ? { images: [product.fotograflar[0]] } : {})
    }))

  return [...staticPages, ...categorySitemap, ...productSitemap]
}