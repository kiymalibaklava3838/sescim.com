import { NextResponse } from 'next/server'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSescimPricingMap } from '@/lib/sescim-pricing'
import { getSiteUrl } from '@/lib/site-url'
import { dovizToTL, getKur } from '@/lib/kur'
import { isQuoteOnlyProduct } from '@/lib/distributor-rules'

export const revalidate = 7200 // 2 saat Edge CDN önbellek

function stripHtml(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim()
}

function getGoogleProductCategory(kategori?: string): string {
  if (!kategori) return '500044'
  const k = kategori.toLowerCase()
  if (k.includes('ışık') || k.includes('isik') || k.includes('lighting') || k.includes('sahne')) return '505353'
  if (k.includes('görüntü') || k.includes('goruntu') || k.includes('projeksiyon') || k.includes('led')) return '211'
  if (k.includes('kablo') || k.includes('konnektör') || k.includes('adaptör')) return '4054'
  return '500044'
}

export async function GET() {
  try {
    const baseUrl = getSiteUrl()
    const supabase = await createAkdagServerClient()
    const kur = await getKur()

    // 1. Hem Akdağ hem Sescim veritabanındaki ürünleri çek (Hibrit)
    const sescimDb = await createServerSupabaseClient()
    const [akdagRes, sescimRes] = await Promise.all([
      supabase.from('urunler').select('id, slug, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, indirimli_fiyat, para_birimi, stok_durumu, marka, model_kodu').limit(10000),
      sescimDb ? sescimDb.from('urunler').select('id, slug, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, indirimli_fiyat, para_birimi, stok_durumu, marka, model_kodu, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, fiyat_sorunuz').limit(5000) : Promise.resolve({ data: [] })
    ])

    const sProducts = (sescimRes.data || []).map((p: any) => ({
      ...p,
      sescim_fiyat: p.sescim_fiyat ?? p.fiyat ?? null,
      sescim_aktif: p.sescim_aktif !== false
    }))
    const aProducts = akdagRes.data || []

    // Deduplicate by id
    const productMap = new Map<string, any>()
    sProducts.forEach((p: any) => productMap.set(p.id, p))
    aProducts.forEach((p: any) => { if (!productMap.has(p.id)) productMap.set(p.id, p) })
    const products = Array.from(productMap.values())

    // 2. Sescim fiyatlandırmasını eşle
    const urunIds = products.map((p: any) => p.id)
    const pricingMap = await getSescimPricingMap(urunIds)

    const validProducts = products.filter((p: any) => {
      const pricing = pricingMap.get(p.id)
      const isAktif = pricing ? pricing.sescim_aktif !== false : p.sescim_aktif !== false
      const isFiyatSorunuz = isQuoteOnlyProduct({
        marka: p.marka,
        fiyat_sorunuz: pricing ? pricing.fiyat_sorunuz : p.fiyat_sorunuz
      })
      return isAktif && !isFiyatSorunuz
    })

    // 3. Google Merchant XML Feed oluştur
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n'
    xml += '  <channel>\n'
    xml += '    <title>Sescim - Yeni Nesil Müzik Market</title>\n'
    xml += `    <link>${baseUrl}</link>\n`
    xml += '    <description>Sescim Profesyonel Ses, Işık ve Görüntü Sistemleri Google Alışveriş ve Merchant Center Ürün Akışı</description>\n'

    for (const p of validProducts) {
      const pb = p.para_birimi || 'TRY'
      const pricing = pricingMap.get(p.id)
      // Normal fiyat (Sescim fiyatı varsa öncelikli)
      const normalRaw = pricing?.sescim_fiyat ?? p.fiyat ?? 0
      // İndirimli fiyat (Sescim indirimli fiyatı varsa öncelikli)
      const discountedRaw = pricing?.sescim_indirimli_fiyat ?? (p.indirimli_fiyat && p.indirimli_fiyat < (p.fiyat || 0) ? p.indirimli_fiyat : null)

      const normalPriceTL = normalRaw > 0 ? dovizToTL(normalRaw, pb, kur) : 0
      const discountedPriceTL = discountedRaw && discountedRaw > 0 ? dovizToTL(discountedRaw, pb, kur) : null

      const hasDiscount = discountedPriceTL !== null && discountedPriceTL > 0 && normalPriceTL > 0 && discountedPriceTL < normalPriceTL
      const finalPriceTL = hasDiscount ? discountedPriceTL : (normalPriceTL > 0 ? normalPriceTL : (discountedPriceTL || 0))

      if (finalPriceTL <= 0) continue

      // Google Merchant görseli olmayan ürünleri reddeder ('Resim çok küçük' hatası)
      const mainImage = Array.isArray(p.fotograflar) && p.fotograflar[0] ? p.fotograflar[0] : null
      if (!mainImage || !mainImage.startsWith('http')) continue

      const isOutlet = !!pricing?.is_outlet
      const stok = p.stok_durumu || 'stokta'
      const availability = (stok === 'tukendi' || stok === 'tükendi') ? 'out_of_stock' : 'in_stock'
      const link = `${baseUrl}/urun/${encodeURIComponent(p.slug || p.id)}`
      const brand = (p.marka || 'Akdağ Elektronik').trim()
      const realMpn = p.model_kodu && typeof p.model_kodu === 'string' && p.model_kodu.trim() ? p.model_kodu.trim() : null
      const title = (p.ad || '').slice(0, 150).trim()
      const rawDesc = stripHtml(p.aciklama || '').trim()
      const desc = (rawDesc || p.ad || 'Profesyonel Ses ve Sahne Ekipmanı').slice(0, 5000)
      const categoryPath = [p.kategori, p.alt_kategori, p.urun_tipi].filter(Boolean).join(' > ')

      xml += '    <item>\n'
      xml += `      <g:id>${p.id}</g:id>\n`
      xml += `      <g:title><![CDATA[${title}]]></g:title>\n`
      xml += `      <g:description><![CDATA[${desc}]]></g:description>\n`
      xml += `      <g:link>${link}</g:link>\n`
      xml += `      <g:image_link>${mainImage}</g:image_link>\n`
      if (Array.isArray(p.fotograflar) && p.fotograflar.length > 1) {
        for (const addImg of p.fotograflar.slice(1, 11)) {
          if (addImg && addImg.startsWith('http')) {
            xml += `      <g:additional_image_link>${addImg}</g:additional_image_link>\n`
          }
        }
      }
      xml += `      <g:condition>${isOutlet ? 'refurbished' : 'new'}</g:condition>\n`
      xml += `      <g:availability>${availability}</g:availability>\n`
      if (hasDiscount) {
        xml += `      <g:price>${normalPriceTL.toFixed(2)} TRY</g:price>\n`
        xml += `      <g:sale_price>${discountedPriceTL.toFixed(2)} TRY</g:sale_price>\n`
      } else {
        xml += `      <g:price>${finalPriceTL.toFixed(2)} TRY</g:price>\n`
      }
      if (brand) {
        xml += `      <g:brand><![CDATA[${brand}]]></g:brand>\n`
      }
      if (realMpn) {
        xml += `      <g:mpn><![CDATA[${realMpn}]]></g:mpn>\n`
      } else {
        xml += '      <g:identifier_exists>no</g:identifier_exists>\n'
      }
      if (categoryPath) {
        xml += `      <g:product_type><![CDATA[${categoryPath}]]></g:product_type>\n`
      }
      const gpc = getGoogleProductCategory(p.kategori || p.alt_kategori)
      xml += `      <g:google_product_category>${gpc}</g:google_product_category>\n`
      xml += '      <g:shipping>\n'
      xml += '        <g:country>TR</g:country>\n'
      xml += '        <g:service>Standart Sigortalı Kargo</g:service>\n'
      xml += `        <g:price>${finalPriceTL >= 1999 ? '0.00' : '149.00'} TRY</g:price>\n`
      xml += '      </g:shipping>\n'
      xml += '    </item>\n'
    }

    xml += '  </channel>\n'
    xml += '</rss>'

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400',
      },
    })
  } catch (e: any) {
    console.error('Google Merchant feed generation error:', e)
    return new NextResponse(`Feed oluşturma hatası: ${e.message}`, { status: 500 })
  }
}
