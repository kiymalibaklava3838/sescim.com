import { createServerSupabaseClient } from './supabase-server'
import { LIGHT_PRODUCT_FIELDS } from './product-queries'
import { getSescimPricingMap } from './sescim-pricing'

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
      const { data: prods } = await supabase
        .from('urunler')
        .select(LIGHT_PRODUCT_FIELDS)
        .in('id', urunIds)
      
      if (prods && prods.length > 0) {
        // Sıralamayı ozel_urunler sırasına göre koru
        const orderMap = new Map(urunIds.map((id, index) => [id, index]))
        products = prods.sort((a: any, b: any) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999))
      }
    }

    // Eğer henüz admin tarafından atanmış ürün yoksa, vitrin için teknik üst segment ürünlerden 6 adet getir
    if (products.length === 0) {
      const { data: fallbackProds } = await supabase
        .from('urunler')
        .select(LIGHT_PRODUCT_FIELDS)
        .in('kategori', ['Stüdyo Ekipmanları', 'Ses Sistemleri', 'DJ Ekipmanları', 'Kulaklık & Monitör'])
        .gt('fiyat', 3000)
        .order('fiyat', { ascending: false })
        .limit(8)

      products = fallbackProds || []
    }

    // Fiyat ve aktiflik eşleme
    if (products.length > 0) {
      try {
        const ids = products.map((p: any) => p.id)
        const pricingMap = await getSescimPricingMap(ids)
        products = products.map((p: any) => {
          const pricing = pricingMap.get(p.id)
          if (pricing) {
            return {
              ...p,
              sescim_fiyat: pricing.sescim_fiyat,
              sescim_indirimli_fiyat: pricing.sescim_indirimli_fiyat,
              sescim_aktif: pricing.sescim_aktif
            }
          }
          return { ...p, sescim_aktif: true }
        }).filter((p: any) => p.sescim_aktif === true)
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
