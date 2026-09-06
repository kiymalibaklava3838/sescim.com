'use client'

import { useMemo } from 'react'
import { Truck, CheckCircle2, Sparkles } from 'lucide-react'

interface Props {
  total: number
  threshold?: number
}

export default function FreeShippingBar({ total, threshold = 1999 }: Props) {
  const remaining = Math.max(0, threshold - total)
  const percent = Math.min(100, Math.round((total / threshold) * 100))
  const isFree = total >= threshold

  const barColor = useMemo(() => {
    if (percent < 40) return 'bg-brand-red'
    if (percent < 80) return 'bg-amber-500'
    return 'bg-emerald-500'
  }, [percent])

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-2">
      <div className="flex items-center justify-between text-xs">
        {isFree ? (
          <div className="flex items-center gap-1.5 text-emerald-700 font-display font-black uppercase tracking-wide">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>🎉 Tebrikler! Ücretsiz Kargo Kazandınız!</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
            <Truck size={15} className="text-brand-red shrink-0" />
            <span>
              Ücretsiz kargo için{' '}
              <strong className="text-brand-red font-bold font-mono">
                {remaining.toLocaleString('tr-TR')} ₺
              </strong>{' '}
              daha ekleyin!
            </span>
          </div>
        )}
        <span className="font-mono text-[11px] font-bold text-slate-500 shrink-0">
          %{percent}
        </span>
      </div>

      {/* Progress Bar Track */}
      <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
        <span>0 ₺</span>
        <span>Hedef: {threshold.toLocaleString('tr-TR')} ₺</span>
      </div>
    </div>
  )
}
