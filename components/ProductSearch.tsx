'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, ArrowRight, Folder, Tag, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createAkdagBrowserClient } from '@/lib/supabase-akdag'
import { SEARCH_SUGGESTION_FIELDS } from '@/lib/product-queries'
import { formatFiyat, dovizToTL, type KurData, DEFAULT_KUR } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'
import { HIERARCHY_DATA } from '@/lib/categories'

interface Product {
  id: string
  slug?: string
  ad: string
  kategori: string
  marka?: string
  fotograflar: string[]
  bayi_fiyati?: number
  fiyat?: number
  indirimli_fiyat?: number
  sescim_fiyat?: number
  sescim_indirimli_fiyat?: number
  sescim_aktif?: boolean
  fiyat_sorunuz?: boolean
  para_birimi?: string
}

interface FlattenedCategory {
  name: string
  slug: string
}

const POPULAR_BRANDS = [
  'JBL',
  'Yamaha',
  'Rode',
  'Shure',
  'Sennheiser',
  'Pioneer DJ',
  'Behringer',
  'Focusrite',
  'Audio-Technica',
  'RCF',
  'Genelec'
]

const POPULAR_CATEGORIES = [
  { name: 'Stüdyo & Podcast', slug: 'studyo-ekipmanlari' },
  { name: 'Mikrofon Sistemleri', slug: 'mikrofon-sistemleri' },
  { name: 'DJ Ekipmanları', slug: 'dj-ekipmanlari' },
  { name: 'Hoparlörler', slug: 'hoparlorler' },
  { name: 'Mixer & Amfi', slug: 'mixer-amfi' },
  { name: 'Kulaklıklar', slug: 'kulaklik-monitor' },
]

