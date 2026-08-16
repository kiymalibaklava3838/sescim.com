'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Package, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ProductImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState(0) // -1 for left, 1 for right

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-[#141414] border border-white/5 flex items-center justify-center">
        <Package size={64} className="text-white/10" />
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

  return (
    <div className="space-y-4">
      {/* Ana Görsel Alanı */}
      <div className="relative aspect-square bg-[#141414] border border-white/5 overflow-hidden group">
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
              className="object-contain p-6 transition-transform duration-700 group-hover:scale-110" 
            />
          </motion.div>
        </AnimatePresence>

        {/* Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

        {/* Navigasyon Okları */}
        {images.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={prevImage}
              className="w-10 h-10 bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-brand-red hover:border-brand-red transition-all transform hover:scale-110"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextImage}
              className="w-10 h-10 bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-brand-red hover:border-brand-red transition-all transform hover:scale-110"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Tam Ekran İkonu (Görsel amaçlı) */}
        <div className="absolute bottom-4 right-4 text-white/20 group-hover:text-white/60 transition-colors">
          <Maximize2 size={16} />
        </div>
      </div>

      {/* Küçük Resimler (Thumbnails) */}
      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => slideTo(i)}
              className={`relative flex-shrink-0 w-20 h-20 border transition-all duration-300 ${
                active === i 
                  ? 'border-brand-red ring-1 ring-brand-red ring-offset-2 ring-offset-black' 
                  : 'border-white/5 opacity-40 hover:opacity-100 hover:border-white/20'
              }`}
            >
              <Image 
                src={img} 
                alt={`${alt} ${i + 1}`} 
                fill 
                className="object-cover" 
              />
              {active === i && (
                <motion.div 
                  layoutId="activeThumb"
                  className="absolute inset-0 border-2 border-brand-red z-10"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
