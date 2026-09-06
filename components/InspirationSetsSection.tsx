'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, ArrowRight } from 'lucide-react'
import { InspirationSet } from '@/lib/ilham-setleri'

interface Props {
  sets: InspirationSet[]
}

export default function InspirationSetsSection({ sets }: Props) {
  if (!sets || sets.length === 0) return null

  return (
    <section className="mb-14">
      {/* BAŞLIK VE AÇIKLAMA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-red text-xs font-display font-black uppercase tracking-[0.25em] mb-1.5">
            <Sparkles size={14} className="text-brand-red" />
            <span>Hazır Çözüm Paketleri</span>
          </div>
          <h2 className="font-display font-black text-2xl sm:text-3xl uppercase text-slate-900 tracking-tight">
            İlham Veren Setler
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Tek tek ürün aramak yerine ihtiyacınıza göre uzmanlarca eşleştirilmiş eksiksiz ses, kayıt ve sahne setleri.
          </p>
        </div>

        <div className="text-[11px] font-display font-semibold uppercase tracking-wider text-slate-400 hidden sm:block">
          {sets.length} Özel Kombin
        </div>
      </div>

      {/* KARTLAR: MOBİLDE YATAY SNAP SCROLL, DESKTOPTA 3 SÜTUNLU GRID */}
      <div className="flex overflow-x-auto pb-4 gap-4 snap-x no-scrollbar -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
        {sets.map((set) => {
          // Alt yazıyı artı işaretinden bölüp etiket yapalım
          const components = set.alt_yazi 
            ? set.alt_yazi.split('+').map(c => c.trim()).filter(Boolean)
            : []

          return (
            <div
              key={set.id}
              className="snap-start shrink-0 w-[290px] sm:w-[320px] md:w-auto bg-slate-900 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group flex flex-col justify-between border border-slate-800 relative"
            >
              {/* Görsel Katmanı */}
              <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-950">
                {set.resim_url && (
                  <Image
                    src={set.resim_url}
                    alt={set.baslik}
                    fill
                    sizes="(max-width: 768px) 300px, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-95"
                  />
                )}
                {/* Gradient Karartma */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                {/* Üst Rozet */}
                <div className="absolute top-3 left-3">
                  <span className="bg-brand-red text-white text-[9px] font-display font-black uppercase px-2.5 py-1 rounded tracking-wider shadow-xs">
                    HAZIR SET
                  </span>
                </div>

                {/* Başlık ve Bileşenler */}
                <div className="absolute bottom-3.5 left-3.5 right-3.5">
                  <h3 className="font-display font-black text-lg sm:text-xl uppercase text-white tracking-wide leading-tight drop-shadow-sm group-hover:text-amber-300 transition-colors">
                    {set.baslik}
                  </h3>
                </div>
              </div>

              {/* Alt İçerik ve Aksiyon */}
              <div className="p-4 bg-slate-900 flex-1 flex flex-col justify-between space-y-3">
                {components.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {components.map((comp, idx) => (
                      <span
                        key={idx}
                        className="bg-white/10 text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded border border-white/5 whitespace-nowrap"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                )}

                <Link
                  href={set.link || '/urunler'}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-brand-red text-white text-xs font-display font-bold uppercase tracking-wider flex items-center justify-between transition-all duration-300 group-hover:bg-brand-red shadow-xs"
                >
                  <span>Seti Gör</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
