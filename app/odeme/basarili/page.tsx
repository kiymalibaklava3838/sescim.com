'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Package } from 'lucide-react'
import { Suspense } from 'react'

function OdemeBasariliContent() {
  const searchParams = useSearchParams()
  // PayTR başarılı dönüşte merchant_oid parametresi ile sipariş numarasını iletir
  const siparisNo = searchParams.get('merchant_oid') || searchParams.get('siparis_no')

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-green-500/10 border-2 border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle size={48} className="text-green-400" />
        </div>
        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="w-8 h-px bg-brand-red" />
          <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Ödeme Onaylandı</span>
          <div className="w-8 h-px bg-brand-red" />
        </div>
        <h1 className="font-display font-black text-4xl uppercase text-white mb-4">
          Siparişiniz Alındı!
        </h1>

        {siparisNo && (
          <div className="bg-[#141414] border border-green-500/20 p-4 mb-6 flex items-center gap-3">
            <Package size={18} className="text-green-400 flex-shrink-0" />
            <div className="text-left">
              <div className="font-display text-[10px] tracking-widest uppercase text-white/30 mb-1">Sipariş Numaranız</div>
              <div className="font-display font-black text-lg text-brand-red tracking-widest">{siparisNo}</div>
            </div>
          </div>
        )}

        <p className="font-body text-white/40 text-base leading-relaxed mb-8">
          Ödemeniz başarıyla tamamlandı. Sipariş detaylarınız e-posta adresinize gönderilecektir.
          En kısa sürede sizinle iletişime geçilecektir.
        </p>
        <div className="bg-[#141414] border border-white/8 p-5 mb-8 text-left">
          <p className="font-body text-white/30 text-sm">
            Sipariş takibi veya sorularınız için:
          </p>
          <a href="tel:+903522316915" className="font-display font-black text-lg text-brand-red mt-1 block hover:underline">
            +90 352 231 69 15
          </a>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href="/urunler" className="btn-primary text-sm">
            Alışverişe Devam
            <ArrowRight size={14} />
          </Link>
          <Link href="/" className="btn-outline text-sm">Ana Sayfa</Link>
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
