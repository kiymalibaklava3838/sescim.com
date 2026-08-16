'use client'
import Link from 'next/link'
import { XCircle, RefreshCw } from 'lucide-react'

export default function OdemeHata() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-brand-red/10 border-2 border-brand-red/30 rounded-full flex items-center justify-center mx-auto mb-8">
          <XCircle size={48} className="text-brand-red" />
        </div>
        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="w-8 h-px bg-brand-red" />
          <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Ödeme Başarısız</span>
          <div className="w-8 h-px bg-brand-red" />
        </div>
        <h1 className="font-display font-black text-4xl uppercase text-white mb-4">
          İşlem Tamamlanamadı
        </h1>
        <p className="font-body text-white/40 text-base leading-relaxed mb-8">
          Ödeme işleminiz tamamlanamadı. Kart bilgilerinizi kontrol edip tekrar deneyebilir veya
          farklı bir ödeme yöntemi seçebilirsiniz.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/sepet" className="btn-primary text-sm">
            <RefreshCw size={14} />
            Tekrar Dene
          </Link>
          <a href="tel:+903522316915" className="btn-outline text-sm">Yardım Al</a>
        </div>
      </div>
    </div>
  )
}
