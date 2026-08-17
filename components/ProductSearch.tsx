'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, ArrowRight, Folder } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createAkdagBrowserClient } from '@/lib/supabase-akdag'
import { SEARCH_SUGGESTION_FIELDS } from '@/lib/product-queries'

interface Product {
  id: string
  slug?: string
  ad: string
  kategori: string
  fotograflar: string[]
  bayi_fiyati?: number
  fiyat?: number
  para_birimi?: string
}

export default function ProductSearch({ fullPage = false }: { fullPage?: boolean }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [categoryResults, setCategoryResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = useRef(createAkdagBrowserClient()).current

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setCategoryResults([])
      setOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      
      // Gelişmiş arama: kelimeleri ayır ve hem isme hem kategoriye bak
      const searchTerms = query.trim().split(' ').filter(t => t.length > 1)
      let supabaseQuery = supabase.from('urunler').select(SEARCH_SUGGESTION_FIELDS)
      
      if (searchTerms.length > 0) {
        // En azından ilk kelime geçsin
        supabaseQuery = supabaseQuery.ilike('ad', `%${searchTerms[0]}%`)
      } else {
        supabaseQuery = supabaseQuery.ilike('ad', `%${query}%`)
      }

      const { data } = await supabaseQuery.limit(6)
      const products = (data as any) || []
      
      // Kategorileri ürün sonuçlarından çıkar (Benzersiz)
      const cats = Array.from(new Set(products.map((p: Product) => p.kategori).filter(Boolean))).slice(0, 3) as string[]

      setResults(products)
      setCategoryResults(cats)
      setOpen(true)
      setLoading(false)
    }, 350)

    return () => clearTimeout(timer)
  }, [query, fullPage, supabase])

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
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div className={`relative ${fullPage ? 'w-full' : 'w-full max-w-2xl mx-auto'}`}>
      <form onSubmit={handleSearch} className="relative flex items-stretch w-full bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm transition-all focus-within:shadow-lg focus-within:border-brand-red group">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Ürün, kategori veya marka ara..."
          className="flex-1 px-5 py-3 text-sm font-body font-medium text-slate-800 focus:outline-none placeholder:text-slate-400 bg-transparent"
        />
        
        {query && !loading && (
          <button 
            type="button" 
            onClick={clear} 
            className="absolute right-14 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors bg-slate-100 p-1 rounded-full"
          >
            <X size={14} />
          </button>
        )}
        
        {loading && (
          <div className="absolute right-14 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
        )}

        <button type="submit" className="bg-brand-red hover:bg-red-700 text-white px-6 flex items-center justify-center transition-colors">
          <Search size={20} strokeWidth={2.5} />
        </button>
      </form>

      {/* Dropdown results */}
      {open && (results.length > 0 || categoryResults.length > 0) && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200 overflow-hidden flex flex-col md:flex-row">
          
          {/* Kategoriler Sütunu */}
          {categoryResults.length > 0 && (
            <div className="w-full md:w-1/3 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-4">
              <div className="font-display font-bold text-[10px] tracking-widest uppercase text-slate-400 mb-3 pl-2">Önerilen Kategoriler</div>
              <div className="space-y-1">
                {categoryResults.map(cat => (
                  <Link 
                    key={cat} 
                    href={`/urunler/${cat.toLowerCase().replace(/ /g, '-')}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-brand-red hover:bg-white p-2 rounded-lg transition-colors group/cat"
                  >
                    <Folder size={14} className="text-slate-400 group-hover/cat:text-brand-red" />
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Ürünler Sütunu */}
          <div className="flex-1 max-h-[60vh] overflow-y-auto">
            <div className="font-display font-bold text-[10px] tracking-widest uppercase text-slate-400 mb-2 pt-4 px-4">Ürün Sonuçları</div>
            {results.map((product) => (
              <Link
                href={`/urun/${product.slug || product.id}`}
                key={product.id}
                onClick={() => setOpen(false)}
                className="flex items-center gap-4 p-4 hover:bg-brand-red/5 border-b border-slate-100 last:border-0 transition-colors duration-150 group"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-lg flex-shrink-0 overflow-hidden relative">
                  {product.fotograflar?.[0] ? (
                    <Image
                      src={product.fotograflar[0]}
                      alt={product.ad}
                      fill
                      sizes="48px"
                      className="object-contain p-1 group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Search size={16} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-sm text-slate-800 group-hover:text-brand-red transition-colors truncate">
                    {product.ad}
                  </div>
                  <div className="font-body text-slate-500 text-xs truncate mt-0.5">
                    {product.kategori}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-display font-black text-brand-red text-sm whitespace-nowrap">
                      {product.fiyat ? `${product.fiyat} ${product.para_birimi || 'TRY'}` : 'İncele'}
                    </span>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-brand-red group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </Link>
            ))}
            
            <Link
              href={`/arama?q=${query}`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 p-4 text-brand-red font-display font-bold text-xs tracking-widest uppercase hover:bg-brand-red hover:text-white transition-colors border-t border-slate-100"
            >
              Tüm sonuçları gör
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {open && query && results.length === 0 && !loading && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl p-8 text-center shadow-2xl">
          <Search size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="font-body font-medium text-slate-500 text-sm">
            &ldquo;<span className="text-slate-800 font-bold">{query}</span>&rdquo; için ürün bulunamadı.
          </p>
        </div>
      )}
    </div>
  )
}
