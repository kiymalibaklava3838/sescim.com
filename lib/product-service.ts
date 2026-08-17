import { unstable_cache } from 'next/cache'
import { createAkdagServerClient } from './supabase-akdag'

/**
 * Ürün verisini ID'ye göre getirir ve cache-ler.
 * Bu sayede veritabanına giden gereksiz istekleri (Egress) engeller.
 * revalidate: 3600 -> Veri 1 saat boyunca cache-den gelir.
 */
export const getProduct = unstable_cache(
  async (id: string) => {
    const supabase = await createAkdagServerClient()
    const result = await supabase.from('urunler')
      .select('id, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, bayi_fiyati, para_birimi, bayi_para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, fiyat_guncelleme, created_at, updated_at')
      .eq('id', id)
      .single()

    if (result.data) {
      try {
        const { getSescimPricing } = await import('./sescim-pricing')
        const pricing = await getSescimPricing(result.data.id)
        if (pricing) {
          result.data = { ...result.data, ...pricing }
        }
      } catch (e) {
        console.error('Sescim pricing fetch failed for product', id, e)
      }
    }
    return result
  },
  ['product-detail'],
  { revalidate: 3600, tags: ['products'] }
)

export const getProductBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = await createAkdagServerClient()
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
    const queryColumn = isUUID ? 'id' : 'slug'

    const result = await supabase.from('urunler')
      .select('id, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, bayi_fiyati, para_birimi, bayi_para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, fiyat_guncelleme, slug, created_at, updated_at')
      .eq(queryColumn, slug)
      .single()

    if (result.data) {
      try {
        const { getSescimPricing } = await import('./sescim-pricing')
        const pricing = await getSescimPricing(result.data.id)
        if (pricing) {
          result.data = { ...result.data, ...pricing }
        }
      } catch (e) {
        console.error('Sescim pricing fetch failed for product slug', slug, e)
      }
    }
    return result
  },
  ['product-detail-slug'],
  { revalidate: 3600, tags: ['products'] }
)
