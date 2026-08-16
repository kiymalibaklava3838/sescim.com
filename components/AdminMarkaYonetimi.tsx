'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Merge, Search, AlertTriangle, Check, RefreshCw, Info } from 'lucide-react'

export default function AdminMarkaYonetimi() {
  const supabase = createClient()
  const [brands, setBrands] = useState<{name: string, count: number}[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [targetBrand, setTargetBrand] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [merging, setMerging] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  const fetchBrands = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('urunler').select('marka')
    if (data) {
      const counts: Record<string, number> = {}
      data.forEach((item: { marka: string | null }) => {
        const m = (item.marka && item.marka.trim() !== '') ? item.marka : 'Belirtilmemiş'
        counts[m] = (counts[m] || 0) + 1
      })
      const sorted = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setBrands(sorted)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBrands()
  }, [])

  const handleToggleBrand = (brandName: string) => {
    if (selectedBrands.includes(brandName)) {
      setSelectedBrands(selectedBrands.filter(b => b !== brandName))
    } else {
      setSelectedBrands([...selectedBrands, brandName])
    }
  }

  const handleSelectAll = () => {
    if (selectedBrands.length === filteredBrands.length) {
      setSelectedBrands([])
    } else {
      setSelectedBrands(filteredBrands.map(b => b.name))
    }
  }

  const handleMerge = async () => {
    if (selectedBrands.length === 0) {
      setMessage({ type: 'error', text: 'Lütfen birleştirilecek markaları seçin.' })
      return
    }
    if (!targetBrand.trim()) {
      setMessage({ type: 'error', text: 'Lütfen hedef markayı girin.' })
      return
    }
    
    const affectedCount = brands.filter(b => selectedBrands.includes(b.name)).reduce((sum, b) => sum + b.count, 0)
    
    if (!window.confirm(`${affectedCount} adet ürün '${targetBrand}' markası ile güncellenecek. Bu işlem geri alınamaz. Onaylıyor musunuz?`)) {
      return
    }

    setMerging(true)
    setMessage(null)
    
    try {
      const dbSelectedBrands = selectedBrands.filter(b => b !== 'Belirtilmemiş')
      
      let errorOccurred = false

      if (dbSelectedBrands.length > 0) {
        const { error } = await supabase
          .from('urunler')
          .update({ marka: targetBrand.trim() })
          .in('marka', dbSelectedBrands)
        
        if (error) errorOccurred = true
      }

      if (selectedBrands.includes('Belirtilmemiş')) {
        // null veya boş string olanlar için
        const { error: err1 } = await supabase.from('urunler').update({ marka: targetBrand.trim() }).is('marka', null)
        const { error: err2 } = await supabase.from('urunler').update({ marka: targetBrand.trim() }).eq('marka', '')
        if (err1 || err2) errorOccurred = true
      }

      if (errorOccurred) {
        throw new Error('Bazı ürünler güncellenirken hata oluştu.')
      }

      setMessage({ type: 'success', text: 'Markalar başarıyla birleştirildi!' })
      setSelectedBrands([])
      setTargetBrand('')
      await fetchBrands()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Bir hata oluştu.' })
    } finally {
      setMerging(false)
    }
  }

  const filteredBrands = brands.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const affectedCount = brands.filter(b => selectedBrands.includes(b.name)).reduce((sum, b) => sum + b.count, 0)

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="bg-[#141414] border border-white/5 p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/5 rounded-full blur-[80px] -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-150" />
        <div className="relative z-10 flex gap-4">
          <div className="w-12 h-12 bg-white/5 flex items-center justify-center shrink-0">
            <Merge className="text-brand-red" size={24} />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl uppercase tracking-wide text-white mb-2">Marka Birleştirme Aracı</h2>
            <p className="font-body text-white/50 text-sm leading-relaxed max-w-3xl">
              Farklı yazılmış veya yanlış girilmiş marka isimlerini tek bir standart marka adı altında toplayabilirsiniz. 
              Örneğin: "Apple", "apple", "APPLE" gibi farklı yazımları seçip hedef olarak "Apple" belirleyebilirsiniz.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} flex items-start gap-3`}>
          {message.type === 'success' ? <Check size={20} className="shrink-0 mt-0.5" /> : <AlertTriangle size={20} className="shrink-0 mt-0.5" />}
          <div className="font-body text-sm">{message.text}</div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Source Brands (Left Column) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white flex items-center gap-2">
              1. Kaynak Markaları Seçin
              <span className="bg-white/10 text-white/70 text-xs py-0.5 px-2 rounded-full font-body">
                {selectedBrands.length} seçili
              </span>
            </h3>
            <button 
              onClick={fetchBrands}
              className="p-2 hover:bg-white/5 text-white/50 hover:text-white transition-colors"
              title="Yenile"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="bg-[#141414] border border-white/5 p-4 flex items-center gap-3">
            <Search size={18} className="text-white/30" />
            <input
              type="text"
              placeholder="Marka ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-white font-body text-sm w-full placeholder:text-white/30"
            />
          </div>

          <div className="bg-[#141414] border border-white/5 flex flex-col h-[500px]">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${selectedBrands.length > 0 && selectedBrands.length === filteredBrands.length ? 'bg-brand-red border-brand-red' : 'border-white/20 group-hover:border-white/40'}`}>
                  {selectedBrands.length > 0 && selectedBrands.length === filteredBrands.length && <Check size={14} className="text-white" />}
                </div>
                <span className="font-display text-xs tracking-wider uppercase text-white/70 group-hover:text-white transition-colors">Tümünü Seç</span>
              </label>
              <span className="font-display text-xs tracking-wider uppercase text-white/50">Ürün Sayısı</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {loading ? (
                <div className="h-full flex items-center justify-center text-white/30 font-display text-sm tracking-widest uppercase">Yükleniyor...</div>
              ) : filteredBrands.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/30 font-display text-sm tracking-widest uppercase">Marka bulunamadı</div>
              ) : (
                filteredBrands.map((brand) => (
                  <label key={brand.name} className="flex items-center justify-between p-3 hover:bg-white/5 cursor-pointer group transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${selectedBrands.includes(brand.name) ? 'bg-brand-red border-brand-red' : 'border-white/20 group-hover:border-white/40'}`}>
                        {selectedBrands.includes(brand.name) && <Check size={14} className="text-white" />}
                      </div>
                      <span className={`font-body text-sm ${selectedBrands.includes(brand.name) ? 'text-white font-medium' : 'text-white/70 group-hover:text-white'}`}>
                        {brand.name}
                      </span>
                    </div>
                    <span className="bg-white/5 text-white/50 text-xs px-2 py-1 font-body">
                      {brand.count}
                    </span>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={selectedBrands.includes(brand.name)}
                      onChange={() => handleToggleBrand(brand.name)}
                    />
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Target Brand (Right Column) */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white">2. Hedef Markayı Belirle</h3>
          
          <div className="bg-[#141414] border border-white/5 p-6 space-y-6 relative overflow-hidden">
            <div className="space-y-3">
              <label className="font-display text-xs tracking-wider uppercase text-white/50">Yeni Marka Adı</label>
              <input
                type="text"
                value={targetBrand}
                onChange={(e) => setTargetBrand(e.target.value)}
                placeholder="Örn: Apple"
                className="w-full bg-[#0A0A0A] border border-white/10 p-4 text-white font-body text-sm focus:border-brand-red focus:outline-none transition-colors"
              />
            </div>

            <div className="bg-brand-red/5 border border-brand-red/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-brand-red font-display text-xs tracking-widest uppercase font-bold">
                <Info size={14} /> Özet
              </div>
              <p className="font-body text-sm text-white/70">
                <strong className="text-white">{selectedBrands.length}</strong> adet farklı marka ismi, <strong className="text-white">'{targetBrand || '?'}'</strong> olarak değiştirilecek.
              </p>
              <p className="font-body text-sm text-white/70">
                Toplam <strong className="text-white">{affectedCount}</strong> adet ürün güncellenecek.
              </p>
            </div>

            <button
              onClick={handleMerge}
              disabled={merging || selectedBrands.length === 0 || !targetBrand.trim()}
              className="w-full bg-brand-red text-white font-display font-bold text-sm tracking-widest uppercase py-4 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {merging ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  İŞLENİYOR...
                </>
              ) : (
                <>
                  <Merge size={18} />
                  BİRLEŞTİR VE GÜNCELLE
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
