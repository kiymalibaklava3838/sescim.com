'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, RefreshCw } from 'lucide-react'
import { getKurClient } from '@/lib/kur-client'

interface Kur { USD: number; EUR: number; guncelleme: string | null; fallback?: boolean }

export default function KurGostergesi() {
  const [kur, setKur] = useState<Kur | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [son, setSon] = useState<Kur | null>(null) // önceki kur (yön oku için)

  const fetchKur = useCallback(async () => {
    try {
      const data = await getKurClient()
      setKur(prev => {
        setSon(prev)
        return data as any
      })
    } catch {}
    finally { setYukleniyor(false) }
  }, [])

  useEffect(() => {
    fetchKur()
    // Her 5 dakikada güncelle
    const interval = setInterval(fetchKur, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchKur])

  if (yukleniyor) {
    return (
      <div className="flex items-center gap-3 text-white/20 text-xs">
        <RefreshCw size={10} className="animate-spin" />
        <span className="font-body">Kur yükleniyor...</span>
      </div>
    )
  }

  if (!kur) return null

  const usdYon = son ? (kur.USD > son.USD ? 'up' : kur.USD < son.USD ? 'down' : 'flat') : 'flat'
  const eurYon = son ? (kur.EUR > son.EUR ? 'up' : kur.EUR < son.EUR ? 'down' : 'flat') : 'flat'

  return (
    <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
      {/* USD/TRY */}
      <div className="flex items-center gap-1.5">
        <span className="font-display font-bold text-xs text-white/60 tracking-wider">USD</span>
        <span className={`font-display font-black text-sm ${
          usdYon === 'up' ? 'text-red-400' : usdYon === 'down' ? 'text-green-400' : 'text-white/70'
        }`}>
          {kur.USD.toFixed(2)}
        </span>
        <span className="font-body text-white/50 text-xs">₺</span>
        {usdYon === 'up'   && <span className="text-red-400 text-xs">▲</span>}
        {usdYon === 'down' && <span className="text-green-400 text-xs">▼</span>}
      </div>

      <div className="w-px h-3 bg-white/10" />

      {/* EUR/TRY */}
      <div className="flex items-center gap-1.5">
        <span className="font-display font-bold text-xs text-white/60 tracking-wider">EUR</span>
        <span className={`font-display font-black text-sm ${
          eurYon === 'up' ? 'text-red-400' : eurYon === 'down' ? 'text-green-400' : 'text-white/70'
        }`}>
          {kur.EUR.toFixed(2)}
        </span>
        <span className="font-body text-white/50 text-xs">₺</span>
        {eurYon === 'up'   && <span className="text-red-400 text-xs">▲</span>}
        {eurYon === 'down' && <span className="text-green-400 text-xs">▼</span>}
      </div>

      {/* Canlı göstergesi */}
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="font-body text-white/50 text-[10px]">Canlı</span>
      </div>
    </div>
  )
}
