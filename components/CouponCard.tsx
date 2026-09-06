'use client'

import { useState } from 'react'
import { Copy, Check, Ticket, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

interface Props {
  code: string
  discountText: string
  description?: string | null
  minAmount?: number | null
  validUntil?: string | null
  kategori?: string | null
}

export default function CouponCard({
  code,
  discountText,
  description,
  minAmount,
  validUntil,
  kategori,
}: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="bg-white border-2 border-dashed border-brand-red/30 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-brand-red/5 rounded-full pointer-events-none group-hover:scale-125 transition-transform" />

      <div>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-brand-red font-display font-black text-xs uppercase tracking-wider bg-brand-red/10 px-2.5 py-1 rounded-full">
            <Ticket size={14} /> İndirim Kuponu
          </span>
          {kategori ? (
            <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
              🏷️ {kategori}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md">
              🌐 Tüm Ürünler
            </span>
          )}
        </div>

        <div className="text-2xl font-display font-black text-slate-900 mb-1">
          {discountText}
        </div>

        {description && (
          <p className="text-xs text-slate-600 font-body leading-relaxed mb-3 font-medium">
            {description}
          </p>
        )}

        <div className="text-[11px] text-slate-500 font-body space-y-1 mb-5">
          {minAmount ? (
            <div>
              Min. Sepet: <strong className="text-slate-700">{minAmount.toLocaleString('tr-TR')} ₺</strong>
            </div>
          ) : (
            <div>Alt limitsiz geçerli</div>
          )}
          {validUntil && (
            <div>
              Son Gün: <strong className="text-slate-700">{new Date(validUntil).toLocaleDateString('tr-TR')}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-mono font-bold text-sm tracking-wider text-slate-800 flex-1 text-center select-all">
          {code}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            title="Kodu Kopyala"
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-display font-bold uppercase tracking-wider rounded-lg transition-all ${
              copied
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {copied ? (
              <>
                <Check size={14} /> <span className="inline">Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy size={14} /> <span className="inline">Kopyala</span>
              </>
            )}
          </button>
          <Link
            href={`/sepet?kupon=${encodeURIComponent(code)}`}
            title="Sepette Kullan"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-display font-bold uppercase tracking-wider rounded-lg bg-brand-red text-white hover:bg-red-700 shadow-sm transition-all whitespace-nowrap"
          >
            <ShoppingCart size={13} />
            <span>Kullan</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
