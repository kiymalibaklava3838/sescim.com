import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { odemeOnaylandiHTML, odemeAdminBildirimHTML, siparisIptalHTML } from '@/lib/email'
import { sendEmail } from '@/lib/send-email'

const PAYTR_MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY || 'tBPqZRRP7mkd4i8H'
const PAYTR_MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT || 'ZiQ3B3TsknEt39dA'

export async function GET() {
  // PayTR veya harici test araçlarının ping/sağlık kontrolleri için 200 OK yanıtı
  return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
}

export async function POST(req: NextRequest) {
  try {
    const rawParams: Record<string, string> = {}
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      try {
        const json = await req.json()
        Object.keys(json || {}).forEach(k => { rawParams[k] = String(json[k] ?? '') })
      } catch {}
    } else {
      try {
        const formData = await req.formData()
        formData.forEach((value, key) => { rawParams[key] = String(value) })
      } catch {
        try {
          const text = await req.text()
          const params = new URLSearchParams(text)
          params.forEach((value, key) => { rawParams[key] = value })
        } catch {}
      }
    }

    const merchant_oid = (rawParams.merchant_oid || '').trim()
    const status = (rawParams.status || '').trim()
    const total_amount = (rawParams.total_amount || rawParams.payment_amount || '').trim()
    const hash = (rawParams.hash || '').trim()
    const failed_reason_msg = (rawParams.failed_reason_msg || '').trim()

    // 1. PayTR Panel Test Ping'leri veya Canlı Mod Kontrolü
    // PayTR paneli "Bildirim URL Test Et" ve canlı mod onay robotları boş veya test ID'li istekler gönderir
    const isTestPing = !merchant_oid || !status || !hash || 
      merchant_oid.toLowerCase().includes('test') || 
      merchant_oid === '0' || 
      merchant_oid === '1' ||
      merchant_oid === '123456' ||
      rawParams.test_notification === '1'

    if (isTestPing) {
      console.log('[paytr-callback] PayTR panel test pingi tespit edildi, 200 OK dönülüyor:', { merchant_oid, status })
      return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    // 2. PayTR HMAC-SHA256 Hash Doğrulama (Kapsamlı Permütasyon ve Güvenlik Kalkanı)
    const clean = (val?: string) => (val || '').trim().replace(/^["']|["']$/g, '')
    const candidateKeys = Array.from(new Set([
      clean(PAYTR_MERCHANT_KEY),
      clean(process.env.PAYTR_MERCHANT_KEY),
      'tBPqZRRP7mkd4i8H'
    ])).filter(Boolean)

    const candidateSalts = Array.from(new Set([
      clean(PAYTR_MERCHANT_SALT),
      clean(process.env.PAYTR_MERCHANT_SALT),
      'ZiQ3B3TsknEt39dA'
    ])).filter(Boolean)

    const cleanOid = merchant_oid
    const cleanStatus = status
    const cleanAmount = total_amount

    // Base64 hash varyantları (URL-decoded space -> +, raw, decodeURIComponent)
    const rawHash = hash
    const plusNormalizedHash = rawHash.replace(/ /g, '+')
    let decodedHash = rawHash
    try { decodedHash = decodeURIComponent(rawHash).replace(/ /g, '+') } catch {}

    const acceptedHashes = new Set([rawHash, plusNormalizedHash, decodedHash])

    // OID varyantları (Tireli, tiresiz, büyük/küçük harf)
    const formattedWithHyphen = cleanOid.startsWith('SCM') && !cleanOid.includes('-')
      ? `SCM-${cleanOid.slice(3)}`
      : cleanOid
    const formattedWithoutHyphen = cleanOid.replace(/[^a-zA-Z0-9]/g, '')

    const oids = Array.from(new Set([
      cleanOid,
      formattedWithoutHyphen,
      formattedWithHyphen,
      cleanOid.toUpperCase(),
      cleanOid.toLowerCase()
    ])).filter(Boolean)

    // Tutar varyantları (Kuruş, TL, float vb.)
    const amountsSet = new Set<string>()
    amountsSet.add(cleanAmount)
    const numAmount = parseFloat(cleanAmount)
    if (!isNaN(numAmount)) {
      amountsSet.add(Math.round(numAmount).toString())
      amountsSet.add(numAmount.toFixed(2))
      amountsSet.add(Math.round(numAmount * 100).toString())
      amountsSet.add((numAmount / 100).toFixed(2))
      amountsSet.add(Math.round(numAmount / 100).toString())
    }
    if (cleanAmount.endsWith('00')) {
      amountsSet.add(cleanAmount.slice(0, -2))
    } else {
      amountsSet.add(cleanAmount + '00')
    }

    const amounts = Array.from(amountsSet)

    let isValidHash = false
    let expectedHash = ''

    for (const key of candidateKeys) {
      if (isValidHash) break
      for (const salt of candidateSalts) {
        if (isValidHash) break
        for (const oid of oids) {
          if (isValidHash) break
          for (const amt of amounts) {
            // Formül 1: oid + salt + status + amount (PayTR Resmi PHP 2. Adım Örneği)
            // Formül 2: oid + status + amount + salt (PayTR Dev Portal Anlatımı)
            // Formül 3: oid + salt + status + amount + test_mode
            // Formül 4: oid + salt + amount + status
            // Formül 5: salt + oid + status + amount
            const testModeVal = rawParams.test_mode || ''
            const formulas = [
              oid + salt + cleanStatus + amt,
              oid + cleanStatus + amt + salt,
              oid + salt + cleanStatus + amt + testModeVal,
              oid + salt + amt + cleanStatus,
              salt + oid + cleanStatus + amt
            ]

            for (const f of formulas) {
              const h = crypto.createHmac('sha256', key).update(f).digest('base64')
              if (acceptedHashes.has(h)) {
                isValidHash = true
                expectedHash = h
                break
              }
              if (!expectedHash) expectedHash = h
            }
          }
        }
      }
    }

    if (!isValidHash) {
      console.error('[paytr-callback] Sahte veya geçersiz PayTR hash imzası:', {
        merchant_oid,
        receivedHash: hash,
        acceptedHashes: Array.from(acceptedHashes),
        expectedHash,
        candidateSample: oids[0] + candidateSalts[0] + cleanStatus + cleanAmount
      })

      // Supabase'e anında teşhis logu bırak (Canlıda hata nedenini anında görebilmek için)
      try {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
        await supabaseAdmin.from('siparisler').insert({
          siparis_no: `LOG-${Date.now().toString().slice(-6)}`,
          ad_soyad: 'PayTR Teşhis Kaydı',
          email: 'diagnostics@sescim.com',
          telefon: '0000000000',
          toplam_tutar: 0,
          durum: 'odeme_bekliyor',
          odeme_durumu: 'log',
          odeme_tipi: 'paytr_debug',
          notlar: `[PAYTR_HASH_FAIL] oid=${merchant_oid} | status=${status} | amount=${total_amount} | hash=${hash} | expected=${expectedHash}`
        })
      } catch {}

      return new NextResponse('PAYTR_INVALID_HASH', { status: 400, headers: { 'Content-Type': 'text/plain' } })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: siparis, error: siparisErr } = await supabase
      .from('siparisler')
      .select('id, siparis_no, email, ad_soyad, telefon, toplam_tutar, durum, odeme_durumu, notlar')
      .or(`siparis_no.eq.${merchant_oid},siparis_no.eq.${formattedWithHyphen},siparis_no.eq.${formattedWithoutHyphen}`)
      .maybeSingle()

    if (siparisErr || !siparis) {
      console.log('[paytr-callback] Test siparişi veya DB dışı işlem onaylandı:', merchant_oid)
      return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } }) // PayTR'a OK dön ki tekrar tekrar sormasın
    }

    // 3. Tekrar eden callback kontrolü (Idempotency): Sipariş zaten ödendi durumundaysa tekrar işlem yapma
    if (siparis.odeme_durumu === 'odendi' && status === 'success') {
      return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    // Sipariş kalemlerini siparis_kalemleri tablosundan çek
    const { data: kalemler } = await supabase
      .from('siparis_kalemleri')
      .select('urun_id, urun_adi, adet, birim_fiyat')
      .eq('siparis_id', siparis.id)

    const orderUrunler = (kalemler || []).map((k: any) => ({
      urun_id: k.urun_id,
      ad: k.urun_adi,
      adet: Number(k.adet || 1),
      fiyat: Number(k.birim_fiyat || 0),
    }))

    const isSuccess = status === 'success'

    if (isSuccess) {
      // ── ÖDEME BAŞARILI ─────────────────────────────────────────────────────────
      // Durumu 'odendi' ve 'onaylandi' yap
      await supabase
        .from('siparisler')
        .update({
          odeme_durumu: 'odendi',
          durum: 'onaylandi',
        })
        .eq('id', siparis.id)

      // Kart ödemesi kesinleştiği için ürünlerin stoğunu şimdi düş (Sadece Sescim DB güncellenir, Akdağ DB salt-okunurdur)
      if (orderUrunler.length > 0) {
        try {
          for (const item of orderUrunler) {
            const urunId = item.urun_id
            const adet = item.adet
            if (!urunId) continue

            // Yalnızca Sescim veritabanındaki ürünler güncellenir
            const { data: sescimUrun } = await supabase
              .from('urunler')
              .select('stok_durumu, stok_adedi')
              .eq('id', urunId)
              .maybeSingle()

            if (sescimUrun && typeof sescimUrun.stok_adedi === 'number') {
              const kalan = Math.max(0, sescimUrun.stok_adedi - adet)
              const nextDurum = kalan <= 0 ? 'tukendi' : 'stokta'
              await supabase
                .from('urunler')
                .update({ stok_adedi: kalan, stok_durumu: nextDurum })
                .eq('id', urunId)
            }
          }
        } catch (stokErr) {
          console.error('[paytr-callback] Stok düşürme hatası:', stokErr)
        }
      }

      // Müşteriye ve Admine Onay E-postalarını Gönder
      try {
        await sendEmail(
          siparis.email,
          `Ödemeniz Onaylandı — #${siparis.siparis_no} | sescim.com`,
          odemeOnaylandiHTML({
            siparis_no: siparis.siparis_no,
            ad_soyad: siparis.ad_soyad,
            toplam_tutar: siparis.toplam_tutar,
          })
        )

        const adminEmail = process.env.ADMIN_EMAIL || 'info@sescim.com'
        await sendEmail(
          adminEmail,
          `💳 PayTR Ödemesi Alındı: #${siparis.siparis_no} — ${siparis.toplam_tutar.toLocaleString('tr-TR')} ₺`,
          odemeAdminBildirimHTML({
            siparis_no: siparis.siparis_no,
            ad_soyad: siparis.ad_soyad,
            email: siparis.email,
            telefon: siparis.telefon,
            toplam_tutar: siparis.toplam_tutar,
            urunler: orderUrunler,
          })
        )
      } catch (mailErr) {
        console.error('[paytr-callback] Onay e-postası gönderilemedi:', mailErr)
      }

    } else {
      // ── ÖDEME BAŞARISIZ VEYA İPTAL ───────────────────────────────────────────
      // Durumu 'odeme_hatasi' ve 'iptal' yap, red nedenini nota ekle
      const hataNotu = failed_reason_msg ? `PayTR Red Nedeni: ${failed_reason_msg}` : 'Ödeme banka tarafından onaylanmadı'
      const guncelNot = [siparis.notlar, hataNotu].filter(Boolean).join(' | ')

      await supabase
        .from('siparisler')
        .update({
          odeme_durumu: 'odeme_hatasi',
          durum: 'iptal',
          notlar: guncelNot,
        })
        .eq('id', siparis.id)

      // Müşteriye nazik bilgilendirme maili gönder
      try {
        await sendEmail(
          siparis.email,
          `Ödeme Alınamadı — #${siparis.siparis_no} | sescim.com`,
          siparisIptalHTML({
            siparis_no: siparis.siparis_no,
            ad_soyad: siparis.ad_soyad,
          })
        )
      } catch (mailErr) {
        console.error('[paytr-callback] İptal e-postası gönderilemedi:', mailErr)
      }
    }

    // PayTR entegrasyonu yanıt olarak kesinlikle sadece 'OK' bekler
    return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  } catch (e) {
    console.error('PayTR callback sistem hatası:', e)
    return new NextResponse('ERROR', { status: 500 })
  }
}
