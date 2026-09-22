'use client'

import Link from 'next/link'
import { ShieldCheck, Truck, Headphones, CreditCard, CheckCircle2 } from 'lucide-react'

const TOP_BRANDS = [
  'SHURE', 'PIONEER DJ', 'YAMAHA', 'SENNHEISER', 'JBL PRO', 
  'RODE', 'BEHRINGER', 'GENELEC', 'AUDIO-TECHNICA', 'FOCUSRITE', 
  'DENON DJ', 'KORG', 'ROLAND', 'MACKIE', 'ELECTRO-VOICE', 'QSC'
]

// Sonsuz pürüzsüz kaydırma için iki eşit yarı (50% translate ile sıfır atlama)
const MARQUEE_BRANDS = [...TOP_BRANDS, ...TOP_BRANDS]

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
                <div className="text-slate-500 text-[10px]">Peşin Fiyatına</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DÜNYANIN EN İYİ MARKALARI — TIKLANABİLİR KESİNTİSİZ KAYAN MARQUEE ŞERİDİ (LIGHT TEMA) */}
      <div className="mt-6 pt-4 border-t border-slate-100 relative group">
        {/* Sol & Sağ Kenar Yumuşatma Gölgeleri (Fade Mask - Light Tema) */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-white via-white/80 to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-white via-white/80 to-transparent z-20 pointer-events-none" />

        <div className="relative flex overflow-hidden w-full">
          <div className="flex animate-marquee whitespace-nowrap group-hover:[animation-play-state:paused] py-1 items-center will-change-transform gpu-accelerate">
            {MARQUEE_BRANDS.map((brand, index) => (
              <Link
                key={index}
                href={`/urunler?marka=${encodeURIComponent(brand)}`}
                className="inline-flex items-center gap-2.5 mx-2 sm:mx-3 px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-brand-red text-slate-700 hover:text-white border border-slate-200 hover:border-brand-red font-display font-black text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-2xs hover:scale-105 active:scale-95"
                title={`${brand} Ürünlerini Keşfet`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-brand-red group-hover:bg-white transition-colors shrink-0" />
                <span>{brand}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
