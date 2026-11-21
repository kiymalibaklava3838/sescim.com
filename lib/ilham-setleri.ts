import { unstable_cache } from 'next/cache'
import { isQuoteOnlyProduct } from './distributor-rules'
import { resolveStock } from './product-stock'
import { LIGHT_PRODUCT_FIELDS } from './product-queries'

export interface InspirationSetProduct {
  id: string
  slug?: string
  ad: string
  kategori: string
  marka?: string | null
  fotograflar: string[]
  fiyat?: number
  indirimli_fiyat?: number | null
  para_birimi?: string
  sescim_fiyat?: number | null
  sescim_indirimli_fiyat?: number | null
  sescim_indirimli_fiyat_pb?: string | null
  stok_durumu?: string
  stok_adedi?: number | null
  kritik_stok?: number | null
  sescim_stok?: number | null
  sescim_stok_durumu?: string | null
  fiyat_sorunuz?: boolean
}

export interface InspirationSet {
  id: string
  baslik: string
  alt_yazi: string | null
  aciklama?: string | null
  rozet?: string | null
  resim_url: string
  link: string
  aktif: boolean
  sira: number
  urun_idler?: string[]
  products?: InspirationSetProduct[]
  created_at?: string
}

export interface PackedInspirationMeta {
  subtitle: string
  description: string
  badge: string
  product_ids: string[]
}

/**
 * `bannerlar.alt_yazi` kolonunda hem eski düz metin ("Mikrofon + Kulaklık")
 * hem de yeni JSON paketli veri yapısını geriye dönük %100 uyumlu olarak çözümler.
 */
export function parseInspirationSetMeta(rawAltYazi: string | null | undefined): PackedInspirationMeta {
  if (!rawAltYazi) {
    return {
      subtitle: '',
      description: '',
      badge: 'HAZIR SET',
      product_ids: [],
    }
  }

  const trimmed = rawAltYazi.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') {
        return {
          subtitle: typeof parsed.subtitle === 'string' ? parsed.subtitle : '',
          description: typeof parsed.description === 'string' ? parsed.description : '',
          badge: typeof parsed.badge === 'string' && parsed.badge.trim() ? parsed.badge.trim() : 'HAZIR SET',
          product_ids: Array.isArray(parsed.product_ids)
            ? parsed.product_ids.filter((id: any) => typeof id === 'string' && id.trim().length > 0)
            : [],
        }
      }
    } catch {
      // JSON parse başarısız olursa düz metin olarak devam et
    }
  }

  return {
    subtitle: rawAltYazi,
    description: '',
    badge: 'HAZIR SET',
    product_ids: [],
  }
}

/**
 * Admin panelinden kaydederken alt yazı, açıklama, rozet ve seçili ürün ID listesini
 * mevcut `bannerlar.alt_yazi` kolonuna güvenli JSON olarak paketler.
 */
export function packInspirationSetMeta(meta: {
  subtitle: string
  description?: string
  badge?: string
  product_ids?: string[]
}): string {
  return JSON.stringify({
    subtitle: (meta.subtitle || '').trim(),
    description: (meta.description || '').trim(),
    badge: (meta.badge || 'HAZIR SET').trim(),
    product_ids: Array.isArray(meta.product_ids) ? meta.product_ids.filter(Boolean) : [],
  })
}

