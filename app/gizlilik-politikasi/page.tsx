import Link from 'next/link'
import { ArrowLeft, Phone, Mail, Shield, Eye, Lock, Database, UserCheck, Trash2, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'KVKK ve Gizlilik Politikası | Sescim',
  description: 'Sescim kişisel verilerin korunması ve gizlilik politikası — KVKK aydınlatma metni.',
}

export default function GizlilikPolitikasi() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-sm rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-red text-sm font-body mb-8 transition-colors">
          <ArrowLeft size={14} /> Ana Sayfa
        </Link>
        
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="text-brand-red w-8 h-8" />
          <h1 className="font-display font-black text-3xl md:text-4xl text-slate-800 leading-tight">
            KVKK VE GİZLİLİK POLİTİKASI
          </h1>
        </div>

        {/* Başlık Kartı */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-12">
          <div className="flex items-start gap-4">
            <Shield size={28} className="text-brand-red shrink-0 mt-1" />
            <div>
              <div className="font-display font-bold text-sm uppercase text-slate-800 mb-2">6698 Sayılı KVKK Aydınlatma Metni</div>
              <p className="font-body text-slate-600 text-sm leading-relaxed">
                Sescim olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında kişisel verilerinizin korunmasına büyük önem veriyoruz. Bu aydınlatma metni, kişisel verilerinizin nasıl toplandığı, işlendiği ve korunduğu hakkında sizi bilgilendirmek amacıyla hazırlanmıştır.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6 flex items-center gap-2"><UserCheck className="text-brand-red" size={24} /> Veri Sorumlusu</h2>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-slate-600 font-body">
              <ul className="space-y-2">
                <li><strong className="text-slate-800">Unvan:</strong> Sescim</li>
                <li><strong className="text-slate-800">Adres:</strong> Cumhuriyet Mah. Sur Cad. No:17/A, Melikgazi / Kayseri</li>
                <li><strong className="text-slate-800">Telefon:</strong> +90 352 231 69 15</li>
                <li><strong className="text-slate-800">E-posta:</strong> info@sescim.com</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6 flex items-center gap-2"><Database className="text-brand-red" size={24} /> Toplanan Kişisel Veriler</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">Sitemiz üzerinden aşağıdaki kişisel veriler toplanabilmektedir:</p>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {[
                { cat: 'Kimlik Bilgileri', items: 'Ad, soyad' },
                { cat: 'İletişim Bilgileri', items: 'E-posta, telefon, adres' },
                { cat: 'Müşteri İşlem Bilgileri', items: 'Sipariş bilgileri, ödeme kayıtları' },
                { cat: 'Dijital İz Bilgileri', items: 'IP adresi, çerez verileri, tarayıcı bilgileri' },
              ].map((item) => (
                <div key={item.cat} className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                  <div className="font-display font-bold text-xs uppercase text-brand-red mb-1">{item.cat}</div>
                  <div className="text-slate-500 text-sm font-body">{item.items}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6 flex items-center gap-2"><Eye className="text-brand-red" size={24} /> Verilerin İşlenme Amaçları</h2>
            <ul className="space-y-3 text-slate-600 font-body">
              {[
                'Sipariş süreçlerinin yürütülmesi ve teslimat işlemlerinin gerçekleştirilmesi',
                'Müşteri ilişkileri yönetimi ve iletişim faaliyetlerinin sürdürülmesi',
                'Fatura düzenleme ve muhasebe kayıtlarının tutulması',
                'Yasal yükümlülüklerin yerine getirilmesi',
                'İletişim formu aracılığıyla gelen talep ve şikayetlerin cevaplanması',
                'Bayi başvuru süreçlerinin yönetimi',
                'Web sitesi performansının analiz edilmesi ve iyileştirilmesi',
                'Bilgi güvenliği süreçlerinin yürütülmesi',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-brand-red rounded-full shrink-0 mt-2" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6 flex items-center gap-2"><Shield className="text-brand-red" size={24} /> Verilerin Hukuki Sebepleri</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">Kişisel verileriniz, KVKK'nın 5. ve 6. maddelerinde belirtilen aşağıdaki hukuki sebeplere dayanılarak işlenmektedir:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 leading-relaxed font-body mb-4">
              <li>Kanunlarda açıkça öngörülmesi</li>
              <li>Sözleşmenin kurulması veya ifası için gerekli olması</li>
              <li>Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi</li>
              <li>İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla, veri sorumlusunun meşru menfaatleri</li>
              <li>Açık rızanızın bulunması (pazarlama faaliyetleri için)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6 flex items-center gap-2"><Lock className="text-brand-red" size={24} /> Verilerin Aktarılması</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">Kişisel verileriniz, aşağıdaki taraflarla paylaşılabilir:</p>
            <ul className="space-y-3 mt-3 text-slate-600 font-body">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-brand-red rounded-full shrink-0 mt-2" />
                <span><strong className="text-slate-800">Kargo şirketleri:</strong> Sipariş teslimatı amacıyla</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-brand-red rounded-full shrink-0 mt-2" />
                <span><strong className="text-slate-800">Ödeme kuruluşları:</strong> Ödeme işlemlerinin güvenli şekilde gerçekleştirilmesi için (PayTR)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-brand-red rounded-full shrink-0 mt-2" />
                <span><strong className="text-slate-800">Yasal otoriteler:</strong> Mevzuat gereği talep edilmesi halinde yetkili kamu kurum ve kuruluşlarına</span>
              </li>
            </ul>
            <p className="mt-4 text-slate-600 leading-relaxed font-body">Kişisel verileriniz, yukarıda belirtilen amaçlar ve hukuki sebepler dışında üçüncü kişilerle paylaşılmamaktadır.</p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6 flex items-center gap-2"><Database className="text-brand-red" size={24} /> Veri Saklama Süresi</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">Kişisel verileriniz, işlenme amaçlarının gerektirdiği süre boyunca ve ilgili mevzuatta öngörülen zamanaşımı süreleri boyunca saklanmaktadır. Yasal saklama süresi sona erdikten sonra verileriniz silinir, yok edilir veya anonim hale getirilir.</p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6 flex items-center gap-2"><Eye className="text-brand-red" size={24} /> Çerez Politikası</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">Web sitemiz, hizmet kalitesini artırmak ve kullanıcı deneyimini iyileştirmek amacıyla çerezler kullanmaktadır.</p>
            <div className="mt-4 space-y-4">
              {[
                { type: 'Zorunlu Çerezler', desc: 'Sitenin temel işlevlerinin çalışması için gerekli çerezlerdir. Devre dışı bırakılamaz.' },
                { type: 'Analitik Çerezler', desc: 'Ziyaretçi istatistikleri ve site performansı analizi için kullanılır.' },
                { type: 'İşlevsel Çerezler', desc: 'Kullanıcı tercihlerini (dil, sepet, favoriler vb.) hatırlamak için kullanılır.' },
              ].map((cookie) => (
                <div key={cookie.type} className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                  <div className="font-display font-bold text-sm uppercase text-slate-800 mb-1">{cookie.type}</div>
                  <p className="text-slate-600 text-sm font-body">{cookie.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6 flex items-center gap-2"><UserCheck className="text-brand-red" size={24} /> KVKK Kapsamında Haklarınız</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">KVKK'nın 11. maddesi gereğince aşağıdaki haklara sahipsiniz:</p>
            <div className="grid md:grid-cols-2 gap-3 mt-4">
              {[
                'Kişisel verilerinizin işlenip işlenmediğini öğrenme',
                'İşlenmiş ise buna ilişkin bilgi talep etme',
                'İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme',
                'Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme',
                'Eksik veya yanlış işlenmiş ise düzeltilmesini isteme',
                "KVKK'nın 7. maddesi kapsamında silinmesini/yok edilmesini isteme",
                'Düzeltme ve silme işlemlerinin aktarılan üçüncü kişilere bildirilmesini isteme',
                'Münhasıran otomatik sistemler aracılığıyla analiz sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme',
                'Kanuna aykırı işleme sebebiyle zararın giderilmesini talep etme',
              ].map((right) => (
                <div key={right} className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <Trash2 size={14} className="text-brand-red shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600 font-body">{right}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-6 flex items-center gap-2"><Mail className="text-brand-red" size={24} /> Başvuru Yöntemi</h2>
            <p className="text-slate-600 leading-relaxed font-body mb-4">KVKK kapsamındaki haklarınızı kullanmak için aşağıdaki yöntemlerle tarafımıza başvurabilirsiniz:</p>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                <Mail size={16} className="text-brand-red shrink-0 mt-0.5" />
                <div>
                  <div className="font-display font-bold text-xs uppercase text-slate-800 mb-1">E-posta</div>
                  <div className="text-slate-500 font-body text-sm">info@sescim.com</div>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                <Phone size={16} className="text-brand-red shrink-0 mt-0.5" />
                <div>
                  <div className="font-display font-bold text-xs uppercase text-slate-800 mb-1">Telefon</div>
                  <div className="text-slate-500 font-body text-sm">+90 352 231 69 15</div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-slate-600 leading-relaxed font-body">Başvurunuz, talebin niteliğine göre en kısa sürede ve en geç 30 (otuz) gün içinde ücretsiz olarak sonuçlandırılacaktır.</p>
          </section>

          <div className="border border-slate-200 bg-slate-50 rounded-2xl p-8 text-center mt-12">
            <Shield size={28} className="text-brand-red mx-auto mb-3" />
            <div className="font-display font-bold text-sm uppercase tracking-widest text-slate-800 mb-3">Verileriniz Güvende</div>
            <p className="font-body text-slate-500 text-sm mb-6">KVKK kapsamında tüm haklarınız saklıdır.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="mailto:info@sescim.com" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-red text-white font-medium rounded-lg hover:bg-brand-red/90 transition-colors text-sm"><Mail size={16} />KVKK Başvurusu</a>
              <Link href="/iletisim" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm">İletişim Formu</Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
