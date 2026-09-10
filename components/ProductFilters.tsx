'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, Filter, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface FilterProps {
  markalar: string[]
  kullanimAlanlari: string[]
  searchParams: Record<string, string | undefined>
  slugArray: string[]
}

export default function ProductFilters({ markalar, kullanimAlanlari, searchParams, slugArray }: FilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (isOpen) {
      const orig = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false)
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = orig
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isOpen, mounted])
  const clearFiltersUrl = slugArray.length > 0 ? `/urunler/${slugArray.join('/')}` : '/urunler'
  
  const hasFilters = !!(searchParams.marka || searchParams.kullanim || searchParams.stok || searchParams.min || searchParams.max || searchParams.q)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const params = new URLSearchParams()

    const q = formData.get('q') as string
    if (q) params.set('q', q)

    const marka = formData.get('marka') as string
    if (marka && marka !== 'tum') params.set('marka', marka)

    const min = formData.get('min') as string
    if (min) params.set('min', min)

    const max = formData.get('max') as string
    if (max) params.set('max', max)

    const stok = formData.get('stok') as string
    if (stok && stok !== 'tum') params.set('stok', stok)

    const sirala = formData.get('sirala') as string
    if (sirala && sirala !== 'yeni') params.set('sirala', sirala)

    const kullanim = formData.get('kullanim') as string
    if (kullanim && kullanim !== 'tum') params.set('kullanim', kullanim)

    setIsOpen(false)
    const qs = params.toString()
    router.push(qs ? `${clearFiltersUrl}?${qs}` : clearFiltersUrl)
  }

  return (
    <>
      {/* Tetikleyici Buton (Filtreler) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between bg-white border border-slate-200 p-4 hover:border-brand-red transition-colors shadow-sm"
      >
        <div className="flex items-center gap-3">
          <SlidersHorizontal size={20} className="text-brand-red" />
          <span className="font-display font-black text-sm tracking-[0.1em] uppercase text-slate-800">Filtrele & Sırala</span>
        </div>
        {hasFilters && (
          <span className="w-2 h-2 rounded-full bg-brand-red" />
        )}
      </button>

      {/* Yan Pencere ve Overlay (Framer Motion ile Portala Bağlı) */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[9999]">
              {/* Overlay */}
              <motion.div 
                key="filter-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
              />

              {/* Yan Pencere (Drawer) */}
              <motion.div 
                key="filter-panel"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="fixed top-0 left-0 h-full w-[300px] sm:w-[350px] bg-white z-[10000] shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50 shrink-0">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={18} className="text-brand-red" />
                    <span className="font-display font-black text-base tracking-[0.1em] uppercase text-slate-800">FİLTRELER</span>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-brand-red transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <form 
                    className="space-y-8" 
                    id="filter-form"
                    action={clearFiltersUrl}
                    method="GET"
                    onSubmit={handleSubmit}
                  >
                    {/* Hidden inputs to preserve search queries */}
                    {searchParams.q && <input type="hidden" name="q" value={searchParams.q} />}
                    {searchParams.kullanim && <input type="hidden" name="kullanim" value={searchParams.kullanim} />}

                    {/* Categories */}
                    <div className="space-y-4">
                      <label className="block text-[10px] font-display font-black uppercase text-slate-800 tracking-[0.2em] border-b border-slate-100 pb-2">
                        Markalar
                      </label>
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" name="marka" value="tum" defaultChecked={!searchParams.marka || searchParams.marka === 'tum'} className="w-4 h-4 text-brand-red focus:ring-brand-red border-slate-300" />
                          <span className="text-sm font-body font-medium text-slate-600 group-hover:text-brand-red transition-colors">Tümü</span>
                        </label>
                        {markalar.map((m) => (
                          <label key={m} className="flex items-center gap-3 cursor-pointer group">
                            <input type="radio" name="marka" value={m} defaultChecked={searchParams.marka === m} className="w-4 h-4 text-brand-red focus:ring-brand-red border-slate-300" />
                            <span className="text-sm font-body font-medium text-slate-600 group-hover:text-brand-red transition-colors">{m.toUpperCase()}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-display font-black uppercase text-slate-800 tracking-[0.2em] border-b border-slate-100 pb-2">
                        Fiyat Aralığı
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₺</span>
                          <input name="min" type="number" min="0" defaultValue={searchParams.min || ''} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm py-3 pl-8 pr-2 focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all" placeholder="Min" />
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₺</span>
                          <input name="max" type="number" min="0" defaultValue={searchParams.max || ''} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm py-3 pl-8 pr-2 focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all" placeholder="Max" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-display font-black uppercase text-slate-800 tracking-[0.2em] border-b border-slate-100 pb-2">
                        Stok Durumu
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" name="stok" value="tum" defaultChecked={!searchParams.stok || searchParams.stok === 'tum'} className="w-4 h-4 text-brand-red focus:ring-brand-red border-slate-300" />
                          <span className="text-sm font-body font-medium text-slate-600 group-hover:text-brand-red transition-colors">Tümü</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" name="stok" value="stokta" defaultChecked={searchParams.stok === 'stokta'} className="w-4 h-4 text-brand-red focus:ring-brand-red border-slate-300" />
                          <span className="text-sm font-body font-medium text-slate-600 group-hover:text-brand-red transition-colors">Sadece Stoktakiler</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-display font-black uppercase text-slate-800 tracking-[0.2em] border-b border-slate-100 pb-2">
                        Sıralama
                      </label>
                      <select name="sirala" defaultValue={searchParams.sirala || 'yeni'} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm py-3 px-3 focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all cursor-pointer">
                        <option value="yeni">En Yeniler</option>
                        <option value="fiyat_artan">Fiyat (Artan)</option>
                        <option value="fiyat_azalan">Fiyat (Azalan)</option>
                        <option value="ad_asc">İsim (A-Z)</option>
                      </select>
                    </div>
                  </form>
                </div>

                <div className="p-6 bg-white border-t border-slate-200 flex gap-3 shrink-0">
                  {hasFilters && (
                    <button 
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        router.push(clearFiltersUrl)
                      }}
                      className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-display font-black tracking-widest uppercase transition-colors"
                    >
                      Temizle
                    </button>
                  )}
                  <button 
                    type="submit" 
                    form="filter-form"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 bg-brand-red hover:bg-red-700 text-white flex items-center justify-center gap-2 text-xs py-4 font-display font-black tracking-widest uppercase transition-colors"
                  >
                    <Filter size={14} /> 
                    Uygula
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
