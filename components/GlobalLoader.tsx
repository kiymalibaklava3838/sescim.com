'use client'

import { useState, useEffect } from 'react'

export default function GlobalLoader() {
  const [isVisible, setIsVisible] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    // Aynı oturumda daha önce ziyaret edildiyse tekrar bekletme (0ms doğrudan açılış)
    const hasVisited = typeof window !== 'undefined' && sessionStorage.getItem('sescim_entered')
    if (hasVisited) {
      setIsVisible(false)
      return
    }

    setIsVisible(true)
    sessionStorage.setItem('sescim_entered', '1')

    const triggerFadeOut = () => {
      setIsFadingOut(true)
      setTimeout(() => {
        setIsVisible(false)
      }, 350)
    }

    // Sayfa hazır olduğunda veya en fazla 550ms sonra akıcı şekilde kaldır
    let timer: NodeJS.Timeout
    if (document.readyState === 'complete') {
      timer = setTimeout(triggerFadeOut, 450)
    } else {
      const onLoad = () => {
        timer = setTimeout(triggerFadeOut, 200)
      }
      window.addEventListener('load', onLoad, { once: true })
      timer = setTimeout(triggerFadeOut, 650) // Maksimum güvenlik tavanı
    }

    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-300 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative w-48 h-52 flex items-center justify-center">
        {/* Dikey Fader Yuvası / Hattı */}
        <div className="absolute w-[4px] h-44 bg-slate-900 rounded-full" />
        
        {/* Hareketli Fader Potu (Sescim logo 'i' fader tasarımı) */}
        <div className="relative z-10 animate-fader-slide">
          <div 
            className="w-10 h-16 bg-brand-red rounded-sm shadow-md flex items-center justify-center relative overflow-hidden"
            style={{
              clipPath: 'polygon(16% 0%, 84% 0%, 100% 12%, 100% 88%, 84% 100%, 16% 100%, 0% 88%, 0% 12%)',
            }}
          >
            {/* Ortadaki Beyaz Çizgi */}
            <div className="w-full h-[3px] bg-white shadow-sm" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-slate-500 font-display font-bold tracking-[0.25em] text-xs uppercase animate-pulse">
        Sescim Yükleniyor...
      </div>
    </div>
  )
}
