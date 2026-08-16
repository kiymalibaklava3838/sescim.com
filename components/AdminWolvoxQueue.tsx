'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Edit, Trash2, RefreshCw, Package, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import AdminAddProduct from './AdminAddProduct'

interface WolvoxItem {
  id: string
  stok_kodu: string
  stok_adi: string
  aciklama?: string
  fiyat_doviz: number
  doviz_tipi: string
  stok_miktari: number
  yil?: number
  is_processed: boolean
}

interface ApiResponse {
  data: WolvoxItem[]
  total: number
  page: number
  totalPages: number
  yillar: number[]
}

// Wolvox'ta özellikler genellikle STOK_ADI'na virgülle sıkıştırılır.
// Bu fonksiyon adı ve açıklamayı akıllıca ayırır.
function splitStokAdi(stok_adi: string, mevcutAciklama?: string): { ad: string; aciklama: string } {
  // Eğer Wolvox'tan gelen ayrı bir açıklama varsa onu kullan
  if (mevcutAciklama && mevcutAciklama.trim().length > 5) {
    return { ad: stok_adi.trim(), aciklama: mevcutAciklama.trim() }
  }
  if (!stok_adi) return { ad: '', aciklama: '' }
  // Virgülde ayır: ilk virgüle kadar = isim, geri kalan = özellikler
  const commaIndex = stok_adi.indexOf(',')
  if (commaIndex > 5 && commaIndex < stok_adi.length - 3) {
    return {
      ad: stok_adi.substring(0, commaIndex).trim(),
      aciklama: stok_adi.substring(commaIndex + 1).trim()
    }
  }
  // Uzun ürün adı ama virgül yok: 60 karakterde son boşluktan kes
  if (stok_adi.length > 60) {
    const cutAt = stok_adi.lastIndexOf(' ', 60)
    const splitAt = cutAt > 15 ? cutAt : 60
    return {
      ad: stok_adi.substring(0, splitAt).trim(),
      aciklama: stok_adi.substring(splitAt).trim()
    }
  }
  return { ad: stok_adi.trim(), aciklama: '' }
}

