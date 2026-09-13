'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Package, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ProductImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center">
        <Package size={64} className="text-slate-300" />
      </div>
    )
  }

  const slideTo = (newIndex: number) => {
    setDirection(newIndex > active ? 1 : -1)
    setActive(newIndex)
  }

  const nextImage = () => {
    setDirection(1)
    setActive((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setDirection(-1)
    setActive((prev) => (prev - 1 + images.length) % images.length)
  }

  const minSwipeDistance = 45

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    if (isLeftSwipe) {
      nextImage()
    } else if (isRightSwipe) {
      prevImage()
    }
  }

  return (
    <div className="space-y-4 w-full min-w-0">
      <div 
        className="relative aspect-square w-full bg-white border border-slate-200/90 rounded-2xl overflow-hidden group select-none shadow-sm"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={active}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -direction * 40, scale: 0.98 }}
            transition={{ 
              type: 'spring', 
              stiffness: 260, 
              damping: 24,
              opacity: { duration: 0.3 } 
            }}
            className="absolute inset-0"
          >
            <Image 
              src={images[active]} 
              alt={alt} 
              fill 
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-contain p-6 transition-transform duration-700 group-hover:scale-105" 
            />
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <div className="absolute top-3 right-3 z-20 bg-slate-900/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full font-mono">
            {active + 1} / {images.length}
          </div>
        )}

        {images.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
            <button
              onClick={prevImage}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/90 md:bg-black/60 shadow-md md:backdrop-blur-md border border-slate-200 md:border-white/10 text-slate-800 md:text-white flex items-center justify-center hover:bg-brand-red hover:text-white md:hover:bg-brand-red md:hover:border-brand-red transition-all transform hover:scale-110 pointer-events-auto opacity-75 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Önceki Görsel"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextImage}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/90 md:bg-black/60 shadow-md md:backdrop-blur-md border border-slate-200 md:border-white/10 text-slate-800 md:text-white flex items-center justify-center hover:bg-brand-red hover:text-white md:hover:bg-brand-red md:hover:border-brand-red transition-all transform hover:scale-110 pointer-events-auto opacity-75 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Sonraki Görsel"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {images.length > 1 && (
          <div className="md:hidden absolute bottom-3 inset-x-0 flex justify-center items-center gap-1.5 z-20 pointer-events-none">
            {images.map((_, i) => (
              <span
                key={i}
                className={"h-1.5 rounded-full transition-all duration-300 " + (active === i ? "w-5 bg-brand-red" : "w-1.5 bg-slate-300")}
              />
            ))}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide smooth-touch-scroll w-full min-w-0">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => slideTo(i)}
              className={"relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 transition-all duration-200 overflow-hidden bg-slate-50 " + (active === i ? "border-brand-red shadow-xs" : "border-slate-200 opacity-60 hover:opacity-100")}
            >
              <Image 
                src={img} 
                alt={alt + " " + (i + 1)} 
                fill 
                className="object-contain p-1" 
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
