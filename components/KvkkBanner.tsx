'use client'

import { useState, useEffect } from 'react'
import { X, Cookie } from 'lucide-react'

export default function KvkkBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const accepted = typeof window !== 'undefined' ? localStorage.getItem('kvkk-accepted') : null
      if (!accepted) setVisible(true)
    } catch {
      // Gizli sekme veya depolama engelli tarayıcılarda da görünür yap
      setVisible(true)
    }
  }, [])

  const accept = () => {
    try {
      localStorage.setItem('kvkk-accepted', '1')
    } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] inset-x-3 md:inset-x-auto md:left-6 md:bottom-6 md:max-w-md z-[60] transition-all duration-300">
      <div className="bg-slate-950/95 backdrop-blur-md border border-white/15 p-4 sm:p-5 rounded-2xl shadow-2xl shadow-black/40 text-white">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-brand-red/20 text-brand-red shrink-0 mt-0.5">
            <Cookie size={20} />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="font-display font-bold text-xs sm:text-sm uppercase tracking-wider text-white">
                Çerez Politikası
              </p>
              <button
                type="button"
                onClick={accept}
                className="text-white/40 hover:text-white transition-colors p-1 -mr-1 rounded-lg"
                aria-label="Kapat"
              >
                <X size={16} />
              </button>
            </div>
            <p className="font-body text-slate-400 text-xs leading-relaxed mb-3">
              Deneyiminizi iyileştirmek için yasal mevzuata uygun çerezler kullanıyoruz.{' '}
              <a href="/gizlilik-politikasi" className="text-brand-red hover:underline font-medium">
                Aydınlatma Metni
              </a>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={accept}
                className="w-full py-2 px-4 rounded-xl bg-brand-red hover:bg-red-700 text-white font-display font-bold text-xs uppercase tracking-wider transition-colors shadow-sm text-center"
              >
                Kabul Et
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