// Varsayılan İlham Setleri (Veritabanında henüz set yoksa ilk açılışta zengin görünüm sağlar)
export const DEFAULT_INSPIRATION_SETS: InspirationSet[] = [
  {
    id: 'default-1',
    baslik: "🎙️ Podcast'e Başla",
    alt_yazi: 'Mikrofon + Masa Kolu + Kulaklık + Ses Kartı',
    aciklama: 'Yayıncı kalitesinde temiz vokal kaydı, sıfır gecikmeli kulaklık takibi ve ergonomik masa kurulumu için ses uzmanlarımızca eşleştirilmiş eksiksiz podcast başlangıç paketi.',
    rozet: 'PODCAST PAKETİ',
    resim_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=800',
    link: '/urunler/studyo-ekipmanlari',
    aktif: true,
    sira: 1,
    urun_idler: [],
  },
  {
    id: 'default-2',
    baslik: '🎚️ Ev Stüdyonu Kur',
    alt_yazi: 'Referans Monitörü + Ses Kartı + Kondenser Mikrofon',
    aciklama: 'Ev ortamında profesyonel müzik prodüksiyonu, vokal/enstrüman kaydı ve doğru frekans duyumu için birbiriyle tam uyumlu ev stüdyosu kurulum seti.',
    rozet: 'STÜDYO ÇÖZÜMÜ',
    resim_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800',
    link: '/urunler/studyo-ekipmanlari',
    aktif: true,
    sira: 2,
    urun_idler: [],
  },
  {
    id: 'default-3',
    baslik: '🎧 Referans Sistemini Kur',
    alt_yazi: 'Stüdyo Monitörü + Monitör Kulaklığı + Bağlantı Ekipmanı',
    aciklama: 'Mix ve mastering aşamasında en ince detayları duymanızı sağlayacak düz frekans tepkili stüdyo referans dinleme kombinasyonu.',
    rozet: 'PRO DİNLEME',
    resim_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800',
    link: '/urunler/kulaklik-monitor',
    aktif: true,
    sira: 3,
    urun_idler: [],
  },
  {
    id: 'default-4',
    baslik: '🎤 Sahneye Çık',
    alt_yazi: 'Kablosuz El Mikrofonu + Mikser + Aktif Kule Hoparlör',
    aciklama: 'Canlı müzik, akustik performans ve etkinlikler için yüksek ses basınç seviyesine (SPL) sahip, tak-çalıştır profesyonel sahne ses sistemi.',
    rozet: 'CANLI PERFORMANS',
    resim_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800',
    link: '/urunler/ses-sistemleri',
    aktif: true,
    sira: 4,
    urun_idler: [],
  },
  {
    id: 'default-5',
    baslik: '🎛️ DJ Performans Seti',
    alt_yazi: 'DJ Ekipmanı + Profesyonel DJ Kulaklığı + Aktif Monitör',
    aciklama: 'Kulüp, parti ve etkinlik performanslarında yüksek izolasyonlu cue dinleme ve güçlü bas tepkisi sunan eksiksiz DJ performans paketi.',
    rozet: 'DJ SETUP',
    resim_url: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?q=80&w=800',
    link: '/urunler/dj-ekipmanlari',
    aktif: true,
    sira: 5,
    urun_idler: [],
  },
  {
    id: 'default-6',
    baslik: '🏛️ Konferans & Toplantı',
    alt_yazi: 'Kürsü / Telsiz Mikrofon + Amplifikatör + Hoparlör',
    aciklama: 'Toplantı salonları, konferans alanları, eğitim kurumları ve kurumsal sunumlar için net konuşma anlaşılabilirliği sağlayan kurumsal ses paketi.',
    rozet: 'KURUMSAL SET',
    resim_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800',
    link: '/urunler/ses-sistemleri',
    aktif: true,
    sira: 6,
    urun_idler: [],
  }
]

/**
 * Bir set için henüz manuel ürün seçilmemişse, katalogdaki gerçek, stokta olan ve fiyatı belli
 * ürünlerden setin temasına (Podcast, Stüdyo, Sahne, DJ, Konferans vb.) uygun 3 tamamlayıcı ürün seçer.
 */
