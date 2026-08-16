'use client'

import { SlidersHorizontal, Filter, X } from 'lucide-react'

interface FilterProps {
  markalar: string[]
  kullanimAlanlari: string[]
  searchParams: Record<string, string | undefined>
  slugArray: string[]
}

export default function ProductFilters({ markalar, kullanimAlanlari, searchParams, slugArray }: FilterProps) {
  const clearFiltersUrl = slugArray.length > 0 ? `/urunler/${slugArray.join('/')}` : '/urunler'
  
  return (
    <div className="bg-white border border-slate-200 p-6 sticky top-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-brand-red" />
          <span className="font-display font-black text-sm tracking-[0.1em] uppercase text-slate-800">FİLTRELER</span>
        </div>
        {(searchParams.marka || searchParams.kullanim || searchParams.stok || searchParams.min || searchParams.max || searchParams.q) && (
          <a href={clearFiltersUrl} className="text-[10px] text-slate-400 hover:text-brand-red font-bold tracking-widest uppercase transition-colors">
            Temizle
          </a>
        )}
      </div>

      <form className="space-y-8">
        {/* Hidden inputs to preserve search queries */}
        {searchParams.q && <input type="hidden" name="q" value={searchParams.q} />}

        {/* Categories */}
        <div className="space-y-4">
          <label className="block text-[10px] font-display font-black uppercase text-slate-800 tracking-[0.2em] border-b border-slate-100 pb-2">
            Markalar
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-2">
              <input type="radio" id="marka_tum" name="marka" value="tum" defaultChecked={!searchParams.marka || searchParams.marka === 'tum'} className="accent-brand-red" />
              <label htmlFor="marka_tum" className="text-xs font-body text-slate-600 hover:text-brand-red cursor-pointer">Tümü</label>
            </div>
            {markalar.map((m) => (
              <div key={m} className="flex items-center gap-2">
                <input type="radio" id={`marka_${m}`} name="marka" value={m} defaultChecked={searchParams.marka === m} className="accent-brand-red" />
                <label htmlFor={`marka_${m}`} className="text-xs font-body text-slate-600 hover:text-brand-red cursor-pointer">{m.toUpperCase()}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-[10px] font-display font-black uppercase text-slate-800 tracking-[0.2em] border-b border-slate-100 pb-2">
            Fiyat Aralığı
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₺</span>
              <input name="min" type="number" min="0" defaultValue={searchParams.min || ''} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs py-2.5 pl-7 pr-2 focus:border-brand-red focus:outline-none transition-colors" placeholder="Min" />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₺</span>
              <input name="max" type="number" min="0" defaultValue={searchParams.max || ''} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs py-2.5 pl-7 pr-2 focus:border-brand-red focus:outline-none transition-colors" placeholder="Max" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-[10px] font-display font-black uppercase text-slate-800 tracking-[0.2em] border-b border-slate-100 pb-2">
            Stok Durumu
          </label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="radio" id="stok_tum" name="stok" value="tum" defaultChecked={!searchParams.stok || searchParams.stok === 'tum'} className="accent-brand-red" />
              <label htmlFor="stok_tum" className="text-xs font-body text-slate-600 cursor-pointer">Tümü</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="radio" id="stok_stokta" name="stok" value="stokta" defaultChecked={searchParams.stok === 'stokta'} className="accent-brand-red" />
              <label htmlFor="stok_stokta" className="text-xs font-body text-slate-600 cursor-pointer">Sadece Stoktakiler</label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-[10px] font-display font-black uppercase text-slate-800 tracking-[0.2em] border-b border-slate-100 pb-2">
            Sıralama
          </label>
          <select name="sirala" defaultValue={searchParams.sirala || 'yeni'} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs py-3 px-3 focus:border-brand-red focus:outline-none transition-colors appearance-none cursor-pointer">
            <option value="yeni">En Yeniler</option>
            <option value="fiyat_artan">Fiyat (Artan)</option>
            <option value="fiyat_azalan">Fiyat (Azalan)</option>
            <option value="ad_asc">İsim (A-Z)</option>
          </select>
        </div>

        <button className="w-full bg-brand-red hover:bg-red-700 text-white flex items-center justify-center gap-2 text-xs py-4 font-display font-black tracking-widest uppercase transition-colors" type="submit">
          <Filter size={14} /> 
          Uygula
        </button>
      </form>
    </div>
  )
}
