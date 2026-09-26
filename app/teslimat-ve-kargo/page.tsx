import Link from 'next/link'
import { ArrowLeft, Truck, ShieldCheck, Clock, PackageCheck, AlertTriangle, Phone, Mail, MapPin } from 'lucide-react'

export const metadata = {
  title: 'Teslimat ve Kargo Politikası | sescim.com',
  description: 'sescim.com teslimat ve kargo koşulları — ücretsiz kargo sınırları, kargoya veriliş süreleri, anlaşmalı kargo firmaları ve hasar tespit tutanağı rehberi.',
}

export default function TeslimatVeKargoPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-sm rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-red text-sm font-body mb-8 transition-colors">
          <ArrowLeft size={14} /> Ana Sayfa
        </Link>
        
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-black text-3xl md:text-4xl text-slate-800 leading-tight">
              TESLİMAT VE KARGO POLİTİKASI
            </h1>
            <p className="text-sm text-slate-500 mt-1">Son Güncelleme: 25 Eylül 2026</p>
          </div>
        </div>

        {/* Özet Vurgu Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center">
            <ShieldCheck size={26} className="text-brand-red mx-auto mb-2" />
            <div className="font-display font-black text-xl text-slate-800">1.999 ₺ ve Üzeri</div>
            <div className="font-body text-emerald-600 font-semibold text-xs mt-1">ÜCRETSİZ KARGO</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center">
            <Clock size={26} className="text-brand-red mx-auto mb-2" />
            <div className="font-display font-black text-xl text-slate-800">1 - 2 İş Günü</div>
            <div className="font-body text-slate-500 text-xs mt-1">Kargoya Teslim Süresi</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center">
            <PackageCheck size={26} className="text-brand-red mx-auto mb-2" />
            <div className="font-display font-black text-xl text-slate-800">Sigortalı Gönderim</div>
            <div className="font-body text-slate-500 text-xs mt-1">Tüm Türkiye'ye Teslimat</div>
          </div>
        </div>

        <div className="space-y-8 text-slate-600 font-body leading-relaxed text-sm md:text-base">

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-4">1. Genel Bilgilendirme ve Kapsam</h2>
            <p className="mb-3">
              sescim.com üzerinden verilen tüm siparişler, <strong>Mustafa Akdağ - Akdağ Elektronik</strong> güvencesiyle doğrudan yetkili distribütör stoklarından özenle paketlenerek sigortalı kargo ile tarafınıza ulaştırılır.
            </p>
            <p>
              Teslimatlarımız Türkiye Cumhuriyeti sınırları içerisindeki tüm il, ilçe ve merkezlere kargo firmalarının dağıtım ağı dahilinde kapınıza kadar yapılmaktadır.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-4">2. Kargo Ücretleri ve Baremleri</h2>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <span className="font-medium text-slate-700">1.999,00 TL ve Üzeri Siparişler:</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md text-sm">ÜCRETSİZ (0,00 TL)</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-medium text-slate-700">1.999,00 TL Altı Siparişler:</span>
                <span className="font-bold text-slate-800 bg-slate-200/60 px-3 py-1 rounded-md text-sm">149,00 TL (KDV Dahil Sabit Ücret)</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              * Kargo ücreti sepet ve ödeme aşamasında toplam tutara şeffaf bir şekilde yansıtılır; kapıda veya teslimat anında ek bir kargo bedeli talep edilmez.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-4">3. Kargoya Teslim ve Teslimat Süreleri</h2>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li><strong>Sipariş Hazırlık Süresi:</strong> Hafta içi saat 15:00'e kadar onaylanan siparişler aynı gün veya en geç <strong>1 - 2 iş günü</strong> içerisinde kargo şirketine teslim edilir.</li>
              <li><strong>Kargo İntikal Süresi:</strong> Kargo şirketine teslim edilen siparişler, teslimat adresinin mesafesine bağlı olarak genellikle <strong>1 - 3 iş günü</strong> içerisinde adrese ulaştırılır.</li>
              <li>Hafta sonu (Cumartesi 12:00 sonrası ve Pazar) ile resmi tatil günlerinde verilen siparişler, takip eden ilk iş günü işleme alınır.</li>
              <li>Ağır veya hacimli ses kabinleri ve truss sahne sistemleri gibi özel lojistik gerektiren ürünler anlaşmalı ambar veya lojistik taşıyıcılar aracılığıyla randevulu teslim edilebilir.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-4">4. Anlaşmalı Kargo Şirketleri</h2>
            <p className="mb-3">
              Gönderilerimiz öncelikli olarak <strong>Yurtiçi Kargo</strong>, <strong>Aras Kargo</strong> ve <strong>MNG Kargo</strong> kurumsal kargo ağları aracılığıyla sigortalı olarak sevk edilmektedir.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-4">5. Sipariş ve Kargo Takibi</h2>
            <p className="mb-3">
              Siparişiniz kargoya teslim edildiğinde sistemimize kayıtlı e-posta adresinize ve cep telefonunuza kargo takip numarasını içeren bilgilendirme iletilir.
            </p>
            <p>
              Ayrıca sitemizdeki <Link href="/siparis-takip" className="text-brand-red font-semibold hover:underline">Sipariş Takibi</Link> sayfasından sipariş numaranız ve telefon bilginizle kargonuzun nerede olduğunu anlık olarak görüntüleyebilirsiniz.
            </p>
          </section>

          <section className="bg-amber-50/70 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display font-bold text-amber-900 text-lg mb-2">6. Kargo Teslim Alma ve Hasar Durumu (Çok Önemli)</h3>
                <p className="text-amber-800 text-sm leading-relaxed mb-3">
                  Taşıma esnasında hassas ses ve ışık cihazlarının zarar görmemesi için tüm paketler özel koruyucu ambalajlarla gönderilir. Lütfen kargo görevlisinden paketi teslim alırken aşağıdaki hususlara dikkat ediniz:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-amber-900/90 text-sm font-medium">
                  <li>Paketin dışını kontrol ediniz. Eğer kolide ezilme, ıslanma, yırtılma veya delinme varsa kargoyu teslim almayınız.</li>
                  <li>Kargo görevlisine derhal <strong>"Hasar Tespit Tutanağı"</strong> tutturunuz.</li>
                  <li>Hasarlı ürünü teslim almayıp tutanakla birlikte geri gönderdiğinizde, ürün bedeli veya yenisi derhal tarafınıza yönlendirilir. Tutanaksız teslim alınan hasarlı ürünlerde kargo sigortası tazmin sağlayamamaktadır.</li>
                </ol>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-4">7. Satıcı ve İletişim Bilgileri</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2"><strong>Ticari Unvan:</strong> Mustafa Akdağ - Akdağ Elektronik (sescim.com)</li>
                <li className="flex items-start gap-2"><MapPin size={16} className="text-brand-red shrink-0 mt-0.5" /><strong>Adres:</strong> Cumhuriyet Mah. Sur Cad. No:17/A, Melikgazi / Kayseri</li>
                <li className="flex items-start gap-2"><Phone size={16} className="text-brand-red shrink-0 mt-0.5" /><strong>Telefon:</strong> +90 352 231 69 15 (Pzt - Cmt: 09:00 - 19:00)</li>
                <li className="flex items-start gap-2"><Mail size={16} className="text-brand-red shrink-0 mt-0.5" /><strong>E-posta:</strong> info@sescim.com</li>
                <li className="flex items-start gap-2"><strong>Vergi Dairesi &amp; No:</strong> Erciyes Vergi Dairesi / 0200327808</li>
              </ul>
            </div>
          </section>

        </div>

      </div>
    </div>
  )
}
