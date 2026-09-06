'use client'
import Link from 'next/link'
import { XCircle, RefreshCw } from 'lucide-react'

export default function OdemeHata() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 sm:p-10 text-center max-w-lg w-full">
        <div className="w-20 h-20 bg-rose-50 border-2 border-rose-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-red shadow-sm">
          <XCircle size={44} className="text-brand-red" />
        </div>
        <div className="flex items-center gap-3 justify-center mb-3">
          <div className="w-8 h-px bg-brand-red" />
          <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Ödeme Başarısız</span>
          <div className="w-8 h-px bg-brand-red" />
        </div>
        <h1 className="font-display font-black text-3xl sm:text-4xl uppercase text-slate-900 mb-3">
          İşlem Tamamlanamadı
        </h1>
        <p className="font-body text-slate-600 text-sm sm:text-base leading-relaxed mb-8">
          Ödeme işleminiz bankanız tarafından onaylanmadı veya işlem iptal edildi. Kart bilgilerinizi ve limitinizi kontrol edip tekrar deneyebilirsiniz.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/sepet" className="btn-primary text-sm justify-center py-3.5 px-6 rounded-xl shadow-md">
            <RefreshCw size={14} />
            Sepete Dön ve Tekrar Dene
          </Link>
          <a href="tel:+903522316915" className="btn-outline text-sm justify-center py-3.5 px-6 rounded-xl">
            Destek Al
          </a>
        </div>
      </div>
    </div>
  )
}
