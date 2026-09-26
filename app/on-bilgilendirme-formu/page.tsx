import Link from 'next/link'
import { ArrowLeft, FileText, Phone, Mail, MapPin, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Ön Bilgilendirme Formu | sescim.com',
  description: 'sescim.com ön bilgilendirme formu — 6502 sayılı Tüketicinin Korunması Hakkında Kanun uyarınca tüketici bilgilendirme şartları.',
}

export default function OnBilgilendirmeFormu() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-sm rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-red text-sm font-body mb-8 transition-colors">
          <ArrowLeft size={14} /> Ana Sayfa
        </Link>
        
        <div className="flex items-center gap-3 mb-8">
          <FileText className="text-brand-red w-8 h-8" />
          <div>
            <h1 className="font-display font-black text-3xl md:text-4xl text-slate-800 leading-tight">
              ÖN BİLGİLENDİRME FORMU
            </h1>
            <p className="text-sm text-slate-500 mt-1">6502 Sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği Uyarınca</p>
          </div>
        </div>

        <div className="space-y-8 text-slate-600 font-body leading-relaxed text-sm md:text-base">

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-4">1. SATICI BİLGİLERİ</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
              <p><strong>Ticari Unvan:</strong> Mustafa Akdağ - Akdağ Elektronik (Satış Platformu: sescim.com)</p>
              <p className="flex items-center gap-2"><MapPin size={15} className="text-brand-red shrink-0" /><strong>Fiziksel Adres:</strong> Cumhuriyet Mah. Sur Cad. No:17/A, Melikgazi / Kayseri</p>
              <p className="flex items-center gap-2"><Phone size={15} className="text-brand-red shrink-0" /><strong>Telefon:</strong> +90 352 231 69 15 (Pzt - Cmt: 09:00 - 19:00)</p>
              <p className="flex items-center gap-2"><Mail size={15} className="text-brand-red shrink-0" /><strong>E-posta:</strong> info@sescim.com</p>
              <p><strong>Vergi Dairesi &amp; No:</strong> Erciyes Vergi Dairesi / 0200327808</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-4">2. ALICI BİLGİLERİ</h2>
            <p>
              sescim.com internet sitesinden sipariş veren, sipariş formunda adı, soyadı, teslimat adresi, e-posta adresi ve telefon bilgileri beyan edilen gerçek veya tüzel kişidir.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-4">3. SÖZLEŞME KONUSU ÜRÜNÜN TEMEL NİTELİKLERİ VE FİYATI</h2>
            <p className="mb-2">
              Ürün veya ürünlerin cinsi, miktarı, marka ve modeli, rengi, adedi, tüm vergiler dahil Türk Lirası cinsinden satış fiyatı, kargo bedeli ve ödeme bilgileri sipariş özeti ekranında ve sipariş onay e-postasında açıkça yer almaktadır.
            </p>
            <p>
              Fiyatlandırmalarımıza tüm yasal vergiler (KDV) dahildir. 1.999 TL ve üzeri siparişlerde kargo bedeli 0,00 TL (ücretsiz), 1.999 TL altı siparişlerde ise 149 TL'dir.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-4">4. ÖDEME VE TESLİMAT KOŞULLARI</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Ödeme Yöntemleri:</strong> Sitemiz üzerinden PayTR altyapısı ile 3D Secure güvencesinde kredi kartı / banka kartı (tek çekim veya 12 aya varan taksit) ile ödeme yapılabilir.</li>
              <li><strong>Teslimat:</strong> Sipariş konusu ürün, yasal 30 günlük süreyi aşmamak şartıyla ALICI'nın sipariş formunda belirttiği adrese anlaşmalı kargo firmaları (Yurtiçi Kargo vb.) aracılığıyla sigortalı olarak teslim edilir.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-4">5. CAYMA HAKKI VE İADE PROSEDÜRÜ</h2>
            <p className="mb-3">
              ALICI, mal teslimine ilişkin sözleşmelerde ürünün kendisine veya gösterdiği adresteki kişi/kuruluşa teslim tarihinden itibaren <strong>14 (on dört) gün</strong> içerisinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin cayma hakkını kullanabilir.
            </p>
            <p className="mb-3">
              Cayma hakkının kullanılması için bu süre içinde SATICI'ya e-posta (<a href="mailto:info@sescim.com" className="text-brand-red underline">info@sescim.com</a>) veya telefon (+90 352 231 69 15) ile açık bildirimde bulunulması ve ürünün ambalajının, kutusunun, aksesuarlarının ve varsa garanti belgelerinin eksiksiz ve hasarsız olması gerekmektedir.
            </p>
            <p className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <strong>İade Gönderim Adresi:</strong> Mustafa Akdağ - Akdağ Elektronik (Sescim.com İade Birimi), Cumhuriyet Mah. Sur Cad. No:17/A, Melikgazi / Kayseri
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800 mb-4">6. ŞİKAYET VE UYUŞMAZLIKLARIN ÇÖZÜMÜ</h2>
            <p>
              Tüketici, şikayet ve itirazları konusunda başvurularını Sanayi ve Ticaret Bakanlığı tarafından her yıl Aralık ayında belirlenen parasal sınırlar dahilinde, tüketicinin mal veya hizmeti satın aldığı veya ikametgahının bulunduğu yerdeki Tüketici Sorunları Hakem Heyetine veya Tüketici Mahkemesine yapabilir.
            </p>
          </section>

        </div>

      </div>
    </div>
  )
}
