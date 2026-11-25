import { Suspense } from 'react'
import Link from 'next/link'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ProductSearch from '@/components/ProductSearch'
import ProductGrid from '@/components/ProductGrid'
import Pagination from '@/components/Pagination'
import { TUM_KATEGORILER, KATEGORI_HIYERARSI, NEW_KATEGORI_HIYERARSI, HIERARCHY_DATA, findCategoryBySlug } from '@/lib/categories'
import { notFound, redirect } from 'next/navigation'
import { Filter, SlidersHorizontal, ChevronRight, X } from 'lucide-react'
import { getActiveBanners } from '@/lib/banner-service'
import BannerCarousel from '@/components/BannerCarousel'
import ProductFilters from '@/components/ProductFilters'
import { getActiveInspirationSets } from '@/lib/ilham-setleri'
import { getProTercihProducts } from '@/lib/pro-tercih'
import DiscoverCuratedSections from '@/components/DiscoverCuratedSections'
import CategorySeoText from '@/components/CategorySeoText'

import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import { unstable_cache } from 'next/cache'
import { getSescimPricingMap } from '@/lib/sescim-pricing'
import { getSiteUrl } from '@/lib/site-url'
import { isQuoteOnlyProduct } from '@/lib/distributor-rules'
import { getKur, dovizToTL, type KurData } from '@/lib/kur'
import { resolveStock } from '@/lib/product-stock'
import type { Metadata } from 'next'

export const revalidate = 1800 // 30 dakika Vercel Edge CDN önbelleği
const PER_PAGE = 20

function normalizeBrandName(m?: string): string {
  if (!m) return ''
  const trimmed = m.trim()
  const upper = trimmed.toUpperCase()
  if (upper === 'LD SYSTEM') return 'LD SYSTEMS'
  if (upper === 'ALLEN&HEALTH' || upper === 'ALLEN & HEALTH' || upper === 'ALLEN AND HEATH') return 'ALLEN&HEATH'
  return trimmed
}

function getCategoryPathBreadcrumbs(slugArray: string[], marka?: string) {
  const baseUrl = getSiteUrl()
  const crumbs = [
    { name: 'Ana Sayfa', url: baseUrl },
    { name: 'Ürünler', url: `${baseUrl}/urunler` },
  ]
  if (marka) {
    crumbs.push({ name: marka, url: `${baseUrl}/urunler?marka=${encodeURIComponent(marka)}` })
    return crumbs
  }
  let currentList = HIERARCHY_DATA
  let path = '/urunler'
  for (const slug of slugArray) {
    const node = currentList.find((n) => n.slug === slug)
    if (node) {
      path += `/${node.slug}`
      crumbs.push({ name: node.name, url: `${baseUrl}${path}` })
      currentList = node.children || []
    } else {
      path += `/${slug}`
      crumbs.push({ name: slug, url: `${baseUrl}${path}` })
      break
    }
  }
  return crumbs
}

// Filtre seçeneklerini cache-leyerek egress tasarrufu yapıyoruz (Akdağ + Sescim hibrit)
const getCachedFilters = unstable_cache(
  async () => {
    const supabase = await createAkdagServerClient()
    const sescimDb = await createServerSupabaseClient()
    const [akdagRes, sescimRes] = await Promise.all([
      supabase.from('urunler').select('marka, kullanim_alani').limit(5000),
      sescimDb ? sescimDb.from('urunler').select('marka, kullanim_alani').limit(5000) : Promise.resolve({ data: [] })
    ])
    const allData = [...(akdagRes.data || []), ...(sescimRes.data || [])]
    const markalar = Array.from(new Set(allData.map((r: any) => r.marka).filter(Boolean))).sort() as string[]
    const kullanimAlanlari = Array.from(new Set(allData.map((r: any) => r.kullanim_alani).filter(Boolean))).sort() as string[]
    
    return { markalar, kullanimAlanlari }
  },
  ['product-filters'],
  { revalidate: 3600 } // 1 saatlik cache
)

