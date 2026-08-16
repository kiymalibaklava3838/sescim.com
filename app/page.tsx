import Link from 'next/link'
import { Speaker, Lightbulb, Monitor, Headphones, Music, Mic, Package, Plug } from 'lucide-react'
import FeaturedProducts from '@/components/FeaturedProducts'
import HeroSlider from '@/components/HeroSlider'
import BrandCarousel from '@/components/BrandCarousel'
import TrustBadges from '@/components/TrustBadges'

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

export default function HomePage() {
  return (
    <div className="bg-slate-50 min-h-screen">

      {/* HERO SLIDER AREA */}
      <HeroSlider />

      {/* CATEGORIES CIRCLES */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-10 text-center">Popüler Kategoriler</h2>
        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {categories.map((cat) => {
            const Icon = cat.icon
            return (
              <Link href={`/urunler/${cat.slug}`} key={cat.label} className="flex flex-col items-center group">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 mb-4 group-hover:shadow-md group-hover:border-brand-red/40 transition-all duration-300">
                  <Icon size={32} className="text-slate-600 group-hover:text-brand-red transition-colors duration-300" />
                </div>
                <span className="text-slate-700 text-sm font-medium group-hover:text-brand-red transition-colors text-center max-w-[100px]">
                  {cat.label}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ÖNE ÇIKAN ÜRÜNLER (Varsayılan) */}
      <FeaturedProducts />

      {/* BRAND CAROUSEL */}
      <BrandCarousel />

      {/* ÇOK SATANLAR */}
      <FeaturedProducts title="Çok Satanlar" sortBy="fiyat" ascending={true} />

      {/* HAFTANIN İNDİRİMLERİ */}
      <FeaturedProducts title="Haftanın Fırsatları" sortBy="created_at" ascending={true} />

      {/* TRUST BADGES */}
      <TrustBadges />
    </div>
  )
}
