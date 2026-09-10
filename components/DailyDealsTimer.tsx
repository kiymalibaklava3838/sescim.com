'use client'

import { useState, useEffect } from 'react'
import { Clock, Flame } from 'lucide-react'

interface Props {
  targetDate?: string
}

export default function DailyDealsTimer({ targetDate }: Props) {
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

  if (!timeLeft) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-brand-red rounded-lg text-xs font-mono font-bold animate-pulse">
        <Clock size={14} />
        <span>Yükleniyor...</span>
      </div>
    )
  }

  const formatNumber = (n: number) => n.toString().padStart(2, '0')

  return (
    <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-medium shadow-sm">
      <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
        <Flame size={14} className="animate-bounce text-amber-400" />
        <span className="hidden sm:inline">Kalan Süre:</span>
      </div>
      <div className="flex items-center gap-1 font-mono font-bold text-xs tracking-wider">
        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-white">{formatNumber(timeLeft.hours)}</span>
        <span className="text-slate-500">:</span>
        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-white">{formatNumber(timeLeft.minutes)}</span>
        <span className="text-slate-500">:</span>
        <span className="bg-brand-red px-1.5 py-0.5 rounded text-white">{formatNumber(timeLeft.seconds)}</span>
      </div>
    </div>
  )
}
