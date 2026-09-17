import { unstable_cache } from 'next/cache'
import { createAkdagServerClient } from './supabase-akdag'
import { createServerSupabaseClient } from './supabase-server'
import { isQuoteOnlyProduct } from './distributor-rules'

/**
 * Ürün verisini ID'ye göre getirir ve cache-ler.
 * Önce Sescim Supabase'de arar, bulunamazsa Akdağ Supabase'den çeker.
 */
export const getProduct = unstable_cache(
  async (id: string) => {
    // 1. Önce Sescim Supabase'de ara (Sescim'e özel eklenmiş ürünler)
    try {
      const sescimDb = await createServerSupabaseClient()
      if (sescimDb) {
        const sescimRes = await sescimDb.from('urunler')
          .select('id, ad, aciklama, kategori:kategori_id, alt_kategori:alt_kategori_id, fotograflar, fiyat, bayi_fiyati, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, model_kodu, slug, is_featured, created_at')
          .eq('id', id)
          .maybeSingle()

        if (sescimRes.data) {
          let prod: any = { ...sescimRes.data }
          try {
            const { getSescimPricing } = await import('./sescim-pricing')
            const pricing = await getSescimPricing(prod.id)
            if (pricing) {
              prod = { ...prod, ...pricing }
            }
          } catch (e) {}
          prod.fiyat_sorunuz = isQuoteOnlyProduct({ marka: prod.marka, fiyat_sorunuz: prod.fiyat_sorunuz })
          const { sanitizeProductForClient } = await import('./pricing-engine')
          return { data: sanitizeProductForClient(prod), error: null }
        }
      }
    } catch (e) {
      console.error('Error querying Sescim DB for product', id, e)
    }

    // 2. Sescim'de yoksa Akdağ Supabase'den çek
    const supabase = await createAkdagServerClient()
    const result = await supabase.from('urunler')
      .select('id, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, fiyat_guncelleme, created_at, updated_at')
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
      ;(result.data as any).fiyat_sorunuz = isQuoteOnlyProduct({ marka: result.data.marka, fiyat_sorunuz: (result.data as any).fiyat_sorunuz })
      const { sanitizeProductForClient } = await import('./pricing-engine')
      result.data = sanitizeProductForClient(result.data)
    }
    return result
  },
  ['product-detail'],
  { revalidate: 3600, tags: ['products'] }
)

export const getProductBySlug = unstable_cache(
  async (slug: string) => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
    const queryColumn = isUUID ? 'id' : 'slug'

    // 1. Önce Sescim Supabase'de ara (Sescim'e özel eklenmiş ürünler)
    try {
      const sescimDb = await createServerSupabaseClient()
      if (sescimDb) {
        const sescimRes = await sescimDb.from('urunler')
          .select('id, ad, aciklama, kategori:kategori_id, alt_kategori:alt_kategori_id, fotograflar, fiyat, bayi_fiyati, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, model_kodu, slug, is_featured, created_at')
          .eq(queryColumn, slug)
          .maybeSingle()

        if (sescimRes.data) {
          let prod: any = { ...sescimRes.data }
          try {
            const { getSescimPricing } = await import('./sescim-pricing')
            const pricing = await getSescimPricing(prod.id)
            if (pricing) {
              prod = { ...prod, ...pricing }
            }
          } catch (e) {}
          prod.fiyat_sorunuz = isQuoteOnlyProduct({ marka: prod.marka, fiyat_sorunuz: prod.fiyat_sorunuz })
          const { sanitizeProductForClient } = await import('./pricing-engine')
          return { data: sanitizeProductForClient(prod), error: null }
        }
      }
    } catch (e) {
      console.error('Error querying Sescim DB for product slug', slug, e)
    }

    // 2. Sescim'de yoksa Akdağ Supabase'den çek
    const supabase = await createAkdagServerClient()
    const result = await supabase.from('urunler')
      .select('id, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, fiyat_guncelleme, slug, created_at, updated_at')
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
      ;(result.data as any).fiyat_sorunuz = isQuoteOnlyProduct({ marka: result.data.marka, fiyat_sorunuz: (result.data as any).fiyat_sorunuz })
      const { sanitizeProductForClient } = await import('./pricing-engine')
      result.data = sanitizeProductForClient(result.data)
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
      .select('id, slug, ad, kategori, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, fiyat_guncelleme')
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
            return { 
              ...p, 
              sescim_fiyat: pricing.sescim_fiyat, 
              sescim_indirimli_fiyat: pricing.sescim_indirimli_fiyat, 
              sescim_aktif: pricing.sescim_aktif,
              fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: pricing.fiyat_sorunuz })
            }
          }
          return { ...p, sescim_aktif: true, fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: false }) }
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
      .select('id, slug, ad, kategori, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, fiyat_guncelleme')
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
            return { 
              ...p, 
              sescim_fiyat: pricing.sescim_fiyat, 
              sescim_indirimli_fiyat: pricing.sescim_indirimli_fiyat, 
              sescim_aktif: pricing.sescim_aktif,
              fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: pricing.fiyat_sorunuz })
            }
          }
          return { ...p, sescim_aktif: true, fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: false }) }
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