// Keşfet Sayfası Özel Vitrinleri (unstable_cache ile 30 dk önbellek)
const getMainDiscoverCurated = unstable_cache(
  async () => {
    try {
      const akdagClient = await createAkdagServerClient()
      const [sets, proProds, newRes, bestRes, forYouRes] = await Promise.all([
        getActiveInspirationSets(),
        getProTercihProducts(),
        akdagClient.from('urunler').select(LIGHT_PRODUCT_FIELDS).order('created_at', { ascending: false }).limit(8),
        akdagClient.from('urunler').select(LIGHT_PRODUCT_FIELDS).gt('fiyat', 1000).order('fiyat', { ascending: false }).limit(8),
        akdagClient.from('urunler').select(LIGHT_PRODUCT_FIELDS).in('kategori', ['Stüdyo Ekipmanları', 'Kulaklık & Monitör', 'DJ Ekipmanları']).limit(8),
      ])

      let inspirationSets = sets || []
      let proTercihProducts = proProds || []
      let newArrivals = newRes.data || []
      let bestSellers = bestRes.data || []
      let forYouProducts = forYouRes.data || []

      // Fiyatlandırma eşlemesi
      const allCurated = [...newArrivals, ...bestSellers, ...forYouProducts]
      const curIds = Array.from(new Set(allCurated.map((p: any) => p.id)))
      if (curIds.length > 0) {
        const pMap = await getSescimPricingMap(curIds)
        const formatCurated = (list: any[]) => list.map((p: any) => {
          const pr = pMap.get(p.id)
          if (pr) {
            return {
              ...p,
              sescim_fiyat: pr.sescim_fiyat,
              sescim_indirimli_fiyat: pr.sescim_indirimli_fiyat,
              sescim_indirimli_fiyat_pb: pr.sescim_indirimli_fiyat_pb,
              flas_kampanya: pr.flas_kampanya ?? null,
              flas_bitis_tarihi: pr.flas_bitis_tarihi ?? null,
              sescim_aktif: pr.sescim_aktif,
              sescim_stok: pr.sescim_stok,
              sescim_stok_durumu: pr.sescim_stok_durumu,
              fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, ad: p.ad, fiyat_sorunuz: pr.fiyat_sorunuz, fiyat_acik: pr.fiyat_acik }),
              fiyat_acik: pr.fiyat_acik ?? false,
            }
          }
          return { ...p, sescim_aktif: true, fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: false }) }
        }).filter((p: any) => p.sescim_aktif === true)

        newArrivals = formatCurated(newArrivals)
        bestSellers = formatCurated(bestSellers)
        forYouProducts = formatCurated(forYouProducts)
      }

      return {
        inspirationSets,
        proTercihProducts,
        newArrivals,
        bestSellers,
        forYouProducts
      }
    } catch (e) {
      console.error('Discover curated showcase load error:', e)
      return {
        inspirationSets: [],
        proTercihProducts: [],
        newArrivals: [],
        bestSellers: [],
        forYouProducts: []
      }
    }
  },
  ['main-discover-curated-showcase'],
  { revalidate: 1800, tags: ['products'] }
)

