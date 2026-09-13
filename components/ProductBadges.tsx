'use client'

import { useMemo } from 'react'
import { Truck, Flame, Sparkles, ShieldCheck, Tag } from 'lucide-react'

interface BadgesProps {
  stokAdedi?: number | null
  kritikStok?: number | null
  stokDurumu?: string
  fiyat?: number
  indirimliFiyat?: number
  kategori?: string
  compact?: boolean
}

export default function ProductBadges({
  stokAdedi,
  kritikStok,
  stokDurumu,
  fiyat,
  indirimliFiyat,
  compact = false,
}: BadgesProps) {
  // Bugün saat 15:00 öncesi ve hafta içi mi kontrol et
  const isAyniGunKargo = useMemo(() => {
    if (stokDurumu === 'tukendi' || stokDurumu === 'tükendi') return false
    const now = new Date()
    const day = now.getDay() // 0 = Pazar, 6 = Cumartesi
    const hours = now.getHours()
    return day >= 1 && day <= 5 && hours < 15
  }, [stokDurumu])

  // İndirim yüzdesi
  const indirimYuzdesi = useMemo(() => {
    if (fiyat && indirimliFiyat && fiyat > indirimliFiyat) {
      return Math.round(((fiyat - indirimliFiyat) / fiyat) * 100)
    }
    return 0
  }, [fiyat, indirimliFiyat])

  // Kritik stok kontrolü
  const isSonUrunler =
    stokAdedi !== null &&
    stokAdedi !== undefined &&
    stokAdedi > 0 &&
    kritikStok !== null &&
    kritikStok !== undefined &&
    stokAdedi <= kritikStok

  return (
    <div className="flex flex-wrap items-center gap-1.5 pointer-events-none w-full min-w-0">
      {/* İndirim Rozeti */}
      {indirimYuzdesi > 0 && (
        <span className="bg-brand-red text-white text-[10px] font-display font-black uppercase px-2 py-0.5 rounded tracking-wider shadow-sm flex items-center gap-1">
          <Tag size={10} /> -%{indirimYuzdesi} İNDİRİM
        </span>
      )}

      {/* Aynı Gün Kargo */}
      {isAyniGunKargo && !compact && (
        <span className="bg-emerald-600 text-white text-[9px] font-display font-bold uppercase px-2 py-0.5 rounded tracking-wide shadow-sm flex items-center gap-1">
          <Truck size={10} /> BUGÜN KARGODA
        </span>
      )}

      {/* Kritik Stok / Son Adetler */}
      {isSonUrunler && (
        <span className="bg-amber-500 text-slate-950 text-[9px] font-display font-black uppercase px-2 py-0.5 rounded tracking-wide animate-pulse flex items-center gap-1">
          <Flame size={10} /> SON {stokAdedi} ADET!
        </span>
      )}
    </div>
  )
}
