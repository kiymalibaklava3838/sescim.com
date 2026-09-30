'use client'

import { useState, useMemo } from 'react'
import { Search, X, SlidersHorizontal, ArrowUpDown, Tag, Folder, Sparkles, RotateCcw } from 'lucide-react'
import ProductGrid from '@/components/ProductGrid'

interface Product {
  id: string
  slug?: string
  ad: string
  aciklama?: string
  kategori: string
  fotograflar: string[]
  fiyat?: number
  bayi_fiyati?: number
  para_birimi?: string
  bayi_para_birimi?: string
  stok_durumu?: string
  fiyat_guncelleme?: string
  stok_adedi?: number | null
  kritik_stok?: number | null
  marka?: string | null
  kullanim_alani?: string | null
  sescim_fiyat?: number
  sescim_indirimli_fiyat?: number
  sescim_aktif?: boolean
  sescim_stok?: number | null
  sescim_stok_durumu?: string | null
  fiyat_sorunuz?: boolean
  created_at?: string | null
}

interface Props {
  products: Product[]
  sectionType: 'firsatlar' | 'outlet'
  sectionTitle: string
}

export default function SpecialSectionExplorer({ products, sectionType, sectionTitle }: Props) {
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('default')

  // Mevcut ürünlerden markaları çıkar
  const brands = useMemo(() => {
    const list = products.map(p => p.marka).filter(Boolean) as string[]
    return Array.from(new Set(list)).sort()
  }, [products])

  // Mevcut ürünlerden kategorileri çıkar
  const categories = useMemo(() => {
    const list = products.map(p => p.kategori).filter(Boolean) as string[]
    return Array.from(new Set(list)).sort()
  }, [products])

  // Canlı Filtreleme ve Sıralama
  const filteredProducts = useMemo(() => {
    let result = [...products]

    // 1. Metin Arama
    const qClean = search.trim().toLowerCase()
    if (qClean) {
      result = result.filter(p => {
        const adMatch = p.ad?.toLowerCase().includes(qClean)
        const markaMatch = p.marka?.toLowerCase().includes(qClean)
        const katMatch = p.kategori?.toLowerCase().includes(qClean)
        const alanMatch = p.kullanim_alani?.toLowerCase().includes(qClean)
        return adMatch || markaMatch || katMatch || alanMatch
      })
    }

    // 2. Marka Filtresi
    if (selectedBrand !== 'all') {
      result = result.filter(p => p.marka === selectedBrand)
    }

    // 3. Kategori Filtresi
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.kategori === selectedCategory)
    }

    // 4. Sıralama
    if (sortBy === 'price-asc') {
      result.sort((a, b) => {
        const fA = a.sescim_indirimli_fiyat ?? a.sescim_fiyat ?? a.fiyat ?? 0
        const fB = b.sescim_indirimli_fiyat ?? b.sescim_fiyat ?? b.fiyat ?? 0
        return fA - fB
      })
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => {
        const fA = a.sescim_indirimli_fiyat ?? a.sescim_fiyat ?? a.fiyat ?? 0
        const fB = b.sescim_indirimli_fiyat ?? b.sescim_fiyat ?? b.fiyat ?? 0
        return fB - fA
      })
    } else if (sortBy === 'discount-desc') {
      result.sort((a, b) => {
        const indirimA = a.fiyat && a.sescim_indirimli_fiyat ? (a.fiyat - a.sescim_indirimli_fiyat) : 0
        const indirimB = b.fiyat && b.sescim_indirimli_fiyat ? (b.fiyat - b.sescim_indirimli_fiyat) : 0
        return indirimB - indirimA
      })
    } else if (sortBy === 'newest') {
      result.sort((a, b) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0
        return tB - tA
      })
    }

    return result
  }, [products, search, selectedBrand, selectedCategory, sortBy])

  const hasActiveFilters = search.trim() !== '' || selectedBrand !== 'all' || selectedCategory !== 'all' || sortBy !== 'default'

  const clearAllFilters = () => {
    setSearch('')
    setSelectedBrand('all')
    setSelectedCategory('all')
    setSortBy('default')
  }

  const placeholderText = sectionType === 'outlet'
    ? 'Outlet ürünleri içinde model, marka veya kategori ara...'
    : 'Fırsat ürünleri içinde ara (örn: JBL, Rode, Hoparlör)...'

  return (
    <div className="space-y-6">
      {/* Arama & Kontrol Paneli */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Canlı Arama Inputu */}
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={placeholderText}
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
                title="Aramayı Temizle"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Sıralama Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[180px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ArrowUpDown size={15} />
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-3 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:border-brand-red appearance-none cursor-pointer shadow-xs"
              >
                <option value="default">Önerilen Sıralama</option>
                <option value="price-asc">Fiyat: Düşükten Yükseğe</option>
                <option value="price-desc">Fiyat: Yüksekten Düşüğe</option>
                <option value="discount-desc">En Çok İndirimli</option>
                <option value="newest">En Yeni Eklenenler</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Hızlı Filtre Butonları (Marka & Kategori) */}
        {(brands.length > 1 || categories.length > 1) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
            
            {/* Markalar */}
            {brands.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide text-xs">
                <span className="font-display font-bold uppercase tracking-wider text-slate-400 text-[10px] mr-1 shrink-0 flex items-center gap-1">
                  <Tag size={12} /> Marka:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedBrand('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                    selectedBrand === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Tümü
                </button>
                {brands.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedBrand(selectedBrand === b ? 'all' : b)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                      selectedBrand === b
                        ? 'bg-brand-red text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-red/40 hover:text-brand-red'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}

            {/* Kategoriler */}
            {categories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide text-xs sm:ml-auto">
                <span className="font-display font-bold uppercase tracking-wider text-slate-400 text-[10px] mr-1 shrink-0 flex items-center gap-1">
                  <Folder size={12} /> Kategori:
                </span>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-brand-red cursor-pointer"
                >
                  <option value="all">Tüm Kategoriler</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Sonuç Sayacı & Aktif Filtre Bilgisi */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              {filteredProducts.length} ürün listeleniyor
            </span>
            {search.trim() && (
              <span className="text-slate-400">
                (&ldquo;<strong className="text-slate-700">{search.trim()}</strong>&rdquo; araması)
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-red hover:text-red-700 transition-colors"
            >
              <RotateCcw size={12} /> Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {/* Ürün Listesi VEYA Boş Sonuç Ekranı */}
      {filteredProducts.length > 0 ? (
        <ProductGrid products={filteredProducts} searchQuery={search} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Search size={26} />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base uppercase text-slate-800 tracking-wide">
              Eşleşen Ürün Bulunamadı
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {search 
                ? `"${search}" aramasıyla eşleşen ${sectionTitle.toLowerCase()} ürünü bulunamadı.` 
                : 'Seçtiğiniz filtrelere uygun ürün bulunamadı.'}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-5 py-2.5 bg-brand-red text-white rounded-xl text-xs font-display font-bold uppercase tracking-wider hover:bg-red-700 transition-colors shadow-xs"
            >
              Tüm {sectionTitle} Ürünlerini Göster
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
