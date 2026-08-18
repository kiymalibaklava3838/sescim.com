"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const slides = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1598488035114-1e7584102c7b?auto=format&fit=crop&q=80&w=2000',
    title: 'Profesyonel Stüdyo Ekipmanları',
    subtitle: 'Yeni Sezon',
    description: 'En iyi ses kalitesi için dünyanın önde gelen markalarından stüdyo monitörleri ve mikrofonlar.',
    ctaText: 'Hemen Keşfet',
    ctaLink: '/urunler/studyo-ekipmanlari',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1511671782633-d5a33f4a38fb?auto=format&fit=crop&q=80&w=2000',
    title: 'Sahnenin Yıldızı Siz Olun',
    subtitle: 'DJ Ekipmanları',
    description: 'Performansınızı zirveye taşıyacak profesyonel DJ setup ve aksesuarları.',
    ctaText: 'Ürünleri Gör',
    ctaLink: '/urunler/dj-ekipmanlari',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&q=80&w=2000',
    title: 'Kusursuz Sahne ve Işık',
    subtitle: 'Fırsatları Yakala',
    description: 'Görkemli sahneler için truss sistemleri, robot ışıklar ve daha fazlası.',
    ctaText: 'Fırsatları İncele',
    ctaLink: '/urunler/isik-sistemleri',
  },
]

export default function HeroSlider() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="relative w-full h-[500px] md:h-[600px] overflow-hidden bg-slate-900">
      {slides.map((slide, index) => {
        const isActive = index === current
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover object-center opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-20 h-full flex items-center max-w-7xl mx-auto px-6">
              <div className="max-w-2xl text-left transform transition-all duration-1000 translate-y-0"
                   style={{ opacity: isActive ? 1 : 0, transform: `translateY(${isActive ? '0' : '20px'})` }}>
                <span className="text-brand-red font-bold tracking-widest uppercase text-sm mb-4 inline-block">
                  {slide.subtitle}
                </span>
                <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                  {slide.title}
                </h1>
                <p className="text-slate-300 text-lg mb-8 max-w-xl">
                  {slide.description}
                </p>
                <Link
                  href={slide.ctaLink}
                  className="bg-brand-red text-white px-8 py-4 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-lg shadow-brand-red/30 inline-flex items-center gap-2"
                >
                  {slide.ctaText} <ArrowRight size={20} />
                </Link>
              </div>
            </div>
          </div>
        )
      })}

      {/* Slider Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === current ? 'bg-brand-red w-8' : 'bg-white/50 hover:bg-white'
            }`}
            aria-label={`Slayt ${index + 1}'e git`}
          />
        ))}
      </div>
    </section>
  )
}