// Kategori & Filtrelenmiş Ürün Listesi (unstable_cache ile 10 dk önbellek)
const getCachedCategoryProducts = unstable_cache(
  async (cacheKey: string, paramsJson: string) => {
    const {
      slugLength,
      targetNames,
      qText,
      min,
      max,
      stok,
      marka,
      kullanim,
      sirala,
      from,
      to
    } = JSON.parse(paramsJson)

    const sb = await createAkdagServerClient()
    const sescimDb = await createServerSupabaseClient()

    let q = sb.from('urunler').select(LIGHT_PRODUCT_FIELDS)
    let sq = sescimDb
      ? sescimDb
          .from('urunler')
          .select(
            'id, slug, ad, kategori:kategori_id, alt_kategori:alt_kategori_id, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, is_featured, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, created_at'
          )
      : null

    if (qText) {
      q = q.ilike('ad', `%${qText}%`)
      if (sq) sq = sq.ilike('ad', `%${qText}%`)
    }
    if (targetNames && targetNames.length > 0) {
      if (slugLength === 1) {
        q = q.in('kategori', targetNames)
        if (sq) sq = sq.in('kategori_id', targetNames)
      } else if (slugLength === 2) {
        q = q.in('alt_kategori', targetNames)
        if (sq) sq = sq.in('alt_kategori_id', targetNames)
      } else if (slugLength === 3) {
        q = q.in('urun_tipi', targetNames)
        // Sescim veritabanında urun_tipi sütunu bulunmadığı ve yaprak kategoriler Akdağ kataloğuyla eşleştiği için
        // kategori dışı bağımsız veya ayna kayıtların bu listeye sızmasını önlemek üzere sq 3. seviyede kapatılır.
        sq = null
      }
    }
    if (marka && marka !== 'tum') {
      const targetMarka = normalizeBrandName(marka)
      q = q.ilike('marka', targetMarka)
      if (sq) sq = sq.ilike('marka', targetMarka)
    }
    if (kullanim && kullanim !== 'tum') {
      q = q.eq('kullanim_alani', kullanim)
      if (sq) sq = sq.eq('kullanim_alani', kullanim)
    }

    const [akdagRes, sescimRes] = await Promise.all([
      q,
      sq ? sq : Promise.resolve({ data: [] })
    ])

    const aData = akdagRes.data || []
    const sData = (sescimRes.data || []).map((p: any) => ({
      ...p,
      sescim_fiyat: p.sescim_fiyat ?? p.fiyat ?? null,
      sescim_aktif: p.sescim_aktif !== false
    }))

    const productMap = new Map<string, any>()
    aData.forEach((p: any) => productMap.set(p.id, p))

    sData.forEach((p: any) => {
      if (!productMap.has(p.id)) {
        // Eğer kategori filtresi aktifse, Sescim'den gelen ürünün ilgili kategoriye ait olduğu doğrulanmalıdır
        if (targetNames && targetNames.length > 0) {
          const pKat = p.kategori || p.kategori_id
          const pAltKat = p.alt_kategori || p.alt_kategori_id
          if (slugLength === 1 && (!pKat || !targetNames.includes(pKat))) {
            return
          }
          if (slugLength === 2 && (!pAltKat || !targetNames.includes(pAltKat))) {
            return
          }
          if (slugLength === 3) {
            return
          }
        }
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

    const combined = Array.from(productMap.values())
    if (combined.length === 0) {
      return { products: [], count: 0 }
    }

    const kur = await getKur()
    const allUrunIds = combined.map((p: any) => p.id)
    const pricingMap = await getSescimPricingMap(allUrunIds)

    let fullProducts = combined
      .map((p: any) => {
        const pricing = pricingMap.get(p.id)
        if (pricing) {
          return {
            ...p,
            sescim_fiyat: pricing.sescim_fiyat,
            sescim_indirimli_fiyat: pricing.sescim_indirimli_fiyat,
            sescim_indirimli_fiyat_pb: pricing.sescim_indirimli_fiyat_pb,
            flas_kampanya: pricing.flas_kampanya ?? null,
            flas_bitis_tarihi: pricing.flas_bitis_tarihi ?? null,
            sescim_aktif: pricing.sescim_aktif,
            sescim_stok: pricing.sescim_stok,
            sescim_stok_durumu: pricing.sescim_stok_durumu,
            fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, ad: p.ad, fiyat_sorunuz: pricing.fiyat_sorunuz, fiyat_acik: pricing.fiyat_acik }),
            fiyat_acik: pricing.fiyat_acik ?? false,
          }
        }
        return {
          ...p,
          sescim_aktif: true,
          fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: false })
        }
      })
      .filter((p: any) => p.sescim_aktif === true)

    // Gerçek efektif TL fiyatını hesaplayan yardımcı fonksiyon (Flaş indirim TL ise kur çarpılmaz)
    const getEffectivePriceTL = (p: any): number => {
      if (p.fiyat_sorunuz) return Infinity
      const pb = p.para_birimi || 'TRY'
      const indirimPB = p.sescim_indirimli_fiyat_pb || pb
      const rawDiscount = p.sescim_indirimli_fiyat ?? null
      const rawBase = p.sescim_fiyat ?? p.fiyat ?? 0
      const basePriceTL = dovizToTL(Number(rawBase), pb, kur)

      if (rawDiscount !== null && rawDiscount !== undefined && Number(rawDiscount) > 0) {
        const discountPriceTL = dovizToTL(Number(rawDiscount), indirimPB, kur)
        if (discountPriceTL > 0 && discountPriceTL < basePriceTL) {
          return discountPriceTL
        }
      }
      return basePriceTL
    }

    // Min ve Max Fiyat Filtresi (Gerçek TL cinsinden hatasız filtreleme)
    if (min !== null && min !== undefined && !isNaN(min)) {
      fullProducts = fullProducts.filter((p: any) => {
        const tl = getEffectivePriceTL(p)
        return tl !== Infinity && tl >= min
      })
    }
    if (max !== null && max !== undefined && !isNaN(max)) {
      fullProducts = fullProducts.filter((p: any) => {
        const tl = getEffectivePriceTL(p)
        return tl !== Infinity && tl <= max
      })
    }

    // Stok Durumu Filtresi (Merkezi Stok Motoru ile Hatasız Hesaplama)
    if (stok && stok !== 'tum') {
      fullProducts = fullProducts.filter((p: any) => {
        const s = resolveStock({
          stok_durumu: p.stok_durumu,
          stok_adedi: p.stok_adedi,
          kritik_stok: p.kritik_stok,
          sescim_stok: p.sescim_stok,
          sescim_stok_durumu: p.sescim_stok_durumu,
        })
        if (stok === 'stokta') return s.canOrder || s.durum === 'stokta'
        return s.durum === stok
      })
    }

    // Sıralama (Gerçek TL Fiyatları, Satış Adetleri ve Alfabetik)
    if (sirala === 'fiyat_artan') {
      fullProducts.sort((a: any, b: any) => {
        const pA = getEffectivePriceTL(a)
        const pB = getEffectivePriceTL(b)
        return pA - pB
      })
    } else if (sirala === 'fiyat_azalan') {
      fullProducts.sort((a: any, b: any) => {
        const pA = a.fiyat_sorunuz ? -1 : getEffectivePriceTL(a)
        const pB = b.fiyat_sorunuz ? -1 : getEffectivePriceTL(b)
        return pB - pA
      })
    } else if (sirala === 'ad_asc') {
      fullProducts.sort((a: any, b: any) => (a.ad || '').localeCompare(b.ad || '', 'tr'))
    } else if (sirala === 'ad_desc') {
      fullProducts.sort((a: any, b: any) => (b.ad || '').localeCompare(a.ad || '', 'tr'))
    } else if (sirala === 'cok_satanlar') {
      let salesCounts = new Map<string, number>()
      if (sescimDb) {
        try {
          const { data: kal } = await sescimDb.from('siparis_kalemleri').select('urun_id, adet')
          ;(kal || []).forEach((k: any) => {
            if (k.urun_id) salesCounts.set(k.urun_id, (salesCounts.get(k.urun_id) || 0) + (k.adet || 1))
          })
        } catch {}
      }
      const popularBrands = ['SOUNDCRAFT', 'YAMAHA', 'RCF', 'BEHRINGER', 'LD SYSTEMS', 'MARTIN AUDIO', 'KÖNİG', 'ALTO', 'ROOF', 'AUDAC', 'MACKIE']
      fullProducts.sort((a: any, b: any) => {
        const sA = (salesCounts.get(a.id) || 0) + (popularBrands.includes(a.marka?.toUpperCase()) ? 3 : 0) + (a.is_featured ? 5 : 0)
        const sB = (salesCounts.get(b.id) || 0) + (popularBrands.includes(b.marka?.toUpperCase()) ? 3 : 0) + (b.is_featured ? 5 : 0)
        if (sB !== sA) return sB - sA
        return getEffectivePriceTL(b) - getEffectivePriceTL(a)
      })
    } else {
      // Varsayılan: En Yeniler
      fullProducts.sort((a: any, b: any) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0
        return tB - tA
      })
    }

    const totalCount = fullProducts.length
    const paged = fullProducts.slice(from, to + 1)

    return { products: paged, count: totalCount }
  },
  ['category-products-listing'],
  { revalidate: 600, tags: ['products'] }
)

