import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import { getKur } from '@/lib/kur'
import { getSescimPricingMap } from '@/lib/sescim-pricing'
import { isQuoteOnlyProduct } from '@/lib/distributor-rules'
import { ProductCard } from '@/components/ProductGrid'

interface Props {
  title?: string
  sortBy?: 'created_at' | 'fiyat' | 'bayi_fiyati'
  ascending?: boolean
  filterByFeatured?: boolean
}

export default async function FeaturedProducts({ 
  title = "Öne Çıkan Ürünler", 
  sortBy = "created_at", 
  ascending = false, 
  filterByFeatured = true 
}: Props = {}) {
  const supabase = await createAkdagServerClient()
  const sescimDb = await createServerSupabaseClient()
  const kur = await getKur()
  const isCokSatanlar = title.toLowerCase().includes('satan')
  
  // Çok satanlar için sipariş geçmişinden popüler ürün ID'lerini al
  let bestSellerIds: string[] = []
  if (sescimDb && isCokSatanlar) {
    try {
      const { data: kal } = await sescimDb.from('siparis_kalemleri').select('urun_id, adet')
      if (kal && kal.length > 0) {
        const counts = new Map<string, number>()
        kal.forEach((k: any) => {
          if (k.urun_id) counts.set(k.urun_id, (counts.get(k.urun_id) || 0) + (k.adet || 1))
        })
        bestSellerIds = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0])
      }
    } catch (e) {
      console.error('FeaturedProducts best sellers error:', e)
    }
  }

  let query = supabase
    .from('urunler')
    .select(LIGHT_PRODUCT_FIELDS)
    .order(sortBy, { ascending })
    .limit(20)

  let sQuery = sescimDb
    ? sescimDb
        .from('urunler')
        .select('id, slug, ad, kategori:kategori_id, alt_kategori:alt_kategori_id, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, is_featured, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, created_at')
        .order(sortBy, { ascending })
        .limit(20)
    : null

  if (filterByFeatured) {
    query = query.eq('is_featured', true)
    if (sQuery) sQuery = sQuery.eq('is_featured', true)
  }

  const [akdagRes, sescimRes] = await Promise.all([
    query,
    sQuery ? sQuery : Promise.resolve({ data: [] })
  ])

  const rawMerged = [
    ...(sescimRes.data || []).map((p: any) => ({
      ...p,
      sescim_fiyat: p.sescim_fiyat ?? p.fiyat ?? null,
      sescim_aktif: p.sescim_aktif !== false
    })),
    ...(akdagRes.data || [])
  ]

  const pDedupMap = new Map<string, any>()
  for (const item of rawMerged) {
    if (item.id && !pDedupMap.has(item.id)) {
      pDedupMap.set(item.id, item)
    }
  }
  let data = Array.from(pDedupMap.values())

  // Eğer özel olarak öne çıkarılan ürün işaretlenmemişse, boş kalmaması için popüler ürünleri göster
  if (data.length === 0 && filterByFeatured) {
    const fallback = await supabase
      .from('urunler')
      .select(LIGHT_PRODUCT_FIELDS)
      .order(sortBy, { ascending })
      .limit(20)
    data = fallback.data || []
  }

  if (!data || data.length === 0) return null

  const urunIds = data.map((p: any) => p.id)
  const pricingMap = await getSescimPricingMap(urunIds)

  let featuredProducts = data.map((p: any) => {
    const pricing = pricingMap.get(p.id)
    return {
      ...p,
      sescim_fiyat: pricing?.sescim_fiyat ?? p.sescim_fiyat ?? null,
      sescim_indirimli_fiyat: pricing?.sescim_indirimli_fiyat ?? p.sescim_indirimli_fiyat ?? null,
      sescim_indirimli_fiyat_pb: pricing?.sescim_indirimli_fiyat_pb ?? null,
      sescim_aktif: pricing?.sescim_aktif ?? p.sescim_aktif ?? true,
      sescim_stok: pricing?.sescim_stok ?? p.sescim_stok ?? null,
      sescim_stok_durumu: pricing?.sescim_stok_durumu ?? p.sescim_stok_durumu ?? null,
      fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: pricing ? pricing.fiyat_sorunuz : p.fiyat_sorunuz })
    }
  }).filter(p => p.sescim_aktif !== false)

  // Eğer çok satanlar ise, sipariş geçmişindeki ürünleri veya popüler markaları öne sırala
  if (isCokSatanlar) {
    const popularBrands = ['SOUNDCRAFT', 'YAMAHA', 'RCF', 'BEHRINGER', 'LD SYSTEMS', 'MARTIN AUDIO', 'KÖNİG', 'ALTO', 'ROOF', 'AUDAC', 'MACKIE']
    const bSet = new Map(bestSellerIds.map((id, index) => [id, index]))
    featuredProducts.sort((a, b) => {
      const idxA = bSet.has(a.id) ? bSet.get(a.id)! : 999
      const idxB = bSet.has(b.id) ? bSet.get(b.id)! : 999
      if (idxA !== idxB) return idxA - idxB
      const brandScoreA = popularBrands.includes(a.marka?.toUpperCase()) ? 1 : 0
      const brandScoreB = popularBrands.includes(b.marka?.toUpperCase()) ? 1 : 0
      return brandScoreB - brandScoreA
    })
  }

  // 5'li ızgara (lg:grid-cols-5) için tam 5 veya 10 adet göster
  const displayCount = Math.floor(featuredProducts.length / 5) * 5
  const finalFeatured = displayCount >= 5 ? featuredProducts.slice(0, Math.min(10, displayCount)) : featuredProducts.slice(0, 10)

  if (finalFeatured.length === 0) return null

  return (
    <div className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 uppercase tracking-tight">
              {title}
            </h2>
            <div className="h-1 w-16 bg-brand-red mt-3 rounded-full" />
          </div>
          
          <Link href="/urunler?sirala=cok_satanlar" className="text-brand-red font-display font-bold text-xs uppercase tracking-wider hover:text-red-700 transition-colors flex items-center gap-1 group">
            Tümünü Gör <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Aktif Standart Ürün Kartları Izgarası */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {finalFeatured.map((product) => (
            <ProductCard key={product.id} product={product} kur={kur} />
          ))}
        </div>
      </div>
    </div>
  )
}

