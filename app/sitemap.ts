import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'
import { createAkdagServerClient } from '@/lib/supabase-akdag'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()
  const supabase = await createAkdagServerClient()
  
  const { data: products } = await supabase.from('urunler').select('slug')
  
  const productEntries: MetadataRoute.Sitemap = (products || []).map((product) => ({
    url: `${base}/urun/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/urunler`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/hakkimizda`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/iletisim`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...productEntries,
  ]
}