interface Props {
  params: { slug?: string[] }
  searchParams: {
    q?: string
    sayfa?: string
    min?: string
    max?: string
    stok?: string
    marka?: string
    kullanim?: string
    sirala?: string
  }
}

export async function generateMetadata({ params, searchParams }: Props) {
  const baseUrl = getSiteUrl()
  const hasFilterParams = !!(searchParams?.min || searchParams?.max || searchParams?.stok || searchParams?.sirala || searchParams?.kullanim)
  const robots = hasFilterParams 
    ? { index: false, follow: true }
    : { index: true, follow: true }

  if (searchParams?.marka) {
    const marka = searchParams.marka
    const rawTitle = `${marka} Fiyatları ve Modelleri | Yetkili Satıcı - Sescim`
    const description = `Tüm orijinal ${marka} profesyonel ses, sahne ve stüdyo ekipmanları en uygun fiyat, aynı gün kargo ve resmi distribütör garantisiyle Sescim'de.`
    const url = `${baseUrl}/urunler?marka=${encodeURIComponent(marka)}`
    return { 
      title: rawTitle,
      description,
      alternates: { canonical: url },
      robots,
      openGraph: {
        title: `${rawTitle} | Sescim`,
        description,
        url,
        siteName: 'Sescim',
        locale: 'tr_TR',
        type: 'website',
        images: [{ url: `${baseUrl}/logo.png`, width: 1200, height: 630, alt: `${marka} Sescim` }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${rawTitle} | Sescim`,
        description,
        images: [`${baseUrl}/logo.png`],
      },
    }
  }

  if (searchParams?.sirala === 'cok_satanlar' && (!params.slug || params.slug.length === 0)) {
    const rawTitle = 'En Çok Satan Profesyonel Ses ve Sahne Ekipmanları | Sescim'
    const description = 'Sescim güvencesiyle Türkiye\'nin en çok tercih edilen ve en popüler profesyonel ses sistemleri, mikserler, mikrofonlar ve stüdyo donanımları.'
    const url = `${baseUrl}/urunler?sirala=cok_satanlar`
    return {
      title: rawTitle,
      description,
      alternates: { canonical: url },
      robots,
      openGraph: {
        title: `${rawTitle} | Sescim`,
        description,
        url,
        siteName: 'Sescim',
        locale: 'tr_TR',
        type: 'website',
        images: [{ url: `${baseUrl}/logo.png`, width: 1200, height: 630, alt: 'En Çok Satanlar Sescim' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${rawTitle} | Sescim`,
        description,
        images: [`${baseUrl}/logo.png`],
      },
    }
  }

  if (!params.slug || params.slug.length === 0) {
    const rawTitle = 'Profesyonel Ses, Işık ve Görüntü Ekipmanları | Sescim'
    const description = 'Türkiye\'nin profesyonel ses sistemleri, mikserler, hoparlörler, sahne ışıkları ve stüdyo ekipmanları online satış mağazası. Aynı gün kargo, peşin fiyatına taksit.'
    const url = `${baseUrl}/urunler`
    return { 
      title: rawTitle,
      description,
      alternates: { canonical: url },
      robots,
      openGraph: {
        title: `${rawTitle} | Sescim`,
        description,
        url,
        siteName: 'Sescim',
        locale: 'tr_TR',
        type: 'website',
        images: [{ url: `${baseUrl}/logo.png`, width: 1200, height: 630, alt: 'Sescim Ürün Kataloğu' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${rawTitle} | Sescim`,
        description,
        images: [`${baseUrl}/logo.png`],
      },
    }
  }

  const category = findCategoryBySlug(params.slug)
  if (!category) return { title: 'Ürünler' }

  const catName = category.name
  const rawTitle = `${catName} Fiyatları ve Modelleri | Peşin Fiyatına Taksit - Sescim`
  const description = `En kaliteli ${catName.toLowerCase()} ekipmanları, %100 orijinal distribütör garantisi, aynı gün kargo ve 6 aya varan taksit avantajıyla Sescim'de. Hemen inceleyin!`
  const canonicalSlug = category.canonicalPath ? category.canonicalPath.join('/') : params.slug.join('/')
  const url = `${baseUrl}/urunler/${canonicalSlug}`

  return { 
    title: rawTitle,
    description,
    alternates: { canonical: url },
    robots,
    openGraph: {
      title: `${rawTitle} | Sescim`,
      description,
      url,
      siteName: 'Sescim',
      locale: 'tr_TR',
      type: 'website',
      images: [{ url: `${baseUrl}/logo.png`, width: 1200, height: 630, alt: catName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${rawTitle} | Sescim`,
      description,
      images: [`${baseUrl}/logo.png`],
    },
  }
}

export default async function UrunlerPage({ params, searchParams }: Props) {
  const slugArray = params.slug || []
  
  // Kategori Bulma
  let activeCategory: any = null
  if (slugArray.length > 0) {
    activeCategory = findCategoryBySlug(slugArray)
    if (!activeCategory) notFound()

    // Eğer eksik hiyerarşik bağlantıyla gelinmişse (örn: /urunler/kablolu-mikrofonlar), canonical hiyerarşik URL'e yönlendir
    if (activeCategory.canonicalPath && activeCategory.canonicalPath.join('/') !== slugArray.join('/')) {
      const sp = new URLSearchParams()
      for (const [key, val] of Object.entries(searchParams || {})) {
        if (val !== undefined) sp.set(key, String(val))
      }
      const qStr = sp.toString() ? `?${sp.toString()}` : ''
      redirect(`/urunler/${activeCategory.canonicalPath.join('/')}${qStr}`)
    }
  }

  const sayfa = Math.max(1, parseInt(searchParams.sayfa || '1'))
  const from = (sayfa - 1) * PER_PAGE
  const to = from + PER_PAGE - 1
  const min = searchParams.min ? Number(searchParams.min) : null
  const max = searchParams.max ? Number(searchParams.max) : null
  const sirala = searchParams.sirala || 'yeni'

  const filters = {
    q: searchParams.q,
    activeCategory,
    slugLength: activeCategory?.level || slugArray.length,
    min,
    max,
    stok: searchParams.stok,
    marka: searchParams.marka,
    kullanim: searchParams.kullanim,
    sirala
  }

  const hasActiveFilterOrSort = !!(
    filters.q ||
    filters.marka ||
    filters.stok ||
    filters.min !== null ||
    filters.max !== null ||
    filters.kullanim ||
    (filters.sirala && filters.sirala !== 'yeni') ||
    sayfa > 1
  )

  const isMainDiscoverPage = slugArray.length === 0 && !hasActiveFilterOrSort

  let products: any[] = []
  let count = 0

  if (!isMainDiscoverPage) {
    const targetNames = activeCategory
      ? (Array.isArray(activeCategory.dbName)
          ? activeCategory.dbName
          : [activeCategory.dbName || activeCategory.name])
      : null

    const cacheKey = `${slugArray.join('/')}_s${sayfa}_q${filters.q || ''}_m${filters.marka || ''}_k${filters.kullanim || ''}_st${filters.stok || ''}_min${filters.min ?? ''}_max${filters.max ?? ''}_ord${filters.sirala}`

    const paramsJson = JSON.stringify({
      slugLength: filters.slugLength,
      targetNames,
      qText: filters.q,
      min: filters.min,
      max: filters.max,
      stok: filters.stok,
      marka: filters.marka,
      kullanim: filters.kullanim,
      sirala: filters.sirala,
      from,
      to
    })

    const res = await getCachedCategoryProducts(cacheKey, paramsJson)
    products = res.products || []
    count = res.count || 0
  }

  const totalPages = Math.ceil((count || 0) / PER_PAGE)

  // Cache'den filtreleri çek
  const { markalar, kullanimAlanlari } = await getCachedFilters()

  // Aktif Bannerları Çek
  const banners = await getActiveBanners()

  // Keşfet Sayfası Özel Vitrinleri (İlham Setleri, Pro Tercihi, Yeni Gelenler, Çok Satanlar, vb.)
  let inspirationSets: any[] = []
  let proTercihProducts: any[] = []
  let newArrivals: any[] = []
  let bestSellers: any[] = []
  let forYouProducts: any[] = []

  if (isMainDiscoverPage) {
    const curated = await getMainDiscoverCurated()
    inspirationSets = curated.inspirationSets
    proTercihProducts = curated.proTercihProducts
    newArrivals = curated.newArrivals
    bestSellers = curated.bestSellers
    forYouProducts = curated.forYouProducts
  }

  const baseParams = new URLSearchParams()
  Object.entries(searchParams).forEach(([k, v]) => { if (v && k !== 'sayfa') baseParams.set(k, v) })

  const categoryPath = slugArray.length > 0 ? `/urunler/${slugArray.join('/')}` : '/urunler'
  const baseUrl = getSiteUrl()
  const crumbs = getCategoryPathBreadcrumbs(slugArray, filters.marka)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: filters.marka ? `${filters.marka} Ürünleri` : activeCategory ? `${activeCategory.name} Modelleri ve Fiyatları` : 'Sescim Ürün Kataloğu',
    numberOfItems: (products || []).length,
    itemListElement: (products || []).slice(0, 16).map((p: any, idx: number) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${baseUrl}/urun/${encodeURIComponent(p.slug || p.id)}`,
      name: p.ad,
    })),
  }

  const collectionPageJsonLd = activeCategory ? {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${activeCategory.name} Fiyatları ve Modelleri`,
    description: `${activeCategory.name} profesyonel ses, ışık ve müzik ekipmanları Sescim güvencesiyle.`,
    url: `${baseUrl}${categoryPath}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Sescim',
      url: baseUrl,
    },
  } : null

  return (
    <div className="min-h-screen pb-24">
      {/* Google Rich Snippets: BreadcrumbList, ItemList & CollectionPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {collectionPageJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
        />
      )}
      {products && products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      
      {/* Kampanya / Banner Alanı (Sadece Ana Keşfet Sayfasında) */}
      {isMainDiscoverPage && <BannerCarousel banners={banners} />}

      {/* Başlık + Arama — Banner’ın hemen altında, aktarımlı geçiş */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6">
        {/* Görsel ve Semantik Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500">
            {crumbs.map((c, i) => (
              <li key={c.url} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                {i === crumbs.length - 1 ? (
                  <span className="font-semibold text-slate-900">{c.name}</span>
                ) : (
                  <Link href={c.url.replace(baseUrl, '') || '/'} className="hover:text-brand-red transition-colors">
                    {c.name}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-[2px] bg-brand-red" />
          <span className="font-display font-black text-[10px] tracking-[0.4em] uppercase text-brand-red">
            {filters.marka 
              ? 'Marka Kataloğu' 
              : activeCategory 
                ? 'Kategori Kataloğu' 
                : filters.sirala === 'cok_satanlar'
                  ? 'Popüler Ürünler'
                  : 'Keşfet & Çözüm Kataloğu'}
          </span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-4xl md:text-6xl uppercase text-slate-900 tracking-tighter leading-none">
              {filters.marka 
                ? filters.marka 
                : activeCategory 
                  ? activeCategory.name 
                  : filters.sirala === 'cok_satanlar'
                    ? 'ÇOK SATANLAR'
                    : filters.sirala === 'fiyat_artan'
                      ? 'FİYAT (DÜŞÜKTEN YÜKSEĞE)'
                      : filters.sirala === 'fiyat_azalan'
                        ? 'FİYAT (PAHALIDAN UCUZA)'
                        : 'KEŞFET'}
            </h1>
            {filters.marka ? (
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xl font-body">
                Tüm orijinal <strong className="text-slate-800">{filters.marka}</strong> profesyonel ses, stüdyo ve sahne sistemleri. Yetkili distribütör garantisi ve hızlı teslimat avantajıyla.
              </p>
            ) : filters.sirala === 'cok_satanlar' ? (
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xl font-body">
                Sescim.com&apos;da en çok sipariş edilen ve profesyoneller tarafından en çok tercih edilen popüler ses, ışık ve stüdyo ekipmanları.
              </p>
            ) : !activeCategory ? (
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xl font-body">
                Aradığınız profesyonel ses, sahne ve stüdyo ekipmanlarını hazır çözümler, popüler tercihler ve uzman seçimleriyle keşfedin.
              </p>
            ) : null}

            {/* Aktif Marka Filtresi Rozeti */}
            {filters.marka && (
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs text-slate-400 font-body">Seçili Marka:</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-brand-red/20 rounded-full text-xs font-bold text-brand-red font-display tracking-wide">
                  <span>{filters.marka}</span>
                  <Link 
                    href="/urunler" 
                    className="hover:bg-brand-red hover:text-white rounded-full p-0.5 transition-colors"
                    title="Filtreyi Temizle"
                  >
                    <X size={12} />
                  </Link>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* KEŞFET ÖZEL VİTRİNLERİ (Sadece Ana Keşfet Sayfasında Gösterilir) */}
        {isMainDiscoverPage && (
          <DiscoverCuratedSections
            inspirationSets={inspirationSets}
            proTercihProducts={proTercihProducts}
            newArrivals={newArrivals}
            bestSellers={bestSellers}
            forYouProducts={forYouProducts}
            markalar={markalar}
          />
        )}
      </div>

      {!isMainDiscoverPage && (
        <div id="tum-urunler-grid" className="max-w-7xl mx-auto px-6 pt-6 md:pt-10 flex flex-col lg:flex-row gap-8 scroll-mt-24">
          
          {/* Sidebar Filters */}
          <div className="w-full lg:w-1/4 flex-shrink-0">
            <ProductFilters 
              markalar={markalar} 
              kullanimAlanlari={kullanimAlanlari} 
              searchParams={searchParams} 
              slugArray={slugArray}
            />
          </div>

          {/* Main Content */}
          <div className="w-full lg:w-3/4 flex-1">

          {/* Dinamik Kategori Gezgini */}
          <div className="mb-8">
            {!activeCategory ? (
              <div className="flex flex-wrap gap-2">
                {NEW_KATEGORI_HIYERARSI.map((kat) => (
                  <Link
                    key={kat.slug}
                    href={filters.marka ? `/urunler/${kat.slug}?marka=${encodeURIComponent(filters.marka)}` : `/urunler/${kat.slug}`}
                    className="font-display font-bold text-[10px] tracking-widest uppercase px-6 py-3 border border-slate-200 bg-white text-slate-500 hover:border-brand-red/40 hover:text-slate-900 transition-all duration-300"
                  >
                    {kat.name}
                  </Link>
                ))}
              </div>
            ) : activeCategory.children && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-slate-500">
                  <span className="font-display font-bold text-[9px] uppercase tracking-[0.3em] whitespace-nowrap">ALT KATEGORİLER</span>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeCategory.children.map((child: any) => (
                    <Link
                      key={child.slug}
                      href={`/urunler/${slugArray.join('/')}/${child.slug}`}
                      className="font-display font-bold text-[10px] tracking-widest uppercase px-5 py-2.5 border border-brand-red/10 bg-brand-red/[0.02] text-brand-red/50 hover:bg-brand-red hover:text-white transition-all"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sonuç Sayacı */}
          <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-200">
            <div className="font-display font-bold text-[11px] tracking-widest text-slate-500 uppercase">
               TOPLAM <span className="text-slate-900 ml-1">{count || 0}</span> ÜRÜN LİSTELENİYOR
            </div>
            {count && count > 0 && (
              <div className="font-body text-xs text-slate-500">
                SAYFA {sayfa} / {totalPages}
              </div>
            )}
          </div>

          <Suspense key={`suspense-${categoryPath}-${sayfa}`} fallback={<GridSkeleton />}>
            <ProductGrid 
              key={`products-${categoryPath}-${sayfa}`}
              products={products || []} 
              searchQuery={searchParams.q} 
            />
          </Suspense>

          {totalPages > 1 && (
            <div className="mt-20">
              <Pagination
                currentPage={sayfa}
                totalPages={totalPages}
                baseParams={baseParams.toString()}
                basePath={categoryPath}
              />
            </div>
          )}

          {/* Kategori SEO Rehber & Tanıtım Metinleri */}
          <CategorySeoText 
            categorySlug={slugArray[slugArray.length - 1] || activeCategory?.slug} 
            categoryName={filters.marka ? `${filters.marka} Profesyonel Ekipmanları` : activeCategory?.name} 
          />
          </div>
        </div>
      )}
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 h-[400px] overflow-hidden">
          <div className="aspect-square bg-slate-100 animate-pulse" />
          <div className="p-4 space-y-3">
             <div className="h-4 bg-slate-200 w-3/4 animate-pulse" />
             <div className="h-3 bg-slate-100 w-1/2 animate-pulse" />
             <div className="pt-4 flex justify-between items-center">
                <div className="h-5 bg-slate-200 w-1/3 animate-pulse" />
                <div className="h-8 bg-slate-200 w-1/4 animate-pulse" />
             </div>
          </div>
        </div>
      ))}
    </div>
  )
}
