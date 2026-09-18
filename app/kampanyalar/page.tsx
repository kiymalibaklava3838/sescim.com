import Image from 'next/image';
import Link from 'next/link';
import { Tag, Sparkles, ArrowRight, ShieldCheck, Truck, CreditCard } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import KampanyalarCoupons from '@/components/KampanyalarCoupons';

export const revalidate = 1800; // 30 dakika Vercel Edge CDN önbelleği

export const metadata = {
  title: 'Kampanyalar & İndirim Kuponları',
  description: 'Sescim güncel indirim kuponları, hoşgeldin fırsatları ve özel ses ekipmanı kampanyaları.',
};

async function getInitialCoupons() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data } = await supabase
      .from('kuponlar')
      .select('*')
      .eq('aktif', true)
      .order('created_at', { ascending: false });

    if (!data) return [];

    const now = Date.now();
    return data.filter((k: any) => {
      if (k.ozel_mi === true) return false;
      if (k.gecerlilik_tarihi && new Date(k.gecerlilik_tarihi).getTime() < now) return false;
      if (k.max_kullanim && (k.kullanim_sayisi || 0) >= k.max_kullanim) return false;
      return true;
    });
  } catch {
    return [];
  }
}

const kampanyalar = [
  {
    id: 1,
    title: 'Profesyonel Stüdyo & Kayıt Sistemleri',
    description: 'Rode, Shure, PreSonus ve Behringer stüdyo kayıt ekipmanlarında Akdağ Elektronik distribütör güvencesiyle özel fiyatlar.',
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070&auto=format&fit=crop',
    link: '/kategoriler/studyo-ve-kayit',
    badge: 'Stüdyo Fırsatı',
    color: 'from-orange-600 to-red-600',
  },
  {
    id: 2,
    title: 'Canlı Performans & Sahne Seslendirme',
    description: 'Aktif kabin hoparlörler, dijital mikserler ve kablosuz telsiz mikrofon sistemlerinde sahneye hazır çözümler.',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=2070&auto=format&fit=crop',
    link: '/kategoriler/ses-sistemleri',
    badge: 'Sahne & Konser',
    color: 'from-blue-600 to-indigo-700',
  },
  {
    id: 3,
    title: 'Günün Flaş Fırsatları & Outlet',
    description: 'Sınırlı stoklu teşhir, kutusu açılmış garantili outlet ve günün özel indirimli ürünlerini kaçırmayın.',
    image: 'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?q=80&w=2070&auto=format&fit=crop',
    link: '/firsatlar',
    badge: 'Sınırlı Stok',
    color: 'from-red-600 to-purple-800',
  },
];

export default async function KampanyalarPage() {
  const coupons = await getInitialCoupons();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-body text-slate-800">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-brand-red/10 text-brand-red px-3.5 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider mb-3">
            <Sparkles size={14} /> Fırsatlar &amp; Kuponlar
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-slate-900 tracking-tight mb-4">
            Kampanyalar ve İndirim Kodları
          </h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base font-body">
            Sescim.com&apos;a özel güncel kupon kodlarını kopyalayarak sepette hemen kullanabilir, güncel kampanya dönemlerindeki avantajlardan faydalanabilirsiniz.
          </p>
        </div>

        {/* Dynamic Coupon Grid */}
        <div className="mb-16">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Tag className="text-brand-red" size={20} />
              <h2 className="text-xl font-display font-black text-slate-900 uppercase tracking-wide">
                Aktif İndirim Kuponları
              </h2>
            </div>
            <Link
              href="/hesabim"
              className="text-xs text-brand-red hover:text-red-700 font-display font-bold uppercase tracking-wider transition-colors hidden sm:inline"
            >
              Özel Kupon Tanımla &gt;
            </Link>
          </div>

          <KampanyalarCoupons initialCoupons={coupons} />
        </div>

        {/* Guarantees Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-brand-red flex items-center justify-center shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-slate-900">Orijinal Ürün &amp; Distribütör Güvencesi</h4>
              <p className="text-xs text-slate-500">Tüm ürünler Akdağ Elektronik ve resmi distribütör garantilidir.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Truck size={24} />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-slate-900">Hızlı &amp; Sigortalı Kargo</h4>
              <p className="text-xs text-slate-500">Özel korumalı ambalajında hasarsız teslimat güvencesi.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CreditCard size={24} />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-slate-900">Güvenli Ödeme &amp; Taksit</h4>
              <p className="text-xs text-slate-500">256-Bit SSL korumalı online ödeme ve vade farksız taksit imkanı.</p>
            </div>
          </div>
        </div>

        {/* Campaign Banners */}
        <div className="space-y-8">
          <h2 className="text-xl font-display font-black text-slate-900 uppercase tracking-wide">
            Öne Çıkan Kampanya Kategorileri
          </h2>

          <div className="grid grid-cols-1 gap-6">
            {kampanyalar.map((kampanya) => (
              <div key={kampanya.id} className="relative rounded-2xl overflow-hidden group shadow-md hover:shadow-xl transition-all duration-300 border border-slate-200 bg-white">
                <div className="aspect-[21/9] sm:aspect-[24/9] md:aspect-[3/1] relative w-full overflow-hidden">
                  <Image 
                    src={kampanya.image} 
                    alt={kampanya.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-r ${kampanya.color} mix-blend-multiply opacity-85`} />
                  
                  <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 md:p-12">
                    <div className="max-w-2xl text-white relative z-10">
                      <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-display font-bold uppercase tracking-wider mb-3 border border-white/30">
                        {kampanya.badge}
                      </span>
                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-black mb-2 text-white">
                        {kampanya.title}
                      </h3>
                      <p className="text-xs sm:text-sm md:text-base text-white/90 mb-6 font-body max-w-xl leading-relaxed">
                        {kampanya.description}
                      </p>
                      <Link 
                        href={kampanya.link}
                        className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-brand-red hover:text-white px-5 py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                      >
                        Kampanyayı Keşfet <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
