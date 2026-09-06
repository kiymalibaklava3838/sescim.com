'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Package, Truck, FileText } from 'lucide-react'
import { Suspense, useEffect } from 'react'
import OrderCelebration from '@/components/OrderCelebration'
import { clearCart } from '@/lib/cart'

function OdemeBasariliContent() {
  const searchParams = useSearchParams()
  // PayTR başarılı dönüşte merchant_oid parametresi ile sipariş numarasını iletir
  const siparisNo = searchParams.get('merchant_oid') || searchParams.get('siparis_no')

  useEffect(() => {
    // Başarılı ödeme sonrası sepeti sıfırla
    try {
      clearCart()
    } catch (e) {
      // sessizce geç
    }
  }, [])

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-slate-50 relative">
      {/* Zarif Mikro-Kutlama Partikülleri */}
      <OrderCelebration />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 sm:p-10 text-center max-w-lg w-full relative z-10">
        <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-sm">
          <CheckCircle size={44} className="text-emerald-500" />
        </div>
        <div className="flex items-center gap-3 justify-center mb-3">
          <div className="w-8 h-px bg-brand-red" />
          <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Ödeme Onaylandı</span>
          <div className="w-8 h-px bg-brand-red" />
        </div>
        <h1 className="font-display font-black text-3xl sm:text-4xl uppercase text-slate-900 mb-3">
          Siparişiniz Alındı!
        </h1>

        {siparisNo && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <Package size={22} className="text-emerald-600 flex-shrink-0" />
              <div>
                <div className="font-display text-[10px] tracking-widest uppercase text-emerald-800 font-bold mb-0.5">Sipariş Numaranız</div>
                <div className="font-display font-black text-xl text-brand-red tracking-wider">{siparisNo}</div>
              </div>
            </div>
            <Link
              href={`/siparis/${siparisNo}/fatura`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-display font-bold text-emerald-800 hover:bg-emerald-100/50 transition-colors shadow-xs"
            >
              <FileText size={13} />
              Sipariş Fişi
            </Link>
          </div>
        )}

        {/* Kargo Teslimat Öngörüsü */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700">
          <Truck size={16} className="text-brand-red flex-shrink-0" />
          <span>Tahmini Kargoya Veriliş: <strong>24 Saat İçinde</strong> (Hızlı Kargo)</span>
        </div>

        <p className="font-body text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
          Ödemeniz başarıyla tamamlandı. Sipariş detaylarınız ve faturanız e-posta adresinize gönderilecektir.
          Kargonuz en kısa sürede özenle hazırlanıp yola çıkacaktır.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 text-left">
          <p className="font-body text-slate-500 text-xs uppercase font-medium tracking-wider">
            Sipariş takibi ve teknik destek için:
          </p>
          <a href="tel:+903522316915" className="font-display font-black text-lg text-brand-red mt-1 block hover:underline">
            +90 352 231 69 15
          </a>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/urunler" className="btn-primary text-sm justify-center py-3.5 px-6 rounded-xl shadow-md">
            Alışverişe Devam
            <ArrowRight size={14} />
          </Link>
          <Link href="/" className="btn-outline text-sm justify-center py-3.5 px-6 rounded-xl">
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function OdemeBasarili() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" />
      </div>
    }>
      <OdemeBasariliContent />
    </Suspense>
  )
}
