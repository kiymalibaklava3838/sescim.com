import { Metadata } from 'next'
import { MapPin, Phone, Mail, Clock, ShieldCheck } from 'lucide-react'
import IletisimForm from '@/components/IletisimForm'
import { getSiteUrl } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'İletişim & Müşteri Hizmetleri',
  description: 'Sescim müşteri hizmetleri telefonu: +90 352 231 69 15, Kayseri merkez mağaza adresi, e-posta ve iletişim formu. Uzman ses ve ışık ekibimize hemen ulaşın.',
  alternates: {
    canonical: `${getSiteUrl()}/iletisim`,
  },
  openGraph: {
    title: 'İletişim & Müşteri Hizmetleri | Sescim',
    description: 'Sescim müşteri hizmetleri, telefon: +90 352 231 69 15, Kayseri merkez mağaza adresi ve iletişim kanalları.',
    url: `${getSiteUrl()}/iletisim`,
    siteName: 'Sescim',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: `${getSiteUrl()}/logo.png`, width: 1200, height: 630, alt: 'Sescim İletişim' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'İletişim & Müşteri Hizmetleri | Sescim',
    description: 'Sescim müşteri hizmetleri, telefon: +90 352 231 69 15, Kayseri merkez mağaza adresi.',
    images: [`${getSiteUrl()}/logo.png`],
  },
}

export default function IletisimPage() {
  const baseUrl = getSiteUrl()

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Ana Sayfa',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'İletişim',
        item: `${baseUrl}/iletisim`,
      },
    ],
  }

  const contactPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Sescim İletişim & Müşteri Hizmetleri',
    description: 'Sescim ve Akdağ Elektronik resmi iletişim kanalları, mağaza adresi ve müşteri destek hattı.',
    url: `${baseUrl}/iletisim`,
    mainEntity: {
      '@type': 'Organization',
      name: 'Sescim',
      legalName: 'Mustafa Akdağ - Akdağ Elektronik',
      telephone: '+90-352-231-69-15',
      email: 'info@sescim.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Cumhuriyet Mah. Sur Cad. No:17/A',
        addressLocality: 'Melikgazi',
        addressRegion: 'Kayseri',
        postalCode: '38040',
        addressCountry: 'TR',
      },
    },
  }

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-6 font-body text-slate-800 animate-in fade-in zoom-in-95 duration-500">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageJsonLd) }}
      />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold font-display mb-4 text-slate-900">İletişim &amp; Müşteri Hizmetleri</h1>
          <p className="text-slate-500 max-w-xl mx-auto">
            Bize ulaşmak için aşağıdaki formu doldurabilir veya doğrudan iletişim kanallarımızı kullanabilirsiniz. Uzman ekibimiz en kısa sürede dönüş yapacaktır.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* İletişim Bilgileri */}
          <div className="p-10 bg-slate-900 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-semibold mb-8 font-display">Bize Ulaşın</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <MapPin className="text-brand-red" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Mağaza &amp; Ofis Adresi</h3>
                    <p className="text-slate-300">Cumhuriyet Mah. Sur Cad. No:17/A</p>
                    <p className="text-slate-400 text-sm">Melikgazi / Kayseri</p>
                    <a
                      href="https://maps.google.com/?q=Akda%C4%9F+Elektronik+Cumhuriyet+Mah.+Sur+Cad.+No:17/A+Melikgazi+Kayseri"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-red hover:underline mt-2 font-medium transition-colors"
                    >
                      Haritada Gör &amp; Yol Tarifi Al →
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Phone className="text-brand-red" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Müşteri Destek Telefonu</h3>
                    <a href="tel:+903522316915" className="text-slate-200 hover:text-white font-mono font-semibold transition-colors">
                      +90 352 231 69 15
                    </a>
                    <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                      <Clock size={12} className="text-amber-400" /> Pazartesi - Cumartesi: 09:00 - 19:00
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Mail className="text-brand-red" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">E-posta</h3>
                    <a href="mailto:info@sescim.com" className="text-slate-300 hover:text-white transition-colors">
                      info@sescim.com
                    </a>
                  </div>
                </div>

                <div className="pt-5 border-t border-white/10 text-xs text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>Mustafa Akdağ - Akdağ Elektronik Güvencesi</span>
                  </div>
                  <p>Erciyes Vergi Dairesi • V.No: 0200327808</p>
                  <p className="text-[11px] text-slate-400">Yetkili E-Ticaret Platformu: sescim.com</p>
                </div>
              </div>
            </div>
            
            {/* Dekoratif arka plan */}
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-brand-red/20 rounded-full blur-3xl z-0 pointer-events-none" />
          </div>

          {/* İletişim Formu (Client Component) */}
          <div className="p-10">
            <h2 className="text-2xl font-semibold mb-6 font-display text-slate-800">Mesaj Gönder</h2>
            <IletisimForm />
          </div>
        </div>
      </div>
    </div>
  )
}
