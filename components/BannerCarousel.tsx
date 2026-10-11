'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { StoreBanner, ParsedBannerSlide, parseBannerContent } from '@/lib/banner-service'
import { createClient } from '@/lib/supabase'

interface BannerCarouselProps {
  banners: StoreBanner[]
}

export default function BannerCarousel({ banners }: BannerCarouselProps) {
  const [slides, setSlides] = useState<ParsedBannerSlide[]>(() => {
    return (banners || []).map((b) => parseBannerContent(b))
  })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  // Banners prop değişirse state'i güncelle
  useEffect(() => {
    if (banners && banners.length > 0) {
      setSlides(banners.map((b) => parseBannerContent(b)))
    }
  }, [banners])

  // Supabase Realtime aboneliği: Admin yeni banner eklediğinde veya güncellediğinde anında yansıtır
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    async function reloadBanners() {
      try {
        const { data, error } = await supabase
          .from('store_banners')
          .select('id, title, subtitle, image_url, link_url, is_active, sort_order, created_at')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          setSlides(data.map((b: StoreBanner) => parseBannerContent(b)))
        }
      } catch (err) {
        console.error('BannerCarousel realtime fetch error:', err)
      }
    }

    const channel = supabase
      .channel('banner-carousel-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_banners' },
        () => {
          reloadBanners()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const nextSlide = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    if (slides.length <= 1) return
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
  }, [slides.length])

  const prevSlide = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    if (slides.length <= 1) return
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
  }, [slides.length])

  // Otomatik geçiş (mouse üzerinde durduğunda duraklar)
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [slides.length, isPaused])

  // Mobil Dokunmatik Kaydırma (Swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (distance > minSwipeDistance) {
      nextSlide()
    } else if (distance < -minSwipeDistance) {
      prevSlide()
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  if (!slides || slides.length === 0) return null

  const activeIndex = currentIndex >= slides.length ? 0 : currentIndex

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div className="max-w-7xl mx-auto">
        <div
          className="relative w-full overflow-hidden rounded-2xl shadow-xl bg-slate-950 aspect-[16/7] sm:aspect-[16/6] min-h-[160px] sm:min-h-[220px] select-none group"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          role="region"
          aria-label="Keşfet Kampanya Bannerları"
        >
          {slides.map((slide, idx) => {
            const isActive = idx === activeIndex
            const hasAnyText = Boolean(slide.title?.trim() || slide.subtitle?.trim() || slide.description?.trim())
            const shouldShowOverlay = slide.showOverlay ?? hasAnyText
            const shouldShowButton = (slide.showButton ?? false) && Boolean(slide.ctaText?.trim()) && Boolean(slide.ctaLink)
            const isWholeSlideClickable = Boolean(slide.ctaLink) && !shouldShowButton

            const isExternalLink = slide.ctaLink ? slide.ctaLink.startsWith('http://') || slide.ctaLink.startsWith('https://') : false

            // Slayt Görsel Bileşeni
            const SlideImageContent = (
              <div className="relative w-full h-full">
                {/* Desktop Görsel */}
                <div className={`relative w-full h-full ${slide.mobileImage ? 'hidden md:block' : 'block'}`}>
                  <Image
                    src={slide.image}
                    alt={slide.title || 'Kampanya Banner'}
                    fill
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    className={`object-cover object-center ${isWholeSlideClickable ? 'group-hover/slide:scale-[1.01] transition-transform duration-700 ease-out' : ''}`}
                    priority={idx === 0}
                    unoptimized={true}
                  />
                </div>

                {/* Mobil Görsel (Varsa) */}
                {slide.mobileImage && (
                  <div className="relative w-full h-full block md:hidden">
                    <Image
                      src={slide.mobileImage}
                      alt={slide.title || 'Kampanya Mobil Banner'}
                      fill
                      sizes="100vw"
                      className={`object-cover object-center ${isWholeSlideClickable ? 'group-hover/slide:scale-[1.01] transition-transform duration-700 ease-out' : ''}`}
                      priority={idx === 0}
                      unoptimized={true}
                    />
                  </div>
                )}

                {/* Karartma Gradyanı: SADECE metin varsa veya özellikle istenmişse gösterilir */}
                {shouldShowOverlay && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-transparent pointer-events-none" />
                  </>
                )}
              </div>
            )

            return (
              <div
                key={slide.id || idx}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* Tüm slayt tıklanabilir ise */}
                {isWholeSlideClickable && slide.ctaLink ? (
                  isExternalLink ? (
                    <a
                      href={slide.ctaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full h-full relative group/slide cursor-pointer"
                    >
                      {SlideImageContent}
                    </a>
                  ) : (
                    <Link
                      href={slide.ctaLink}
                      className="block w-full h-full relative group/slide cursor-pointer"
                    >
                      {SlideImageContent}
                    </Link>
                  )
                ) : (
                  <div className="w-full h-full relative">
                    {SlideImageContent}
                  </div>
                )}

                {/* Banner İçerik Kartı (Sadece metin veya buton varsa render edilir) */}
                {(hasAnyText || shouldShowButton) && (
                  <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6 md:p-8 z-20 pointer-events-none">
                    <div className="backdrop-blur-md bg-black/60 border border-white/10 p-4 sm:p-5 rounded-xl shadow-2xl max-w-xs sm:max-w-md border-l-4 border-l-brand-red pointer-events-auto inline-block">
                      {slide.subtitle && (
                        <div className="mb-1.5 sm:mb-2">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-red/20 border border-brand-red/40 text-brand-red font-display text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                            {slide.subtitle}
                          </span>
                        </div>
                      )}
                      {slide.title && (
                        <h2 className="font-display font-black text-base sm:text-xl md:text-2xl text-white uppercase tracking-tight mb-1 sm:mb-1.5 line-clamp-2 leading-tight">
                          {slide.title}
                        </h2>
                      )}
                      {slide.description && (
                        <p className="font-body text-slate-200 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                          {slide.description}
                        </p>
                      )}
                      {shouldShowButton && slide.ctaLink && (
                        <div className="mt-3">
                          {isExternalLink ? (
                            <a
                              href={slide.ctaLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-red/90 text-white px-4 py-1.5 rounded font-display font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                              <span>{slide.ctaText || 'İncele'}</span> <ArrowRight size={13} />
                            </a>
                          ) : (
                            <Link
                              href={slide.ctaLink}
                              className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-red/90 text-white px-4 py-1.5 rounded font-display font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                              <span>{slide.ctaText || 'İncele'}</span> <ArrowRight size={13} />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Navigasyon Okları (Birden fazla slayt varsa) */}
          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                onTouchStart={(e) => e.stopPropagation()}
                className="flex absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 items-center justify-center bg-black/60 hover:bg-brand-red backdrop-blur-md border border-white/10 text-white hover:border-brand-red transition-all md:opacity-0 md:group-hover:opacity-100 rounded-full shadow-xl cursor-pointer active:scale-95"
                aria-label="Önceki Slayt"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                onTouchStart={(e) => e.stopPropagation()}
                className="flex absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 items-center justify-center bg-black/60 hover:bg-brand-red backdrop-blur-md border border-white/10 text-white hover:border-brand-red transition-all md:opacity-0 md:group-hover:opacity-100 rounded-full shadow-xl cursor-pointer active:scale-95"
                aria-label="Sonraki Slayt"
              >
                <ChevronRight size={20} />
              </button>

              {/* Dots / Sayfa İndikatörleri */}
              <div className="absolute bottom-3 right-4 z-30 flex items-center gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCurrentIndex(idx)
                    }}
                    aria-label={`Slayt ${idx + 1}`}
                    className="p-1 focus:outline-none"
                  >
                    <div
                      className={`transition-all duration-300 rounded-full ${
                        idx === activeIndex
                          ? 'w-5 h-1.5 bg-brand-red'
                          : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                      }`}
                    />
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
