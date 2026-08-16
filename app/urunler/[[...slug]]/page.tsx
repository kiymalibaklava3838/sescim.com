import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ProductSearch from '@/components/ProductSearch'
import ProductGrid from '@/components/ProductGrid'
import Pagination from '@/components/Pagination'
import { TUM_KATEGORILER, KATEGORI_HIYERARSI, NEW_KATEGORI_HIYERARSI, findCategoryBySlug } from '@/lib/categories'
import { notFound } from 'next/navigation'
import { Filter, SlidersHorizontal, ChevronRight, X } from 'lucide-react'
import { getActiveBanners } from '@/lib/banner-service'
import BannerCarousel from '@/components/BannerCarousel'
import ProductFilters from '@/components/ProductFilters'

import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import { unstable_cache } from 'next/cache'
import { getSescimPricingMap } from '@/lib/sescim-pricing'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PER_PAGE = 16

// Filtre seçeneklerini cache-leyerek egress tasarrufu yapıyoruz
const getCachedFilters = unstable_cache(
  async () => {
    const supabase = await createServerSupabaseClient()
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

export async function generateMetadata({ params }: Props) {
  if (!params.slug || params.slug.length === 0) {
    return { title: 'Tüm Ürünler | Sescim.com' }
  }
  const category = findCategoryBySlug(params.slug)
  if (!category) return { title: 'Ürünler | Sescim.com' }
  return { title: `${category.name} | Sescim.com`, description: `${category.name} ürün kategorisi.` }
}

export default async function UrunlerPage({ params, searchParams }: Props) {
  const supabase = await createServerSupabaseClient()
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

  // Ürünleri getiren ana fonksiyonu cache-liyoruz
  const getProducts = unstable_cache(
    async (from: number, to: number, filters: any) => {
      const sb = await createServerSupabaseClient()
      let q = sb.from('urunler').select(LIGHT_PRODUCT_FIELDS, { count: 'exact' })
      
      if (filters.q) q = q.ilike('ad', `%${filters.q}%`)
      if (filters.activeCategory) {
        const targetNames = Array.isArray(filters.activeCategory.dbName) 
          ? filters.activeCategory.dbName 
          : [filters.activeCategory.dbName || filters.activeCategory.name];

        if (filters.slugLength === 1) q = q.in('kategori', targetNames)
        else if (filters.slugLength === 2) q = q.in('alt_kategori', targetNames)
        else if (filters.slugLength === 3) q = q.in('urun_tipi', targetNames)
      }
      if (filters.min) q = q.gte('fiyat', filters.min)
      if (filters.max) q = q.lte('fiyat', filters.max)
      if (filters.stok && filters.stok !== 'tum') q = q.eq('stok_durumu', filters.stok)
      if (filters.marka && filters.marka !== 'tum') q = q.eq('marka', filters.marka)
      if (filters.kullanim && filters.kullanim !== 'tum') q = q.eq('kullanim_alani', filters.kullanim)

      if (filters.sirala === 'yeni') q = q.order('created_at', { ascending: false })
      else if (filters.sirala === 'fiyat_artan') q = q.order('fiyat', { ascending: true })
      else if (filters.sirala === 'fiyat_azalan') q = q.order('fiyat', { ascending: false })
      else if (filters.sirala === 'ad_asc') q = q.order('ad', { ascending: true })

      return q.range(from, to)
    },
    ['product-list-cache'],
    { revalidate: 3600, tags: ['products'] }
  )

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

  let { data: products, count } = await getProducts(from, to, filters) as any

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
              sescim_aktif: pricing.sescim_aktif
            }
          }
          // Sescim'de kaydı olmayan ürünler her zaman gösterilir (default: true)
          return { ...p, sescim_aktif: true }
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

  const baseParams = new URLSearchParams()
  Object.entries(searchParams).forEach(([k, v]) => { if (v && k !== 'sayfa') baseParams.set(k, v) })

  return (
    <div className="min-h-screen pb-24">
      
      {/* Kampanya / Banner Alanı */}
      <BannerCarousel banners={banners} />

      {/* Başlık + Arama — Banner’ın hemen altında, aktarımlı geçiş */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-[2px] bg-brand-red" />
          <span className="font-display font-black text-[10px] tracking-[0.4em] uppercase text-brand-red">
            {activeCategory ? 'Kategori Kataloğu' : 'Tüm Ürünler'}
          </span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-12">
          <h1 className="font-display font-black text-4xl md:text-6xl uppercase text-slate-900 tracking-tighter leading-none flex-shrink-0">
            {activeCategory ? activeCategory.name : 'ÜRÜN KATALOĞU'}
          </h1>
          <div className="flex-1 max-w-xl">
            <ProductSearch fullPage />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8 md:pt-16 flex flex-col lg:flex-row gap-8">
        
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
        <div className="mb-12">
          {!activeCategory ? (
            <div className="flex flex-wrap gap-2">
              {NEW_KATEGORI_HIYERARSI.map((kat) => (
                <a
                  key={kat.slug}
                  href={`/urunler/${kat.slug}`}
                  className="font-display font-bold text-[10px] tracking-widest uppercase px-6 py-3 border border-slate-200 bg-white text-slate-500 hover:border-brand-red/40 hover:text-slate-900 transition-all duration-300"
                >
                  {kat.name}
                </a>
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
                  <a
                    key={child.slug}
                    href={`/urunler/${slugArray.join('/')}/${child.slug}`}
                    className="font-display font-bold text-[10px] tracking-widest uppercase px-5 py-2.5 border border-brand-red/10 bg-brand-red/[0.02] text-brand-red/50 hover:bg-brand-red hover:text-white transition-all"
                  >
                    {child.name}
                  </a>
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

        <Suspense fallback={<GridSkeleton />}>
          <ProductGrid products={products || []} searchQuery={searchParams.q} />
        </Suspense>

        {totalPages > 1 && (
          <div className="mt-20">
            <Pagination
              currentPage={sayfa}
              totalPages={totalPages}
              baseParams={baseParams.toString()}
            />
          </div>
        )}
        </div>
      </div>
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
