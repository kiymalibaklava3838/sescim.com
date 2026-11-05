import Link from 'next/link'
import { Speaker, Lightbulb, Monitor, Headphones, Music, Mic, Package, Plug } from 'lucide-react'
import FeaturedProducts from '@/components/FeaturedProducts'
import DailyDealsSection from '@/components/DailyDealsSection'
import ProTercihSection from '@/components/ProTercihSection'
import HeroSlider from '@/components/HeroSlider'
import TrustBadges from '@/components/TrustBadges'
import WorldBrandsTrustBanner from '@/components/WorldBrandsTrustBanner'
import { getActiveParsedBanners } from '@/lib/banner-service'
import dynamic from 'next/dynamic'

const PersonalizedRecommendationsSection = dynamic(
  () => import('@/components/PersonalizedRecommendationsSection'),
  { ssr: false }
)

const categories = [
  { icon: Speaker, label: 'Ses Sistemleri', slug: 'ses-sistemleri' },
  { icon: Lightbulb, label: 'Işık Sistemleri', slug: 'isik-sistemleri' },
  { icon: Monitor, label: 'Görüntü Sistemleri', slug: 'goruntu-sistemleri' },
  { icon: Headphones, label: 'Kulaklık & Monitör', slug: 'kulaklik-ve-monitor' },
  { icon: Music, label: 'DJ Ekipmanları', slug: 'dj-ekipmanlari' },
  { icon: Mic, label: 'Stüdyo Ekipmanları', slug: 'studyo-ekipmanlari' },
  { icon: Package, label: 'Sahne ve Truss', slug: 'sahne-ve-truss' },
  { icon: Plug, label: 'Kablo & Aksesuar', slug: 'kablo-stand-ve-aksesuar' },
]

export default async function HomePage() {
  const initialBanners = await getActiveParsedBanners().catch(() => [])

  return (
    <div className="bg-slate-50 min-h-screen">

      {/* HERO SLIDER AREA */}
      <HeroSlider initialSlides={initialBanners.length > 0 ? initialBanners : undefined} />

      {/* DÜNYANIN MARKALARI SESCİM'DE — GÜVEN VİTRİNİ */}
      <WorldBrandsTrustBanner />

      {/* CATEGORIES CIRCLES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6 sm:mb-10 text-center font-display uppercase tracking-wide">Popüler Kategoriler</h2>
        <div className="grid grid-cols-4 sm:flex sm:flex-wrap justify-center gap-3 sm:gap-6 md:gap-10">
          {categories.map((cat) => {
            const Icon = cat.icon
            return (
              <Link href={`/urunler/${cat.slug}`} key={cat.label} className="flex flex-col items-center group">
                <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200 mb-2 sm:mb-4 group-hover:shadow-md group-hover:border-brand-red/40 active:scale-95 transition-all duration-300">
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-slate-600 group-hover:text-brand-red transition-colors duration-300" />
                </div>
                <span className="text-slate-700 text-[11px] sm:text-sm font-medium group-hover:text-brand-red transition-colors text-center line-clamp-2 max-w-[85px] sm:max-w-[100px] leading-tight">
                  {cat.label}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* GÜNÜN FIRSATLARI */}
      <DailyDealsSection />

      {/* PROFESYONELLERİN TERCİHİ (Stüdyo & Canlı Sahne Vitrini) */}
      <ProTercihSection />

      {/* EN ÇOK SATANLAR */}
      <FeaturedProducts title="En Çok Satanlar" sortBy="fiyat" ascending={false} filterByFeatured={false} />

      {/* İLGİNİZİ ÇEKEBİLECEK ÜRÜNLER (Yeni Eklenenler Yerine - Akıllı Öneri Motoru) */}
      <PersonalizedRecommendationsSection />

      {/* TRUST BADGES */}
      <TrustBadges />

      {/* SEO İÇERİK BLOKU — Google'ın "sescim" aramasında siteyi doğru anlaması için */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 border-t border-slate-200">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Sescim Nedir */}
          <div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 uppercase tracking-tight mb-4">
              Sescim Nedir?
            </h2>
            <div className="w-10 h-0.5 bg-brand-red mb-5" />
            <p className="text-slate-600 font-body text-sm sm:text-base leading-relaxed mb-4">
              <strong>Sescim</strong>, Kayseri merkezli <strong>Akdağ Elektronik</strong> güvencesiyle kurulan Türkiye&apos;nin yeni nesil profesyonel ses, ışık ve müzik ekipmanları e-ticaret platformudur. Sahne sistemlerinden stüdyo donanımlarına, DJ ekipmanlarından hoparlör ve mikrofon setlerine kadar binlerce orijinal ürünü distribütör garantisiyle sunar.
            </p>
            <p className="text-slate-600 font-body text-sm sm:text-base leading-relaxed">
              İster yatak odasında kayıt yapan amatör bir müzisyen olun, ister binlerce kişilik konser salonları kuran ses mühendisi — <strong>sescim.com</strong>&apos;da ihtiyacınıza uygun ekipmanı aynı gün kargo ve taksit avantajıyla kapınıza getiriyoruz.
            </p>
          </div>

          {/* Neden Sescim */}
          <div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 uppercase tracking-tight mb-4">
              Neden Sescim?
            </h2>
            <div className="w-10 h-0.5 bg-brand-red mb-5" />
            <ul className="space-y-3">
              {[
                { title: '%100 Orijinal & Distribütör Garantili', desc: 'Tüm ürünler resmi distribütör kanalından, seri numarası doğrulanmış olarak gönderilir.' },
                { title: 'Aynı Gün Hızlı Kargo', desc: '1999 ₺ ve üzeri siparişlerde ücretsiz, hafta içi saat 14:00\'e kadar verilen siparişlerde aynı gün kargo.' },
                { title: 'Uzman Teknik Destek', desc: 'Satış öncesi ve sonrası; WhatsApp, telefon ve e-posta ile ses mühendislerimizden ücretsiz danışmanlık.' },
                { title: 'Peşin Fiyatına Taksit', desc: 'Tüm kredi kartlarına 6 aya varan taksit imkânı ve kurumsal fatura seçeneği.' },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-brand-red/10 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-brand-red" />
                  </span>
                  <div>
                    <span className="font-semibold text-slate-800 text-sm">{item.title}:</span>{' '}
                    <span className="text-slate-500 text-sm">{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
