'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Search, X, ArrowRight, CornerDownLeft, Sparkles, Tag, Package, Flame, Clock, Truck, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatFiyat, dovizToTL, type KurData } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'

interface SearchProduct {
  id: string
  slug?: string
  ad: string
  kategori: string
  fotograflar: string[]
  fiyat: number
  indirimli_fiyat?: number
  sescim_fiyat?: number
  sescim_indirimli_fiyat?: number
  para_birimi?: string
  stok_durumu?: string
}

const QUICK_CATEGORIES = [
  { name: 'Ses Sistemleri', slug: 'ses-sistemleri' },
  { name: 'Mikrofonlar', slug: 'mikrofon-sistemleri' },
  { name: 'Hoparlörler', slug: 'hoparlorler' },
  { name: 'Mikser & Amfi', slug: 'mixer-amfi' },
  { name: 'Işık Sistemleri', slug: 'isik-sistemleri' },
  { name: 'DJ Ekipmanları', slug: 'dj-ekipmanlari' },
]

export default function SpotlightSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [kur, setKur] = useState<KurData>({ USD: 38.0, EUR: 41.0, guncelleme: null })

  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = useRef(createClient()).current

  // Canlı kurları al
  useEffect(() => {
    getKurClient().then(setKur).catch(() => {})
  }, [])

  // Global Kısayol: Ctrl+K veya Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    const handleCustomOpen = () => setIsOpen(true)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-spotlight-search', handleCustomOpen)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-spotlight-search', handleCustomOpen)
    }
  }, [isOpen])

  // Modal açıldığında inputa odaklan
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Canlı Arama Sorgusu (Debounced)
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const qClean = query.trim()
      
      try {
        const { data } = await supabase
          .from('urunler')
          .select('id, slug, ad, kategori, fotograflar, fiyat, indirimli_fiyat, sescim_fiyat, sescim_indirimli_fiyat, para_birimi, stok_durumu')
          .ilike('ad', `%${qClean}%`)
          .limit(8)

        setResults((data as any) || [])
        setSelectedIndex(0)
      } catch (e) {
        console.error('Spotlight search error:', e)
      } finally {
        setLoading(false)
      }
    }, 180)

    return () => clearTimeout(timer)
  }, [query, supabase])

  // Klavye Gezinimi (Yukarı, Aşağı, Enter)
  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (results.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        setIsOpen(false)
        router.push(`/urunler?q=${encodeURIComponent(query.trim())}`)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = results[selectedIndex]
      if (selected) {
        setIsOpen(false)
        router.push(`/urun/${selected.slug || selected.id}`)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100000] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-md transition-all duration-200">
      {/* Kapatıcı arka plan overlay */}
      <div className="fixed inset-0" onClick={() => setIsOpen(false)} />

      {/* Spotlight Kutusu */}
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden rounded-xl z-10 flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Arama Input Alanı */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-100 bg-white">
          <Search size={20} className="text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Ürün adı, model, marka veya kategori ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyNavigation}
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-body text-base outline-none pr-8"
          />
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-300 border-t-brand-red rounded-full animate-spin shrink-0" />
          ) : query ? (
            <button
              onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={16} />
            </button>
          ) : (
            <span className="hidden sm:inline-block font-mono text-[10px] text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
              ESC
            </span>
          )}
        </div>

        {/* İçerik / Sonuçlar */}
        <div className="overflow-y-auto flex-1 p-3 divide-y divide-slate-100">
          {query.trim() && results.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Eşleşen Ürünler ({results.length})</span>
                <span className="text-[9px] lowercase font-normal">Geçiş için ↑↓ kullanın</span>
              </div>

              {results.map((product, idx) => {
                const isSelected = idx === selectedIndex
                const rawPrice = product.sescim_indirimli_fiyat || product.sescim_fiyat || product.indirimli_fiyat || product.fiyat || 0
                const priceTL = dovizToTL(rawPrice, product.para_birimi || 'TRY', kur)
                const img = Array.isArray(product.fotograflar) && product.fotograflar[0] ? product.fotograflar[0] : null

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      setIsOpen(false)
                      router.push(`/urun/${product.slug || product.id}`)
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                      isSelected ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {/* Görsel */}
                    <div className="w-12 h-12 bg-white border border-slate-200 rounded overflow-hidden relative shrink-0 flex items-center justify-center">
                      {img ? (
                        <Image src={img} alt={product.ad} fill className="object-cover" />
                      ) : (
                        <Package size={20} className="text-slate-300" />
                      )}
                    </div>

                    {/* Detay */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-display font-semibold uppercase tracking-wider text-brand-red">
                        {product.kategori}
                      </div>
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {product.ad}
                      </div>
                    </div>

                    {/* Fiyat & Aksiyon */}
                    <div className="text-right shrink-0">
                      <div className="font-display font-bold text-sm text-slate-900">
                        {formatFiyat(priceTL, 'TRY')}
                      </div>
                      {isSelected && (
                        <div className="hidden sm:flex items-center justify-end gap-1 text-[10px] text-brand-red font-semibold">
                          <span>Git</span> <CornerDownLeft size={10} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              <div className="pt-2 px-3 pb-1">
                <Link
                  href={`/urunler?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded text-xs font-display font-bold uppercase tracking-wider transition-colors"
                >
                  Tüm Sonuçları Gör ({query.trim()}) <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ) : query.trim() && !loading ? (
            <div className="py-12 text-center text-slate-400">
              <Search size={32} className="mx-auto mb-2 opacity-30" />
              <p className="font-display font-bold text-sm uppercase tracking-wider text-slate-600">
                &quot;{query}&quot; İle İlgili Ürün Bulunamadı
              </p>
              <p className="text-xs text-slate-400 mt-1">Farklı anahtar kelimelerle arama yapmayı deneyebilirsiniz.</p>
            </div>
          ) : (
            /* Başlangıç Durumu: Hızlı Bağlantılar ve Popüler Kategoriler */
            <div className="p-3 space-y-4">
              <div>
                <div className="px-2 pb-2 text-[10px] font-display font-bold uppercase tracking-widest text-slate-400">
                  POPÜLER KATEGORİLER
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {QUICK_CATEGORIES.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/urunler/${cat.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-brand-red/5 hover:border-brand-red/30 border border-slate-200 rounded text-xs text-slate-700 hover:text-brand-red font-medium transition-all group"
                    >
                      <span className="truncate">{cat.name}</span>
                      <ChevronRight size={12} className="text-slate-400 group-hover:text-brand-red shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="px-2 pb-2 text-[10px] font-display font-bold uppercase tracking-widest text-slate-400">
                  HIZLI ERİŞİM
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <Link
                    href="/firsatlar"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded text-slate-700 hover:text-brand-red transition-colors"
                  >
                    <Flame size={14} className="text-amber-500" />
                    <span>Flaş Fırsatlar</span>
                  </Link>
                  <Link
                    href="/kampanyalar"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded text-slate-700 hover:text-brand-red transition-colors"
                  >
                    <Tag size={14} className="text-emerald-500" />
                    <span>Kuponlar</span>
                  </Link>
                  <Link
                    href="/outlet"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded text-slate-700 hover:text-brand-red transition-colors"
                  >
                    <Sparkles size={14} className="text-purple-500" />
                    <span>Outlet / Teşhir</span>
                  </Link>
                  <Link
                    href="/hesabim"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded text-slate-700 hover:text-brand-red transition-colors"
                  >
                    <Truck size={14} className="text-blue-500" />
                    <span>Kargo Takibi</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alt Bilgi Çubuğu */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">↑↓</kbd> Gezin
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">↵</kbd> Seç
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">esc</kbd> Kapat
            </span>
          </div>
          <span className="font-display font-bold text-slate-700 uppercase tracking-widest text-[9px]">
            SESCİM SPOTLİGHT
          </span>
        </div>
      </div>
    </div>
  )
}
