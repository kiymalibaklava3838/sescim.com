import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { musterionayHTML, adminBildirimHTML } from '@/lib/email'
import { sendEmail } from '@/lib/send-email'
import { siparisOlusturSchema } from '@/lib/api-schemas'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'
import { calculateCouponDiscount } from '@/lib/coupon-helper'
import { calculateShippingFee } from '@/lib/shipping'
import { isQuoteOnlyProduct } from '@/lib/distributor-rules'
import { getSiteUrl } from '@/lib/site-url'

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
      console.error('[siparis-olustur] Zod validation error:', parsed.error.format())
      const firstIssue = parsed.error.issues[0]
      const field = firstIssue?.path?.join('.') || 'form'
      const msg = firstIssue?.message || 'Geçersiz veri'
      return NextResponse.json({ 
        error: `Geçersiz veri (${field}: ${msg})`, 
        details: parsed.error.flatten() 
      }, { status: 400 })
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
    const rawUrunIds = urunler.map((u) => u.urun_id).filter((id): id is string => Boolean(id))
    const urunIds = Array.from(new Set(rawUrunIds))
    if (urunIds.length === 0) {
      return NextResponse.json({ error: 'Sepette geçerli ürün bulunamadı' }, { status: 400 })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const uuidIds = urunIds.filter((id) => uuidRegex.test(id))
    const slugIds = urunIds.filter((id) => !uuidRegex.test(id))

    const [akdagUuidRes, akdagSlugRes, sescimUuidRes, sescimSlugRes, sescimFiyatlarRes] = await Promise.all([
      uuidIds.length > 0
        ? akdagDb.from('urunler').select('id, slug, ad, kategori, alt_kategori, fiyat, indirimli_fiyat, para_birimi, stok_durumu, stok_adedi, marka').in('id', uuidIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      slugIds.length > 0
        ? akdagDb.from('urunler').select('id, slug, ad, kategori, alt_kategori, fiyat, indirimli_fiyat, para_birimi, stok_durumu, stok_adedi, marka').in('slug', slugIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      uuidIds.length > 0
        ? db.from('urunler').select('id, slug, ad, kategori:kategori_id, alt_kategori:alt_kategori_id, fiyat, indirimli_fiyat, para_birimi, stok_durumu, stok_adedi, marka').in('id', uuidIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      slugIds.length > 0
        ? db.from('urunler').select('id, slug, ad, kategori:kategori_id, alt_kategori:alt_kategori_id, fiyat, indirimli_fiyat, para_birimi, stok_durumu, stok_adedi, marka').in('slug', slugIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      db.from('sescim_fiyatlar').select('urun_id, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, fiyat_sorunuz').in('urun_id', urunIds)
    ])

    const dbProducts = [
      ...(sescimUuidRes.data || []).map((p: any) => ({ ...p, kaynak: 'sescim' })),
      ...(sescimSlugRes.data || []).map((p: any) => ({ ...p, kaynak: 'sescim' })),
      ...(akdagUuidRes.data || []).map((p: any) => ({ ...p, kaynak: 'akdag' })),
      ...(akdagSlugRes.data || []).map((p: any) => ({ ...p, kaynak: 'akdag' }))
    ]

    if (dbProducts.length === 0) {
      console.error('[siparis-olustur] dbProducts empty for urunIds:', urunIds, {
        akdagErr: akdagUuidRes.error || akdagSlugRes.error,
        sescimErr: sescimUuidRes.error || sescimSlugRes.error
      })
      return NextResponse.json({
        error: 'Sepetinizdeki ürünün güncel fiyatı doğrulanamadı. Lütfen sepeti temizleyip ürünü tekrar sepete ekleyiniz.'
      }, { status: 400 })
    }

    const sescimFiyatlarMap = new Map<string, any>()
    ;(sescimFiyatlarRes.data || []).forEach((f: any) => {
      sescimFiyatlarMap.set(f.urun_id, f)
    })

    // Ürünlerin gerçek fiyatlarını hesapla ve doğrulanmış sepet dizisini oluştur
    // Fiyat Hiyerarşisi:
    // 1. Öncelik: sescim_fiyat (veya sescim_indirimli_fiyat)
    // 2. Öncelik: fiyat (liste satış fiyatı) - Bayi fiyatı ASLA kullanılmaz
    let serverAraToplam = 0
    const verifiedUrunler: any[] = []

    for (const item of urunler) {
      const dbProd = dbProducts.find((p) => p.id === item.urun_id || p.slug === item.urun_id)
      if (!dbProd) {
        return NextResponse.json({ error: `Ürün bulunamadı: ${item.ad}` }, { status: 400 })
      }

      const sescimPricing = sescimFiyatlarMap.get(dbProd.id)
      const quoteOnly = isQuoteOnlyProduct({
        marka: dbProd.marka,
        fiyat_sorunuz: sescimPricing?.fiyat_sorunuz === true
      })

      if (quoteOnly) {
        return NextResponse.json({
          error: `"${dbProd.ad}" distribütör kuralları gereği doğrudan internet üzerinden satılamaz. Lütfen fiyat teklifi alınız.`
        }, { status: 400 })
      }

      const sescimFiyat = (sescimPricing?.sescim_fiyat !== null && sescimPricing?.sescim_fiyat !== undefined && Number(sescimPricing.sescim_fiyat) > 0)
        ? Number(sescimPricing.sescim_fiyat)
        : null

      const sescimIndirimli = (sescimPricing?.sescim_indirimli_fiyat !== null && sescimPricing?.sescim_indirimli_fiyat !== undefined && Number(sescimPricing.sescim_indirimli_fiyat) > 0)
        ? Number(sescimPricing.sescim_indirimli_fiyat)
        : null

      const listeFiyat = Number(dbProd.fiyat || 0)
      const listeIndirimli = (dbProd.indirimli_fiyat !== null && dbProd.indirimli_fiyat !== undefined && Number(dbProd.indirimli_fiyat) > 0)
        ? Number(dbProd.indirimli_fiyat)
        : null

      const basePrice = sescimFiyat !== null ? sescimFiyat : (listeIndirimli !== null ? listeIndirimli : listeFiyat)
      const finalUnitCurrencyPrice = sescimIndirimli !== null ? sescimIndirimli : basePrice
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

    let derlenmisFaturaAdresi = teslimat_adresi || ''
    if (fatura_tipi === 'kurumsal') {
      derlenmisFaturaAdresi = `[Kurumsal Fatura] Firma: ${firma_unvani || '-'} | VD: ${vergi_dairesi || '-'} | VN: ${vergi_no || '-'} | Adres: ${teslimat_adresi || ''}`
    }

    let compiledNotlar = notlar || ''
    const ekNot = `[Kurlar: USD=${dolarKuru}, EUR=${euroKuru}] [IP: ${ip}]`
    compiledNotlar = compiledNotlar ? `${compiledNotlar} | ${ekNot}` : ekNot

    // user_id'nin profiles tablosunda yer aldığından emin ol (foreign key hatasını önlemek için)
    let validUserId = user_id || null
    if (validUserId) {
      try {
        const { data: existingProfile } = await db
          .from('profiles')
          .select('id')
          .eq('id', validUserId)
          .maybeSingle()

        if (!existingProfile) {
          const parts = (ad_soyad || '').trim().split(' ')
          const ad = parts[0] || 'Müşteri'
          const soyad = parts.slice(1).join(' ') || ''
          const { error: upsertErr } = await db.from('profiles').upsert({
            id: validUserId,
            ad,
            soyad,
            telefon: telefon || null,
            rol: 'user'
          })
          if (upsertErr) {
            console.warn('[siparis-olustur] profiles upsert başarısız, user_id null yapılıyor:', upsertErr.message)
            validUserId = null
          }
        }
      } catch (pErr) {
        console.warn('[siparis-olustur] profil kontrol hatası, user_id null yapılıyor:', pErr)
        validUserId = null
      }
    }

    const isKart = (odeme_tipi === 'kredi_karti' || odeme_tipi === 'kart')

    const insertPayload: any = {
      user_id: validUserId,
      toplam_tutar: serverGenelToplam,
      ad_soyad: ad_soyad || 'Müşteri',
      email: email,
      telefon: telefon || '',
      notlar: compiledNotlar,
      odeme_tipi: odeme_tipi || 'kart',
      odeme_durumu: isKart ? 'odeme_bekliyor' : 'beklemede',
      // Kart ödemelerinde PayTR onayı gelene kadar durum 'odeme_bekliyor' yapılır.
      // Bu sayede ödeme yapılmadığı sürece admine veya müşteriye sipariş düştü bildirimi gitmez.
      durum: isKart ? 'odeme_bekliyor' : 'beklemede',
      teslimat_adresi: teslimat_adresi || null,
      fatura_adresi: derlenmisFaturaAdresi || null,
      kupon_kodu: cleanKuponKodu || null,
      indirim_tutari: appliedDiscount,
      kargo_ucreti: serverKargoUcreti,
    }

    let { data: siparis, error: dbErr } = await db
      .from('siparisler')
      .insert(insertPayload)
      .select('siparis_no, id')
      .single()

    // Eğer user_id foreign key hatası verirse user_id olmadan hemen tekrar dene (sipariş asla bloke olmasın)
    if (dbErr && (dbErr.message?.includes('user_id_fkey') || dbErr.message?.includes('foreign key') || dbErr.message?.includes('profiles'))) {
      console.warn('[siparis-olustur] user_id foreign key hatası, user_id null olarak tekrar deneniyor:', dbErr.message)
      insertPayload.user_id = null
      const retry = await db
        .from('siparisler')
        .insert(insertPayload)
        .select('siparis_no, id')
        .single()
      siparis = retry.data
      dbErr = retry.error
    }

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
      console.error('[siparis-olustur] siparisler insert error:', dbErr)
      return NextResponse.json({ error: dbErr?.message || 'Sipariş oluşturulamadı' }, { status: 400 })
    }

    // Sipariş kalemlerini siparis_kalemleri tablosuna ekle
    const kalemlerPayload = verifiedUrunler.map((u) => ({
      siparis_id: siparis.id,
      urun_id: u.kaynak === 'sescim' ? u.urun_id : null,
      urun_adi: u.ad || 'Ürün',
      adet: Number(u.adet) || 1,
      birim_fiyat: Number(u.fiyat) || 0,
    }))

    try {
      const { error: kalErr } = await db.from('siparis_kalemleri').insert(kalemlerPayload)
      if (kalErr) {
        // FK hatası durumunda urun_id null olarak tekrar dene
        console.warn('[siparis-olustur] siparis_kalemleri ilk deneme hatası, urun_id null deneniyor:', kalErr.message)
        await db.from('siparis_kalemleri').insert(kalemlerPayload.map(k => ({ ...k, urun_id: null })))
      }
    } catch (kErr) {
      console.error('[siparis-olustur] siparis_kalemleri ekleme hatası:', kErr)
    }

    // Kart siparişlerinde PayTR token'ını anında burada üretip tek yanıtta döndür (Gecikmeyi önler)
    let paytrToken: string | null = null
    if (isKart) {
      try {
        const PAYTR_MERCHANT_ID = process.env.PAYTR_MERCHANT_ID
        const PAYTR_MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY
        const PAYTR_MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT

        if (PAYTR_MERCHANT_ID && PAYTR_MERCHANT_KEY && PAYTR_MERCHANT_SALT) {
          const tutarKurus = Math.round(serverGenelToplam * 100).toString()
          const itemsSum = verifiedUrunler.reduce((sum, u) => sum + (Number(u.fiyat || 0) * Number(u.adet || 1)), 0)

          let basketArray: [string, string, number][] = []
          if (Math.abs(itemsSum - serverGenelToplam) < 0.05) {
            basketArray = verifiedUrunler.map((u) => [
              String(u.ad || 'Ürün').slice(0, 100).replace(/[^\w\s\-\.\,\(\)çğıöşüÇĞİÖŞÜ]/gi, ''),
              Number(u.fiyat).toFixed(2),
              Number(u.adet || 1)
            ])
          } else {
            const ozet = verifiedUrunler.map((u) => `${u.ad} (x${u.adet})`).join(', ').slice(0, 90)
            basketArray = [
              [`${ozet || 'Sipariş Bedeli'}`, serverGenelToplam.toFixed(2), 1]
            ]
          }

          const sepetIcerik = JSON.stringify(basketArray)
          const sepetBase64 = Buffer.from(sepetIcerik).toString('base64')
          const test_mode = process.env.PAYTR_TEST_MODE === '1' ? '1' : '0'
          const merchant_oid = siparis.siparis_no.replace(/[^a-zA-Z0-9]/g, '')
          const siteUrl = getSiteUrl()

          const hashStr = [
            PAYTR_MERCHANT_ID,
            ip,
            merchant_oid,
            email,
            tutarKurus,
            sepetBase64,
            '0', // no_installment
            '0', // max_installment
            'TL',
            test_mode,
            PAYTR_MERCHANT_SALT,
          ].join('')

          const tokenSig = crypto.createHmac('sha256', PAYTR_MERCHANT_KEY).update(hashStr).digest('base64')

          const params = new URLSearchParams({
            merchant_id: PAYTR_MERCHANT_ID,
            user_ip: ip,
            merchant_oid,
            email,
            payment_amount: tutarKurus,
            paytr_token: tokenSig,
            user_basket: sepetBase64,
            user_address: teslimat_adresi || 'Türkiye',
            debug_on: '1',
            no_installment: '0',
            max_installment: '0',
            user_name: ad_soyad || 'Müşteri',
            user_phone: telefon || '',
            merchant_ok_url: `${siteUrl}/odeme/basarili`,
            merchant_fail_url: `${siteUrl}/odeme/hata`,
            timeout_limit: '30',
            currency: 'TL',
            test_mode,
            lang: 'tr',
          })

          const paytrRes = await fetch('https://www.paytr.com/odeme/api/get-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          })

          const paytrData = await paytrRes.json()
          if (paytrData.status === 'success') {
            paytrToken = paytrData.token
          } else {
            console.error('[siparis-olustur] PayTR get-token hatası:', paytrData.reason)
          }
        }
      } catch (paytrErr) {
        console.error('[siparis-olustur] PayTR bağlantı hatası:', paytrErr)
      }
    }

    // Havale siparişlerinde stok hemen rezerve edilir
    // Kart siparişlerinde ise stok PayTR ödeme onayı geldiğinde (paytr-callback) düşülür.
    if (!isKart) {
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
    }

    // Kupon kullanım sayısını artır
    if (cleanKuponKodu) {
      const { error: rpcErr } = await db.rpc('increment_kupon_kullanim', { p_kod: cleanKuponKodu })
      if (rpcErr) {
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
      urunler: urunler.map((u) => ({
        ...u,
        fotograf: u.fotograf ?? undefined,
      })),
      toplam_tutar,
      odeme_tipi: odeme_tipi || 'havale',
      notlar: notlar ?? undefined,
    }

    // E-postalar: YALNIZCA Havale siparişlerinde hemen gider.
    // Kredi kartı siparişlerinde ise ödeme ALINMADAN müşteriye veya admine ASLA bildirim gitmez;
    // kart ödemesi PayTR tarafından onaylandığı an (paytr-callback) iki tarafa da onay maili gönderilir.
    let emailError: string | undefined
    if (!isKart) {
      try {
        await sendEmail(
          email,
          `Siparişiniz Alındı — ${siparis.siparis_no} | sescim.com`,
          musterionayHTML(emailData)
        )
        const adminEmail = process.env.ADMIN_EMAIL || 'info@sescim.com'
        await sendEmail(
          adminEmail,
          `🔔 Yeni Havale Siparişi: ${siparis.siparis_no} — ${toplam_tutar.toLocaleString('tr-TR')} ₺`,
          adminBildirimHTML(emailData)
        )
      } catch (mailErr) {
        emailError = (mailErr as Error).message
        console.error('[siparis-olustur] E-posta gönderilemedi, sipariş oluşturuldu:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      siparis_no: siparis.siparis_no,
      id: siparis.id,
      paytr_token: paytrToken,
      ...(emailError ? { email_error: 'E-posta gönderilemedi, siparişiniz kaydedildi.' } : {}),
    })
  } catch (e) {
    console.error('Sipariş oluşturma hatası:', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
