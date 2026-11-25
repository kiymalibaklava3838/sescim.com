import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, ShieldCheck, Tag, Flame, Sparkles, Clock } from 'lucide-react'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import { getSescimPricingMap } from '@/lib/sescim-pricing'
import {
  BADGE_COLOR_THEMES,
  getFlashCampaignMetaMap,
  normalizeFlashMeta,
  slugifyCampaign,
  type FlashCampaignMeta,
} from '@/lib/flash-campaign'
import SpecialSectionExplorer from '@/components/SpecialSectionExplorer'
import CampaignBadge from '@/components/CampaignBadge'
import DailyDealsTimer from '@/components/DailyDealsTimer'
import { getSiteUrl } from '@/lib/site-url'

export const revalidate = 300

async function getCampaignData(rawSlug: string) {
  const slug = slugifyCampaign(decodeURIComponent(rawSlug || ''))
  const nowIso = new Date().toISOString()

  const akdagSupabase = await createAkdagServerClient()
  const sescimSupabase = await createServerSupabaseClient()

  let matchingDeals: Array<{ row: any; meta: FlashCampaignMeta }> = []
  let primaryMeta: FlashCampaignMeta | null = null

  if (sescimSupabase) {
    try {
      const [{ data: flasData }, metaMap] = await Promise.all([
        sescimSupabase
          .from('flas_indirimler')
          .select('*')
          .eq('aktif', true)
          .lte('baslangic_tarihi', nowIso)
          .gt('bitis_tarihi', nowIso)
          .order('bitis_tarihi', { ascending: true }),
        getFlashCampaignMetaMap(),
      ])

      for (const row of flasData || []) {
        const meta = normalizeFlashMeta(metaMap[row.id])
        if (meta.kampanya_tipi === 'ozel' && meta.kampanya_slug === slug) {
          matchingDeals.push({ row, meta })
          if (!primaryMeta) primaryMeta = meta
        }
      }

      // Aktif ürün kalmadıysa bile kampanya başlığını meta haritasından bulmaya çalış
      if (!primaryMeta) {
        for (const m of Object.values(metaMap)) {
          const norm = normalizeFlashMeta(m)
          if (norm.kampanya_tipi === 'ozel' && norm.kampanya_slug === slug) {
            primaryMeta = norm
            break
          }
        }
      }
    } catch (e) {
      console.error('[kampanya/slug] fetch error:', e)
    }
  }

  const urunIds = Array.from(new Set(matchingDeals.map((d) => d.row.urun_id)))
  const dealByUrunId = new Map(matchingDeals.map((d) => [d.row.urun_id, d]))
  const enYakinBitis = matchingDeals[0]?.row?.bitis_tarihi

  let products: any[] = []
  if (urunIds.length > 0) {
    const [akdagRes, sescimRes, pricingMap] = await Promise.all([
      akdagSupabase.from('urunler').select(LIGHT_PRODUCT_FIELDS).in('id', urunIds),
      sescimSupabase
        ? sescimSupabase.from('urunler').select(LIGHT_PRODUCT_FIELDS).in('id', urunIds)
        : Promise.resolve({ data: [] as any[] }),
      getSescimPricingMap(urunIds),
    ])

    const combinedMap = new Map<string, any>()
    ;(akdagRes.data || []).forEach((p: any) => combinedMap.set(p.id, p))
    ;(sescimRes.data || []).forEach((p: any) => {
      if (!combinedMap.has(p.id)) combinedMap.set(p.id, p)
    })

    products = urunIds
      .map((id) => combinedMap.get(id))
      .filter(Boolean)
      .map((p: any) => {
        const pricing = pricingMap.get(p.id)
        const deal = dealByUrunId.get(p.id)
        const indirimliFiyat = deal ? Number(deal.row.indirimli_fiyat) : (pricing?.sescim_indirimli_fiyat ?? null)
        const indirimliPB = deal?.row?.fiyat_para_birimi || pricing?.sescim_indirimli_fiyat_pb || null
        return {
          ...p,
          sescim_fiyat: pricing?.sescim_fiyat ?? null,
          sescim_indirimli_fiyat: indirimliFiyat,
          sescim_indirimli_fiyat_pb: indirimliPB,
          flas_kampanya: deal?.meta ?? pricing?.flas_kampanya ?? primaryMeta,
          flas_bitis_tarihi: deal?.row?.bitis_tarihi ?? pricing?.flas_bitis_tarihi ?? null,
          sescim_aktif: pricing?.sescim_aktif ?? true,
          sescim_stok: pricing?.sescim_stok ?? null,
          sescim_stok_durumu: pricing?.sescim_stok_durumu ?? null,
          fiyat_sorunuz: pricing?.fiyat_sorunuz ?? false,
        }
      })
      .filter((p) => p.sescim_aktif !== false)
  }

  return { slug, primaryMeta, products, enYakinBitis }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const slug = slugifyCampaign(decodeURIComponent(params.slug || ''))
  if (slug === 'sescim-haftasi') {
    return { title: 'Sescim Haftası | Sescim' }
  }
  const { primaryMeta } = await getCampaignData(params.slug)
  const titleName = primaryMeta?.kampanya_adi || slug.replace(/-/g, ' ').toUpperCase()
  const baseUrl = getSiteUrl()

  return {
    title: `${titleName} - Özel Kampanya İndirimleri | Sescim`,
    description:
      primaryMeta?.vurgu_metni ||
      `${titleName} kapsamında seçili profesyonel ses, ışık, stüdyo ve sahne ekipmanlarında özel indirim fırsatları Sescim.com'da!`,
    alternates: {
      canonical: `${baseUrl}/kampanya/${slug}`,
    },
  }
}

