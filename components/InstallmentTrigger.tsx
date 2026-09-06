'use client'

import { useState } from 'react'
import { CreditCard, ChevronRight } from 'lucide-react'
import InstallmentModal from './InstallmentModal'

interface Props {
  fiyat: number
  urunAdi: string
}

export default function InstallmentTrigger({ fiyat, urunAdi }: Props) {
  const [open, setOpen] = useState(false)
  const monthly12 = Math.round((fiyat * 1.189) / 12)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full mt-2.5 flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-brand-red/40 hover:bg-slate-50 transition-all text-left group shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0">
            <CreditCard size={15} />
          </div>
          <div>
            <div className="text-xs font-display font-bold text-slate-800 uppercase tracking-wide group-hover:text-brand-red transition-colors">
              Taksit Seçenekleri
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              12 aya varan taksitle ayda <strong className="text-brand-red font-bold">{monthly12.toLocaleString('tr-TR')} ₺</strong>&apos;den başlayan fiyatlarla
            </div>
          </div>
        </div>
        <div className="text-slate-400 group-hover:text-brand-red group-hover:translate-x-0.5 transition-all">
          <ChevronRight size={16} />
        </div>
      </button>

      <InstallmentModal
        isOpen={open}
        onClose={() => setOpen(false)}
        fiyat={fiyat}
        urunAdi={urunAdi}
      />
    </>
  )
}
