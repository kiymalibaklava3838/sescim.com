'use client'

import { useState, useEffect } from 'react'
import { Star, Search, Plus, Trash2, Check, ArrowUpDown, Package, AlertCircle, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import { formatFiyat } from '@/lib/kur'
import { createAkdagBrowserClient } from '@/lib/supabase-akdag'

export default function AdminProTercih({ supabase }: { supabase: any }) {
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    loadSelected()
  }, [])

  async function triggerRevalidate() {
    try {
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/' })
      })
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/urunler' })
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      console.warn('Revalidation warning:', e)
    }
  }

  async function loadSelected() {
    setLoading(true)
    try {
      // 1. ozel_urunler'den kayıtları al
      const { data: ozelData, error } = await supabase
        .from('ozel_urunler')
        .select('id, urun_id, sira, created_at')
        .eq('tip', 'profesyonellerin_tercihi')
        .order('sira', { ascending: true })

      if (error) throw error

      if (!ozelData || ozelData.length === 0) {
        setSelectedItems([])
        return
      }

      // 2. Ürün bilgilerini hem Sescim hem Akdağ kataloğundan çek
      const urunIds = ozelData.map((x: any) => x.urun_id)
      const akdagDb = createAkdagBrowserClient()
      const [sescimRes, akdagRes] = await Promise.all([
        supabase
          .from('urunler')
          .select('id, ad, marka, kategori, fiyat, sescim_fiyat, sescim_indirimli_fiyat, para_birimi, fotograflar, stok_durumu')
          .in('id', urunIds),
        akdagDb
          .from('urunler')
          .select('id, ad, marka, kategori, fiyat, para_birimi, fotograflar, stok_durumu')
          .in('id', urunIds)
      ])

      const allCombined = [...(sescimRes.data || []), ...(akdagRes.data || [])]
      const productMap = new Map((allCombined || []).map((p: any) => [p.id, p]))

      const joined = ozelData
        .map((ozel: any) => ({
          ozel_id: ozel.id,
          sira: ozel.sira,
          product: productMap.get(ozel.urun_id) || null
        }))
        .filter((item: any) => item.product !== null)

      setSelectedItems(joined)
    } catch (err) {
      console.error('Profesyonellerin tercihi yüklenemedi:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(term: string) {
    setSearchTerm(term)
    if (!term.trim() || term.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const akdagDb = createAkdagBrowserClient()
      const [sescimRes, akdagRes] = await Promise.all([
        supabase
          .from('urunler')
          .select('id, ad, marka, kategori, fiyat, sescim_fiyat, sescim_indirimli_fiyat, para_birimi, fotograflar, stok_durumu')
          .or(`ad.ilike.%${term}%,marka.ilike.%${term}%`)
          .limit(20),
        akdagDb
          .from('urunler')
          .select('id, ad, marka, kategori, fiyat, para_birimi, fotograflar, stok_durumu')
          .or(`ad.ilike.%${term}%,marka.ilike.%${term}%`)
          .limit(20)
      ])

      const combined = [...(sescimRes.data || []), ...(akdagRes.data || [])]
      const uniqueMap = new Map<string, any>()
      combined.forEach(p => {
        if (!uniqueMap.has(p.id)) {
          uniqueMap.set(p.id, p)
        }
      })

      setSearchResults(Array.from(uniqueMap.values()).slice(0, 20))
    } catch (err) {
      console.error('Ürün arama hatası:', err)
    } finally {
      setSearching(false)
    }
  }

  async function addProduct(prod: any) {
    // Zaten seçili mi?
    if (selectedItems.some(i => i.product.id === prod.id)) {
      alert('Bu ürün zaten Profesyonellerin Tercihi listesinde ekli.')
      return
    }

    setActionLoading(true)
    try {
      const nextSira = selectedItems.length + 1
      const { data, error } = await supabase
        .from('ozel_urunler')
        .insert([{
          urun_id: prod.id,
          tip: 'profesyonellerin_tercihi',
          sira: nextSira
        }])
        .select()

      if (error) throw error

      if (data && data[0]) {
        setSelectedItems([
          ...selectedItems,
          {
            ozel_id: data[0].id,
            sira: nextSira,
            product: prod
          }
        ])
        await triggerRevalidate()
      }
    } catch (err: any) {
      alert('Eklenemedi: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function removeProduct(ozelId: string) {
    if (!confirm('Bu ürünü listeden çıkarmak istiyor musunuz?')) return
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('ozel_urunler')
        .delete()
        .eq('id', ozelId)

      if (error) throw error
      setSelectedItems(selectedItems.filter(i => i.ozel_id !== ozelId))
      await triggerRevalidate()
    } catch (err: any) {
      alert('Çıkarılamadı: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Star className="text-amber-500 fill-amber-500" size={22} />
            Profesyonellerin Tercihi Yönetimi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Anasayfada ve Keşfet sayfasında &quot;⭐ Profesyonellerin Tercihi&quot; vitrininde gösterilecek teknik ve stüdyo odaklı ürünleri buradan seçip anında yayınlayın.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold animate-fade-in">
              <Check size={14} /> Web sitesinde anında yayınlandı!
            </span>
          )}
          <button
            onClick={() => triggerRevalidate()}
            disabled={actionLoading}
            className="px-4 py-2 bg-slate-900 hover:bg-brand-red text-white text-xs font-display font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            title="Önbelleği temizle ve web sitesini anında güncelle"
          >
            <RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />
            <span>Web Sitesini Güncelle</span>
          </button>
        </div>
      </div>

      {/* ARAMA VE EKLEME BÖLÜMÜ */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-display font-bold uppercase tracking-wider text-slate-700">
          Ürün Ara ve Listeye Ekle
        </h3>
        
        <div className="relative max-w-xl">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Ürün adı, marka veya model ara (örn: Shure, Yamaha, Mikrofon)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red focus:bg-white transition-all"
          />
        </div>

        {searching && <div className="text-xs text-slate-500 py-2">Aranıyor...</div>}

        {searchResults.length > 0 && (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-80 overflow-y-auto mt-2">
            {searchResults.map((prod) => {
              const isAlreadyAdded = selectedItems.some(i => i.product.id === prod.id)
              const img = prod.fotograflar?.[0] || null
              return (
                <div key={prod.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 relative bg-white border border-slate-200 rounded overflow-hidden shrink-0 flex items-center justify-center">
                      {img ? (
                        <Image src={img} alt={prod.ad} fill sizes="48px" className="object-contain p-1" />
                      ) : (
                        <Package size={20} className="text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{prod.ad}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-brand-red">{prod.marka || 'Sescim'}</span>
                        <span>•</span>
                        <span>{prod.kategori}</span>
                        <span>•</span>
                        <span className="font-mono font-bold text-slate-700">
                          {formatFiyat(prod.fiyat, prod.para_birimi || 'TRY')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => addProduct(prod)}
                    disabled={isAlreadyAdded || actionLoading}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all ${
                      isAlreadyAdded
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-900 hover:bg-brand-red text-white'
                    }`}
                  >
                    {isAlreadyAdded ? <Check size={14} /> : <Plus size={14} />}
                    {isAlreadyAdded ? 'Listede Ekli' : 'Listeye Ekle'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SEÇİLEN ÜRÜNLER LİSTESİ */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-display font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <span>Yayındaki Profesyonel Ürünler</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
              {selectedItems.length} Ürün
            </span>
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500">Yükleniyor...</div>
        ) : selectedItems.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg space-y-2">
            <Star size={32} className="mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">Henüz özel ürün seçilmedi</p>
            <p className="text-[11px] text-slate-400">
              Yukarıdaki arama kutusundan ürün aratarak ekleyebilirsiniz. Ürün seçilmediğinde sistem otomatik olarak stüdyo & ses sistemlerindeki üst segment ürünleri vitrinde listeler.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedItems.map((item, idx) => {
              const prod = item.product
              const img = prod.fotograflar?.[0] || null
              return (
                <div
                  key={item.ozel_id}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:shadow-xs transition-all flex items-center justify-between gap-3 relative group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="w-12 h-12 relative bg-slate-50 rounded overflow-hidden shrink-0 flex items-center justify-center border border-slate-100">
                      {img ? (
                        <Image src={img} alt={prod.ad} fill sizes="48px" className="object-contain p-1" />
                      ) : (
                        <Package size={20} className="text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate" title={prod.ad}>
                        {prod.ad}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {prod.marka || prod.kategori}
                      </div>
                      <div className="text-xs font-mono font-bold text-brand-red mt-0.5">
                        {formatFiyat(prod.fiyat, prod.para_birimi || 'TRY')}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeProduct(item.ozel_id)}
                    disabled={actionLoading}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title="Listeden Çıkar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