export default async function KampanyaSlugPage({ params }: { params: { slug: string } }) {
  const normalizedSlug = slugifyCampaign(decodeURIComponent(params.slug || ''))
  if (normalizedSlug === 'sescim-haftasi') {
    redirect('/firsatlar')
  }

  const { primaryMeta, products, enYakinBitis } = await getCampaignData(params.slug)
  const theme = primaryMeta
    ? BADGE_COLOR_THEMES[primaryMeta.rozet_rengi] || BADGE_COLOR_THEMES.black
    : BADGE_COLOR_THEMES.black
  const isDarkHero = !primaryMeta || primaryMeta.rozet_rengi === 'black'
  const campaignTitle = primaryMeta?.kampanya_adi || normalizedSlug.replace(/-/g, ' ').toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50 py-10 font-body text-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-display font-semibold uppercase tracking-widest text-slate-400 mb-6">
          <Link href="/" className="hover:text-brand-red transition-colors">
            Ana Sayfa
          </Link>
          <span>/</span>
          <Link href="/kampanyalar" className="hover:text-brand-red transition-colors">
            Kampanyalar
          </Link>
          <span>/</span>
          <span className="text-brand-red">{campaignTitle}</span>
        </div>

        {/* Kampanya Hero Banner */}
        <div
          className={`rounded-2xl border p-6 sm:p-8 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 ${
            isDarkHero
              ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white border-amber-400/30'
              : `${theme.bannerBg} ${theme.bannerBorder}`
          }`}
        >
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              {primaryMeta ? (
                <CampaignBadge kampanya={primaryMeta} size="sm" />
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-400 text-slate-950 text-[11px] font-display font-black uppercase tracking-wider">
                  <Sparkles size={12} /> Özel Kampanya
                </span>
              )}
              {products.length > 0 && (
                <span
                  className={`text-xs font-display font-bold uppercase tracking-wider ${
                    isDarkHero ? 'text-amber-300/90' : 'text-slate-500'
                  }`}
                >
                  • {products.length} İndirimli Ürün
                </span>
              )}
            </div>

            <h1
              className={`font-display font-black text-2xl sm:text-4xl uppercase tracking-tight ${
                isDarkHero ? 'text-white' : 'text-slate-900'
              }`}
            >
              {campaignTitle}
            </h1>

            <p className={`text-sm font-body ${isDarkHero ? 'text-slate-300' : 'text-slate-600'}`}>
              {primaryMeta?.vurgu_metni ||
                'Seçili profesyonel ses, ışık ve stüdyo ekipmanlarında kampanyaya özel sınırlı stoklu indirimler.'}
            </p>
          </div>

          {enYakinBitis && (
            <div
              className={`p-4 rounded-xl border shrink-0 flex flex-col items-start md:items-end gap-1.5 ${
                isDarkHero
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white/80 border-slate-200/80'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-widest ${
                  isDarkHero ? 'text-amber-300' : 'text-slate-500'
                }`}
              >
                <Clock size={12} />
                <span>Kampanya Bitişine Kalan</span>
              </div>
              <DailyDealsTimer targetDate={enYakinBitis} />
            </div>
          )}
        </div>

        {/* Güven Şeridi */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="font-display font-bold text-xs uppercase text-slate-800">Distribütör Garantisi</div>
              <div className="text-[11px] text-slate-500">2 Yıl resmi faturalı garanti</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Tag size={18} />
            </div>
            <div>
              <div className="font-display font-bold text-xs uppercase text-slate-800">Taksit İmkanı</div>
              <div className="text-[11px] text-slate-500">Tüm kartlara 12 aya varan taksit</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-xs col-span-2 md:col-span-1">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Flame size={18} />
            </div>
            <div>
              <div className="font-display font-bold text-xs uppercase text-slate-800">Sigortalı Hızlı Kargo</div>
              <div className="text-[11px] text-slate-500">Özenli paketleme & hızlı teslimat</div>
            </div>
          </div>
        </div>

        {/* Ürün Listesi veya Boş Durum */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {products.length > 0 ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="font-display font-black text-xl uppercase text-slate-900">
                    {campaignTitle} Ürünleri ({products.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kampanya kapsamındaki tüm indirimli ürünler aşağıda listelenmektedir.
                  </p>
                </div>
                <Link
                  href="/urunler"
                  className="inline-flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider text-brand-red hover:underline"
                >
                  Tüm Kataloğu Gör <ArrowRight size={14} />
                </Link>
              </div>

              <SpecialSectionExplorer
                products={products}
                sectionType="kampanya"
                sectionTitle={campaignTitle}
              />
            </>
          ) : (
            <div className="py-16 text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles size={28} />
              </div>
              <h2 className="font-display font-black text-xl uppercase text-slate-900">
                Bu Kampanya Şu Anda Aktif Değil
              </h2>
              <p className="text-sm text-slate-500">
                Aradığınız kampanya henüz başlamamış veya süresi dolmuş olabilir. Güncel fırsatlarımızı Sescim Haftası sayfamızdan inceleyebilirsiniz.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  href="/firsatlar"
                  className="btn-primary text-xs py-2.5 px-5 rounded-xl font-display font-bold uppercase tracking-wider"
                >
                  Sescim Haftası Fırsatları
                </Link>
                <Link
                  href="/urunler"
                  className="btn-outline text-xs py-2.5 px-5 rounded-xl font-display font-bold uppercase tracking-wider"
                >
                  Tüm Ürünler
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