function autoMatchProductsForSet(
  set: InspirationSet,
  pool: InspirationSetProduct[],
  globalUsedIds: Set<string>
): InspirationSetProduct[] {
  if (!pool || pool.length === 0) return []

  const text = `${set.baslik} ${set.alt_yazi || ''} ${set.link || ''}`.toLowerCase()

  // Yardımcı: Belirli anahtar kelimelere uyan ilk uygun ürünü bul
  const pickOne = (
    keywords: string[],
    selectedInThisSet: Set<string>,
    preferUnusedGlobally = true
  ): InspirationSetProduct | null => {
    const matchesKeyword = (p: InspirationSetProduct) => {
      const hay = `${p.ad} ${p.kategori || ''}`.toLowerCase()
      return keywords.some(kw => hay.includes(kw))
    }

    if (preferUnusedGlobally) {
      const fresh = pool.find(
        p => !selectedInThisSet.has(p.id) && !globalUsedIds.has(p.id) && matchesKeyword(p)
      )
      if (fresh) return fresh
    }

    return pool.find(p => !selectedInThisSet.has(p.id) && matchesKeyword(p)) || null
  }

  // Tema bazlı 3'lü ekipman reçeteleri
  let slots: string[][] = [
    ['mikrofon'],
    ['hoparlör', 'kabin', 'monitör'],
    ['mikser', 'amfi', 'kulaklık'],
  ]

  if (text.includes('podcast')) {
    slots = [
      ['kondenser', 'usb mikrofon', 'podcast', 'vokal mikrofon', 'mikrofon'],
      ['kulaklık'],
      ['ses kartı', 'mikser', 'kablo', 'stand', 'sehpa'],
    ]
  } else if (text.includes('stüdyo') || text.includes('studyo')) {
    slots = [
      ['kondenser', 'stüdyo mikrofon', 'mikrofon'],
      ['ses kartı', 'mikser', 'referans', 'monitör'],
      ['kulaklık', 'kablo'],
    ]
  } else if (text.includes('referans') || text.includes('kulaklik-monitor')) {
    slots = [
      ['kulaklık'],
      ['monitör', 'hoparlör', 'aktif'],
      ['kablo', 'ses kartı', 'mikser'],
    ]
  } else if (text.includes('dj')) {
    slots = [
      ['dj', 'kontrol', 'mikser', 'pikap'],
      ['kulaklık'],
      ['aktif', 'hoparlör', 'kabin', 'monitör', 'ışık', 'lazer', 'par'],
    ]
  } else if (text.includes('konferans') || text.includes('toplantı')) {
    slots = [
      ['kürsü', 'yaka', 'telsiz', 'kablosuz', 'mikrofon'],
      ['amfi', 'amplifikatör', 'mikser', 'hat trafolu'],
      ['tavan', 'duvar', 'sütun', 'hoparlör'],
    ]
  } else if (text.includes('sahne')) {
    slots = [
      ['telsiz', 'kablosuz', 'el mikrofon', 'mikrofon'],
      ['mikser', 'power mikser'],
      ['aktif', 'kule', 'kabin', 'hoparlör'],
    ]
  }

  const chosen: InspirationSetProduct[] = []
  const chosenIds = new Set<string>()

  for (const slotKeywords of slots) {
    const item = pickOne(slotKeywords, chosenIds, true)
    if (item) {
      chosen.push(item)
      chosenIds.add(item.id)
      globalUsedIds.add(item.id)
    }
  }

  // Eğer 3 ürüne tamamlanmadıysa havuzdan genel uygun ürünlerle tamamla
  for (const p of pool) {
    if (chosen.length >= 3) break
    if (!chosenIds.has(p.id) && !globalUsedIds.has(p.id)) {
      chosen.push(p)
      chosenIds.add(p.id)
      globalUsedIds.add(p.id)
    }
  }

  return chosen
}

