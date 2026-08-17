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

export const getRelatedProducts = unstable_cache(
  async (kategori: string, excludeId: string) => {
    const supabase = await createAkdagServerClient()
    const { data } = await supabase
      .from('urunler')
      .select('id, slug, ad, kategori, fotograflar, fiyat, bayi_fiyati, para_birimi, bayi_para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, fiyat_guncelleme')
      .eq('kategori', kategori)
      .neq('id', excludeId)
      .limit(50) // Daha fazla ürün çek

    if (data && data.length > 0) {
      // Rastgele karıştır ve ilk 4 tanesini al
      const shuffled = data.sort(() => 0.5 - Math.random())
      const selected = shuffled.slice(0, 4)

      try {
        const { getSescimPricingMap } = await import('./sescim-pricing')
        const urunIds = selected.map((p: any) => p.id)
        const pricingMap = await getSescimPricingMap(urunIds)
        
        return selected.map((p: any) => {
          const pricing = pricingMap.get(p.id)
          if (pricing) {
            return { ...p, sescim_fiyat: pricing.sescim_fiyat, sescim_indirimli_fiyat: pricing.sescim_indirimli_fiyat, sescim_aktif: pricing.sescim_aktif }
          }
          return { ...p, sescim_aktif: true }
        }).filter((p: any) => p.sescim_aktif)
      } catch (e) {
        return selected
      }
    }
    return data || []
  },
  ['product-related'],
  { revalidate: 3600, tags: ['products'] }
)

export const getCrossSellProducts = unstable_cache(
  async (kategori: string) => {
    const targetKategori = kategori !== 'Kablo, Stand ve Aksesuar' ? 'Kablo, Stand ve Aksesuar' : 'Kulaklık & Monitör'
    const supabase = await createAkdagServerClient()
    const { data } = await supabase
      .from('urunler')
      .select('id, slug, ad, kategori, fotograflar, fiyat, bayi_fiyati, para_birimi, bayi_para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, fiyat_guncelleme')
      .eq('kategori', targetKategori)
      .limit(4)

    if (data && data.length > 0) {
      try {
        const { getSescimPricingMap } = await import('./sescim-pricing')
        const urunIds = data.map((p: any) => p.id)
        const pricingMap = await getSescimPricingMap(urunIds)
        
        return data.map((p: any) => {
          const pricing = pricingMap.get(p.id)
          if (pricing) {
            return { ...p, sescim_fiyat: pricing.sescim_fiyat, sescim_indirimli_fiyat: pricing.sescim_indirimli_fiyat, sescim_aktif: pricing.sescim_aktif }
          }
          return { ...p, sescim_aktif: true }
        }).filter((p: any) => p.sescim_aktif)
      } catch (e) {
        return data
      }
    }
    return data || []
  },
  ['product-cross-sell'],
  { revalidate: 3600, tags: ['products'] }
)
