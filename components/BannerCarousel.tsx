'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { StoreBanner } from '@/lib/banner-service'

interface BannerCarouselProps {
  banners: StoreBanner[]
}

export default function BannerCarousel({ banners }: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [banners.length])

  if (!banners || banners.length === 0) return null

  const banner = banners[currentIndex]

  return (
    /* Sayfa içi container: full-width değil, max-width ile sınırlı ve yatay padding'li */
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-2">
      <div className="max-w-7xl mx-auto">
        {/* Rounded, overflow-hidden kapsayıcı */}
        <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl bg-[#111] group" style={{ aspectRatio: '16/6' }}>

          {/* Banner Images */}
          {banners.map((b, idx) => (
            <div
              key={b.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
              {b.link_url ? (
                <a href={b.link_url} className="block w-full h-full relative" target={b.link_url.startsWith('http') ? '_blank' : '_self'} rel="noopener noreferrer">
                  <Image
                    src={b.image_url}
                    alt={b.title || 'Kampanya Banner'}
                    fill
                    className="object-cover object-center"
                    priority={idx === 0}
                  />
                </a>
              ) : (
                <Image
                  src={b.image_url}
                  alt={b.title || 'Kampanya Banner'}
                  fill
                  className="object-cover object-center"
                  priority={idx === 0}
                />
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none" />
            </div>
          ))}

          {/* Banner İçerik */}
          <div className="absolute bottom-0 left-0 w-full p-5 sm:p-8 z-20 pointer-events-none">
            {(banner.title || banner.subtitle) && (
              <div className="backdrop-blur-md bg-black/50 border border-white/10 p-4 sm:p-5 shadow-2xl max-w-xs sm:max-w-sm border-l-4 border-l-brand-red pointer-events-auto inline-block">
                {banner.title && (
                  <h2 className="font-display font-black text-base sm:text-xl md:text-2xl text-white uppercase tracking-tight mb-1 line-clamp-1 leading-tight">
                    {banner.title}
                  </h2>
                )}
                {banner.subtitle && (
                  <p className="font-body text-white/70 text-xs sm:text-sm line-clamp-2">
                    {banner.subtitle}
                  </p>
                )}
                {banner.link_url && (
                  <div className="mt-3">
                    <a
                      href={banner.link_url}
                      className="inline-flex items-center gap-2 bg-brand-red text-white px-4 py-1.5 font-display font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:bg-brand-red/80 transition-colors"
                      target={banner.link_url.startsWith('http') ? '_blank' : '_self'}
                      rel="noopener noreferrer"
                    >
                      İncele <ArrowRight size={12} />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigasyon Okları */}
          {banners.length > 1 && (
            <>
              <button
                onClick={() => setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1))}
                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-brand-red hover:border-brand-red transition-all opacity-0 group-hover:opacity-100 rounded-full"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-brand-red hover:border-brand-red transition-all opacity-0 group-hover:opacity-100 rounded-full"
              >
                <ChevronRight size={18} />
              </button>

              {/* Dots */}
              <div className="absolute bottom-3 right-4 z-30 flex items-center gap-1.5">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Slayt ${idx + 1}`}
                  >
                    <div className={`transition-all duration-300 rounded-full ${idx === currentIndex ? 'w-5 h-1.5 bg-brand-red' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'}`} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

