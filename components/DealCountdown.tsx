'use client'

import { useState, useEffect } from 'react'
import { Clock, Zap, Flame } from 'lucide-react'

interface Props {
  targetDate?: string
  title?: string
}

export default function DealCountdown({ targetDate, title = "Günün Fırsatları Bitişine Kalan:" }: Props) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null)

  useEffect(() => {
    const calculateTime = () => {
      let target: number
      if (targetDate) {
        target = new Date(targetDate).getTime()
      } else {
        const now = new Date()
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime()
        target = endOfDay
      }

      const diff = Math.max(0, target - Date.now())
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds })
    }

    calculateTime()
    const timer = setInterval(calculateTime, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  if (!timeLeft) return null

  const formatNumber = (n: number) => n.toString().padStart(2, '0')

  return (
    <div className="bg-gradient-to-r from-red-600 via-brand-red to-orange-600 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden mb-10">
      <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-display font-bold uppercase tracking-wider mb-2 border border-white/30">
            <Flame size={14} className="text-amber-300 animate-bounce" />
            Sınırlı Süre & Flaş Fırsat
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight text-white">
            Günün Özel İndirimleri
          </h2>
          <p className="text-white/80 text-xs sm:text-sm mt-1 font-body">
            Seçili profesyonel ses, stüdyo ve ışık ekipmanlarında geçerli süper fırsatlar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center bg-black/30 backdrop-blur-md rounded-xl p-3 min-w-[64px] border border-white/10">
            <span className="font-display font-black text-2xl sm:text-3xl text-white tracking-wider">
              {formatNumber(timeLeft.hours)}
            </span>
            <span className="text-[9px] font-display font-bold uppercase tracking-widest text-white/70 mt-0.5">Saat</span>
          </div>
          <span className="font-display font-black text-2xl text-white/60 -mt-3">:</span>
          <div className="flex flex-col items-center bg-black/30 backdrop-blur-md rounded-xl p-3 min-w-[64px] border border-white/10">
            <span className="font-display font-black text-2xl sm:text-3xl text-white tracking-wider">
              {formatNumber(timeLeft.minutes)}
            </span>
            <span className="text-[9px] font-display font-bold uppercase tracking-widest text-white/70 mt-0.5">Dakika</span>
          </div>
          <span className="font-display font-black text-2xl text-white/60 -mt-3">:</span>
          <div className="flex flex-col items-center bg-black/30 backdrop-blur-md rounded-xl p-3 min-w-[64px] border border-white/10">
            <span className="font-display font-black text-2xl sm:text-3xl text-amber-300 tracking-wider animate-pulse">
              {formatNumber(timeLeft.seconds)}
            </span>
            <span className="text-[9px] font-display font-bold uppercase tracking-widest text-white/70 mt-0.5">Saniye</span>
          </div>
        </div>
      </div>
    </div>
  )
}
