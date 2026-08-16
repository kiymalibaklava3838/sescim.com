// ─────────────────────────────────────────────
// sescim.com — Merkezi Kategori Tanımları
// 3 Seviyeli Hiyerarşi (Ana > Alt > 3. Seviye)
// ─────────────────────────────────────────────

export interface CategoryNode {
  name: string
  slug: string
  dbName?: string | string[]
  children?: CategoryNode[]
}

export const HIERARCHY_DATA: CategoryNode[] = [
  {
    name: 'Ses Sistemleri',
    slug: 'ses-sistemleri',
    dbName: ['Ses Sistemleri', 'Ses Sistemleri (Pro Audio)'],
    children: [
      {
        name: 'Mixer & Amfi',
        slug: 'mixer-amfi',
        children: [
          { name: 'Analog Mikserler', slug: 'analog-mikserler' },
          { name: 'Dijital Mikserler', slug: 'dijital-mikserler' },
          { name: 'Power Mikserler', slug: 'power-mikserler' },
          { name: 'Power Amfileri', slug: 'power-amfileri' },
          { name: 'Hat Trafolu Kurulum Amfileri', slug: 'hat-trafolu-kurulum-amfileri' },
        ],
      },
      {
        name: 'Hoparlörler',
        slug: 'hoparlorler',
        children: [
          { name: 'Taşınabilir Ses Sistemleri', slug: 'tasinabilir-ses-sistemleri' },
          { name: 'Aktif Hoparlörler', slug: 'aktif-hoparlorler' },
          { name: 'Pasif Hoparlörler', slug: 'pasif-hoparlorler' },
          { name: 'Line Array Sistemler', slug: 'line-array-sistemler' },
          { name: 'Subwooferlar', slug: 'subwooferlar' },
          { name: 'Tavan, Sütun ve Duvar Hoparlörleri', slug: 'tavan-sutun-duvar-hoparlorleri' },
        ],
      },
      {
        name: 'Mikrofon Sistemleri',
        slug: 'mikrofon-sistemleri',
        dbName: ['Mikrofon Sistemleri', 'Mikrofonlar'],
        children: [
          { name: 'Telsiz Mikrofonlar (El, Yaka, Kafa)', slug: 'telsiz-mikrofonlar', dbName: ['Telsiz Mikrofonlar (El, Yaka, Kafa)', 'Telsiz (Kablosuz) Mikrofonlar (El, Yaka, Kafa)', 'Kablosuz (Wireless) El/Yaka/Headset Takımları'] },
          { name: 'Kablolu Dinamik ve Condenser Mikrofonlar', slug: 'kablolu-mikrofonlar' },
          { name: 'Kürsü ve Konferans Sistemleri', slug: 'kursu-ve-konferans-sistemleri', dbName: ['Kürsü ve Konferans Sistemleri', 'Kürsü ve Konferans (Delege) Sistemleri', 'Kürsü ve Konferans Mikrofonları'] },
          { name: 'Enstrüman Mikrofonları', slug: 'enstruman-mikrofonlari' },
          { name: 'Stüdyo Kondenser Mikrofon', slug: 'studyo-kondenser-mikrofon' },
          { name: 'USB Mikrofon', slug: 'usb-mikrofon' },
        ],
      },
      {
        name: 'Sinyal İşleyiciler',
        slug: 'sinyal-isleyiciler',
        children: [
          { name: 'DSP Ses İşlemcileri', slug: 'dsp-ses-islemcileri' },
          { name: 'Crossover ve Equalizerlar', slug: 'crossover-ve-equalizerlar' },
          { name: 'Ses Dağıtıcılar (Splitter)', slug: 'ses-dagiticilar' },
        ],
      },
    ],
  },
  {
    name: 'Işık Sistemleri',
    slug: 'isik-sistemleri',
    dbName: ['Işık Sistemleri', 'Işık Sistemleri (Pro Lighting)'],
    children: [
      {
        name: 'Sahne Işıkları (Hareketli)',
        slug: 'sahne-isiklari-hareketli',
        children: [
          { name: 'Robot Işıklar (Moving Head - Beam, Spot, Wash)', slug: 'robot-isiklar' },
          { name: 'Scanner Sistemler', slug: 'scanner-sistemler' },
        ],
      },
      {
        name: 'Sahne Işıkları (Sabit)',
        slug: 'sahne-isiklari-sabit',
        children: [
          { name: 'LED Par ve Boyama Işıkları', slug: 'led-par-ve-boyama-isiklari' },
          { name: 'Profil, PC ve Tiyatro Spotları', slug: 'tiyatro-spotlari' },
          { name: 'Strobe ve Blinder Işıklar', slug: 'strobe-ve-blinder-isiklar' },
          { name: 'Lazer Sistemleri', slug: 'lazer-sistemleri' },
        ],
      },
      {
        name: 'Efekt Makineleri',
        slug: 'efekt-makineleri-ve-likitler',
        children: [
          { name: 'Sis, Duman ve Hazer Makineleri', slug: 'sis-ve-duman-makineleri' },
          { name: 'Kar, Köpük ve Baloncuk Makineleri', slug: 'kar-ve-kopuk-makineleri' },
          { name: 'Kıvılcım ve Alev Makineleri', slug: 'kivilcim-ve-alev-makineleri' },
          { name: 'Efekt Likitleri ve Tozları', slug: 'efekt-likitleri' },
        ],
      },
      {
        name: 'Işık Kontrol',
        slug: 'isik-kontrol',
        children: [
          { name: 'DMX Işık Masaları ve Konsollar', slug: 'dmx-isik-masalari' },
          { name: 'PC/USB DMX Yazılım ve Arayüzleri', slug: 'pc-dmx-yazilimlari' },
          { name: 'DMX Dağıtıcı ve Sinyal Güçlendiriciler', slug: 'dmx-splitterlar' },
        ],
      },
      {
        name: 'Mimari Aydınlatma',
        slug: 'mimari-aydinlatma',
        children: [
          { name: "Dış Mekan LED Par'lar", slug: 'dis-mekan-led-parlar' },
          { name: 'Wall Washerlar', slug: 'wall-washerlar' },
        ],
      },
    ],
  },
  {
    name: 'Görüntü Sistemleri',
    slug: 'goruntu-sistemleri',
    children: [
      {
        name: 'LED Ekran Sistemleri',
        slug: 'led-ekran-sistemleri',
        children: [
          { name: 'İç Mekan LED Paneller', slug: 'ic-mekan-led-paneller' },
          { name: 'Dış Mekan LED Paneller', slug: 'dis-mekan-led-paneller' },
          { name: 'LED Ekran İşlemcileri', slug: 'led-ekran-islemcileri' },
        ],
      },
      {
        name: 'Projeksiyon Sistemleri',
        slug: 'projeksiyon-sistemleri',
        children: [
          { name: 'Profesyonel Projeksiyon Cihazları', slug: 'profesyonel-projeksiyonlar' },
          { name: 'Motorlu Projeksiyon Perdeleri', slug: 'motorlu-projeksiyon-perdeleri' },
          { name: 'Stor ve Taşınabilir Perdeler', slug: 'tasinabilir-projeksiyon-perdeleri' },
        ],
      },
      {
        name: 'Görüntü Yönetimi',
        slug: 'goruntu-yonetimi',
        children: [
          { name: 'Video Mikserleri (Switcher)', slug: 'video-mikserleri' },
          { name: 'Görüntü Splitter ve Matrisler', slug: 'goruntu-splitterlar' },
          { name: 'Görüntü Çeviriciler (Converter)', slug: 'goruntu-ceviriciler' },
        ],
      },
    ],
  },
  {
    name: 'Kulaklık & Monitör',
    slug: 'kulaklik-ve-monitor',
    children: [
      {
        name: 'DJ & Stüdyo Kulaklıklar',
        slug: 'dj-studyo-kulakliklar',
        children: [
          { name: 'Over-Ear DJ Kulaklıklar', slug: 'over-ear-dj-kulakliklar' },
          { name: 'Stüdyo Referans Kulaklıklar', slug: 'studyo-referans-kulakliklar' },
          { name: 'Kablosuz Sahnesi Kulaklıklar', slug: 'kablosuz-sahne-kulakliklar' },
        ],
      },
      {
        name: 'In-Ear Monitor (IEM)',
        slug: 'in-ear-monitor',
        children: [
          { name: 'Kablolu IEM', slug: 'kablolu-iem' },
          { name: 'Kablosuz IEM Sistemleri', slug: 'kablosuz-iem-sistemleri' },
        ],
      },
      {
        name: 'Stüdyo Monitör Hoparlörler',
        slug: 'studyo-monitor-hoparlorler',
        children: [
          { name: 'Aktif Stüdyo Monitörler', slug: 'aktif-studyo-monitorler' },
          { name: 'Pasif Stüdyo Monitörler', slug: 'pasif-studyo-monitorler' },
        ],
      },
      {
        name: 'Kulaklık Amplifikatörleri',
        slug: 'kulaklik-amplifikatorleri',
        children: [
          { name: 'Stereo Kulaklık Amfileri', slug: 'stereo-kulaklik-amfileri' },
          { name: 'Çok Kanallı Kulaklık Dağıtıcılar', slug: 'kulaklik-dagiticilar' },
        ],
      },
    ],
  },
  {
    name: 'DJ Ekipmanları',
    slug: 'dj-ekipmanlari',
    children: [
      {
        name: 'DJ Controller & Mixer',
        slug: 'dj-controller-mixer',
        children: [
          { name: 'DJ Controller', slug: 'dj-controller' },
          { name: 'DJ Mixer', slug: 'dj-mixer' },
          { name: 'Scratch Turntable', slug: 'scratch-turntable' },
        ],
      },
      {
        name: 'Media Player & CDJ',
        slug: 'media-player-cdj',
        children: [
          { name: 'Profesyonel CDJ', slug: 'profesyonel-cdj' },
          { name: 'DJ Media Player', slug: 'dj-media-player' },
        ],
      },
      {
        name: 'DJ Aksesuarları',
        slug: 'dj-aksesuarlari',
        children: [
          { name: 'DJ Çantası ve Kılıfı', slug: 'dj-cantasi' },
          { name: 'DJ Stand ve Rack', slug: 'dj-stand-rack' },
          { name: 'Iğne ve Kartuş', slug: 'iğne-ve-kartus' },
        ],
      },
    ],
  },
  {
    name: 'Stüdyo Ekipmanları',
    slug: 'studyo-ekipmanlari',
    children: [
      {
        name: 'Audio Interface (Ses Kartı)',
        slug: 'audio-interface',
        children: [
          { name: '2 Kanal Ses Kartı', slug: '2-kanal-ses-karti' },
          { name: 'Çok Kanallı Ses Kartı', slug: 'cok-kanalli-ses-karti' },
          { name: 'USB Ses Kartı', slug: 'usb-ses-karti' },
        ],
      },
      {
        name: 'Stüdyo Mikrofon Paketleri',
        slug: 'studyo-mikrofon-paketleri',
        children: [
          { name: 'Condenser Mikrofon Seti', slug: 'condenser-mikrofon-seti' },
          { name: 'Vokal Kayıt Paketi', slug: 'vokal-kayit-paketi' },
          { name: 'Podcast & Yayın Seti', slug: 'podcast-yayin-seti' },
        ],
      },
      {
        name: 'Akustik & Ses Yalıtım',
        slug: 'akustik-ses-yalitim',
        children: [
          { name: 'Akustik Panel', slug: 'akustik-panel' },
          { name: 'Köpük Sünger (Akustik Sünger)', slug: 'akustik-sunger' },
          { name: 'Ses Yalıtım Malzemeleri', slug: 'ses-yalitim-malzemeleri' },
        ],
      },
    ],
  },

  {
    name: 'Sahne ve Truss',
    slug: 'sahne-ve-truss',
    dbName: ['Sahne ve Truss', 'Sahne ve Truss (Truss & Rigging)'],
    children: [
      {
        name: 'Truss Sistemleri',
        slug: 'truss-sistemleri',
        children: [
          { name: 'Kare Trusslar', slug: 'kare-trusslar' },
          { name: 'Üçgen Trusslar', slug: 'ucgen-trusslar' },
          { name: 'Dairesel Trusslar', slug: 'dairesel-trusslar' },
          { name: 'Köşe Bağlantıları ve Uzatmalar', slug: 'truss-baglanti-aparatlari' },
        ],
      },
      {
        name: 'Sahne ve Podyum',
        slug: 'sahne-ve-podyum',
        children: [
          { name: 'Modüler Sahne Platformları', slug: 'moduler-sahne-platformlari' },
          { name: 'Sahne Ayakları', slug: 'sahne-ayaklari' },
          { name: 'Sahne Merdivenleri', slug: 'sahne-merdivenleri' },
        ],
      },
      {
        name: 'Rigging Sistemleri',
        slug: 'kaldirma-sistemleri',
        dbName: ['Rigging Sistemleri', 'Kaldırma Sistemleri (Rigging)'],
        children: [
          { name: 'Manuel Zincirli Vinçler', slug: 'manuel-vincler' },
          { name: 'Elektrikli Vinç Motorları', slug: 'elektrikli-vincler' },
          { name: 'Kule (Lifter) Sistemleri', slug: 'kule-lifterlar' },
          { name: 'Rigging Bağlantı Ekipmanları', slug: 'rigging-baglanti-ekipmanlari' },
        ],
      },
    ],
  },
  {
    name: 'Kablo, Stand ve Aksesuar',
    slug: 'kablo-stand-ve-aksesuar',
    dbName: ['Kablo, Stand ve Aksesuar', 'Kablo, Stand ve Aksesuar (Accessories & Cables)'],
    children: [
      {
        name: 'Kablolar',
        slug: 'kablolar',
        children: [
          { name: 'Ses Kabloları (Mikrofon, Enstrüman, Hoparlör)', slug: 'ses-kablolari' },
          { name: 'DMX Işık Kabloları', slug: 'dmx-isik-kablolari' },
          { name: 'Görüntü Kabloları (HDMI, SDI, VGA)', slug: 'goruntu-kablolari' },
          { name: 'Multicore (Yılan) Kablolar', slug: 'multicore-kablolar' },
        ],
      },
      {
        name: 'Konnektörler ve Adaptörler',
        slug: 'konnektorler-ve-adaptorler',
        children: [
          { name: 'XLR, Speakon ve Çivi Jaklar', slug: 'xlr-ve-speakon-konnektorler' },
          { name: 'Powercon Fişler', slug: 'powercon-konnektorler' },
          { name: 'Çevirici Adaptör Jaklar', slug: 'cevirici-adaptorler' },
        ],
      },
      {
        name: 'Standlar ve Sehpalar',
        slug: 'standlar-ve-sehpalar',
        children: [
          { name: 'Hoparlör Standları', slug: 'hoparlor-standlari' },
          { name: 'Mikrofon Standları', slug: 'mikrofon-standlari' },
          { name: 'Işık Standları ve T-Barlar', slug: 'isik-standlari' },
          { name: 'Nota ve Enstrüman Standları', slug: 'nota-ve-enstruman-standlari' },
        ],
      },
    ],
  },
  {
    name: 'Taşıma ve Altyapı',
    slug: 'tasima-ve-altyapi',
    dbName: ['Taşıma ve Altyapı', 'Taşıma ve Altyapı (Cases & Power)'],
    children: [
      {
        name: 'Taşıma Çantaları (Hard Case & Bag)',
        slug: 'tasima-cantalari',
        children: [
          { name: 'Rack Kabinler (Standart 19")', slug: 'rack-kabinler' },
          { name: 'Mikser ve Işık Masası Caseleri', slug: 'mikser-ve-isik-masasi-caseleri' },
          { name: 'Trunk Case (Kablo Sandığı)', slug: 'trunk-caseler' },
          { name: 'Soft Case Taşıma Çantaları', slug: 'soft-case-cantalar' },
        ],
      },
      {
        name: 'Enerji ve Güç Dağıtımı',
        slug: 'enerji-ve-guc-dagitimi',
        children: [
          { name: 'Sahne Tipi Güç Dağıtım Panoları', slug: 'power-boxlar' },
          { name: 'Rack Tipi Grup Prizler', slug: 'rack-tipi-prizler' },
          { name: 'Sanayi Tipi Fiş ve Kauçuk Uzatmalar', slug: 'sanayi-tipi-fislere-prizler' },
        ],
      },
    ],
  },
]

