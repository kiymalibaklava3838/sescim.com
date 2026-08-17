import Link from 'next/link'
import { ArrowLeft, FileText, Phone, Mail, MapPin } from 'lucide-react'

export const metadata = {
  title: 'Mesafeli Satış Sözleşmesi | Sescim',
  description: 'Sescim mesafeli satış sözleşmesi — alıcı ve satıcı hakları, ürün teslimat koşulları.',
}

export default function MesafeliSatisSozlesmesi() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-sm rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-red text-sm font-body mb-8 transition-colors">
          <ArrowLeft size={14} /> Ana Sayfa
        </Link>
        
        <div className="flex items-center gap-3 mb-8">
          <FileText className="text-brand-red w-8 h-8" />
          <h1 className="font-display font-black text-3xl md:text-4xl text-slate-800 leading-tight">
            MESAFELİ SATIŞ SÖZLEŞMESİ
          </h1>
        </div>

        <div className="space-y-8">

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Madde 1 — Taraflar</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                <div className="font-display font-bold text-sm uppercase text-brand-red mb-3">SATICI</div>
                <ul className="space-y-2 text-sm font-body text-slate-600">
                  <li className="flex gap-2"><FileText size={13} className="text-brand-red shrink-0 mt-0.5" />Unvan: Sescim</li>
                  <li className="flex gap-2"><MapPin size={13} className="text-brand-red shrink-0 mt-0.5" />Adres: Cumhuriyet Mah. Sur Cad. No:17/A, Melikgazi / Kayseri</li>
                  <li className="flex gap-2"><Phone size={13} className="text-brand-red shrink-0 mt-0.5" />Telefon: +90 352 231 69 15</li>
                  <li className="flex gap-2"><Mail size={13} className="text-brand-red shrink-0 mt-0.5" />E-posta: info@sescim.com</li>
                </ul>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                <div className="font-display font-bold text-sm uppercase text-brand-red mb-3">ALICI</div>
                <p className="text-sm font-body text-slate-600 leading-relaxed">
                  Sipariş esnasında beyan edilen ad-soyad, adres, telefon ve e-posta bilgileri ile tanımlanan gerçek veya tüzel kişidir.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Madde 2 — Tanımlar</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">İşbu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümlerine uygun olarak düzenlenmiştir.</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 leading-relaxed font-body mb-4">
              <li><strong className="text-slate-800">Hizmet:</strong> Bir ücret karşılığında yapılan her türlü tüketici işlemi.</li>
              <li><strong className="text-slate-800">Satıcı:</strong> Ticari amaçlarla tüketiciye mal sunan gerçek veya tüzel kişi.</li>
              <li><strong className="text-slate-800">Alıcı:</strong> Ticari veya mesleki olmayan amaçlarla hareket eden gerçek veya tüzel kişi.</li>
              <li><strong className="text-slate-800">Site:</strong> sescim.com alan adlı web sitesi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Madde 3 — Sözleşmenin Konusu</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">İşbu sözleşmenin konusu; ALICI&apos;nın SATICI&apos;ya ait sescim.com internet sitesinden elektronik ortamda sipariş verdiği ürün/ürünlerin satışı ve teslimi ile ilgili olarak 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.</p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Madde 4 — Ürün Bilgileri</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">Malın türü ve miktarı, rengi, tüm vergiler dahil satış bedeli, ödeme şekli sipariş sayfasında ve sipariş onay e-postasında yer almaktadır.</p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Madde 5 — Genel Hükümler</h2>
            <ol className="list-decimal list-inside space-y-2 text-slate-600 leading-relaxed font-body mb-4">
              <li>ALICI, sipariş konusu ürünün temel nitelikleri, satış fiyatı ve ödeme şekli ile teslimat ve iade şartlarına ilişkin ön bilgileri okuyup bilgi sahibi olduğunu kabul eder.</li>
              <li>Sözleşme konusu ürün, yasal 30 günlük süreyi aşmamak koşulu ile ALICI&apos;nın yerleşim yerine teslim edilir.</li>
              <li>SATICI, ürünün sağlam, eksiksiz, siparişte belirtilen niteliklere uygun ve varsa garanti belgeleri ile teslim edilmesinden sorumludur.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Madde 6 — Teslimat Koşulları</h2>
            <ol className="list-decimal list-inside space-y-2 text-slate-600 leading-relaxed font-body mb-4">
              <li>Teslimat, stokun müsait olması ve ödemenin gerçekleşmesinden sonra en kısa sürede yapılır.</li>
              <li>Teslimat, ALICI&apos;nın sipariş formunda belirttiği adrese yapılacaktır.</li>
              <li>Kargo ücreti aksine bir bilgilendirme yapılmadıkça ALICI&apos;ya aittir.</li>
              <li>SATICI, ürünün teslim anına kadar tüm riskleri üzerine alır.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Madde 7 — Cayma Hakkı</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">ALICI, ürünün teslim tarihinden itibaren <strong className="text-brand-red">14 (on dört) gün</strong> içerisinde cayma hakkını kullanabilir.</p>
            <div className="bg-red-50 rounded-xl border border-red-100 p-4 mt-4">
              <div className="font-display font-bold text-xs uppercase tracking-widest text-brand-red mb-2">Cayma hakkı kullanılamayacak ürünler</div>
              <ul className="space-y-1 text-sm font-body text-slate-600">
                <li>• Fiyatı finansal piyasadaki dalgalanmalara bağlı olan ürünler</li>
                <li>• Tüketici talebine göre özel olarak üretilen ürünler</li>
                <li>• Koruyucu unsurları açılan, iade edilmesi hijyen açısından uygun olmayan ürünler</li>
                <li>• Açılmış dijital içerik, yazılım ve programlar</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Madde 8 — İade Koşulları</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">Cayma hakkının kullanılması halinde iade edilecek ürünün kullanılmamış, orijinal ambalajında ve tüm aksesuarları ile birlikte eksiksiz olarak teslim edilmesi gerekmektedir.</p>
            <p className="text-slate-600 leading-relaxed font-body mb-4">Detaylı bilgi için <Link href="/iptal-ve-iade" className="text-brand-red font-semibold hover:underline">İptal ve İade Koşulları</Link> sayfasını inceleyiniz.</p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Madde 9 — Ödeme ve Güvenlik</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">Kredi kartı bilgileri SATICI tarafından saklanmamakta olup, ödeme altyapısı PayTR güvenli ödeme sistemi üzerinden gerçekleştirilmektedir.</p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Madde 10 — Yetkili Mahkeme</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">İşbu sözleşmeden doğan uyuşmazlıklarda Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir. ALICI, siparişi onaylayarak işbu sözleşmenin tüm koşullarını kabul etmiş sayılır.</p>
          </section>

          <div className="border border-slate-200 rounded-2xl bg-slate-50 p-8 text-center mt-12">
            <div className="font-display font-bold text-sm uppercase tracking-widest text-slate-800 mb-4">Sorularınız İçin</div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="mailto:info@sescim.com" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-red text-white font-medium rounded-lg hover:bg-brand-red/90 transition-colors text-sm">E-Posta Gönder</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