export const getActiveInspirationSets = unstable_cache(
  async (): Promise<InspirationSet[]> => {
    try {
      const { createServerSupabaseClient } = await import('./supabase-server')
      const supabase = await createServerSupabaseClient()
      const { createAkdagServerClient } = await import('./supabase-akdag')
      const { getSescimPricingMap } = await import('./sescim-pricing')
      const akdagSupabase = await createAkdagServerClient()

      let rawSets: InspirationSet[] = DEFAULT_INSPIRATION_SETS

      if (supabase) {
        const { data, error } = await supabase
          .from('bannerlar')
          .select('id, baslik, alt_yazi, resim_url, link, aktif, sira, created_at')
          .eq('aktif', true)
          .order('sira', { ascending: true })
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          rawSets = data as InspirationSet[]
        }
      }

      // 1. Her setin JSON veya düz metin alt_yazi meta verisini çözümle
      const parsedSets: InspirationSet[] = rawSets.map((s, idx) => {
        const meta = parseInspirationSetMeta(s.alt_yazi)
        const defaultMatch = DEFAULT_INSPIRATION_SETS[idx]
        return {
          ...s,
          alt_yazi: meta.subtitle || s.alt_yazi || '',
          aciklama: s.aciklama || meta.description || defaultMatch?.aciklama || 'Uzmanlarımız tarafından birbiriyle tam uyumlu çalışacak şekilde seçilmiş hazır ekipman paketi.',
          rozet: s.rozet || meta.badge || defaultMatch?.rozet || 'HAZIR SET',
          urun_idler: s.urun_idler && s.urun_idler.length > 0 ? s.urun_idler : meta.product_ids,
        }
      })

      // 2. Manuel seçilmiş tüm ürün ID'lerini topla
      const explicitIds = Array.from(
        new Set(parsedSets.flatMap(s => s.urun_idler || []).filter(Boolean))
      )

      const needAutoMatch = parsedSets.some(s => !s.urun_idler || s.urun_idler.length === 0)

      // 3. Katalogdan hem manuel ürünleri hem de (gerekiyorsa) otomatik eşleştirme havuzunu çek
      const [explicitAkdagRes, explicitSescimRes, poolRes] = await Promise.all([
        explicitIds.length > 0
          ? akdagSupabase.from('urunler').select(LIGHT_PRODUCT_FIELDS).in('id', explicitIds)
          : Promise.resolve({ data: [] }),
        explicitIds.length > 0 && supabase
          ? supabase
              .from('urunler')
              .select('id, slug, ad, kategori:kategori_id, fotograflar, fiyat, indirimli_fiyat, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif')
              .in('id', explicitIds)
          : Promise.resolve({ data: [] }),
        needAutoMatch
          ? akdagSupabase
              .from('urunler')
              .select(LIGHT_PRODUCT_FIELDS)
              .gt('fiyat', 0)
              .neq('stok_durumu', 'tukendi')
              .order('is_featured', { ascending: false })
              .limit(180)
          : Promise.resolve({ data: [] }),
      ])

      const allRawProductsMap = new Map<string, any>()
      for (const p of (poolRes.data || []) as any[]) {
        if (p?.id) allRawProductsMap.set(p.id, p)
      }
      for (const p of (explicitAkdagRes.data || []) as any[]) {
        if (p?.id) allRawProductsMap.set(p.id, p)
      }
      for (const p of (explicitSescimRes.data || []) as any[]) {
        if (p?.id && !allRawProductsMap.has(p.id)) {
          allRawProductsMap.set(p.id, p)
        }
      }

      const allIds = Array.from(allRawProductsMap.keys())
      const pricingMap = allIds.length > 0 ? await getSescimPricingMap(allIds) : new Map()

      // 4. Sescim fiyat, flaş indirim ve stok kurallarını birleştir
      const enrichedMap = new Map<string, InspirationSetProduct>()
      allRawProductsMap.forEach((p, id) => {
        const pricing = pricingMap.get(id)
        const sescimAktif = pricing ? pricing.sescim_aktif !== false : p.sescim_aktif !== false
        if (!sescimAktif) return

        const quoteOnly = isQuoteOnlyProduct({
          marka: p.marka,
          ad: p.ad,
          fiyat_sorunuz: pricing ? pricing.fiyat_sorunuz : p.fiyat_sorunuz,
        })

        enrichedMap.set(id, {
          id: p.id,
          slug: p.slug,
          ad: p.ad,
          kategori: p.kategori || 'Ses Ekipmanı',
          marka: p.marka || null,
          fotograflar: Array.isArray(p.fotograflar) ? p.fotograflar : [],
          fiyat: p.fiyat,
          indirimli_fiyat: p.indirimli_fiyat ?? null,
          para_birimi: p.para_birimi || 'TRY',
          sescim_fiyat: pricing?.sescim_fiyat ?? p.sescim_fiyat ?? null,
          sescim_indirimli_fiyat: pricing?.sescim_indirimli_fiyat ?? p.sescim_indirimli_fiyat ?? null,
          sescim_indirimli_fiyat_pb: pricing?.sescim_indirimli_fiyat_pb ?? null,
          stok_durumu: p.stok_durumu,
          stok_adedi: p.stok_adedi,
          kritik_stok: p.kritik_stok,
          sescim_stok: pricing?.sescim_stok ?? null,
          sescim_stok_durumu: pricing?.sescim_stok_durumu ?? null,
          fiyat_sorunuz: quoteOnly,
        })
      })

      // Otomatik eşleştirme için sadece stokta olan, fotoğrafı ve fiyatı bulunan ürünleri filtrele
      const validPool = Array.from(enrichedMap.values()).filter(p => {
        if (p.fiyat_sorunuz) return false
        const basePrice = p.sescim_fiyat ?? p.fiyat ?? 0
        if (!basePrice || basePrice <= 0) return false
        if (!p.fotograflar || p.fotograflar.length === 0) return false
        const st = resolveStock({
          stok_durumu: p.stok_durumu,
          stok_adedi: p.stok_adedi,
          kritik_stok: p.kritik_stok,
          sescim_stok: p.sescim_stok,
          sescim_stok_durumu: p.sescim_stok_durumu,
        })
        return st.canOrder && !st.isTukendi
      })

      const globalUsedIds = new Set<string>(explicitIds)

      // 5. Her sete ürünlerini ata
      return parsedSets.map(set => {
        let setProducts: InspirationSetProduct[] = []

        if (set.urun_idler && set.urun_idler.length > 0) {
          setProducts = set.urun_idler
            .map(id => enrichedMap.get(id))
            .filter((p): p is InspirationSetProduct => Boolean(p))
        }

        if (setProducts.length === 0 && validPool.length > 0) {
          setProducts = autoMatchProductsForSet(set, validPool, globalUsedIds)
        }

        return {
          ...set,
          products: setProducts,
        }
      })
    } catch (err) {
      console.error('Failed to get inspiration sets:', err)
      return DEFAULT_INSPIRATION_SETS
    }
  },
  ['active-inspiration-sets-v2'],
  { revalidate: 1800, tags: ['inspiration_sets', 'products'] }
)
