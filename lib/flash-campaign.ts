import { createClient } from '@supabase/supabase-js'

export type CampaignType = 'sescim_haftasi' | 'ozel'

export type BadgeColorKey =
  | 'black'
  | 'red'
  | 'orange'
  | 'purple'
  | 'emerald'
  | 'blue'
  | 'gold'

export type BadgeIconKey = 'zap' | 'flame' | 'tag' | 'sparkles' | 'percent' | 'gift' | 'none'

export interface FlashCampaignMeta {
  kampanya_tipi: CampaignType
  kampanya_adi: string
  kampanya_slug: string
  rozet_metni: string
  rozet_rengi: BadgeColorKey
  rozet_ikonu: BadgeIconKey
  yuzde_goster: boolean
  urun_sayfasinda_sayac: boolean
  vurgu_metni?: string
}

export function slugifyCampaign(input: string): string {
  const trMap: Record<string, string> = {
    ç: 'c', Ç: 'c',
    ğ: 'g', Ğ: 'g',
    ı: 'i', İ: 'i', I: 'i',
    ö: 'o', Ö: 'o',
    ş: 's', Ş: 's',
    ü: 'u', Ü: 'u',
  }
  const replaced = (input || '')
    .split('')
    .map((ch) => trMap[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return replaced || 'ozel-kampanya'
}

export const DEFAULT_SESCIM_HAFTASI_META: FlashCampaignMeta = {
  kampanya_tipi: 'sescim_haftasi',
  kampanya_adi: 'Sescim Haftası',
  kampanya_slug: 'sescim-haftasi',
  rozet_metni: 'SESCİM HAFTASI',
  rozet_rengi: 'red',
  rozet_ikonu: 'zap',
  yuzde_goster: true,
  urun_sayfasinda_sayac: true,
  vurgu_metni: "Her Cuma 20.00'da yenilenen haftalık özel fırsat",
}

export interface CampaignPreset {
  key: string
  label: string
  meta: Omit<FlashCampaignMeta, 'kampanya_tipi' | 'kampanya_slug'>
}

export const CUSTOM_CAMPAIGN_PRESETS: CampaignPreset[] = [
  {
    key: 'kara_cuma',
    label: 'Kara Cuma',
    meta: {
      kampanya_adi: 'Kara Cuma',
      rozet_metni: 'KARA CUMA',
      rozet_rengi: 'black',
      rozet_ikonu: 'flame',
      yuzde_goster: true,
      urun_sayfasinda_sayac: true,
      vurgu_metni: "Kara Cuma'ya özel sınırlı stoklu büyük indirim!",
    },
  },
  {
    key: 'yilbasi',
    label: 'Yılbaşı Özel',
    meta: {
      kampanya_adi: 'Yılbaşı İndirimi',
      rozet_metni: 'YILBAŞI ÖZEL',
      rozet_rengi: 'red',
      rozet_ikonu: 'gift',
      yuzde_goster: true,
      urun_sayfasinda_sayac: true,
      vurgu_metni: 'Yılbaşına özel avantajlı fiyat fırsatı!',
    },
  },
  {
    key: 'sezon',
    label: 'Sezon Fırsatı',
    meta: {
      kampanya_adi: 'Sezon İndirimi',
      rozet_metni: 'SEZON FIRSATI',
      rozet_rengi: 'purple',
      rozet_ikonu: 'tag',
      yuzde_goster: true,
      urun_sayfasinda_sayac: false,
      vurgu_metni: 'Sezona özel seçili ürünlerde indirim!',
    },
  },
  {
    key: 'super_fiyat',
    label: 'Süper Fiyat',
    meta: {
      kampanya_adi: 'Süper Fiyat',
      rozet_metni: 'SÜPER FİYAT',
      rozet_rengi: 'emerald',
      rozet_ikonu: 'zap',
      yuzde_goster: true,
      urun_sayfasinda_sayac: false,
      vurgu_metni: 'Kaçırılmayacak özel internet fiyatı!',
    },
  },
  {
    key: 'ozel_gun',
    label: 'Özel Gün',
    meta: {
      kampanya_adi: 'Özel Gün Kampanyası',
      rozet_metni: 'ÖZEL KAMPANYA',
      rozet_rengi: 'gold',
      rozet_ikonu: 'sparkles',
      yuzde_goster: true,
      urun_sayfasinda_sayac: true,
      vurgu_metni: 'Sınırlı süreye özel kampanya fiyatı!',
    },
  },
]

export const BADGE_COLOR_THEMES: Record<
  BadgeColorKey,
  {
    label: string
    pillClass: string
    bannerBg: string
    bannerBorder: string
    bannerText: string
    swatchClass: string
  }
> = {
  black: {
    label: 'Kara Cuma (Siyah)',
    pillClass: 'bg-slate-950 text-amber-300 border border-amber-400/50',
    bannerBg: 'bg-slate-950 text-white',
    bannerBorder: 'border-amber-400/40',
    bannerText: 'text-amber-300',
    swatchClass: 'bg-slate-950 ring-amber-400',
  },
  red: {
    label: 'Sescim Kırmızı',
    pillClass: 'bg-brand-red text-white border border-red-400/40',
    bannerBg: 'bg-red-50 text-slate-900',
    bannerBorder: 'border-red-200',
    bannerText: 'text-brand-red',
    swatchClass: 'bg-brand-red ring-red-300',
  },
  orange: {
    label: 'Alev Turuncu',
    pillClass: 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border border-orange-300/40',
    bannerBg: 'bg-orange-50 text-slate-900',
    bannerBorder: 'border-orange-200',
    bannerText: 'text-orange-700',
    swatchClass: 'bg-orange-500 ring-orange-300',
  },
  purple: {
    label: 'VIP Mor',
    pillClass: 'bg-purple-700 text-white border border-purple-400/40',
    bannerBg: 'bg-purple-50 text-slate-900',
    bannerBorder: 'border-purple-200',
    bannerText: 'text-purple-700',
    swatchClass: 'bg-purple-700 ring-purple-300',
  },
  emerald: {
    label: 'Süper Yeşil',
    pillClass: 'bg-emerald-600 text-white border border-emerald-400/40',
    bannerBg: 'bg-emerald-50 text-slate-900',
    bannerBorder: 'border-emerald-200',
    bannerText: 'text-emerald-700',
    swatchClass: 'bg-emerald-600 ring-emerald-300',
  },
  blue: {
    label: 'Kış Mavi',
    pillClass: 'bg-blue-600 text-white border border-blue-400/40',
    bannerBg: 'bg-blue-50 text-slate-900',
    bannerBorder: 'border-blue-200',
    bannerText: 'text-blue-700',
    swatchClass: 'bg-blue-600 ring-blue-300',
  },
  gold: {
    label: 'Altın Sarısı',
    pillClass: 'bg-amber-400 text-slate-950 border border-amber-500/60',
    bannerBg: 'bg-amber-50 text-slate-900',
    bannerBorder: 'border-amber-200',
    bannerText: 'text-amber-800',
    swatchClass: 'bg-amber-400 ring-amber-300',
  },
}

const BUCKET = 'kampanya-gorselleri'
const META_PATH = 'config/flas-kampanyalar.json'

export type FlashCampaignMetaMap = Record<string, FlashCampaignMeta>

export function normalizeFlashMeta(raw?: Partial<FlashCampaignMeta> | null): FlashCampaignMeta {
  if (!raw || raw.kampanya_tipi !== 'ozel') {
    return { ...DEFAULT_SESCIM_HAFTASI_META }
  }
  const color: BadgeColorKey =
    raw.rozet_rengi && raw.rozet_rengi in BADGE_COLOR_THEMES ? raw.rozet_rengi : 'black'
  const validIcons: BadgeIconKey[] = ['zap', 'flame', 'tag', 'sparkles', 'percent', 'gift', 'none']
  const icon: BadgeIconKey =
    raw.rozet_ikonu && validIcons.includes(raw.rozet_ikonu) ? raw.rozet_ikonu : 'flame'

  const kampanyaAdi = (raw.kampanya_adi || 'Özel Kampanya').trim().slice(0, 60)
  const kampanyaSlug = slugifyCampaign(raw.kampanya_slug || kampanyaAdi)

  return {
    kampanya_tipi: 'ozel',
    kampanya_adi: kampanyaAdi,
    kampanya_slug: kampanyaSlug,
    rozet_metni: (raw.rozet_metni || kampanyaAdi || 'ÖZEL FIRSAT').trim().slice(0, 28),
    rozet_rengi: color,
    rozet_ikonu: icon,
    yuzde_goster: raw.yuzde_goster !== false,
    urun_sayfasinda_sayac: raw.urun_sayfasinda_sayac !== false,
    vurgu_metni: (raw.vurgu_metni || '').trim().slice(0, 140),
  }
}

function getAdminStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function fetchFreshFlashMetaMap(): Promise<FlashCampaignMetaMap> {
  // Sunucu tarafında service role varsa doğrudan Storage download ile Cloudflare CDN önbelleğini atla
  const admin = getAdminStorageClient()
  if (admin) {
    try {
      const { data, error } = await admin.storage.from(BUCKET).download(META_PATH)
      if (!error && data) {
        const text = await data.text()
        const json = JSON.parse(text)
        if (json && typeof json === 'object') return json as FlashCampaignMetaMap
      }
    } catch {}
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) return {}

  try {
    const url = `${baseUrl}/storage/v1/object/public/${BUCKET}/${META_PATH}?t=${Date.now()}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return {}
    const json = await res.json()
    if (!json || typeof json !== 'object') return {}
    return json as FlashCampaignMetaMap
  } catch {
    return {}
  }
}

/**
 * Tüm flaş indirimlerin kampanya metadata haritasını okur.
 * `noCache: true` olduğunda doğrudan güncel veriyi çeker; aksi halde Next.js
 * `flash-meta` tag önbelleğiyle (5 dk) hızlı okur ve admin kaydında anında yenilenir.
 */
export async function getFlashCampaignMetaMap(options?: { noCache?: boolean }): Promise<FlashCampaignMetaMap> {
  if (options?.noCache) {
    return fetchFreshFlashMetaMap()
  }

  try {
    const { unstable_cache } = await import('next/cache')
    const cachedRead = unstable_cache(
      fetchFreshFlashMetaMap,
      ['flash-campaign-meta-map'],
      { revalidate: 300, tags: ['products', 'flash-meta'] }
    )
    return await cachedRead()
  } catch {
    return fetchFreshFlashMetaMap()
  }
}

export async function saveFlashCampaignMetaMap(map: FlashCampaignMetaMap): Promise<boolean> {
  const admin = getAdminStorageClient()
  if (!admin) return false

  try {
    const payload = JSON.stringify(map)
    const { error } = await admin.storage.from(BUCKET).upload(META_PATH, payload, {
      contentType: 'application/json',
      upsert: true,
      cacheControl: '0',
    })
    if (error) {
      console.error('[flash-campaign] Metadata save error:', error)
      return false
    }
    return true
  } catch (e) {
    console.error('[flash-campaign] Metadata save exception:', e)
    return false
  }
}

export async function setFlashCampaignMeta(flasId: string, meta: Partial<FlashCampaignMeta>): Promise<FlashCampaignMeta> {
  const normalized = normalizeFlashMeta(meta)
  const current = await getFlashCampaignMetaMap({ noCache: true })
  current[flasId] = normalized
  await saveFlashCampaignMetaMap(current)
  return normalized
}

export async function deleteFlashCampaignMeta(flasId: string): Promise<void> {
  const current = await getFlashCampaignMetaMap({ noCache: true })
  if (flasId in current) {
    delete current[flasId]
    await saveFlashCampaignMetaMap(current)
  }
}
