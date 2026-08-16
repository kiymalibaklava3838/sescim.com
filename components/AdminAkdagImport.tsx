'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { createClient as createAkdagClient } from '@supabase/supabase-js'
import { Download, Search, Check, AlertCircle, Loader2, Package, RefreshCw, Image as ImageIcon, ChevronDown } from 'lucide-react'
import { NEW_KATEGORI_HIYERARSI, type CategoryNode } from '@/lib/categories'

const AKDAG_URL = process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL || 'https://csekzzsaeehakpdmzfam.supabase.co'
const AKDAG_KEY = process.env.NEXT_PUBLIC_AKDAG_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzZWt6enNhZWVoYWtwZG16ZmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzEzMDIsImV4cCI6MjA5MjM0NzMwMn0.mz8y4Stqv4HKqvxxJZZScxeAlENe-VOGjXm5n4AT_ec'

interface AkdagProduct {
  id: string
  ad: string
  aciklama: string
  kategori: string
  fotograflar: string[]
  fiyat: number | null
  para_birimi: string
  marka: string | null
  stok_durumu: string
  model_kodu?: string
}

interface Props {
  onImported?: () => void
}

export default function AdminAkdagImport({ onImported }: Props) {
  const [akdagProducts, setAkdagProducts] = useState<AkdagProduct[]>([])
  const [filtered, setFiltered] = useState<AkdagProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ success: number; error: number } | null>(null)
  const [editPrices, setEditPrices] = useState<Record<string, string>>({})
  const [editCategories, setEditCategories] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [fetched, setFetched] = useState(false)
  const supabase = useRef(createClient()).current
  const akdagSupabase = useRef(createAkdagClient(AKDAG_URL, AKDAG_KEY)).current

  const fetchAkdagProducts = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await akdagSupabase
        .from('urunler')
        .select('id, ad, aciklama, kategori, fotograflar, fiyat, para_birimi, marka, stok_durumu')
        .order('created_at', { ascending: false })
        .limit(500)
      
      if (err) throw err
      const products = data || []
      setAkdagProducts(products)
      setFiltered(products)
      setFetched(true)
      // Initialize edit prices with list prices
      const prices: Record<string, string> = {}
      const cats: Record<string, string> = {}
      products.forEach((p: AkdagProduct) => {
        prices[p.id] = p.fiyat ? String(p.fiyat) : ''
        cats[p.id] = p.kategori
      })
      setEditPrices(prices)
      setEditCategories(cats)
    } catch (e: any) {
      setError('Akdağ veritabanına erişilemedi: ' + (e.message || 'Bilinmeyen hata'))
    }
    setLoading(false)
  }

  const handleSearch = (q: string) => {
    setSearchQ(q)
    if (!q.trim()) { setFiltered(akdagProducts); return }
    const ql = q.toLowerCase()
    setFiltered(akdagProducts.filter(p =>
      p.ad.toLowerCase().includes(ql) ||
      (p.marka || '').toLowerCase().includes(ql) ||
      p.kategori.toLowerCase().includes(ql)
    ))
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const selectAll = () => setSelected(new Set(filtered.map(p => p.id)))
  const clearAll = () => setSelected(new Set())

  const handleImport = async () => {
    if (selected.size === 0) return
    setImporting(true)
    setImportResults(null)
    let success = 0, errCount = 0

    const toImport = akdagProducts.filter(p => selected.has(p.id))
    
    for (const product of toImport) {
      const fiyatStr = editPrices[product.id]
      const fiyat = fiyatStr ? parseFloat(fiyatStr) : null
      const kategori = editCategories[product.id] || product.kategori

      const { error: insertErr } = await supabase.from('urunler').insert({
        ad: product.ad,
        aciklama: product.aciklama,
        kategori: kategori,
        fotograflar: product.fotograflar || [],
        fiyat: fiyat,
        para_birimi: product.para_birimi || 'TRY',
        marka: product.marka,
        stok_durumu: product.stok_durumu || 'stokta',
        stok_adedi: 0,
      })

      if (insertErr) { errCount++ } else { success++ }
    }

    setImportResults({ success, error: errCount })
    setSelected(new Set())
    setImporting(false)
    if (success > 0 && onImported) onImported()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Aktarma Aracı</span>
          </div>
          <h2 className="font-display font-black text-2xl uppercase text-white">Akdağ Elektronik&apos;ten İçe Aktar</h2>
          <p className="font-body text-white/30 text-sm mt-1">Liste fiyatı ile aktar, gerekirse düzenle.</p>
        </div>
        <button
          onClick={fetchAkdagProducts}
          disabled={loading}
          className="flex items-center gap-2 bg-brand-red/10 border border-brand-red/20 text-brand-red px-5 py-2.5 font-display font-bold text-xs tracking-widest uppercase hover:bg-brand-red hover:text-white transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {fetched ? 'Yenile' : 'Akdağ\'dan Çek'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm font-body bg-red-400/10 border border-red-400/20 px-4 py-3">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {importResults && (
        <div className={`flex items-center gap-3 px-4 py-3 border text-sm font-body ${
          importResults.error === 0
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
        }`}>
          <Check size={16} />
          <span>{importResults.success} ürün başarıyla aktarıldı{importResults.error > 0 ? `, ${importResults.error} hata` : ''}.</span>
        </div>
      )}

      {fetched && (
        <>
          {/* Search & Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={searchQ}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Ürün adı, marka veya kategori ara..."
                className="w-full bg-[#141414] border border-white/10 text-white pl-11 pr-4 py-3 text-sm font-body focus:outline-none focus:border-brand-red/50 transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll} className="px-4 py-2 border border-white/10 text-white/50 hover:border-brand-red/30 hover:text-white font-display text-xs tracking-widest uppercase transition-all">
                Tümünü Seç
              </button>
              <button onClick={clearAll} className="px-4 py-2 border border-white/10 text-white/50 hover:border-white/20 hover:text-white font-display text-xs tracking-widest uppercase transition-all">
                Seçimi Temizle
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-xs font-body text-white/40">
            <span>{filtered.length} ürün listeleniyor</span>
            <span className="text-brand-red font-semibold">{selected.size} seçili</span>
          </div>

          {/* Product List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.map((product) => (
              <div
                key={product.id}
                className={`bg-[#141414] border transition-all duration-200 p-4 ${
                  selected.has(product.id) ? 'border-brand-red/40 bg-brand-red/5' : 'border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(product.id)}
                    className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      selected.has(product.id) ? 'bg-brand-red border-brand-red' : 'border-white/20 hover:border-brand-red/50'
                    }`}
                  >
                    {selected.has(product.id) && <Check size={12} className="text-white" />}
                  </button>

                  {/* Image */}
                  <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.fotograflar?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.fotograflar[0]} alt={product.ad} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={20} className="text-white/20" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-sm text-white truncate">{product.ad}</div>
                    <div className="font-body text-xs text-white/40 mt-0.5">
                      {product.marka && <span className="text-brand-red/70 mr-2">{product.marka}</span>}
                      {product.kategori}
                    </div>
                  </div>

                  {/* Price & Category Edit */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-white/30 font-body mb-1">Liste Fiyatı</div>
                      <input
                        type="number"
                        value={editPrices[product.id] || ''}
                        onChange={e => setEditPrices(prev => ({ ...prev, [product.id]: e.target.value }))}
                        placeholder="Fiyat"
                        className="w-28 bg-[#0F0F0F] border border-white/10 text-white px-3 py-2 text-sm font-body focus:outline-none focus:border-brand-red/50 text-right"
                      />
                      <div className="text-[10px] text-white/20 font-body mt-0.5">{product.para_birimi}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-white/20 font-body">
                <Package size={32} className="mx-auto mb-3 opacity-30" />
                Sonuç bulunamadı
              </div>
            )}
          </div>

          {/* Import Button */}
          {selected.size > 0 && (
            <div className="sticky bottom-0 bg-[#0F0F0F] border-t border-white/5 py-4">
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full bg-brand-red text-white font-display font-bold text-sm tracking-widest uppercase py-4 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {importing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {importing ? 'Aktarılıyor...' : `${selected.size} Ürünü sescim\'e Aktar`}
              </button>
            </div>
          )}
        </>
      )}

      {!fetched && !loading && (
        <div className="py-20 text-center">
          <Download size={48} className="mx-auto mb-4 text-white/10" />
          <p className="font-body text-white/30 text-sm">Akdağ Elektronik\'deki ürünleri görmek için &quot;Akdağ\'dan Çek&quot; butonuna tıklayın.</p>
        </div>
      )}
    </div>
  )
}