export const NEW_KATEGORI_HIYERARSI = HIERARCHY_DATA

export const KATEGORI_HIYERARSI = HIERARCHY_DATA.map(ana => ({
  label: ana.name,
  labelEn: ana.slug,
  altKategoriler: ana.children?.map(alt => ({
    label: alt.name,
    detaylar: alt.children?.map(d => d.name) || []
  })) || []
}))

export const KATEGORILER: string[] = KATEGORI_HIYERARSI.map((k) => k.label)
export const TUM_KATEGORILER: string[] = ['Tümü', ...KATEGORILER]

export function getAltKategoriler(anaKategori: string): string[] {
  const ana = KATEGORI_HIYERARSI.find((k) => k.label === anaKategori)
  return ana ? ana.altKategoriler.map((a) => a.label) : []
}

export function tumAltKategoriler(): string[] {
  return KATEGORI_HIYERARSI.flatMap((k) => k.altKategoriler.map((a) => a.label))
}

export function getDetayKategoriler(anaKategori: string, altKategori: string): string[] {
  const ana = KATEGORI_HIYERARSI.find((k) => k.label === anaKategori)
  if (!ana) return []
  const alt = ana.altKategoriler.find((a) => a.label === altKategori)
  return alt ? alt.detaylar : []
}

export function findCategoryBySlug(slugs: string[]) {
  let current: CategoryNode | undefined = undefined
  let list = HIERARCHY_DATA

  for (const slug of slugs) {
    current = list.find(n => n.slug === slug)
    if (!current) return null
    list = current.children || []
  }
  return current
}

export function getBreadcrumbs(ana?: string | null, alt?: string | null, detay?: string | null) {
  const crumbs = [{ name: 'Ürünler', href: '/urunler' }]
  if (!ana) return crumbs

  const anaNode = HIERARCHY_DATA.find(n => n.name === ana)
  if (anaNode) {
    crumbs.push({ name: anaNode.name, href: `/urunler/${anaNode.slug}` })
    if (alt && anaNode.children) {
      const altNode = anaNode.children.find(n => n.name === alt)
      if (altNode) {
        crumbs.push({ name: altNode.name, href: `/urunler/${anaNode.slug}/${altNode.slug}` })
        if (detay && altNode.children) {
          const detayNode = altNode.children.find(n => n.name === detay)
          if (detayNode) {
            crumbs.push({ name: detayNode.name, href: `/urunler/${anaNode.slug}/${altNode.slug}/${detayNode.slug}` })
          }
        }
      }
    }
  }
  return crumbs
}
