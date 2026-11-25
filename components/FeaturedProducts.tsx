import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import { getKur } from '@/lib/kur'
import { getSescimPricingMap } from '@/lib/sescim-pricing'
import { isQuoteOnlyProduct } from '@/lib/distributor-rules'
import { resolveStock } from '@/lib/product-stock'
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
  filterByFeatured = false 
}: Props = {}) {
  const supabase = await createAkdagServerClient()
  const sescimDb = await createServerSupabaseClient()
  const kur = await getKur()
  const isCokSatanlar = title.toLowerCase().includes('satan')

  const productMap = new Map<string, any>()

  if (isCokSatanlar) {
    // 1. Sipariş geçmişindeki gerçek çok satan ürünleri al
    let salesCounts = new Map<string, number>()
    if (sescimDb) {
      try {
        const { data: kal } = await sescimDb.from('siparis_kalemleri').select('urun_id, adet')
        ;(kal || []).forEach((k: any) => {
          if (k.urun_id) salesCounts.set(k.urun_id, (salesCounts.get(k.urun_id) || 0) + (k.adet || 1))
        })
      } catch (e) {
        console.error('FeaturedProducts sales error:', e)
      }
    }

    // 2. Aktif Flaş İndirim ürünlerini al (Çok satan vitrininin en güçlü yıldızları)
    let flasUrunIds: string[] = []
    if (sescimDb) {
      try {
        const nowIso = new Date().toISOString()
        const { data: flasRows } = await sescimDb
          .from('flas_indirimler')
          .select('urun_id')
          .eq('aktif', true)
          .gt('bitis_tarihi', nowIso)
          .lte('baslangic_tarihi', nowIso)
        flasUrunIds = (flasRows || []).map((r: any) => r.urun_id)
      } catch (e) {
        console.error('FeaturedProducts flas error:', e)
      }
    }

    // 3. Akdağ ve Sescim DB'den aday ürün havuzunu çek
    const [flasRes, featuredRes, inStockRes, sescimRes] = await Promise.all([
      flasUrunIds.length > 0
        ? supabase.from('urunler').select(LIGHT_PRODUCT_FIELDS).in('id', flasUrunIds)
        : Promise.resolve({ data: [] }),
      supabase.from('urunler').select(LIGHT_PRODUCT_FIELDS).eq('is_featured', true).limit(20),
      supabase
        .from('urunler')
        .select(LIGHT_PRODUCT_FIELDS)
        .eq('stok_durumu', 'stokta')
        .gt('stok_adedi', 0)
        .not('fiyat', 'is', null)
        .order('created_at', { ascending: false })
        .limit(60),
      sescimDb
        ? sescimDb
            .from('urunler')
            .select('id, slug, ad, kategori:kategori_id, alt_kategori:alt_kategori_id, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, is_featured, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, created_at')
            .limit(20)
        : Promise.resolve({ data: [] })
    ])

    // KRİTİK: Akdağ ürünleri birincil (canonical) stok ve bilgi kaynağıdır.
    ;[...(flasRes.data || []), ...(featuredRes.data || []), ...(inStockRes.data || [])].forEach((p: any) => {
      if (p.id) productMap.set(p.id, p)
    })

    ;(sescimRes.data || []).forEach((p: any) => {
      if (!productMap.has(p.id)) {
        productMap.set(p.id, p)
      } else {
        const existing = productMap.get(p.id)
        productMap.set(p.id, {
          ...existing,
          sescim_fiyat: p.sescim_fiyat ?? existing.sescim_fiyat,
          sescim_indirimli_fiyat: p.sescim_indirimli_fiyat ?? existing.sescim_indirimli_fiyat,
        })
      }
    })
  } else {
    // Normal sıralama (Örn: Yeni Gelenler)
    let query = supabase
      .from('urunler')
      .select(LIGHT_PRODUCT_FIELDS)
      .order(sortBy, { ascending })
      .limit(30)

    let sQuery = sescimDb
      ? sescimDb
          .from('urunler')
          .select('id, slug, ad, kategori:kategori_id, alt_kategori:alt_kategori_id, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, is_featured, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, created_at')
          .order(sortBy, { ascending })
          .limit(30)
      : null

    if (filterByFeatured) {
      query = query.eq('is_featured', true)
      if (sQuery) sQuery = sQuery.eq('is_featured', true)
    }

    const [akdagRes, sescimRes] = await Promise.all([
      query,
      sQuery ? sQuery : Promise.resolve({ data: [] })
    ])

    ;(akdagRes.data || []).forEach((p: any) => {
      if (p.id) productMap.set(p.id, p)
    })

    ;(sescimRes.data || []).forEach((p: any) => {
      if (!productMap.has(p.id)) {
        productMap.set(p.id, p)
      } else {
        const existing = productMap.get(p.id)
        productMap.set(p.id, {
          ...existing,
          sescim_fiyat: p.sescim_fiyat ?? existing.sescim_fiyat,
          sescim_indirimli_fiyat: p.sescim_indirimli_fiyat ?? existing.sescim_indirimli_fiyat,
        })
      }
    })
  }

  const rawProducts = Array.from(productMap.values())
  if (rawProducts.length === 0) return null

  // Sescim Pricing & Stok Kotası tablosunu uygula
  const urunIds = rawProducts.map((p: any) => p.id)
  const pricingMap = await getSescimPricingMap(urunIds)

  let featuredProducts = rawProducts.map((p: any) => {
    const pricing = pricingMap.get(p.id)
    return {
      ...p,
      sescim_fiyat: pricing?.sescim_fiyat ?? p.sescim_fiyat ?? null,
      sescim_indirimli_fiyat: pricing?.sescim_indirimli_fiyat ?? p.sescim_indirimli_fiyat ?? null,
      sescim_indirimli_fiyat_pb: pricing?.sescim_indirimli_fiyat_pb ?? null,
      flas_kampanya: pricing?.flas_kampanya ?? null,
      flas_bitis_tarihi: pricing?.flas_bitis_tarihi ?? null,
      sescim_aktif: pricing?.sescim_aktif ?? p.sescim_aktif ?? true,
      sescim_stok: pricing?.sescim_stok ?? p.sescim_stok ?? null,
      sescim_stok_durumu: pricing?.sescim_stok_durumu ?? p.sescim_stok_durumu ?? null,
      fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: pricing ? pricing.fiyat_sorunuz : p.fiyat_sorunuz })
    }
  }).filter((p: any) => p.sescim_aktif !== false)

  if (isCokSatanlar) {
    const popularBrands = [
      'KÖNİG', 'ROOF', 'SPEKON', 'WESTA', 'BEHRINGER', 'YAMAHA', 
      'RCF', 'SHURE', 'FENİX', 'CAROL', 'STUDIO PLUS', 'STUDIOPLUS', 
      'WÖLLER', 'SOUNDCRAFT', 'LD SYSTEMS', 'MARTIN AUDIO', 'ALTO'
    ]

    featuredProducts.sort((a, b) => {
      const aStock = resolveStock({
        stok_durumu: a.stok_durumu,
        stok_adedi: a.stok_adedi,
        kritik_stok: a.kritik_stok,
        sescim_stok: a.sescim_stok,
        sescim_stok_durumu: a.sescim_stok_durumu,
      })
      const bStock = resolveStock({
        stok_durumu: b.stok_durumu,
        stok_adedi: b.stok_adedi,
        kritik_stok: b.kritik_stok,
        sescim_stok: b.sescim_stok,
        sescim_stok_durumu: b.sescim_stok_durumu,
      })

      // 1. Tükendi olanları vitrinde en sona at
      if (aStock.isTukendi && !bStock.isTukendi) return 1
      if (!aStock.isTukendi && bStock.isTukendi) return -1

      // 2. Flaş indirim / Fırsat ürünleri en öne (+10)
      const aHasDiscount = (a.sescim_indirimli_fiyat && Number(a.sescim_indirimli_fiyat) > 0) ? 10 : 0
      const bHasDiscount = (b.sescim_indirimli_fiyat && Number(b.sescim_indirimli_fiyat) > 0) ? 10 : 0

      // 3. Öne çıkarılan (+5)
      const aFeatured = a.is_featured ? 5 : 0
      const bFeatured = b.is_featured ? 5 : 0

      // 4. Popüler çok satan markalar (+3)
      const aBrand = popularBrands.includes(a.marka?.toUpperCase()) ? 3 : 0
      const bBrand = popularBrands.includes(b.marka?.toUpperCase()) ? 3 : 0

      // 5. Stokta olan (+2)
      const aStokta = aStock.isStokta ? 2 : 0
      const bStokta = bStock.isStokta ? 2 : 0

      const scoreA = aHasDiscount + aFeatured + aBrand + aStokta
      const scoreB = bHasDiscount + bFeatured + bBrand + bStokta
      if (scoreB !== scoreA) return scoreB - scoreA

      return 0
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
