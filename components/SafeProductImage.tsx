'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Package } from 'lucide-react'

interface SafeProductImageProps {
  src?: string | null
  alt: string
  fill?: boolean
  width?: number
  height?: number
  sizes?: string
  priority?: boolean
  loading?: 'lazy' | 'eager'
  className?: string
  wrapperClassName?: string
  unoptimized?: boolean
  quality?: number
  placeholderIconSize?: number
}

/**
 * 3 Aşamalı Hata Toleranslı Görsel Bileşeni
 *
 * Aşama 1 — "optimized": Next.js Image Optimizer üzerinden WebP/AVIF ile yükle.
 *   → Başarılı: SEO + Core Web Vitals için optimize görsel kullanılır.
 *   → Hata (optimizer erişilemiyor, kota doldu, vb.): Aşama 2'ye geç.
 *
 * Aşama 2 — "direct": Supabase CDN'den doğrudan unoptimized olarak yükle.
 *   → Next.js proxy'si devre dışı, orijinal URL kullanılır.
 *   → Hata (görsel silinmiş, CDN erişilemiyor, vb.): Aşama 3'e geç.
 *
 * Aşama 3 — "failed": Şık gri Package ikonu gösterilir. Layout shift yaratmaz.
 *
 * Not: `unoptimized` prop'u dışarıdan verilirse Aşama 1 atlanır, doğrudan
 * Aşama 2'den başlanır (küçük thumbnail'lar için optimize etmeye değmez).
 */
export default function SafeProductImage({
  src,
  alt,
  fill = true,
  width,
  height,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw',
  priority = false,
  loading,
  className = 'object-contain',
  wrapperClassName = '',
  unoptimized = false,
  quality = 80,
  placeholderIconSize = 32,
}: SafeProductImageProps) {
  type Stage = 'optimized' | 'direct' | 'failed'

  const getInitialStage = (): Stage => {
    if (!src || !src.trim()) return 'failed'
    // Dışarıdan unoptimized=true verilmişse optimize adımını atla
    return unoptimized ? 'direct' : 'optimized'
  }

  const [stage, setStage] = useState<Stage>(getInitialStage)
  const [isLoaded, setIsLoaded] = useState(false)

  // src veya unoptimized prop değişirse durumu sıfırla
  useEffect(() => {
    if (!src || !src.trim()) {
      setStage('failed')
    } else {
      setStage(unoptimized ? 'direct' : 'optimized')
    }
    setIsLoaded(false)
  }, [src, unoptimized])

  const handleError = () => {
    setStage((prev) => {
      if (prev === 'optimized') return 'direct'   // Optimizer hata → CDN doğrudan dene
      return 'failed'                              // CDN de hata → ikon göster
    })
    setIsLoaded(false)
  }

  if (stage === 'failed' || !src || !src.trim()) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 select-none ${wrapperClassName}`}>
        <Package size={placeholderIconSize} className="stroke-[1.5]" />
      </div>
    )
  }

  const effectiveLoading = priority ? undefined : (loading || 'lazy')
  const isUnoptimized = stage === 'direct'

  return (
    <div className={`relative w-full h-full overflow-hidden ${wrapperClassName}`}>
      {/* Yükleniyor shimmer arka planı — görsel hazır olunca gizlenir */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-100 skeleton-shimmer z-0" />
      )}

      <Image
        key={`${src}-${stage}`}
        src={src}
        alt={alt || 'Ürün görseli'}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        sizes={sizes}
        priority={priority}
        loading={effectiveLoading}
        unoptimized={isUnoptimized}
        quality={isUnoptimized ? undefined : quality}
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