export default function AdminWolvoxQueue() {
  const [items, setItems] = useState<WolvoxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [editingItem, setEditingItem] = useState<WolvoxItem | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [yillar, setYillar] = useState<number[]>([])
  const [selectedYil, setSelectedYil] = useState<string>('')

  const loadItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ page: page.toString() })
      if (selectedYil) params.set('yil', selectedYil)
      if (search) params.set('search', search)

      const res = await fetch(`/api/wolvox-taslak?${params}`)
      const json: ApiResponse = await res.json()

      if (!res.ok) {
        setError((json as {error?: string}).error || 'Bilinmeyen hata')
        return
      }

      setItems(json.data || [])
      setTotal(json.total || 0)
      setTotalPages(json.totalPages || 1)
      if (json.yillar?.length > 0) setYillar(json.yillar)
    } catch (e) {
      setError('Sunucuya bağlanılamadı.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, selectedYil, search])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Arama için debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleDelete = async (id: string) => {
    if (!confirm('Bu taslağı silmek istediğinize emin misiniz?')) return
    await fetch('/api/wolvox-taslak', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    loadItems()
  }

  const formatDoviz = (tipi: string) => {
    if (!tipi || tipi === 'TRY') return '₺'
    if (tipi === 'USD') return '$'
    if (tipi === 'EUR') return '€'
    return tipi
  }

  // Wolvox'ta özellikler genellikle STOK_ADI'na virgülle sıkıştırılır.
  // Bu fonksiyon adı ve açıklamayı akıllıca ayırır.
  const splitStokAdi = (stok_adi: string, mevcutAciklama?: string) => {
    // Eğer Wolvox'tan gelen ayrı bir açıklama varsa onu kullan
    if (mevcutAciklama && mevcutAciklama.trim().length > 5) {
      return { ad: stok_adi.trim(), aciklama: mevcutAciklama.trim() }
    }

    if (!stok_adi) return { ad: '', aciklama: '' }

    // Virgülde ayır: "DENOX TAVAN HOPARLÖRÜ 8" 100V, 8ohm Ceiling Spk..." → isim + özellikler
    const commaIndex = stok_adi.indexOf(',')
    if (commaIndex > 5 && commaIndex < stok_adi.length - 3) {
      return {
        ad: stok_adi.substring(0, commaIndex).trim(),
        aciklama: stok_adi.substring(commaIndex + 1).trim()
      }
    }

    // Uzun ürün adı ama virgül yok: 60 karakterde son boşluktan kes
    if (stok_adi.length > 60) {
      const cutAt = stok_adi.lastIndexOf(' ', 60)
      const splitAt = cutAt > 15 ? cutAt : 60
      return {
        ad: stok_adi.substring(0, splitAt).trim(),
        aciklama: stok_adi.substring(splitAt).trim()
      }
    }

    return { ad: stok_adi.trim(), aciklama: '' }
  }

  if (editingItem) {
    const { ad: splitAd, aciklama: splitAciklama } = splitStokAdi(editingItem.stok_adi, editingItem.aciklama)
    const initialData = {
      ad: splitAd,
      kod: editingItem.stok_kodu,
      fiyat: editingItem.fiyat_doviz?.toString() || '0',
      paraBirimi: editingItem.doviz_tipi || 'TRY',
      stokAdedi: editingItem.stok_miktari?.toString() || '0',
      taslakId: editingItem.id,
      aciklama: splitAciklama
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-[#141414] p-4 border border-white/10 rounded-sm">
          <div>
            <h2 className="text-white font-bold text-lg">Wolvox Ürününü Onayla</h2>
            <p className="text-white/40 text-xs">Aşağıdaki bilgileri düzenleyerek asıl sisteme aktarın.</p>
          </div>
          <button
            onClick={() => setEditingItem(null)}
            className="text-white/50 hover:text-white font-bold text-xs uppercase tracking-widest flex items-center gap-1"
          >
            <ChevronLeft size={14} /> Geri Dön
          </button>
        </div>

        {/* Stok kodu bilgi banner'ı */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-sm p-3 flex items-start gap-3">
          <span className="text-amber-400 text-lg leading-none mt-0.5">⚠</span>
          <div className="text-xs text-amber-300/80 leading-relaxed">
            <strong>Stok Kodu: {editingItem.stok_kodu}</strong> — Bu ürün Wolvox&apos;tan geldi.
            Kaydettiğinizde sistemde aynı stok koduna sahip ürün varsa üzerine yazılır,
            yoksa yeni ürün olarak eklenir. Lütfen bilgileri kontrol edin.
          </div>
        </div>

        <AdminAddProduct
          initialData={initialData}
          onAdded={() => {
            setEditingItem(null)
            loadItems()
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-1">Wolvox Bekleyen Ürünler</h2>
          <p className="text-white/40 text-sm">
            {loading ? 'Yükleniyor...' : `Toplam ${total.toLocaleString('tr-TR')} ürün — Sayfa ${page}/${totalPages}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Yıl Filtresi */}
          {yillar.length > 0 && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-sm">
              <Calendar size={14} className="text-white/40" />
              <select
                value={selectedYil}
                onChange={(e) => { setSelectedYil(e.target.value); setPage(1) }}
                className="bg-transparent text-white text-sm outline-none cursor-pointer"
              >
                <option value="">Tüm Yıllar</option>
                {yillar.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => loadItems()}
            disabled={loading}
            className="bg-white/5 hover:bg-white/10 border border-white/10 p-2.5 text-white rounded-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-sm p-6">
        {/* Arama */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Stok adı veya kodunda ara..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-4 pl-12 text-white outline-none focus:border-brand-red transition-colors"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
        </div>

        {/* İçerik */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-white/40">
            <RefreshCw size={20} className="animate-spin" />
            <span>Yükleniyor...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 border border-dashed border-red-500/20 rounded-sm">
            <p className="font-bold mb-1">Hata</p>
            <p className="text-sm opacity-70">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/20 border border-dashed border-white/5 gap-3">
            <Package size={40} className="opacity-30" />
            <p className="font-display italic">
              {searchInput ? 'Aramanızla eşleşen ürün bulunamadı.' : 'Onay bekleyen Wolvox ürünü bulunmuyor.'}
            </p>
            {!searchInput && (
              <p className="text-xs text-white/10">Masaüstündeki BAT dosyasını çalıştırarak Wolvox&apos;tan veri çekin.</p>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-white text-xs uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-3 border-b border-white/10 w-28">Stok Kodu</th>
                    <th className="p-3 border-b border-white/10 w-52">Ürün Adı</th>
                    <th className="p-3 border-b border-white/10">Açıklama / Özellikler</th>
                    <th className="p-3 border-b border-white/10 w-32">Fiyat</th>
                    <th className="p-3 border-b border-white/10 w-24">Stok</th>
                    <th className="p-3 border-b border-white/10 w-16">Yıl</th>
                    <th className="p-3 border-b border-white/10 text-right w-36">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const { ad, aciklama: splitAciklama } = splitStokAdi(item.stok_adi, item.aciklama)
                    return (
                      <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] align-top">
                        <td className="p-3 font-mono text-[11px] text-white/40 pt-4">{item.stok_kodu}</td>
                        <td className="p-3">
                          <div className="text-white font-semibold text-sm leading-tight">{ad}</div>
                        </td>
                        <td className="p-3">
                          {splitAciklama ? (
                            <div className="text-white/50 text-xs leading-relaxed max-w-xl">{splitAciklama}</div>
                          ) : (
                            <span className="text-white/20 text-xs italic">—</span>
                          )}
                        </td>
                        <td className="p-3 pt-4">
                          <div className="font-black text-brand-red text-sm">
                            {formatDoviz(item.doviz_tipi)}{Number(item.fiyat_doviz).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-white/30 mt-0.5">{item.doviz_tipi || 'TRY'}</div>
                        </td>
                        <td className="p-3 pt-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-sm ${Number(item.stok_miktari) > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {Number(item.stok_miktari).toFixed(0)}
                          </span>
                        </td>
                        <td className="p-3 pt-4">
                          {item.yil ? (
                            <span className="text-xs bg-white/5 text-white/50 px-2 py-1 rounded-sm border border-white/10">
                              {item.yil}
                            </span>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-3 pt-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="px-2 py-1.5 bg-brand-red/10 text-brand-red border border-brand-red/20 hover:bg-brand-red hover:text-white transition-colors rounded-sm flex items-center gap-1 text-xs font-bold uppercase"
                            >
                              <Edit size={12} /> Onayla
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 bg-white/5 text-white/40 hover:text-red-500 border border-white/5 transition-colors rounded-sm"
                              title="Taslağı Sil"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Sayfalama */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <span className="text-white/30 text-xs">
                  Sayfa {page} / {totalPages} ({total.toLocaleString('tr-TR')} ürün)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="p-2 bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:bg-white/10 transition-colors rounded-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {/* Sayfa numaraları */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const startPage = Math.max(1, Math.min(page - 2, totalPages - 4))
                    const p = startPage + i
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 text-xs rounded-sm transition-colors ${p === page ? 'bg-brand-red text-white' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'}`}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                    className="p-2 bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:bg-white/10 transition-colors rounded-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
