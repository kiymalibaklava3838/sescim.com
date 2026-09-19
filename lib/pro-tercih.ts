import { createServerSupabaseClient } from './supabase-server'
import { createAkdagServerClient } from './supabase-akdag'
import { LIGHT_PRODUCT_FIELDS } from './product-queries'
import { getSescimPricingMap } from './sescim-pricing'
import { isQuoteOnlyProduct } from './distributor-rules'

export async function getProTercihProducts(): Promise<any[]> {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) return []

    // 1. ozel_urunler tablosundan profesyonellerin tercihi kayıtlarını al
    const { data: ozelData, error: ozelErr } = await supabase
      .from('ozel_urunler')
      .select('urun_id, sira')
      .eq('tip', 'profesyonellerin_tercihi')
      .order('sira', { ascending: true })

    let urunIds: string[] = []
    if (!ozelErr && ozelData && ozelData.length > 0) {
      urunIds = ozelData.map((x: any) => x.urun_id).filter(Boolean)
    }

    let products: any[] = []

    if (urunIds.length > 0) {
      const akdagSupabase = createAkdagServerClient()
      const [sescimRes, akdagRes] = await Promise.all([
        supabase
          .from('urunler')
          .select(LIGHT_PRODUCT_FIELDS)
          .in('id', urunIds),
        akdagSupabase
          .from('urunler')
          .select(LIGHT_PRODUCT_FIELDS)
          .in('id', urunIds)
      ])

      const combined: any[] = [
        ...((sescimRes.data as any[]) || []),
        ...((akdagRes.data as any[]) || [])
      ]
      const pMap = new Map<string, any>()
      for (const p of combined) {
        if (!pMap.has(p.id)) {
          pMap.set(p.id, p)
        }
      }

      const orderMap = new Map(urunIds.map((id, index) => [id, index]))
      products = Array.from(pMap.values()).sort(
        (a: any, b: any) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
      )
    }

    // Eğer henüz admin tarafından atanmış ürün yoksa, vitrin için teknik üst segment ürünlerden getir
    if (products.length === 0) {
      const akdagSupabase = createAkdagServerClient()
      const [akdagFallback, sescimFallback] = await Promise.all([
        akdagSupabase
          .from('urunler')
          .select(LIGHT_PRODUCT_FIELDS)
          .in('kategori', ['Stüdyo Ekipmanları', 'Ses Sistemleri', 'DJ Ekipmanları', 'Kulaklık & Monitör'])
          .gt('fiyat', 3000)
          .order('fiyat', { ascending: false })
          .limit(8),
        supabase
          .from('urunler')
          .select(LIGHT_PRODUCT_FIELDS)
          .in('kategori', ['Stüdyo Ekipmanları', 'Ses Sistemleri', 'DJ Ekipmanları', 'Kulaklık & Monitör'])
          .gt('fiyat', 3000)
          .order('fiyat', { ascending: false })
          .limit(8)
      ])

      const fallbackList: any[] = [
        ...((sescimFallback.data as any[]) || []),
        ...((akdagFallback.data as any[]) || [])
      ]
      const seen = new Set<string>()
      const uniqueFallback: any[] = []
      for (const item of fallbackList) {
        if (!seen.has(item.id)) {
          seen.add(item.id)
          uniqueFallback.push(item)
        }
      }
      products = uniqueFallback.slice(0, 8)
    }

    // Fiyat ve aktiflik eşleme
    if (products.length > 0) {
      try {
        const ids = products.map((p: any) => p.id)
        const pricingMap = await getSescimPricingMap(ids)
        products = products
          .map((p: any) => {
            const pricing = pricingMap.get(p.id)
            if (pricing) {
              return {
                ...p,
                sescim_fiyat: pricing.sescim_fiyat,
                sescim_indirimli_fiyat: pricing.sescim_indirimli_fiyat,
                sescim_aktif: pricing.sescim_aktif,
                fiyat_sorunuz: isQuoteOnlyProduct({
                  marka: p.marka,
                  fiyat_sorunuz: pricing.fiyat_sorunuz ?? false
                })
              }
            }
            return {
              ...p,
              sescim_aktif: true,
              fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: false })
            }
          })
          .filter((p: any) => p.sescim_aktif === true)
      } catch (e) {
        console.error('Pro Tercih pricing error:', e)
      }
    }

    return products
  } catch (err) {
    console.error('getProTercihProducts failed:', err)
    return []
  }
}
