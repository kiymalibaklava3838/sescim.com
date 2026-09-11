import { NextResponse } from 'next/server'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { getSescimPricingMap } from '@/lib/sescim-pricing'
import { getSiteUrl } from '@/lib/site-url'
import { dovizToTL, KurData } from '@/lib/kur'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 saat önbellek

function stripHtml(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim()
}

async function getLiveKur(): Promise<KurData> {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    const usdTry = data.rates?.TRY || 38.0
    const eurTry = usdTry / (data.rates?.EUR || 1.05)
    return {
      USD: parseFloat(usdTry.toFixed(2)),
      EUR: parseFloat(eurTry.toFixed(2)),
      guncelleme: new Date().toISOString(),
    }
  } catch {
    return { USD: 38.0, EUR: 41.0, guncelleme: null, fallback: true }
  }
}

export async function GET() {
  try {
    const baseUrl = getSiteUrl()
    const supabase = await createAkdagServerClient()
    const kur = await getLiveKur()

    // 1. Akdağ veritabanındaki tüm ürünleri çek
    const { data: products, error } = await supabase
      .from('urunler')
      .select('id, slug, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, indirimli_fiyat, para_birimi, stok_durumu, marka, model_kodu')
      .limit(10000)

    if (error || !products) {
      console.error('Google Merchant feed DB error:', error)
      return new NextResponse('Veritabanı hatası', { status: 500 })
    }

    // 2. Sescim fiyatlandırmasını eşle
    const urunIds = products.map((p: any) => p.id)
    const pricingMap = await getSescimPricingMap(urunIds)

    const validProducts = products.filter((p: any) => {
      const pricing = pricingMap.get(p.id)
      return (!pricing || pricing.sescim_aktif !== false) && !pricing?.fiyat_sorunuz
    })

    // 3. Google Merchant XML Feed oluştur
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n'
    xml += '  <channel>\n'
    xml += '    <title>Sescim - Yeni Nesil Müzik Market</title>\n'
    xml += `    <link>${baseUrl}</link>\n`
    xml += '    <description>Sescim Profesyonel Ses, Işık ve Görüntü Sistemleri Google Alışveriş ve Merchant Center Ürün Akışı</description>\n'

    for (const p of validProducts) {
      const pricing = pricingMap.get(p.id)
      const rawPrice = pricing?.sescim_indirimli_fiyat ?? pricing?.sescim_fiyat ?? p.indirimli_fiyat ?? p.fiyat
      if (!rawPrice || rawPrice <= 0) continue

      const pb = p.para_birimi || 'TRY'
      const priceTL = dovizToTL(rawPrice, pb, kur)
      const isOutlet = !!pricing?.is_outlet
      const stok = p.stok_durumu || 'stokta'
      const availability = (stok === 'tukendi' || stok === 'tükendi') ? 'out_of_stock' : 'in_stock'
      const link = `${baseUrl}/urun/${encodeURIComponent(p.slug || p.id)}`
      const image = Array.isArray(p.fotograflar) && p.fotograflar[0] ? p.fotograflar[0] : `${baseUrl}/logo.png`
      const brand = p.marka || 'Akdağ Elektronik'
      const mpn = p.model_kodu || p.id
      const desc = stripHtml(p.aciklama || p.ad).slice(0, 5000)
      const categoryPath = [p.kategori, p.alt_kategori, p.urun_tipi].filter(Boolean).join(' > ')

      xml += '    <item>\n'
      xml += `      <g:id>${p.id}</g:id>\n`
      xml += `      <g:title><![CDATA[${p.ad || ''}]]></g:title>\n`
      xml += `      <g:description><![CDATA[${desc}]]></g:description>\n`
      xml += `      <g:link>${link}</g:link>\n`
      xml += `      <g:image_link>${image}</g:image_link>\n`
      xml += `      <g:condition>${isOutlet ? 'refurbished' : 'new'}</g:condition>\n`
      xml += `      <g:availability>${availability}</g:availability>\n`
      xml += `      <g:price>${priceTL.toFixed(2)} TRY</g:price>\n`
      xml += `      <g:brand><![CDATA[${brand}]]></g:brand>\n`
      xml += `      <g:mpn><![CDATA[${mpn}]]></g:mpn>\n`
      if (categoryPath) {
        xml += `      <g:product_type><![CDATA[${categoryPath}]]></g:product_type>\n`
      }
      xml += '      <g:shipping>\n'
      xml += '        <g:country>TR</g:country>\n'
      xml += '        <g:service>Standart Sigortalı Kargo</g:service>\n'
      xml += `        <g:price>${priceTL >= 1999 ? '0.00' : '99.00'} TRY</g:price>\n`
      xml += '      </g:shipping>\n'
      xml += '    </item>\n'
    }

    xml += '  </channel>\n'
    xml += '</rss>'

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (e: any) {
    console.error('Google Merchant feed generation error:', e)
    return new NextResponse(`Feed oluşturma hatası: ${e.message}`, { status: 500 })
  }
}
