import Link from 'next/link'
import { ArrowRight, Target, ShieldCheck, HeartPulse, Mic2, Users2, Headphones } from 'lucide-react'

export const metadata = {
  title: 'Hakkımızda | sescim.com',
  description: 'sescim.com - 2026 yılında sektöre giriş yapan, Türkiye\'nin profesyonel ve amatör ses, ışık ve müzik teknolojileri platformu.',
}

export default function HakkimizdaPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 bg-slate-900 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-red/20 to-transparent opacity-50 mix-blend-screen" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-red/30 rounded-full blur-[100px]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl text-center mx-auto">
            <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-white mb-6 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700">
              Sesi Hissedenlerin <br className="hidden md:block" /> Yeni Adresi: <span className="text-brand-red">sescim.com</span>
            </h1>
            <p className="font-body text-lg md:text-xl text-slate-300 leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
              2026 yılında e-ticaret dünyasına yeni bir soluk getirmek üzere yola çıktık. Amatör ruhun heyecanını, profesyonel kalitenin gücüyle birleştirerek müzik ve teknoloji tutkunlarına en iyisini sunuyoruz.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content & Story */}
      <section className="py-20 -mt-16 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-16 border border-slate-100">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              
              <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700 delay-300">
                <div>
                  <h2 className="font-display font-bold text-3xl text-slate-800 mb-4">Hikayemiz</h2>
                  <div className="w-16 h-1.5 bg-brand-red rounded-full mb-6"></div>
                  <p className="text-slate-600 font-body leading-relaxed text-lg">
                    Sektöre taze bir kan olarak <strong>2026</strong> yılında giriş yapan sescim.com; sesi sadece duymakla kalmayıp hissedenler, müziği hayatının merkezine koyanlar ve sahne ışıklarında sınır tanımayanlar için özel olarak kurgulandı.
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 font-body leading-relaxed text-lg">
                    Amacımız çok net: İster yatak odasında kayıt alan bir amatör müzisyen, ister on binlerce kişiye konser veren bir ses mühendisi olun; ihtiyaç duyduğunuz tüm ses, sahne ve müzik ekipmanlarını <strong>en iyi fiyat avantajı, en şeffaf hizmet ve kusursuz bir alışveriş deneyimiyle</strong> kapınıza kadar getirmek. Üstelik tüm bu süreçler yılların tecrübesi olan <strong><a href="https://www.akdagelektronik.com" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:underline">AKDAĞ ELEKTRONİK</a> güvencesiyle</strong> desteklenmektedir.
                  </p>
                </div>
              </div>

              {/* Grid of Values */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-8 duration-700 delay-300">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-brand-red/30 transition-colors group">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Target className="text-brand-red w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-slate-800 text-lg mb-2">En İyi Fiyat Politikası</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-body">Sektördeki dinamikleri yakından takip ediyor, kaliteyi en ulaşılabilir fiyatlarla sunuyoruz.</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-brand-red/30 transition-colors group">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="text-brand-red w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-slate-800 text-lg mb-2">Güvenilir Alışveriş</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-body">%100 orijinal ürün garantisi ve şifrelenmiş ödeme altyapısıyla güvenliğiniz önceliğimizdir.</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-brand-red/30 transition-colors group">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <HeartPulse className="text-brand-red w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-slate-800 text-lg mb-2">Tutkulu Müşteri Destek</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-body">Sorunlarınıza robotlar değil, sizinle aynı müzik tutkusunu paylaşan uzman ekibimiz yanıt verir.</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-brand-red/30 transition-colors group">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Headphones className="text-brand-red w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-slate-800 text-lg mb-2">Amatörden Profesyele</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-body">Stüdyoya yeni başlayanlardan, devasa konser alanları kuranlara kadar herkese hitap eden geniş yelpaze.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Stats / Numbers (Optional visual appeal) */}
      <section className="py-20 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-100">
            <div className="px-4">
              <div className="text-4xl font-display font-black text-slate-800 mb-2">2026</div>
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Kuruluş Yılı</div>
            </div>
            <div className="px-4">
              <div className="text-4xl font-display font-black text-slate-800 mb-2">%100</div>
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Orijinal Ürün</div>
            </div>
            <div className="px-4">
              <div className="text-4xl font-display font-black text-slate-800 mb-2">24/7</div>
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Online Destek</div>
            </div>
            <div className="px-4">
              <div className="flex justify-center items-center gap-2 text-4xl font-display font-black text-brand-red mb-2">
                <Users2 size={32} /> +
              </div>
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Mutlu Müşteri</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 text-center px-4">
        <h2 className="font-display font-black text-3xl md:text-4xl text-white mb-6">Müzikal Yolculuğunuza Başlayın</h2>
        <p className="text-slate-400 font-body text-lg mb-10 max-w-2xl mx-auto">En iyi ekipmanları incelemek ve sescim.com ayrıcalıklarıyla tanışmak için kataloğumuza göz atın.</p>
        <Link href="/urunler" className="inline-flex items-center gap-2 bg-brand-red text-white font-semibold px-8 py-4 rounded-xl hover:bg-brand-red/90 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-red/30">
          <Mic2 size={20} />
          Tüm Ürünleri İncele
          <ArrowRight size={18} className="ml-2" />
        </Link>
      </section>
    </div>
  )
}
