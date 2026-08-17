'use client'

import { useState, useEffect } from 'react'

export default function GlobalLoader() {
  const [isVisible, setIsVisible] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    // Sadece siteye ilk girildiğinde (veya F5 atıldığında) çalışır.
    // Sayfa geçişlerinde (layout mount olduğu sürece) bir daha tetiklenmez.
    setIsVisible(true)
    setIsFadingOut(false)
    
    // 2 saniye tam görünür kal
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true) // Fade out animasyonunu başlat
      
      // Fade out bittikten sonra (1 saniye) DOM'dan tamamen kaldır
      const removeTimer = setTimeout(() => {
        setIsVisible(false)
      }, 1000) 
      
      return () => clearTimeout(removeTimer)
    }, 2000)
    
    return () => clearTimeout(fadeTimer)
  }, [])

  if (!isVisible) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-1000 ease-in-out
        ${isFadingOut ? 'opacity-0' : 'opacity-100'}
      `}
    >
      <div className="relative w-64 h-64 flex items-center justify-center">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-contain pointer-events-none"
        >
          <source src="/loader.mov" />
          <div className="text-brand-red font-bold">Video yüklenemedi.</div>
        </video>
      </div>
      <div className="mt-8 flex items-center gap-2 text-slate-500 font-display font-medium tracking-widest text-sm uppercase animate-pulse">
        Sescim Yükleniyor...
      </div>
    </div>
  )
}
