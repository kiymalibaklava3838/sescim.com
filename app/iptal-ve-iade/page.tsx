import Link from 'next/link'
import { ArrowLeft, Phone, Mail, RotateCcw, Clock, CheckCircle, XCircle, Package, RefreshCcw } from 'lucide-react'

export const metadata = {
  title: 'İptal ve İade Koşulları | Akdağ Elektronik',
  description: 'Akdağ Elektronik iptal ve iade koşulları — cayma hakkı, iade süreci ve para iadesi bilgileri.',
}

export default function IptalVeIade() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-sm rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-red text-sm font-body mb-8 transition-colors">
          <ArrowLeft size={14} /> Ana Sayfa
        </Link>
        
        <div className="flex items-center gap-3 mb-8">
          <RefreshCcw className="text-brand-red w-8 h-8" />
          <h1 className="font-display font-black text-3xl md:text-4xl text-slate-800 leading-tight">
            İPTAL VE İADE KOŞULLARI
          </h1>
        </div>

        {/* Özet Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center">
            <Clock size={24} className="text-brand-red mx-auto mb-3" />
            <div className="font-display font-black text-2xl text-slate-800">14 Gün</div>
            <div className="font-body text-slate-500 text-xs mt-1">Cayma hakkı süresi</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center">
            <RotateCcw size={24} className="text-brand-red mx-auto mb-3" />
            <div className="font-display font-black text-2xl text-slate-800">Ücretsiz</div>
            <div className="font-body text-slate-500 text-xs mt-1">İade kargo bedeli (ayıplı ürün)</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center">
            <CheckCircle size={24} className="text-brand-red mx-auto mb-3" />
            <div className="font-display font-black text-2xl text-slate-800">14 Gün</div>
            <div className="font-body text-slate-500 text-xs mt-1">Para iadesi süresi</div>
          </div>
        </div>

        <div className="space-y-8">

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Cayma Hakkı</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">
              6502 sayılı Tüketicinin Korunması Hakkında Kanun gereğince, tüketici mesafeli sözleşmenin kurulduğu tarihten itibaren veya malın teslimine ilişkin sözleşmelerde, tüketicinin veya tüketici tarafından belirlenen üçüncü kişinin malı teslim aldığı günden itibaren <strong className="text-brand-red">14 (on dört) gün</strong> içerisinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.
            </p>
            <p className="text-slate-600 leading-relaxed font-body mb-4">
              Cayma hakkı süresinin belirlenmesinde; tek sipariş konusu olup ayrı ayrı teslim edilen mallarda, son malın teslim alındığı gün esas alınır.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Cayma Hakkının Kullanımı</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">Cayma hakkını kullanmak isteyen ALICI, aşağıdaki yöntemlerden biri ile SATICI'ya bildirimde bulunmalıdır:</p>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                <Phone size={16} className="text-brand-red shrink-0 mt-0.5" />
                <div>
                  <div className="font-display font-bold text-xs uppercase text-slate-800 mb-1">Telefon</div>
                  <div className="text-slate-500">+90 352 231 69 15</div>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                <Mail size={16} className="text-brand-red shrink-0 mt-0.5" />
                <div>
                  <div className="font-display font-bold text-xs uppercase text-slate-800 mb-1">E-posta</div>
                  <div className="text-slate-500">info@akdagelektronik.com</div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">İade Şartları</h2>
            <div className="space-y-3 text-slate-600 font-body">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
                <span>Ürün kullanılmamış ve orijinal ambalajında olmalıdır</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
                <span>Tüm aksesuarları, garanti belgesi ve faturası ile birlikte iade edilmelidir</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
                <span>Ürün, teslim alındığı şekliyle ve hasarsız olmalıdır</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
                <span>Cayma bildirimi 14 gün içinde yapılmış olmalıdır</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">İade Edilemeyecek Ürünler</h2>
            <div className="bg-red-50 border border-red-100 rounded-xl p-5">
              <div className="space-y-3 text-slate-600 font-body">
                <div className="flex items-start gap-3">
                  <XCircle size={18} className="text-brand-red shrink-0 mt-0.5" />
                  <span>Tüketici talebine göre özel olarak üretilmiş veya kişiye özel hale getirilmiş ürünler</span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle size={18} className="text-brand-red shrink-0 mt-0.5" />
                  <span>Ambalajı açılmış, kullanılmış veya hasar görmüş ürünler</span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle size={18} className="text-brand-red shrink-0 mt-0.5" />
                  <span>Koruyucu unsurları açılmış yazılım, dijital içerik ve programlar</span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle size={18} className="text-brand-red shrink-0 mt-0.5" />
                  <span>Fiyatı finansal piyasadaki dalgalanmalara bağlı olarak değişen ürünler</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">İade Süreci</h2>
            <div className="relative pl-6 border-l-2 border-brand-red/20 space-y-8 my-6">
              {[
                { step: '1', title: 'Bildirim', desc: 'Cayma iradenizi telefon veya e-posta ile tarafımıza bildirin.' },
                { step: '2', title: 'Onay', desc: 'İade talebiniz incelendikten sonra onay ve kargo bilgileri iletilir.' },
                { step: '3', title: 'Kargolama', desc: 'Ürünü orijinal ambalajında, eksiksiz olarak belirtilen adrese gönderin.' },
                { step: '4', title: 'Kontrol', desc: 'Ürün tarafımıza ulaştığında kontrol edilir.' },
                { step: '5', title: 'Para İadesi', desc: 'Onay sonrası 14 gün içinde ödeme yönteminize iade yapılır.' },
              ].map((item) => (
                <div key={item.step} className="relative">
                  <div className="absolute -left-[33px] w-4 h-4 bg-brand-red border-2 border-white rounded-full" />
                  <div className="font-display font-bold text-sm uppercase text-slate-800">{item.title}</div>
                  <p className="text-slate-500 mt-1 font-body text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Para İadesi</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">Cayma hakkının kullanılması durumunda SATICI, cayma bildiriminin kendisine ulaştığı tarihten itibaren en geç <strong className="text-brand-red">14 (on dört) gün</strong> içerisinde almış olduğu toplam bedeli ALICI'ya iade eder.</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 leading-relaxed font-body mb-4 mt-2">
              <li><strong className="text-slate-800">Kredi kartı:</strong> İade tutarı bankanız tarafından 1-4 hafta içinde yansıtılır.</li>
              <li><strong className="text-slate-800">Havale/EFT:</strong> İade tutarı belirtilen banka hesabına aktarılır.</li>
              <li><strong className="text-slate-800">Kapıda ödeme:</strong> İade tutarı ALICI'nın bildireceği banka hesabına havale edilir.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6">Ayıplı Ürün</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">Teslim alınan üründe herhangi bir ayıp/kusur bulunması halinde, ALICI ürünü teslim aldığı tarihten itibaren 30 gün içinde SATICI'ya bildirimde bulunmalıdır.</p>
            <p className="text-slate-600 leading-relaxed font-body mb-4">Ayıplı ürün iade kargo bedeli <strong className="text-brand-red">SATICI</strong> tarafından karşılanır. ALICI, ücretsiz onarım, ürün değişimi veya bedel iadesi haklarından birini kullanabilir.</p>
          </section>

          <div className="border border-slate-200 bg-slate-50 rounded-2xl p-8 text-center mt-12">
            <Package size={28} className="text-brand-red mx-auto mb-3" />
            <div className="font-display font-bold text-sm uppercase tracking-widest text-slate-800 mb-3">İade Talebi Oluşturmak İçin</div>
            <p className="font-body text-slate-500 text-sm mb-6">Lütfen sipariş numaranız ile birlikte bizimle iletişime geçin.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/iletisim" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-red text-white font-medium rounded-lg hover:bg-brand-red/90 transition-colors text-sm">İletişime Geç</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
