import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getKur, dovizToTL, DEFAULT_KUR } from '@/lib/kur'
import { getSescimPricingMap } from '@/lib/sescim-pricing'
import { resolveStock } from '@/lib/product-stock'
import { isQuoteOnlyProduct } from '@/lib/distributor-rules'

export const dynamic = 'force-dynamic'

const KEYWORDS_BY_TYPE: Record<string, string[]> = {
  microphone: ['mikrofon stand', 'xlr', 'pop filtre', 'mikrofon kablo', 'stand'],
  speaker: ['hoparlör stand', 'tripod', 'ara sehpa', 'speakon', 'kablo'],
  headphone: ['kulaklık', 'jak', 'adaptör', 'kablo', 'stand'],
  general: ['xlr', 'stand', 'kablo', 'jak', 'adaptör'],
}

export async function GET(req: NextRequest) {
  try {
    const type = (req.nextUrl.searchParams.get('type') || 'general').toLowerCase()
    const keywords = KEYWORDS_BY_TYPE[type] || KEYWORDS_BY_TYPE.general

    const akdagUrl = process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL
    const akdagKey = process.env.AKDAG_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_AKDAG_SUPABASE_ANON_KEY
    if (!akdagUrl || !akdagKey) {
      return NextResponse.json({ items: [] })
    }

    const akdagDb = createClient(akdagUrl, akdagKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Gerçek aksesuar / kablo / stand ürünlerini çek
    const orFilter = keywords.map((kw) => `ad.ilike.%${kw}%`).join(',')
    const { data: rows, error } = await akdagDb
      .from('urunler')
      .select('id, slug, ad, kategori, fotograflar, fiyat, indirimli_fiyat, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka')
      .eq('aktif', true)
      .or(orFilter)
      .limit(30)

    if (error || !rows || rows.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const [kur, pricingMap] = await Promise.all([
      getKur().catch(() => DEFAULT_KUR),
      getSescimPricingMap(rows.map((r: any) => r.id)).catch(() => new Map<string, any>()),
    ])

    const resolved = []
    for (const r of rows) {
      const sp = pricingMap.get(r.id)
      if (sp?.aktif === false) continue

      const isQuote = isQuoteOnlyProduct({
        marka: r.marka,
        ad: r.ad,
        fiyat_sorunuz: sp?.fiyat_sorunuz,
      })
      if (isQuote) continue

      const stockInfo = resolveStock({
        stok_durumu: r.stok_durumu,
        stok_adedi: r.stok_adedi,
        kritik_stok: r.kritik_stok,
        sescim_stok: sp?.sescim_stok,
        sescim_stok_durumu: sp?.sescim_stok_durumu,
      })
      if (!stockInfo.canOrder) continue

      const pb = r.para_birimi || 'TRY'
      const rawBase = sp?.sescim_fiyat ?? r.fiyat ?? 0
      const baseTL = dovizToTL(rawBase, pb, kur)
      if (!baseTL || baseTL <= 0) continue

      const rawInd = sp?.sescim_indirimli_fiyat ?? r.indirimli_fiyat ?? null
      const indPB = sp?.sescim_indirimli_fiyat_pb || pb
      const indTL = rawInd ? dovizToTL(rawInd, indPB, kur) : null
      const hasDiscount = indTL !== null && indTL > 0 && indTL < baseTL

      const effectiveTL = hasDiscount ? indTL! : baseTL
      // Tamamlayıcı aksesuar mantığı: makul fiyatlı ve fotoğrafı olan ürünleri öne al
      const photo = Array.isArray(r.fotograflar) && r.fotograflar.length > 0 ? r.fotograflar[0] : ''
      if (!photo) continue

      resolved.push({
        id: r.id,
        slug: r.slug || r.id,
        ad: r.ad,
        kategori: r.kategori || 'Kablo, Stand ve Aksesuar',
        fotograf: photo,
        fiyat: baseTL,
        fiyat_doviz: rawBase,
        para_birimi: pb,
        indirimli_fiyat: hasDiscount ? indTL : null,
        indirimli_fiyat_doviz: hasDiscount ? rawInd : null,
        indirimli_fiyat_pb: hasDiscount ? indPB : null,
        stok_adedi: stockInfo.adet,
        marka: r.marka || null,
        effectiveTL,
      })
    }

    // Uygun fiyatlı aksesuarları öne sırala ve en fazla 8 aday döndür
    resolved.sort((a, b) => a.effectiveTL - b.effectiveTL)
    const items = resolved.slice(0, 8).map(({ effectiveTL: _ignore, ...rest }) => rest)

    return NextResponse.json(
      { items },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (err) {
    console.error('[cross-sell] API hatası:', err)
    return NextResponse.json({ items: [] })
  }
}
