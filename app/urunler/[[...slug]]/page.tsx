import { Suspense } from 'react'
import Link from 'next/link'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
import ProductSearch from '@/components/ProductSearch'
import ProductGrid from '@/components/ProductGrid'
import Pagination from '@/components/Pagination'
import { TUM_KATEGORILER, KATEGORI_HIYERARSI, NEW_KATEGORI_HIYERARSI, HIERARCHY_DATA, findCategoryBySlug } from '@/lib/categories'
import { notFound } from 'next/navigation'
import { Filter, SlidersHorizontal, ChevronRight, X } from 'lucide-react'
import { getActiveBanners } from '@/lib/banner-service'
import BannerCarousel from '@/components/BannerCarousel'
import ProductFilters from '@/components/ProductFilters'
import { getActiveInspirationSets } from '@/lib/ilham-setleri'
import { getProTercihProducts } from '@/lib/pro-tercih'
import DiscoverCuratedSections from '@/components/DiscoverCuratedSections'

import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import { unstable_cache } from 'next/cache'
import { getSescimPricingMap } from '@/lib/sescim-pricing'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PER_PAGE = 16

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

// Filtre seçeneklerini cache-leyerek egress tasarrufu yapıyoruz
const getCachedFilters = unstable_cache(
  async () => {
    const supabase = await createAkdagServerClient()
    const { data } = await supabase
      .from('urunler')
      .select('marka, kullanim_alani')
      .limit(5000)
    
    const markalar = Array.from(new Set((data || []).map((r) => r.marka).filter(Boolean))).sort() as string[]
    const kullanimAlanlari = Array.from(new Set((data || []).map((r) => r.kullanim_alani).filter(Boolean))).sort() as string[]
    
    return { markalar, kullanimAlanlari }
  },
  ['product-filters'],
  { revalidate: 3600 } // 1 saatlik cache
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

  if (searchParams?.marka) {
    const marka = searchParams.marka
    const title = `${marka} Ürünleri, Modelleri ve Fiyatları | Sescim`
    const description = `Tüm orijinal ${marka} profesyonel ses, sahne ve stüdyo ekipmanları en uygun fiyat ve distribütör garantisiyle Sescim'de.`
    const url = `${baseUrl}/urunler?marka=${encodeURIComponent(marka)}`
    return { 
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        siteName: 'Sescim',
        locale: 'tr_TR',
        type: 'website',
        images: [{ url: `${baseUrl}/logo.png`, width: 1200, height: 630, alt: `${marka} Sescim` }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [`${baseUrl}/logo.png`],
      },
    }
  }

  if (!params.slug || params.slug.length === 0) {
    const title = 'Tüm Profesyonel Ses, Işık ve Görüntü Ürünleri | Sescim'
    const description = 'Tüm profesyonel ses sistemleri, mikserler, hoparlörler, mikrofonlar ve sahne sistemleri en uygun fiyat ve taksit seçenekleriyle Sescim\'de.'
    const url = `${baseUrl}/urunler`
    return { 
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        siteName: 'Sescim',
        locale: 'tr_TR',
        type: 'website',
        images: [{ url: `${baseUrl}/logo.png`, width: 1200, height: 630, alt: 'Sescim Ürün Kataloğu' }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [`${baseUrl}/logo.png`],
      },
    }
  }

  const category = findCategoryBySlug(params.slug)
  if (!category) return { title: 'Ürünler | Sescim' }

  const catName = category.name
  const title = `${catName} Modelleri ve Fiyatları | Sescim`
  const description = `En kaliteli ${catName.toLowerCase()} ekipmanları, orijinal ürün garantisi, aynı gün kargo ve 12 aya varan taksit seçenekleriyle Sescim'de.`
  const url = `${baseUrl}/urunler/${params.slug.join('/')}`

  return { 
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Sescim',
      locale: 'tr_TR',
      type: 'website',
      images: [{ url: `${baseUrl}/logo.png`, width: 1200, height: 630, alt: catName }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/logo.png`],
    },
  }
}

export default async function UrunlerPage({ params, searchParams }: Props) {
  const supabase = await createAkdagServerClient()
  const slugArray = params.slug || []
  
  // Kategori Bulma
  let activeCategory: any = null
  if (slugArray.length > 0) {
    activeCategory = findCategoryBySlug(slugArray)
    if (!activeCategory) notFound()
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
    slugLength: slugArray.length,
    min,
    max,
    stok: searchParams.stok,
    marka: searchParams.marka,
    kullanim: searchParams.kullanim,
    sirala
  }

  const isMainDiscoverPage = slugArray.length === 0 && !filters.q && !filters.marka && !filters.stok && !filters.min && !filters.max

  // Ürün sorgusu - sayfa zaten force-dynamic olduğundan ayrıca cache gerekmez
  const fetchProducts = async () => {
    const sb = await createAkdagServerClient()
    let q = sb.from('urunler').select(LIGHT_PRODUCT_FIELDS, { count: 'exact' })

    if (filters.q) q = q.ilike('ad', `%${filters.q}%`)
    if (filters.activeCategory) {
      const targetNames = Array.isArray(filters.activeCategory.dbName)
        ? filters.activeCategory.dbName
        : [filters.activeCategory.dbName || filters.activeCategory.name]

      if (filters.slugLength === 1) q = q.in('kategori', targetNames)
      else if (filters.slugLength === 2) q = q.in('alt_kategori', targetNames)
      else if (filters.slugLength === 3) q = q.in('urun_tipi', targetNames)
    }
    if (filters.min) q = q.gte('fiyat', filters.min)
    if (filters.max) q = q.lte('fiyat', filters.max)
    if (filters.stok && filters.stok !== 'tum') q = q.eq('stok_durumu', filters.stok)
    if (filters.marka && filters.marka !== 'tum') q = q.ilike('marka', filters.marka)
    if (filters.kullanim && filters.kullanim !== 'tum') q = q.eq('kullanim_alani', filters.kullanim)

    if (filters.sirala === 'yeni') q = q.order('created_at', { ascending: false })
    else if (filters.sirala === 'fiyat_artan') q = q.order('fiyat', { ascending: true })
    else if (filters.sirala === 'fiyat_azalan') q = q.order('fiyat', { ascending: false })
    else if (filters.sirala === 'ad_asc') q = q.order('ad', { ascending: true })

    return q.range(from, to)
  }

  let products: any[] = []
  let count = 0

  if (!isMainDiscoverPage) {
    const res = await fetchProducts() as any
    products = res.data || []
    count = res.count || 0
  }

  if (products && products.length > 0) {
    try {
      const urunIds = products.map((p: any) => p.id)
      const pricingMap = await getSescimPricingMap(urunIds)
      products = products
        .map((p: any) => {
          const pricing = pricingMap.get(p.id)
          if (pricing) {
            return { 
              ...p, 
              sescim_fiyat: pricing.sescim_fiyat,
              sescim_indirimli_fiyat: pricing.sescim_indirimli_fiyat,
              sescim_aktif: pricing.sescim_aktif,
              fiyat_sorunuz: pricing.fiyat_sorunuz
            }
          }
          // Sescim'de kaydı olmayan ürünler her zaman gösterilir (default: true)
          return { ...p, sescim_aktif: true, fiyat_sorunuz: false }
        })
        .filter((p: any) => p.sescim_aktif === true)
    } catch (e) {
      console.error('Sescim pricing fetch failed for product list', e)
      // Hata olursa tüm ürünleri göster
    }
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
    try {
      const akdagClient = await createAkdagServerClient()
      const [sets, proProds, newRes, bestRes, forYouRes] = await Promise.all([
        getActiveInspirationSets(),
        getProTercihProducts(),
        akdagClient.from('urunler').select(LIGHT_PRODUCT_FIELDS).order('created_at', { ascending: false }).limit(8),
        akdagClient.from('urunler').select(LIGHT_PRODUCT_FIELDS).gt('fiyat', 1000).order('fiyat', { ascending: false }).limit(8),
        akdagClient.from('urunler').select(LIGHT_PRODUCT_FIELDS).in('kategori', ['Stüdyo Ekipmanları', 'Kulaklık & Monitör', 'DJ Ekipmanları']).limit(8),
      ])

      inspirationSets = sets || []
      proTercihProducts = proProds || []
      newArrivals = newRes.data || []
      bestSellers = bestRes.data || []
      forYouProducts = forYouRes.data || []

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
              sescim_aktif: pr.sescim_aktif,
              fiyat_sorunuz: pr.fiyat_sorunuz
            }
          }
          return { ...p, sescim_aktif: true, fiyat_sorunuz: false }
        }).filter((p: any) => p.sescim_aktif === true)

        newArrivals = formatCurated(newArrivals)
        bestSellers = formatCurated(bestSellers)
        forYouProducts = formatCurated(forYouProducts)
      }
    } catch (curErr) {
      console.error('Discover curated load error:', curErr)
    }
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

  return (
    <div className="min-h-screen pb-24">
      {/* Google Rich Snippets: BreadcrumbList & ItemList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
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
            {filters.marka ? 'Marka Kataloğu' : activeCategory ? 'Kategori Kataloğu' : 'Keşfet & Çözüm Kataloğu'}
          </span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-4xl md:text-6xl uppercase text-slate-900 tracking-tighter leading-none">
              {filters.marka ? filters.marka : activeCategory ? activeCategory.name : 'KEŞFET'}
            </h1>
            {filters.marka ? (
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xl font-body">
                Tüm orijinal <strong className="text-slate-800">{filters.marka}</strong> profesyonel ses, stüdyo ve sahne sistemleri. Yetkili distribütör garantisi ve hızlı teslimat avantajıyla.
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
