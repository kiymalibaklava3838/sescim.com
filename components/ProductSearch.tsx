'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SEARCH_SUGGESTION_FIELDS } from '@/lib/product-queries'

interface Product {
  id: string
  slug?: string
  ad: string
  kategori: string
  fotograflar: string[]
  bayi_fiyati?: number
  para_birimi?: string
}

export default function ProductSearch({ fullPage = false }: { fullPage?: boolean }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = useRef(createClient()).current

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('urunler')
        .select(SEARCH_SUGGESTION_FIELDS)
        .ilike('ad', `%${query}%`)
        .limit(6)

      setResults(data || [])
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
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div className={`relative ${fullPage ? 'w-full' : 'w-full max-w-2xl mx-auto'}`}>
      <form onSubmit={handleSearch} className="relative flex items-stretch w-full border-2 border-brand-red rounded-lg overflow-hidden shadow-sm transition-all focus-within:shadow-md bg-white">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Ürün, kategori veya marka ara..."
          className="flex-1 px-5 py-2.5 text-sm text-slate-800 focus:outline-none placeholder:text-slate-400"
        />
        
        {query && !loading && (
          <button 
            type="button" 
            onClick={clear} 
            className="absolute right-[5.5rem] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        )}
        
        {loading && (
          <div className="absolute right-[5.5rem] top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
        )}

        <button type="submit" className="bg-brand-red hover:bg-red-700 text-white px-6 md:px-8 flex items-center justify-center transition-colors">
          <Search size={20} strokeWidth={2.5} />
        </button>
      </form>

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 border-t-0 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          {results.map((product) => (
            <Link
              href={`/urun/${product.slug || product.id}`}
              key={product.id}
              onClick={() => setOpen(false)}
              className="flex items-center gap-4 p-4 hover:bg-slate-50 border-b border-slate-200 last:border-0 transition-colors duration-150 group"
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 bg-slate-50 border border-slate-200 flex-shrink-0 overflow-hidden">
                {product.fotograflar?.[0] ? (
                  <Image
                    src={product.fotograflar[0]}
                    alt={product.ad}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Search size={16} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-700 text-sm text-slate-800 group-hover:text-brand-red transition-colors uppercase tracking-wide truncate">
                  {product.ad}
                </div>
                <div className="font-body text-slate-500 text-xs truncate mt-0.5">
                  {product.bayi_fiyati 
                    ? `${product.bayi_fiyati} ${product.para_birimi || 'TRY'}`
                    : product.kategori}
                </div>
              </div>
              <ArrowRight size={14} className="text-slate-400 group-hover:text-brand-red transition-colors flex-shrink-0" />
            </Link>
          ))}
          <Link
            href={`/arama?q=${query}`}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 p-3 text-brand-red font-display font-600 text-xs tracking-widest uppercase hover:bg-brand-red/5 transition-colors"
          >
            Tüm sonuçları gör
            <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {open && query && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 border-t-0 p-6 text-center shadow-2xl">
          <p className="font-body text-slate-500 text-sm">
            &ldquo;<span className="text-slate-800">{query}</span>&rdquo; için sonuç bulunamadı.
          </p>
        </div>
      )}
    </div>
  )
}
