"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { 
  ParsedBannerSlide, 
  DEFAULT_HERO_SLIDES, 
  parseBannerContent,
  StoreBanner 
} from '@/lib/banner-service'

interface HeroSliderProps {
  initialSlides?: ParsedBannerSlide[]
}

export default function HeroSlider({ initialSlides }: HeroSliderProps) {
  const [slides, setSlides] = useState<ParsedBannerSlide[]>(
    initialSlides && initialSlides.length > 0 ? initialSlides : DEFAULT_HERO_SLIDES
  )
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  // Fetch active banners on client-side and subscribe to Realtime updates
  useEffect(() => {
    const supabase = createClient()

    async function loadLatestBanners() {
      try {
        const { data, error } = await supabase
          .from('store_banners')
          .select('id, title, subtitle, image_url, link_url, is_active, sort_order, created_at')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          const parsed = data.map((b: StoreBanner) => parseBannerContent(b))
          setSlides(parsed)
        } else if (!initialSlides || initialSlides.length === 0) {
          setSlides(DEFAULT_HERO_SLIDES)
        }
      } catch (err) {
        console.error('HeroSlider client fetch failed:', err)
      }
    }

    loadLatestBanners()

    // Realtime subscription for instant live updates without page reload
    const channel = supabase
      .channel('hero-slider-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_banners' },
        () => {
          loadLatestBanners()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [initialSlides])

  // Slide navigation handlers
  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
  }, [slides.length])

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
  }, [slides.length])

  // Auto-advance interval
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return

    const timer = setInterval(() => {
      nextSlide()
    }, 5500)

    return () => clearInterval(timer)
  }, [slides.length, isPaused, nextSlide])

  // Touch Swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (distance > minSwipeDistance) {
      // Swiped left -> next slide
      nextSlide()
    } else if (distance < -minSwipeDistance) {
      // Swiped right -> prev slide
      prevSlide()
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  // Safety check: ensure current index is within bounds
  const activeIndex = current >= slides.length ? 0 : current

  return (
    <section 
      className="relative w-full h-[400px] sm:h-[460px] md:h-[500px] lg:h-[540px] xl:h-[580px] overflow-hidden bg-slate-950 select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Öne Çıkan Kampanyalar Vitrini"
    >
      {slides.map((slide, index) => {
        const isActive = index === activeIndex
        const hasAnyText = Boolean(slide.title?.trim() || slide.subtitle?.trim() || slide.description?.trim())
        const shouldShowOverlay = slide.showOverlay ?? hasAnyText
        const shouldShowButton = (slide.showButton ?? false) && Boolean(slide.ctaText?.trim()) && Boolean(slide.ctaLink)
        const isWholeSlideClickable = Boolean(slide.ctaLink) && !shouldShowButton

        const SlideWrapper = isWholeSlideClickable ? Link : 'div'
        const wrapperProps: any = isWholeSlideClickable 
          ? { href: slide.ctaLink!, className: 'absolute inset-0 block cursor-pointer group/link' }
          : { className: 'absolute inset-0 block' }

        return (
          <div
            key={slide.id || index}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
              isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <SlideWrapper {...wrapperProps}>
              {/* Background Image Container */}
              <div className="absolute inset-0">
                {/* Masaüstü Görseli (Eğer mobil görsel varsa md ve üzerinde gösterilir, yoksa her ekranda gösterilir) */}
                <div className={`absolute inset-0 ${slide.mobileImage ? 'hidden md:block' : 'block'}`}>
                  <Image
                    src={slide.image}
                    alt={slide.title || 'Sescim Kampanya'}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    unoptimized={true}
                    className={`object-cover object-center ${isWholeSlideClickable ? 'group-hover/link:scale-[1.01] transition-transform duration-700 ease-out' : ''}`}
                  />
                </div>

                {/* Mobil Görseli (Sadece mobilde md ekranın altında devreye girer) */}
                {slide.mobileImage && (
                  <div className="absolute inset-0 block md:hidden">
                    <Image
                      src={slide.mobileImage}
                      alt={slide.title || 'Sescim Mobil Kampanya'}
                      fill
                      priority={index === 0}
                      sizes="100vw"
                      unoptimized={true}
                      className={`object-cover object-center ${isWholeSlideClickable ? 'group-hover/link:scale-[1.01] transition-transform duration-700 ease-out' : ''}`}
                    />
                  </div>
                )}
                
                {/* Sadece metin varsa veya özellikle istenmişse karanlık gradyan uygulanır */}
                {shouldShowOverlay && (
                  <>
                    <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 md:via-slate-950/40 to-transparent" />
                    <div className="block md:hidden absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent" />
                  </>
                )}
              </div>

              {/* Slide Content (Metin veya Buton varsa gösterilir) */}
              {(hasAnyText || shouldShowButton) && (
                <div className="relative z-20 h-full flex items-end md:items-center max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pb-8 md:pb-0 pointer-events-none">
                  <div 
                    className="max-w-2xl text-left transform transition-all duration-700 delay-100 pointer-events-auto"
                    style={{ 
                      opacity: isActive ? 1 : 0, 
                      transform: `translateY(${isActive ? '0' : '24px'})` 
                    }}
                  >
                    {/* Subtitle / Badge */}
                    {slide.subtitle && (
                      <div className="mb-2 sm:mb-3.5">
                        <span className="inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-brand-red/20 border border-brand-red/40 text-brand-red font-display text-[10px] sm:text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                          {slide.subtitle}
                        </span>
                      </div>
                    )}

                    {/* Main Title */}
                    {slide.title && (
                      <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black text-white mb-2.5 sm:mb-5 leading-[1.15] tracking-tight uppercase drop-shadow-md">
                        {slide.title}
                      </h2>
                    )}

                    {/* Description Text */}
                    {slide.description && (
                      <p className="text-slate-200 text-xs sm:text-base md:text-lg mb-4 sm:mb-8 max-w-xl line-clamp-2 sm:line-clamp-4 font-normal leading-relaxed drop-shadow">
                        {slide.description}
                      </p>
                    )}

                    {/* Action CTA Button (Sadece butona izin verilmişse) */}
                    {shouldShowButton && slide.ctaLink && (
                      <div>
                        <Link
                          href={slide.ctaLink}
                          className="inline-flex items-center gap-2.5 bg-brand-red hover:bg-red-700 text-white font-display font-bold text-xs sm:text-sm tracking-widest uppercase px-6 sm:px-8 py-3.5 sm:py-4 rounded-md shadow-xl shadow-brand-red/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                          <span>{slide.ctaText}</span>
                          <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </SlideWrapper>
          </div>
        )
      })}

      {/* Navigation Arrows (visible on desktop or tablet) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            aria-label="Önceki Slayt"
            className="hidden md:flex absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-slate-900/60 hover:bg-brand-red text-white/80 hover:text-white border border-white/10 hover:border-brand-red backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-lg"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={nextSlide}
            aria-label="Sonraki Slayt"
            className="hidden md:flex absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-slate-900/60 hover:bg-brand-red text-white/80 hover:text-white border border-white/10 hover:border-brand-red backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-lg"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Slider Controls / Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-950/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeIndex 
                  ? 'bg-brand-red w-7 sm:w-8' 
                  : 'bg-white/40 hover:bg-white/70 w-2'
              }`}
              aria-label={`Slayt ${index + 1}'e git`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
