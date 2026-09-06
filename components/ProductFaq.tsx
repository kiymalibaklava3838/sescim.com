'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle, ShieldCheck, Truck, CreditCard, RotateCcw, Headphones } from 'lucide-react'

interface Props {
  productName?: string
  brandName?: string
}

export default function ProductFaq({ productName = 'Bu ürün', brandName = 'Akdağ Elektronik' }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      q: `${productName} orijinal mi ve garanti süresi ne kadardır?`,
      a: `Evet, Sescim üzerinden satın aldığınız tüm profesyonel ses, stüdyo ve ışık ekipmanları %100 orijinaldir ve ${brandName} distribütör güvencesiyle 2 yıl resmi garantilidir. Ürününüz adınıza düzenlenmiş e-fatura ile birlikte teslim edilir.`,
      icon: ShieldCheck
    },
    {
      q: 'Siparişim ne zaman kargoya verilir ve kargo ücreti var mı?',
      a: 'Hafta içi saat 15:00\'e kadar oluşturulan siparişler aynı gün özel koruyucu ambalajında kargoya teslim edilir. ₺1.999 ve üzeri tüm siparişlerinizde kargo tamamen ücretsizdir.',
      icon: Truck
    },
    {
      q: 'Kredi kartına taksit ve güvenli ödeme seçenekleri nelerdir?',
      a: 'Tüm siparişleriniz 256-Bit SSL sertifikası ve 3D Secure güvenlik altyapısı ile korunmaktadır. Anlaşmalı tüm banka kartlarına vade farksız taksit seçenekleriyle güvenle ödeme yapabilirsiniz.',
      icon: CreditCard
    },
    {
      q: 'Ürünü kurarken veya kullanırken teknik destek alabilir miyim?',
      a: 'Evet, ses mühendislerimiz ve teknik uzmanlarımız satış sonrasında da kurulum, kablo bağlantıları ve sistem optimizasyonu konularında WhatsApp hattımız üzerinden ücretsiz destek sunmaktadır.',
      icon: Headphones
    },
    {
      q: 'İade ve değişim şartları nelerdir?',
      a: 'Ürününüzü teslim aldığınız tarihten itibaren 14 gün içinde, kutusu, aksesuarları ve faturası eksiksiz olmak kaydıyla koşulsuz iade edebilir veya farklı bir modelle değiştirebilirsiniz.',
      icon: RotateCcw
    }
  ]

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a
      }
    }))
  }

  return (
    <div className="mt-16 pt-12 border-t border-slate-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-px bg-brand-red" />
        <span className="font-display font-black text-xs tracking-[0.3em] uppercase text-brand-red">
          Merak Edilenler
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
            <HelpCircle size={26} className="text-brand-red shrink-0" />
            Sıkça Sorulan Sorular
          </h2>
          <p className="font-body text-slate-500 text-xs sm:text-sm mt-1">
            Garanti, teslimat, teknik destek ve iade süreçleriyle ilgili detaylar
          </p>
        </div>
      </div>

      <div className="space-y-3 max-w-4xl">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx
          const Icon = faq.icon
          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-red/5 text-brand-red flex items-center justify-center shrink-0">
                    <Icon size={16} />
                  </div>
                  <span className="font-display font-bold text-sm sm:text-base text-slate-900">
                    {faq.q}
                  </span>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform duration-300 shrink-0 ${
                    isOpen ? 'rotate-180 text-brand-red' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-slate-100 text-xs sm:text-sm text-slate-600 font-body leading-relaxed pl-14 sm:pl-16">
                  {faq.a}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
