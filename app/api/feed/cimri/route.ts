import { NextResponse } from 'next/server'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSescimPricingMap } from '@/lib/sescim-pricing'
import { getSiteUrl } from '@/lib/site-url'
import { dovizToTL, KurData } from '@/lib/kur'
import { isQuoteOnlyProduct } from '@/lib/distributor-rules'

export const revalidate = 7200 // 2 saat Edge CDN önbellek

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
    const sescimDb = await createServerSupabaseClient()
    const kur = await getLiveKur()

    // 1. Akdağ ve Sescim ürünlerini çek
    const [akdagRes, sescimRes] = await Promise.all([
      supabase.from('urunler').select('id, slug, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, indirimli_fiyat, para_birimi, stok_durumu, stok_adedi, marka, model_kodu, barkod').limit(10000),
      sescimDb ? sescimDb.from('urunler').select('id, slug, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, indirimli_fiyat, para_birimi, stok_durumu, stok_adedi, marka, model_kodu, barkod, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, fiyat_sorunuz').limit(5000) : Promise.resolve({ data: [] })
    ])

    const sProducts = (sescimRes.data || []).map((p: any) => ({
      ...p,
      sescim_fiyat: p.sescim_fiyat ?? p.fiyat ?? null,
      sescim_aktif: p.sescim_aktif !== false
    }))
    const aProducts = akdagRes.data || []

    const productMap = new Map<string, any>()
    sProducts.forEach((p: any) => productMap.set(p.id, p))
    aProducts.forEach((p: any) => { if (!productMap.has(p.id)) productMap.set(p.id, p) })
    const products = Array.from(productMap.values())

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

    // Cimri XML formatı
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<products>\n'

    for (const p of validProducts) {
      const pb = p.para_birimi || 'TRY'
      const pricing = pricingMap.get(p.id)

      const normalRaw = pricing?.sescim_fiyat ?? p.fiyat ?? 0
      const discountedRaw = pricing?.sescim_indirimli_fiyat ?? (p.indirimli_fiyat && p.indirimli_fiyat < (p.fiyat || 0) ? p.indirimli_fiyat : null)

      const normalPriceTL = normalRaw > 0 ? dovizToTL(normalRaw, pb, kur) : 0
      const discountedPriceTL = discountedRaw && discountedRaw > 0 ? dovizToTL(discountedRaw, pb, kur) : null

      const hasDiscount = discountedPriceTL !== null && discountedPriceTL > 0 && normalPriceTL > 0 && discountedPriceTL < normalPriceTL
      const finalPriceTL = hasDiscount ? discountedPriceTL : (normalPriceTL > 0 ? normalPriceTL : (discountedPriceTL || 0))

      if (finalPriceTL <= 0) continue

      const stok = p.stok_durumu || 'stokta'
      const isOutOfStock = stok === 'tukendi' || stok === 'tükendi'
      const stockStatus = isOutOfStock ? 0 : 1
      const stockQty = isOutOfStock ? 0 : (p.stok_adedi || 10)
      const link = `${baseUrl}/urun/${encodeURIComponent(p.slug || p.id)}`
      const image = Array.isArray(p.fotograflar) && p.fotograflar[0] ? p.fotograflar[0] : `${baseUrl}/logo.png`
      const brand = p.marka || 'Akdağ Elektronik'
      const model = p.model_kodu || ''
      const barcode = p.barkod || ''
      const categoryHierarchy = [p.kategori, p.alt_kategori, p.urun_tipi].filter(Boolean).join(' > ')
      const shippingFee = finalPriceTL >= 1999 ? '0.00' : '149.00'

      xml += '  <product>\n'
      xml += `    <merchantItemId>${p.id}</merchantItemId>\n`
      xml += `    <productName><![CDATA[${p.ad || ''}]]></productName>\n`
      xml += `    <brand><![CDATA[${brand}]]></brand>\n`
      if (model) xml += `    <model><![CDATA[${model}]]></model>\n`
      if (barcode) xml += `    <barcode>${barcode}</barcode>\n`
      if (categoryHierarchy) xml += `    <categoryHierarchy><![CDATA[${categoryHierarchy}]]></categoryHierarchy>\n`
      xml += `    <pricePlusTax>${finalPriceTL.toFixed(2)}</pricePlusTax>\n`
      if (hasDiscount && normalPriceTL > 0) {
        xml += `    <listPricePlusTax>${normalPriceTL.toFixed(2)}</listPricePlusTax>\n`
      }
      xml += '    <currency>TRY</currency>\n'
      xml += `    <itemUrl>${link}</itemUrl>\n`
      xml += `    <imageUrl>${image}</imageUrl>\n`
      xml += `    <stockStatus>${stockStatus}</stockStatus>\n`
      xml += `    <stockQuantity>${stockQty}</stockQuantity>\n`
      xml += `    <shippingFee>${shippingFee}</shippingFee>\n`
      xml += '  </product>\n'
    }

    xml += '</products>'

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400',
      },
    })
  } catch (e: any) {
    console.error('Cimri feed generation error:', e)
    return new NextResponse(`Cimri feed oluşturma hatası: ${e.message}`, { status: 500 })
  }
}
