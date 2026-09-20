'use client'

import { useState } from 'react'
import { ChevronDown, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react'

interface Props {
  categorySlug?: string
  categoryName?: string
}

interface SeoContentItem {
  title: string
  lead: string
  highlights: string[]
  body: string
}

const SEO_CONTENT_MAP: Record<string, SeoContentItem> = {
  'ses-sistemleri': {
    title: 'Profesyonel Ses Sistemleri ve Ekipmanları Rehberi',
    lead: 'Canlı sahne performansları, konserler, konferans salonları, ibadethaneler ve kurumsal mekanlar için kristal netliğinde ses iletimi sunan profesyonel ses sistemleri Sescim\'de.',
    highlights: [
      'Yüksek SPL kapasiteli aktif ve pasif hoparlör seçenekleri',
      'Dijital mikser konsolları ile hassas sahne ve stüdyo miksajı',
      'Parazitsiz UHF telsiz mikrofon sistemleri ve delege kürsü mikrofonları',
      'Akdağ Elektronik distribütör güvencesiyle 2 yıl resmi garanti'
    ],
    body: `Profesyonel ses sistemi kurulumlarında doğru bileşenlerin seçimi, akustik performansın ve dinleyici memnuniyetinin temel belirleyicisidir. Mekanın büyüklüğüne, tavan yüksekliğine ve kullanım amacına bağlı olarak hat trafolu anons sistemleri, taşınabilir aktif kabinler veya geniş alan seslendirmesi sağlayan line array sistemler tercih edilmelidir. Sescim, dünyanın önde gelen pro audio markalarının orijinal ürünlerini en avantajlı fiyat ve taksit seçenekleriyle sunar.`
  },
  'mixer-amfi': {
    title: 'Analog & Dijital Mikserler ile Güç Amfileri',
    lead: 'Müzik prodüksiyonu, canlı sahne ve sabit kurulum seslendirmelerinde sinyal yönetiminin kalbi olan profesyonel mikser ve amfi modelleri.',
    highlights: [
      'Geniş kanal kapasiteli USB / Bluetooth bağlantılı analog mikserler',
      'Wi-Fi kontrollü, DSP motorlu yeni nesil dijital sahne mikserleri',
      'Yüksek verimli Class-D power amfileri ve hat trafolu kurulum amplifikatörleri',
      'Dahili efekt işlemcileri (Reverb, Delay, Chorus, Kompresör)'
    ],
    body: `Canlı müzik performanslarından konferans salonlarına kadar her türlü etkinlikte sinyal akışının bozulmadan iletilmesi amfi ve mikser uyumuna bağlıdır. Dijital mikserler uzaktan tablet kontrolü ve sahne kayıt yetenekleriyle öne çıkarken, analog mikserler hızlı müdahale kolaylığı sağlar. İhtiyacınıza uygun watt gücü ve empedans değerlerine sahip amfi modellerini Sescim güvencesiyle sipariş verebilirsiniz.`
  },
  'hoparlorler': {
    title: 'Aktif, Pasif ve Taşınabilir Hoparlör Çeşitleri',
    lead: 'Açık hava festivallerinden cafe-restoran seslendirmesine kadar her bütçeye ve mekana uygun yüksek performanslı hoparlör sistemleri.',
    highlights: [
      'Dahili amfili tak-çalıştır aktif kabin hoparlörler (10", 12", 15")',
      'Derin bas vuruşları için profesyonel aktif ve pasif subwooferlar',
      'Mekan mimarisine uyum sağlayan şık tavan ve duvar tipi hoparlörler',
      'Akü ve batarya beslemeli kablosuz taşınabilir ses sistemleri'
    ],
    body: `Hoparlör seçiminde desibel (SPL) seviyesi, frekans tepkisi ve dispersiyon (yayılım) açısı kritik öneme sahiptir. Cafe, mağaza ve okul projelerinde tavan ve sütun hoparlörler eşit ses dağılımı sağlarken; sahne ve DJ performanslarında yüksek bas tepkisine sahip aktif sub-satelit kombinasyonları tercih edilir.`
  },
  'mikrofon-sistemleri': {
    title: 'Telsiz, Kablolu ve Stüdyo Mikrofon Sistemleri',
    lead: 'Vokalistler, sunucular, tiyatrolar, camiler ve yayıncılar için pürüzsüz ses yakalama kabiliyetine sahip mikrofon modelleri.',
    highlights: [
      'True Diversity teknolojili çekim mesafesi yüksek UHF kablosuz mikrofonlar',
      'Yaka (Lavalier) ve Kafa (Headset) mikrofon seçenekleri',
      'Podcasting, yayıncılık ve stüdyo kaydı için geniş diyaframlı kondenser mikrofonlar',
      'Geri beslemeyi (feedback) engelleyen kardioid dinamik vokal mikrofonları'
    ],
    body: `Doğru mikrofon, sesin doğallığını ve enerjisini dinleyiciye en saf haliyle ulaştırır. Sahne hareketliliği gerektiren durumlarda çift el ya da yaka telsiz mikrofon setleri tercih edilirken; stüdyo kayıtlarında en ince detayları yakalayan 48V Phantom Power destekli kondenser mikrofonlar öne çıkar.`
  },
  'isik-sistemleri': {
    title: 'Sahne Işık Sistemleri, Robot Işıklar & Efekt Makineleri',
    lead: 'Konserler, düğün salonları, tiyatrolar ve gece kulüpleri için büyüleyici görsel atmosferler yaratan DMX kontrollü aydınlatma ekipmanları.',
    highlights: [
      'Hızlı pan/tilt hareketli Beam, Spot ve Wash robot kafalar (Moving Head)',
      'RGBW renk karışımlı yüksek lümenli LED Par ve sahne boyama ışıkları',
      'DMX ışık kontrol masaları, kablosuz DMX vericiler ve PC arayüzleri',
      'Sis, hazer, kar, köpük ve soğuk kıvılcım efekt makineleri'
    ],
    body: `Işık ve görsel efektler, ses ile senkronize olduğunda sahnenin enerjisini katlar. Düşük enerji tüketimli ve uzun ömürlü LED teknolojisi sayesinde sahne aydınlatmasında yeni bir dönem başlamıştır. Mekanınıza özel truss kurulumları ve DMX ışık projeleriniz için Sescim teknik ekibinden ücretsiz danışmanlık alabilirsiniz.`
  },
  'goruntu-sistemleri': {
    title: 'Profesyonel Projeksiyon ve LED Ekran Sistemleri',
    lead: 'Toplantı salonları, eğitim kurumları, ibadethaneler ve etkinlik alanları için yüksek parlaklıklı görüntüleme teknolojileri.',
    highlights: [
      'Yüksek ANSI lümenli lazer ve lamba projeksiyon cihazları',
      'Motorlu, uzaktan kumandalı ve storlu projeksiyon perdeleri',
      'Modüler iç ve dış mekan LED ekran panelleri ve video işlemcileri',
      '4K HDMI / fiber optik görüntü aktarıcılar ve switcher sistemleri'
    ],
    body: `Görsel sunumların başarısı, ortam ışığına uygun parlaklık (lümen) ve kontrast oranına sahip projeksiyon veya LED panellerin seçilmesine dayanır. Sescim, anahtar teslim görüntüleme çözümleriyle projenizin tüm donanım ihtiyaçlarını karşılar.`
  }
}

const DEFAULT_SEO_CONTENT: SeoContentItem = {
  title: 'Profesyonel Ses, Işık ve Müzik Ekipmanlarında Güvenilir Adres: Sescim',
  lead: 'Akdağ Elektronik\'in yarım asra yaklaşan sektör deneyimiyle kurulan Sescim.com, Türkiye\'nin en kapsamlı profesyonel ses, ışık ve görüntü ekipmanları e-ticaret platformudur.',
  highlights: [
    'Türkiye resmi distribütör garantili %100 orijinal ürünler',
    'Aynı gün hızlı kargo ve güvenli ambalajlama standartları',
    'Uzman ses mühendislerinden satış öncesi ve sonrası ücretsiz teknik destek',
    'Tüm kredi kartlarına peşin fiyatına taksit ve kurumsal fatura avantajı'
  ],
  body: `Sescim kataloğunda yer alan binlerce ürün; konser sahnelerinden stüdyolara, kamu kurumlarından eğlence mekanlarına kadar profesyonellerin en çok tercih ettiği markalardan oluşmaktadır. Dünyaca ünlü ses ve ışık teknolojilerini en uygun fiyat garantisiyle doğrudan kullanıcıya ulaştırıyoruz.`
}

export default function CategorySeoText({ categorySlug, categoryName }: Props) {
  const [expanded, setExpanded] = useState(false)

  // Find matching content by slug or parent slug
  let content = DEFAULT_SEO_CONTENT
  if (categorySlug) {
    if (SEO_CONTENT_MAP[categorySlug]) {
      content = SEO_CONTENT_MAP[categorySlug]
    } else {
      // Check partial match
      const matchedKey = Object.keys(SEO_CONTENT_MAP).find(k => categorySlug.includes(k))
      if (matchedKey) {
        content = SEO_CONTENT_MAP[matchedKey]
      }
    }
  }

  const title = categoryName ? `${categoryName} Fiyatları, Modelleri ve Satın Alma Rehberi` : content.title

  return (
    <section className="mt-14 border-t border-slate-200 pt-10 pb-6 font-body text-slate-700">
      <div className="bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200/80 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Dekoratif Işık Efekti */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2 text-brand-red font-display font-black text-xs tracking-widest uppercase mb-2">
          <Sparkles size={16} />
          <span>Sescim Alışveriş Rehberi &amp; Uzman Notu</span>
        </div>

        <h2 className="font-display font-black text-xl sm:text-2xl text-slate-900 mb-3 tracking-tight">
          {title}
        </h2>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4">
          {content.lead}
        </p>

        {/* Öne Çıkanlar Rozetleri */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4">
          {content.highlights.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 bg-white/80 border border-slate-200/60 rounded-lg p-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Genişleyen İçerik */}
        <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
          <div className="pt-3 border-t border-slate-200/60 text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3 whitespace-pre-line">
            <p>{content.body}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 font-medium">
              <ShieldCheck size={16} className="text-brand-red shrink-0" />
              <span>Sescim.com üzerinden verilen tüm siparişler orijinal ambalajında, seri numarası doğrulanmış ve Akdağ Elektronik distribütör güvencesiyle sevk edilmektedir.</span>
            </div>
          </div>
        </div>

        {/* Devamını Oku Butonu */}
        <div className="mt-4 pt-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider text-brand-red hover:text-red-700 transition-colors cursor-pointer"
          >
            <span>{expanded ? 'Daha Az Göster' : 'Devamını Oku ve Detayları Gör'}</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </section>
  )
}
