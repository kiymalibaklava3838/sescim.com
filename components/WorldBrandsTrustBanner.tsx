'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShieldCheck, Truck, Headphones, CreditCard, CheckCircle2 } from 'lucide-react'

interface BrandItem {
  id: string
  name: string
  query: string
  logo: string
}

const BRANDS: BrandItem[] = [
  { id: 'yamaha', name: 'Yamaha', query: 'YAMAHA', logo: '/brands/yamaha-clean.webp' },
  { id: 'jbl', name: 'JBL', query: 'JBL', logo: '/brands/jbl-clean.webp' },
  { id: 'soundcraft', name: 'Soundcraft', query: 'SOUNDCRAFT', logo: '/brands/soundcraft-clean.webp' },
  { id: 'ld-systems', name: 'LD Systems', query: 'LD SYSTEMS', logo: '/brands/ld-systems-clean.webp' },
  { id: 'rcf', name: 'RCF', query: 'RCF', logo: '/brands/rcf-clean.webp' },
  { id: 'alto', name: 'Alto Professional', query: 'ALTO', logo: '/brands/alto-clean.webp' },
  { id: 'db-technologies', name: 'dB Technologies', query: 'DB TECHNOLOGIES', logo: '/brands/db-technologies-clean.webp' },
  { id: 'mackie', name: 'Mackie', query: 'MACKIE', logo: '/brands/mackie-clean.webp' },
  { id: 'martin-audio', name: 'Martin Audio', query: 'MARTIN AUDIO', logo: '/brands/martin-audio-clean.webp' },
  { id: 'audac', name: 'Audac', query: 'AUDAC', logo: '/brands/audac-clean.webp' },
  { id: 'allen-heath', name: 'Allen & Heath', query: 'ALLEN&HEATH', logo: '/brands/allen-heath-clean.webp' },
  { id: 'shure', name: 'Shure', query: 'SHURE', logo: '/brands/shure-clean.webp' },
  { id: 'sennheiser', name: 'Sennheiser', query: 'SENNHEISER', logo: '/brands/sennheiser-clean.webp' },
  { id: 'behringer', name: 'Behringer', query: 'BEHRINGER', logo: '/brands/behringer-clean.webp' },
]

// Sonsuz pürüzsüz kaydırma için iki eşit yarı (50% translate ile sıfır atlama)
const MARQUEE_BRANDS = [...BRANDS, ...BRANDS]

export default function WorldBrandsTrustBanner() {
  return (
    <section className="bg-white text-slate-900 border-y border-slate-200 py-6 relative overflow-hidden">
      {/* Arka plan hafif renk esintisi */}
      <div className="absolute -left-10 -top-10 w-48 h-48 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Sol: Güçlü Başlık & Distribütör Güvencesi */}
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-brand-red text-[11px] font-display font-black uppercase tracking-[0.25em] mb-1">
              <ShieldCheck size={14} className="text-brand-red" />
              <span>Yetkili Distribütör Güvencesi</span>
            </div>
            <h2 className="font-display font-black text-xl sm:text-2xl lg:text-3xl uppercase tracking-tight text-slate-900 leading-tight">
              Dünyanın Lider Ses &amp; Sahne Markaları <span className="text-brand-red">SESCİM</span>&apos;de
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              %100 Orijinal ürün garantisi, faturalı resmi ithalatçı desteği ve uzman ses mühendisleri güvencesiyle.
            </p>
          </div>

          {/* Sağ: 4 Güven Sütunu */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 shadow-2xs">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-slate-900 uppercase font-display tracking-wider">%100 Orijinal</div>
                <div className="text-slate-500 text-[10px]">Resmi Distribütör</div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 shadow-2xs">
              <Truck size={18} className="text-amber-600 shrink-0" />
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-slate-900 uppercase font-display tracking-wider">Hızlı Kargo</div>
                <div className="text-slate-500 text-[10px]">Aynı Gün Sevk</div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 shadow-2xs">
              <Headphones size={18} className="text-blue-600 shrink-0" />
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-slate-900 uppercase font-display tracking-wider">Ses Uzmanı</div>
                <div className="text-slate-500 text-[10px]">Teknik Danışmanlık</div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 shadow-2xs">
              <CreditCard size={18} className="text-purple-600 shrink-0" />
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-slate-900 uppercase font-display tracking-wider">Taksit İmkanı</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DÜNYANIN EN İYİ MARKALARI — TIKLANABİLİR KESİNTİSİZ KAYAN MARQUEE ŞERİDİ (LOGOLU VİTRİN) */}
      <div className="mt-6 pt-5 border-t border-slate-100 relative group">
        {/* Sol & Sağ Kenar Yumuşatma Gölgeleri (Fade Mask - Light Tema) */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-white via-white/90 to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-white via-white/90 to-transparent z-20 pointer-events-none" />

        <div className="relative flex overflow-hidden w-full py-1">
          <div className="flex animate-marquee [animation-duration:38s] whitespace-nowrap group-hover:[animation-play-state:paused] items-center will-change-transform gpu-accelerate">
            {MARQUEE_BRANDS.map((brand, index) => (
              <Link
                key={`${brand.id}-${index}`}
                href={`/urunler?marka=${encodeURIComponent(brand.query)}`}
                className="inline-flex items-center justify-center mx-2 sm:mx-3 px-5 sm:px-6 h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-brand-red/50 shadow-2xs hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 group/card"
                title={`${brand.name} Ürünlerini Keşfet`}
                aria-label={`${brand.name} Yetkili Satıcı Ürünleri`}
              >
                <div className="relative h-7 sm:h-8 w-24 sm:w-28 flex items-center justify-center">
                  <Image
                    src={brand.logo}
                    alt={`${brand.name} Logo`}
                    width={140}
                    height={40}
                    unoptimized
                    className="max-h-full max-w-full w-auto h-auto object-contain transition-all duration-300 opacity-80 group-hover/card:opacity-100 group-hover/card:scale-105"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