export default function ProductSearch({ fullPage = false }: { fullPage?: boolean }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [categoryResults, setCategoryResults] = useState<FlattenedCategory[]>([])
  const [brandResults, setBrandResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [kur, setKur] = useState<KurData>(DEFAULT_KUR)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = useRef(createAkdagBrowserClient()).current

  // Canlı döviz kurunu çek
  useEffect(() => {
    getKurClient().then(setKur).catch(() => {})
  }, [])

  // Kategori ağacını düzleştir (Arama için hızlı eşleşme)
  const allCategories = useMemo(() => {
    const list: FlattenedCategory[] = []
    const traverse = (nodes: typeof HIERARCHY_DATA) => {
      for (const node of nodes) {
        list.push({ name: node.name, slug: node.slug })
        if (node.children) traverse(node.children)
      }
    }
    traverse(HIERARCHY_DATA)
    return list
  }, [])

  // Dışarı tıklama kontrolü
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Canlı Arama Sorgusu (Debounced)
  useEffect(() => {
    const qClean = query.trim()
    if (!qClean) {
      setResults([])
      setCategoryResults([])
      setBrandResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const qLower = qClean.toLowerCase()

      // 1. Marka Eşleştirmesi (Önceden tanımlı + Veritabanı sorgusu)
      const matchedPopular = POPULAR_BRANDS.filter(b => 
        b.toLowerCase().includes(qLower) || qLower.includes(b.toLowerCase())
      )

      let dbBrands: string[] = []
      try {
        const { data: bData } = await supabase
          .from('urunler')
          .select('marka')
          .ilike('marka', `%${qClean}%`)
          .not('marka', 'is', null)
          .limit(10)
        
        if (bData) {
          dbBrands = Array.from(new Set(bData.map((x: any) => x.marka).filter(Boolean))) as string[]
        }
      } catch (e) {
        console.error('Brand search error:', e)
      }

      // Markaları birleştir ve tekilleştir
      const combinedBrands = Array.from(new Set([...matchedPopular, ...dbBrands])).slice(0, 3)
      setBrandResults(combinedBrands)

      // 2. Kategori Eşleştirmesi (Hiyerarşi üzerinden)
      const matchedCats = allCategories
        .filter(c => c.name.toLowerCase().includes(qLower))
        .slice(0, 4)
      setCategoryResults(matchedCats)

      // 3. Ürün Sorgusu (Hem ürün adı hem marka içinde arama)
      try {
        const { data: prodData } = await supabase
          .from('urunler')
          .select(SEARCH_SUGGESTION_FIELDS)
          .or(`ad.ilike.%${qClean}%,marka.ilike.%${qClean}%`)
          .limit(6)

        let prods: any[] = (prodData as any) || []
        if (prods.length > 0) {
          try {
            const { createClient } = await import('@/lib/supabase')
            const sescimDb = createClient()
            const { data: sfData } = await sescimDb
              .from('sescim_fiyatlar')
              .select('urun_id, sescim_fiyat, sescim_aktif, fiyat_sorunuz')
              .in('urun_id', prods.map(p => p.id))

            if (sfData) {
              const sfMap = new Map<string, any>((sfData as any[]).map((x: any) => [x.urun_id, x]))
              prods = prods
                .map(p => {
                  const s = sfMap.get(p.id)
                  return {
                    ...p,
                    sescim_fiyat: s?.sescim_fiyat ?? null,
                    sescim_aktif: s?.sescim_aktif ?? true,
                    fiyat_sorunuz: s?.fiyat_sorunuz ?? false
                  }
                })
                .filter(p => p.sescim_aktif !== false)
            }
          } catch (sfErr) {
            console.error('Failed to merge sescim_fiyatlar in search:', sfErr)
          }
        }

        setResults(prods)
      } catch (e) {
        console.error('Product search error:', e)
      }

      setLoading(false)
      setOpen(true)
    }, 280)

    return () => clearTimeout(timer)
  }, [query, allCategories, supabase])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setOpen(false)
    router.push(`/arama?q=${encodeURIComponent(query.trim())}`)
  }

  const clear = () => {
    setQuery('')
    setResults([])
    setCategoryResults([])
    setBrandResults([])
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className={`relative ${fullPage ? 'w-full' : 'w-full max-w-2xl mx-auto'}`}>
      <form onSubmit={handleSearch} className="relative flex items-stretch w-full bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs transition-all focus-within:shadow-md focus-within:border-brand-red group">
        <div className="flex items-center pl-4 text-slate-400 group-focus-within:text-brand-red transition-colors">
          <Search size={18} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Ürün, kategori veya marka ara (örn: JBL, Rode, Mikrofon)..."
          className="flex-1 px-3.5 py-2.5 md:py-3 text-sm font-body font-medium text-slate-800 focus:outline-none placeholder:text-slate-400 bg-transparent"
        />
        
        {query && !loading && (
          <button 
            type="button" 
            onClick={clear} 
            className="text-slate-400 hover:text-slate-700 transition-colors p-2 self-center mr-1 rounded-full hover:bg-slate-100 cursor-pointer"
            title="Temizle"
          >
            <X size={16} />
          </button>
        )}
        
        {loading && (
          <div className="flex items-center pr-3">
            <div className="w-4 h-4 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
          </div>
        )}

        <button 
          type="submit" 
          className="bg-brand-red hover:bg-red-700 text-white px-5 md:px-6 flex items-center justify-center font-display font-bold text-xs uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
        >
          Ara
        </button>
      </form>

      {/* AÇILIR PANEL */}
      {open && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200 overflow-hidden max-h-[80vh] flex flex-col">
          
          {/* BOŞ ARAMA (ODAKLANDIĞINDA) - POPÜLER MARKA & KATEGORİ ÖNERİLERİ */}
          {!query.trim() && (
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <div className="flex items-center gap-2 text-xs font-display font-black tracking-widest uppercase text-slate-400 mb-2.5">
                  <Tag size={13} className="text-brand-red" />
                  <span>Popüler Markalar</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_BRANDS.map((brand) => (
                    <Link
                      key={brand}
                      href={`/urunler?marka=${encodeURIComponent(brand)}`}
                      onClick={() => setOpen(false)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-brand-red/40 rounded-lg text-xs font-semibold text-slate-700 hover:text-brand-red transition-all"
                    >
                      {brand}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-display font-black tracking-widest uppercase text-slate-400 mb-2.5">
                  <Sparkles size={13} className="text-brand-red" />
                  <span>Öne Çıkan Kategoriler</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {POPULAR_CATEGORIES.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/urunler/${cat.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 hover:text-brand-red transition-colors"
                    >
                      <Folder size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SORGULU SONUÇLAR */}
          {query.trim() && (
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              
              {/* 1. MARKA KARTI (Eğer marka eşleşmesi varsa) */}
              {brandResults.length > 0 && (
                <div className="p-3 bg-gradient-to-r from-red-50/70 via-white to-slate-50">
                  <div className="text-[10px] font-display font-black tracking-widest uppercase text-brand-red mb-2 flex items-center gap-1.5 px-1">
                    <Tag size={12} />
                    <span>Marka</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {brandResults.map((brand) => (
                      <Link
                        key={brand}
                        href={`/urunler?marka=${encodeURIComponent(brand)}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between p-2.5 bg-white border border-slate-200 hover:border-brand-red rounded-lg transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-brand-red shrink-0" />
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-brand-red transition-colors block truncate">
                              {brand}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              Tüm {brand} ürünlerini incele
                            </span>
                          </div>
                        </div>
                        <ArrowRight size={13} className="text-slate-400 group-hover:text-brand-red group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. KATEGORİ ÖNERİLERİ */}
              {categoryResults.length > 0 && (
                <div className="p-3 bg-slate-50/60">
                  <div className="text-[10px] font-display font-black tracking-widest uppercase text-slate-400 mb-2 flex items-center gap-1.5 px-1">
                    <Folder size={12} />
                    <span>İlgili Kategoriler</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categoryResults.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/urunler/${cat.slug}`}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-brand-red/50 hover:text-brand-red rounded-lg text-xs font-medium text-slate-700 transition-colors"
                      >
                        <Folder size={12} className="text-slate-400" />
                        <span>{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. ÜRÜN SONUÇLARI */}
              {results.length > 0 && (
                <div className="p-2">
                  <div className="text-[10px] font-display font-black tracking-widest uppercase text-slate-400 mb-1 px-3 pt-2">
                    Ürünler
                  </div>
                  {results.map((product) => {
                    const pb = product.para_birimi || 'TRY'
                    const aktifFiyat = product.sescim_fiyat ?? product.fiyat ?? 0
                    const fiyatTL = dovizToTL(aktifFiyat, pb, kur)
                    const formatliFiyat = formatFiyat(fiyatTL, 'TRY')

                    return (
                      <Link
                        href={`/urun/${product.slug || product.id}`}
                        key={product.id}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        {/* Ürün Görseli */}
                        <div className="w-12 h-12 bg-white border border-slate-200 rounded-lg flex-shrink-0 overflow-hidden relative p-1">
                          {product.fotograflar?.[0] ? (
                            <Image
                              src={product.fotograflar[0]}
                              alt={product.ad}
                              fill
                              sizes="48px"
                              className="object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Search size={16} />
                            </div>
                          )}
                        </div>

                        {/* Ürün Bilgisi */}
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-bold text-xs sm:text-sm text-slate-800 group-hover:text-brand-red transition-colors truncate">
                            {product.ad}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 truncate">
                            {product.marka && (
                              <span className="font-semibold text-slate-600">{product.marka}</span>
                            )}
                            {product.marka && product.kategori && <span>•</span>}
                            {product.kategori && <span>{product.kategori}</span>}
                          </div>
                        </div>

                        {/* Fiyat Bilgisi (Her zaman TL) */}
                        <div className="text-right shrink-0">
                          {product.fiyat_sorunuz ? (
                            <span className="font-display font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] uppercase tracking-wide whitespace-nowrap">
                              Fiyat Sorunuz
                            </span>
                          ) : (
                            <span className="font-display font-black text-brand-red text-xs sm:text-sm whitespace-nowrap">
                              {fiyatTL > 0 ? formatliFiyat : 'Fiyat Sorun'}
                            </span>
                          )}
                        </div>

                        <ArrowRight size={14} className="text-slate-300 group-hover:text-brand-red group-hover:translate-x-1 transition-all shrink-0 ml-1" />
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* SONUÇ BULUNAMADI */}
              {results.length === 0 && brandResults.length === 0 && categoryResults.length === 0 && !loading && (
                <div className="p-8 text-center">
                  <Search size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-body font-medium text-slate-500 text-sm">
                    &ldquo;<span className="text-slate-800 font-bold">{query}</span>&rdquo; ile eşleşen ürün veya marka bulunamadı.
                  </p>
                </div>
              )}

              {/* TÜM SONUÇLARI GÖR DÜĞMESİ */}
              <div className="p-3 bg-slate-50 border-t border-slate-100">
                <Link
                  href={`/arama?q=${encodeURIComponent(query)}`}
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-red hover:bg-red-700 text-white rounded-lg font-display font-bold text-xs uppercase tracking-wider transition-colors shadow-xs"
                >
                  Tüm Arama Sonuçlarını Gör &ldquo;{query}&rdquo;
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
