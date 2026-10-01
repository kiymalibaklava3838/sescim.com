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
 * Hata Toleranslı, Vercel CPU Dostu ve Akıllı Görsel Bileşeni
 * 1. Görsel yoksa veya boşsa: Şık gri paket ikonu render eder.
 * 2. Next.js optimizasyon sunucusu hata verirse: Otomatik olarak doğrudan unoptimized Supabase CDN linkine geçer.
 * 3. Doğrudan link de erişilemezse: Güvenli fallback ikonunu gösterir.
 * 4. Yüklenme tamamlanana kadar pürüzsüz animasyon sağlar, layout shift yaratmaz.
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
  // Aşama: 'optimizing' -> hata verirse -> 'direct' -> hata verirse -> 'failed'
  const [stage, setStage] = useState<'optimizing' | 'direct' | 'failed'>(() => {
    if (!src || !src.trim()) return 'failed'
    return unoptimized ? 'direct' : 'optimizing'
  })
  const [isLoaded, setIsLoaded] = useState(false)

  // src prop değişirse durumu sıfırla
  useEffect(() => {
    if (!src || !src.trim()) {
      setStage('failed')
      setIsLoaded(false)
    } else {
      setStage(unoptimized ? 'direct' : 'optimizing')
      setIsLoaded(false)
    }
  }, [src, unoptimized])

  const handleError = () => {
    if (stage === 'optimizing') {
      // 1. Düzey Kurtarma: Next.js optimizer başarısız olduysa, doğrudan ham CDN linkine geç
      setStage('direct')
    } else {
      // 2. Düzey Kurtarma: CDN de yanıt vermiyorsa fallback ikonu göster
      setStage('failed')
    }
  }

  if (stage === 'failed' || !src || !src.trim()) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 select-none ${wrapperClassName}`}>
        <Package size={placeholderIconSize} className="stroke-[1.5]" />
      </div>
    )
  }

  const effectiveLoading = priority ? undefined : (loading || 'lazy')

  return (
    <div className={`relative w-full h-full overflow-hidden ${wrapperClassName}`}>
      {/* Hafif yükleniyor arka planı — görsel yüklendiğinde gizlenir */}
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
        unoptimized={stage === 'direct'}
        quality={quality}
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
