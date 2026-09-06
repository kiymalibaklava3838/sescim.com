'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Sparkles, Mic, Music, Headphones, 
  Speaker, Lightbulb, Zap, Package, History
} from 'lucide-react'
import { 
  getRecentlyViewed, 
  getTopAffinityCategory,
  VIBE_CHIPS, 
  ViewedProductItem 
} from '@/lib/personalized-discover'
import { formatFiyat, dovizToTL, DEFAULT_KUR, type KurData } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'

const chipIcons: Record<string, any> = {
  Mic,
  Music,
  Headphones,
  Speaker,
  Lightbulb,
  Zap
}

interface Props {
  onItemClick?: () => void
  variant?: 'drawer' | 'page'
}

export default function PersonalizedDiscoverSection({ onItemClick }: Props) {
  const [mounted, setMounted] = useState(false)
  const [recentlyViewed, setRecentlyViewed] = useState<ViewedProductItem[]>([])
  const [topCategory, setTopCategory] = useState<string | null>(null)
  const [kur, setKur] = useState<KurData>(DEFAULT_KUR)

  const syncData = () => {
    setRecentlyViewed(getRecentlyViewed())
    setTopCategory(getTopAffinityCategory())
  }

  useEffect(() => {
    setMounted(true)
    syncData()
    getKurClient().then(setKur).catch(() => {})

    const handleUpdate = () => syncData()
    window.addEventListener('sescim-personalization-updated', handleUpdate)
    return () => window.removeEventListener('sescim-personalization-updated', handleUpdate)
  }, [])

  if (!mounted) return null

  return (
    <div className="space-y-3.5 py-1">
      {/* 1. KULLANICIYA ÖZEL İLGİ ALANI ROZETİ (Gezindiği kategorilere göre) */}
      {topCategory && (
        <div className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border border-brand-red/20 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-brand-red min-w-0">
            <Sparkles size={14} className="shrink-0 text-brand-red" />
            <div className="truncate">
              <span className="font-display font-bold uppercase tracking-wider text-[11px] mr-1.5">Sana Özel İlgi:</span>
              <span className="font-semibold text-slate-800">{topCategory}</span>
            </div>
          </div>
          <span className="text-[9px] font-bold text-brand-red font-display uppercase tracking-wider bg-white/80 px-2 py-0.5 rounded border border-brand-red/15 shrink-0">
            Önerilen
          </span>
        </div>
      )}

      {/* 2. İLHAM SENARYO ÇİPLERİ (Stories / Vibe Pills) */}
      <div>
        <div className="text-[10px] font-display font-bold uppercase tracking-widest text-slate-400 mb-2 px-1 flex items-center justify-between">
          <span>İlham Veren Setler</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2 snap-x">
          {VIBE_CHIPS.map((chip) => {
            const Icon = chipIcons[chip.iconName] || Mic
            return (
              <Link
                key={chip.id}
                href={chip.href}
                onClick={onItemClick}
                className="snap-start shrink-0 px-3 py-2 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-brand-red/40 flex items-center gap-2 text-slate-700 hover:text-brand-red transition-all group shadow-2xs"
              >
                <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all shadow-2xs">
                  <Icon size={13} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-display font-bold uppercase leading-tight">
                    {chip.label}
                  </div>
                  <div className="text-[9px] text-slate-400 font-normal leading-tight">
                    {chip.tagline}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* 3. SON İNCELEDİKLERİN (Yatay Mini Raf) */}
      {recentlyViewed.length > 0 && (
        <div className="pt-2 border-t border-slate-200">
          <div className="text-[10px] font-display font-bold uppercase tracking-widest text-slate-400 mb-2 px-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <History size={12} className="text-slate-400" />
              Son İnceledikleriniz
            </span>
            <span className="text-[10px] text-slate-400 font-mono">({recentlyViewed.length})</span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2 snap-x">
            {recentlyViewed.slice(0, 8).map((item) => (
              <Link
                key={item.id}
                href={`/urun/${item.slug}`}
                onClick={onItemClick}
                className="snap-start shrink-0 w-32 p-2 rounded-xl bg-white border border-slate-200 hover:border-brand-red/40 hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="w-full h-20 relative bg-slate-50 rounded-lg mb-1.5 overflow-hidden flex items-center justify-center">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="128px"
                      className="object-contain p-1.5 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Package size={22} className="text-slate-300" />
                  )}
                </div>
                <div className="text-[11px] font-medium text-slate-800 line-clamp-2 group-hover:text-brand-red leading-tight">
                  {item.name}
                </div>
                {item.price !== null && (
                  <div className="text-xs font-bold text-brand-red mt-1">
                    {formatFiyat(
                      item.currency && item.currency !== 'TRY'
                        ? dovizToTL(item.price, item.currency, kur)
                        : item.price,
                      'TRY'
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
