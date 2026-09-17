import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { musterionayHTML, adminBildirimHTML } from '@/lib/email'
import { sendEmail } from '@/lib/send-email'
import { siparisOlusturSchema } from '@/lib/api-schemas'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'
import { calculateCouponDiscount } from '@/lib/coupon-helper'
import { calculateShippingFee } from '@/lib/shipping'
import { isQuoteOnlyProduct } from '@/lib/distributor-rules'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

const akdagAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL!, process.env.AKDAG_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!(await rateLimit(`siparis:${ip}`, 15, 60_000))) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen bir dakika sonra deneyin.' }, { status: 429 })
    }

    const raw = await req.json()
    const parsed = siparisOlusturSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Geçersiz veri', details: parsed.error.flatten() }, { status: 400 })
    }

    const {
      user_id,
      urunler,
      toplam_tutar,
      ad_soyad,
      email,
      telefon,
      notlar,
      odeme_tipi,
      teslimat_tipi,
      fatura_tipi,
      firma_unvani,
      vergi_dairesi,
      vergi_no,
      teslimat_adresi,
      kupon_kodu,
      indirim_tutari,
    } = parsed.data

    const db = supabaseAdmin()
    const akdagDb = akdagAdmin()

    // 1. Döviz kurlarını al
    let dolarKuru = 38.0
    let euroKuru = 41.0
    try {
      const kurRes = await fetch(`${req.nextUrl.origin}/api/kur`)
      if (kurRes.ok) {
        const kurData = await kurRes.json()
        dolarKuru = kurData.USD || 38.0
        euroKuru = kurData.EUR || 41.0
      }
    } catch {}

    const kurObj = { USD: dolarKuru, EUR: euroKuru }

    // 2. Sepetteki ürünlerin veritabanından yetkili gerçek fiyatlarını çek
    const urunIds = Array.from(new Set(urunler.map((u) => u.urun_id).filter(Boolean)))
    if (urunIds.length === 0) {
      return NextResponse.json({ error: 'Sepette geçerli ürün bulunamadı' }, { status: 400 })
    }

    const [akdagRes, sescimRes, sescimFiyatlarRes] = await Promise.all([
      akdagDb.from('urunler').select('id, ad, kategori, alt_kategori, fiyat, sescim_fiyat, sescim_indirimli_fiyat, para_birimi, stok_durumu, stok_adedi, marka').in('id', urunIds),
      db.from('urunler').select('id, ad, kategori:kategori_id, alt_kategori:alt_kategori_id, fiyat, sescim_fiyat, sescim_indirimli_fiyat, para_birimi, stok_durumu, stok_adedi, marka').in('id', urunIds),
      db.from('sescim_fiyatlar').select('urun_id, fiyat_sorunuz').in('urun_id', urunIds)
    ])

    const dbProducts = [
      ...(sescimRes.data || []).map((p: any) => ({ ...p, kaynak: 'sescim' })),
      ...(akdagRes.data || []).map((p: any) => ({ ...p, kaynak: 'akdag' }))
    ]

    if (dbProducts.length === 0) {
      return NextResponse.json({ error: 'Ürün fiyatları doğrulanamadı' }, { status: 500 })
    }

    const fiyatSorunuzMap = new Map<string, boolean>()
    ;(sescimFiyatlarRes.data || []).forEach((f: any) => {
      fiyatSorunuzMap.set(f.urun_id, f.fiyat_sorunuz === true)
    })

    // Ürünlerin gerçek fiyatlarını hesapla ve doğrulanmış sepet dizisini oluştur
    // Fiyat Hiyerarşisi:
    // 1. Öncelik: sescim_fiyat (veya sescim_indirimli_fiyat)
    // 2. Öncelik: fiyat (liste satış fiyatı) - Bayi fiyatı ASLA kullanılmaz
    let serverAraToplam = 0
    const verifiedUrunler: any[] = []

    for (const item of urunler) {
      const dbProd = dbProducts.find((p) => p.id === item.urun_id)
      if (!dbProd) {
        return NextResponse.json({ error: `Ürün bulunamadı: ${item.ad}` }, { status: 400 })
      }

      const quoteOnly = isQuoteOnlyProduct({
        marka: dbProd.marka,
        fiyat_sorunuz: fiyatSorunuzMap.get(dbProd.id)
      })

      if (quoteOnly) {
        return NextResponse.json({
          error: `"${dbProd.ad}" distribütör kuralları gereği doğrudan internet üzerinden satılamaz. Lütfen fiyat teklifi alınız.`
        }, { status: 400 })
      }

      const basePrice = (dbProd.sescim_fiyat !== null && dbProd.sescim_fiyat !== undefined && Number(dbProd.sescim_fiyat) > 0)
        ? Number(dbProd.sescim_fiyat)
        : Number(dbProd.fiyat || 0)

      const discountPrice = (dbProd.sescim_indirimli_fiyat !== null && dbProd.sescim_indirimli_fiyat !== undefined && Number(dbProd.sescim_indirimli_fiyat) > 0)
        ? Number(dbProd.sescim_indirimli_fiyat)
        : null

      const finalUnitCurrencyPrice = discountPrice !== null ? discountPrice : basePrice
      const pb = dbProd.para_birimi || 'TRY'

      // Döviz to TL dönüşümü
      let unitPriceTL = finalUnitCurrencyPrice
      if (pb === 'USD') unitPriceTL = finalUnitCurrencyPrice * kurObj.USD
      else if (pb === 'EUR') unitPriceTL = finalUnitCurrencyPrice * kurObj.EUR
      unitPriceTL = Math.ceil(unitPriceTL)

      const itemTotalTL = unitPriceTL * item.adet
      serverAraToplam += itemTotalTL

      verifiedUrunler.push({
        ...item,
        ad: dbProd.ad || item.ad,
        kategori: dbProd.kategori || (item as any).kategori || null,
        alt_kategori: dbProd.alt_kategori || (item as any).alt_kategori || null,
        fiyat: unitPriceTL,
        birim_fiyat_doviz: finalUnitCurrencyPrice,
        para_birimi: pb,
      })
    }

    let hesaplanan = serverAraToplam
    let appliedDiscount = 0
    const cleanKuponKodu = kupon_kodu ? kupon_kodu.trim().toUpperCase() : null

    if (cleanKuponKodu) {
      const { data: kupon, error: kErr } = await db.from('kuponlar').select('*').ilike('kod', cleanKuponKodu).eq('aktif', true).maybeSingle()
      if (kErr || !kupon) {
        return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş kupon' }, { status: 400 })
      }
      
      const isExpired = kupon.gecerlilik_tarihi && new Date(kupon.gecerlilik_tarihi).getTime() < Date.now()
      if (isExpired) return NextResponse.json({ error: 'Kuponun süresi dolmuş' }, { status: 400 })
      
      if (kupon.max_kullanim && kupon.kullanim_sayisi >= kupon.max_kullanim) {
        return NextResponse.json({ error: 'Kupon kullanım limiti dolmuş' }, { status: 400 })
      }

      // Kategoriye ve minimum tutara göre doğrulanmış indirim tutarını hesapla
      const discountResult = calculateCouponDiscount(kupon, verifiedUrunler, serverAraToplam)
      if (discountResult.error) {
        return NextResponse.json({ error: discountResult.error }, { status: 400 })
      }

      appliedDiscount = discountResult.discount
      hesaplanan = Math.max(0, serverAraToplam - appliedDiscount)
    }

    const serverKargoUcreti = calculateShippingFee(hesaplanan)
    const serverGenelToplam = hesaplanan + serverKargoUcreti

    if (Math.abs(serverGenelToplam - toplam_tutar) > 2) {
      return NextResponse.json({ 
        error: 'Tutar doğrulanamadı. Sepetinizdeki ürün fiyatları veya kurlar güncellenmiş olabilir.',
        guncel_tutar: serverGenelToplam
      }, { status: 400 })
    }

    const insertPayload: any = {
      user_id: user_id || null,
      urunler: verifiedUrunler,
      toplam_tutar: serverGenelToplam,
      ad_soyad,
      email,
      telefon,
      notlar,
      odeme_tipi,
      teslimat_tipi: 'kargo',
      kargo_ucreti: serverKargoUcreti,
      odeme_durumu: 'beklemede',
      durum: 'beklemede',
      fatura_tipi: fatura_tipi || 'bireysel',
      firma_unvani: firma_unvani || null,
      vergi_dairesi: vergi_dairesi || null,
      vergi_no: vergi_no || null,
      teslimat_adresi: teslimat_adresi || null,
      kupon_kodu: kupon_kodu || null,
      indirim_tutari: appliedDiscount,
      dolar_kuru: dolarKuru,
      euro_kuru: euroKuru,
      ip_adresi: ip,
      user_agent: req.headers.get('user-agent') || null,
    }

    let { data: siparis, error: dbErr } = await db
      .from('siparisler')
      .insert(insertPayload)
      .select('siparis_no, id')
      .single()

    // Eğer kargo_ucreti kolonu henüz DB'de yoksa sütunsuz tekrar dene
    if (dbErr && dbErr.message?.includes('kargo_ucreti')) {
      delete insertPayload.kargo_ucreti
      const retry = await db
        .from('siparisler')
        .insert(insertPayload)
        .select('siparis_no, id')
        .single()
      siparis = retry.data
      dbErr = retry.error
    }

    if (dbErr || !siparis) {
      return NextResponse.json({ error: dbErr?.message || 'Sipariş oluşturulamadı' }, { status: 400 })
    }

    for (const item of urunler) {
      if (!item.urun_id) continue

      const dbProd = dbProducts.find((p) => p.id === item.urun_id)
      const targetDb = dbProd?.kaynak === 'sescim' ? db : akdagDb

      // Önce mevcut durumu al
      const { data: urun } = await targetDb
        .from('urunler')
        .select('stok_durumu, stok_adedi')
        .eq('id', item.urun_id)
        .single()

      if (typeof urun?.stok_adedi === 'number') {
        const kalan = Math.max(0, urun.stok_adedi - item.adet)
        const nextDurum = kalan <= 0 ? 'tukendi' : 'stokta'
        await targetDb.from('urunler').update({ stok_adedi: kalan, stok_durumu: nextDurum }).eq('id', item.urun_id)
      }
    }

    // Kupon kullanım sayısını artır
    if (cleanKuponKodu) {
      const { error: rpcErr } = await db.rpc('increment_kupon_kullanim', { p_kod: cleanKuponKodu })
      if (rpcErr) {
        // Fallback if rpc is missing
        const { data: kData } = await db.from('kuponlar').select('id, kullanim_sayisi').ilike('kod', cleanKuponKodu).maybeSingle()
        if (kData) {
          await db.from('kuponlar').update({ kullanim_sayisi: (kData.kullanim_sayisi || 0) + 1 }).eq('id', kData.id)
        }
      }

      if (user_id) {
        try {
          await db.from('kullanici_kuponlari').update({
            kullanildi: true,
            kullanilma_tarihi: new Date().toISOString(),
          }).eq('user_id', user_id).ilike('kupon_kodu', cleanKuponKodu)
        } catch {}
      }
    }

    const emailData = {
      siparis_no: siparis.siparis_no,
      ad_soyad: ad_soyad || 'Müşteri',
      email,
      telefon: telefon || '',
      urunler,
      toplam_tutar,
      odeme_tipi: odeme_tipi || 'havale',
      notlar: notlar ?? undefined,
    }

    // E-postaları ayrı try/catch ile gönder — mail hatası siparişi engellemesin
    let emailError: string | undefined
    try {
      await sendEmail(
        email,
        `Siparişiniz Alındı — ${siparis.siparis_no} | sescim.com`,
        musterionayHTML(emailData)
      )
      const adminEmail = process.env.ADMIN_EMAIL || 'info@sescim.com'
      await sendEmail(
        adminEmail,
        `🔔 Yeni Sipariş: ${siparis.siparis_no} — ${toplam_tutar.toLocaleString('tr-TR')} ₺`,
        adminBildirimHTML(emailData)
      )
    } catch (mailErr) {
      emailError = (mailErr as Error).message
      console.error('[siparis-olustur] E-posta gönderilemedi, sipariş oluşturuldu:', emailError)
    }

    return NextResponse.json({
      success: true,
      siparis_no: siparis.siparis_no,
      id: siparis.id,
      ...(emailError ? { email_error: 'E-posta gönderilemedi, siparişiniz kaydedildi.' } : {}),
    })
  } catch (e) {
    console.error('Sipariş oluşturma hatası:', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
