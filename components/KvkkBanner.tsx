'use client'

import { useState, useEffect } from 'react'
import { X, Cookie } from 'lucide-react'

export default function KvkkBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('kvkk-accepted')
    if (!accepted) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem('kvkk-accepted', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-[#141414] border border-white/10 p-5 md:p-6 shadow-2xl"
        style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-4 flex-1">
            <Cookie size={20} className="text-brand-red flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-display font-bold text-sm uppercase tracking-wide text-white mb-1">
                Çerez Politikası
              </p>
              <p className="font-body text-white/40 text-xs leading-relaxed">
                Bu site, hizmet kalitesini artırmak amacıyla çerezler kullanmaktadır.
                Siteyi kullanmaya devam ederek{' '}
                <a href="/gizlilik-politikasi" className="text-brand-red hover:underline">
                  KVKK Aydınlatma Metni
                </a>
                &apos;ni kabul etmiş sayılırsınız.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto">
            <button
              onClick={accept}
              className="btn-primary text-xs flex-1 md:flex-none justify-center"
            >
              Kabul Et
            </button>
            <button
              onClick={accept}
              className="text-white/20 hover:text-white/50 transition-colors p-1"
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
