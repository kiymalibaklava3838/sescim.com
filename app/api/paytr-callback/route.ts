import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import {
  odemeOnaylandiHTML,
  odemeAdminBildirimHTML,
  odemeBasarisizHTML,
} from '@/lib/email'
import { sendEmail } from '@/lib/send-email'
import { deductSescimStock } from '@/lib/product-stock'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

function getIstanbulTime(): string {
  return new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
}

/** HTML enjeksiyonunu (XSS) önlemek için HTML gövdesine basılan metinleri güvenli hale getirir */
function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Denetim ve muhasebe için PayTR olayını odeme_olaylari tablosuna ekler */
async function recordPaymentEvent(
  db: any,
  payload: {
    merchant_oid: string
    status: string
    total_amount?: number
    payment_amount?: number
    failed_reason_msg?: string
  }
) {
  const { error } = await db.from('odeme_olaylari').insert({
    merchant_oid: payload.merchant_oid,
    status: payload.status,
    total_amount: payload.total_amount,
    payment_amount: payload.payment_amount,
    failed_reason_msg: payload.failed_reason_msg ? payload.failed_reason_msg.slice(0, 255) : null,
  })

  // 23505: Unique constraint violation (bu olay daha önce kaydedilmiş, beklenen durum)
  if (error && error.code !== '23505') {
    console.warn('[paytr-callback] odeme_olaylari tablosuna yazılamadı:', error.message)
  }
}

export async function GET() {
  return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
}

export async function POST(req: NextRequest) {
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. GİRDİ AYRIŞTIRMA (Form-Data, URL-Encoded & JSON Desteği)
    // ─────────────────────────────────────────────────────────────────────────
    const rawParams: Record<string, string> = {}
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      try {
        const json = await req.json()
        Object.keys(json || {}).forEach((k) => {
          rawParams[k] = String(json[k] ?? '').trim()
        })
      } catch (err: any) {
        console.warn('[paytr-callback] JSON ayrıştırma hatası:', err.message)
      }
    } else {
      try {
        const formData = await req.formData()
        formData.forEach((value, key) => {
          rawParams[key] = String(value).trim()
        })
      } catch {
        try {
          const text = await req.text()
          const params = new URLSearchParams(text)
          params.forEach((value, key) => {
            rawParams[key] = String(value).trim()
          })
        } catch (err: any) {
          console.warn('[paytr-callback] FormData/URLSearchParams ayrıştırma hatası:', err.message)
        }
      }
    }

    const merchant_oid = (rawParams.merchant_oid || '').trim()
    const status = (rawParams.status || '').trim()
    const total_amount = (rawParams.total_amount || '').trim()
    const payment_amount = (rawParams.payment_amount || '').trim()
    const hash = (rawParams.hash || '').trim()
    const failed_reason_msg = (rawParams.failed_reason_msg || '').trim().slice(0, 200)
    const test_mode = (rawParams.test_mode || '').trim()

    // ─────────────────────────────────────────────────────────────────────────
    // 2. AYRIŞTIRMA VE TEST PİNGİ KONTROLÜ
    // ─────────────────────────────────────────────────────────────────────────
    if (!merchant_oid) {
      console.warn('[paytr-callback] merchant_oid parametresi eksik veya okunamadı!', {
        contentType,
        paramKeys: Object.keys(rawParams),
      })
      return new NextResponse('MISSING_MERCHANT_OID', { status: 400, headers: { 'Content-Type': 'text/plain' } })
    }

    // PayTR paneli "Bildirim URL Test Et" kontrolü
    const isTestPing =
      merchant_oid === 'test' ||
      merchant_oid === '0' ||
      merchant_oid === '1' ||
      merchant_oid === '123456' ||
      rawParams.test_notification === '1'

    if (isTestPing) {
      console.log('[paytr-callback] PayTR panel test pingi yanıtlandı:', { merchant_oid, status })
      return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. HMAC-SHA256 HASH İMZA DOĞRULAMASI (GÜVENLİK DUVARI)
    // ─────────────────────────────────────────────────────────────────────────
    const merchantKey = process.env.PAYTR_MERCHANT_KEY
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT

    if (!merchantKey || !merchantSalt) {
      console.error('[paytr-callback] KRİTİK: PAYTR_MERCHANT_KEY veya PAYTR_MERCHANT_SALT ortam değişkenleri eksik!')
      return new NextResponse('CONFIG_ERROR', { status: 500, headers: { 'Content-Type': 'text/plain' } })
    }

    // Hash hesabı: PayTR standardı gereği her zaman total_amount ile hesaplanır
    const hashString = merchant_oid + merchantSalt + status + total_amount
    const expectedHash = crypto
      .createHmac('sha256', merchantKey)
      .update(hashString)
      .digest('base64')

    const normalizedReceivedHash = hash.replace(/ /g, '+')
    const expectedBuffer = Buffer.from(expectedHash, 'utf8')
    const receivedBuffer = Buffer.from(normalizedReceivedHash, 'utf8')

    const isHashValid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer)

    if (!isHashValid) {
      console.error('[paytr-callback] Güvenlik uyarısı: Geçersiz PayTR hash imzası reddedildi!', {
        merchant_oid,
        status,
        total_amount,
      })
      return new NextResponse('PAYTR_INVALID_HASH', { status: 400, headers: { 'Content-Type': 'text/plain' } })
    }

    // Canlı ortamda test_mode=1 bildirimlerini engelle
    if (process.env.NODE_ENV === 'production' && process.env.PAYTR_TEST_MODE !== '1' && test_mode === '1') {
      console.warn('[paytr-callback] Canlı ortamda test_mode bildirimi yok sayıldı:', { merchant_oid })
      return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. SİPARİŞİ VERİTABANINDA BULMA (Enjeksiyon Korumalı)
    // ─────────────────────────────────────────────────────────────────────────
    const db = supabaseAdmin()
    const hyphenatedOid =
      merchant_oid.startsWith('SCM') && !merchant_oid.includes('-')
        ? `SCM-${merchant_oid.slice(3)}`
        : merchant_oid

    const { data: siparis, error: siparisErr } = await db
      .from('siparisler')
      .select('id, siparis_no, user_id, email, ad_soyad, telefon, toplam_tutar, durum, odeme_durumu, notlar, stok_dusuldu, onay_maili_gonderildi, odeme_hata_maili_gonderildi, kupon_kodu')
      .in('siparis_no', [merchant_oid, hyphenatedOid])
      .maybeSingle()

    if (siparisErr) {
      console.error('[paytr-callback] Sipariş sorgulanırken DB hatası:', siparisErr.message)
      return new NextResponse('DB_ERROR', { status: 500, headers: { 'Content-Type': 'text/plain' } })
    }

    if (!siparis) {
      console.warn('[paytr-callback] Geçerli hash ancak eşleşmeyen sipariş:', merchant_oid)
      return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    const timeStr = getIstanbulTime()
    const adminEmail = process.env.ADMIN_EMAIL || 'info@sescim.com'
    const isSuccess = status === 'success'

    // Olay kaydı
    const parsedTotalAmount = Number(total_amount) / 100
    const parsedPaymentAmount = payment_amount ? Number(payment_amount) / 100 : parsedTotalAmount
    await recordPaymentEvent(db, {
      merchant_oid: siparis.siparis_no,
      status,
      total_amount: Number.isFinite(parsedTotalAmount) ? parsedTotalAmount : undefined,
      payment_amount: Number.isFinite(parsedPaymentAmount) ? parsedPaymentAmount : undefined,
      failed_reason_msg,
    })

    // ─────────────────────────────────────────────────────────────────────────
    // 5. İPTAL EDİLMİŞ SİPARİŞE GELEN ÖDEME KONTROLÜ
    // ─────────────────────────────────────────────────────────────────────────
    if (siparis.durum === 'iptal') {
      if (isSuccess && siparis.odeme_durumu !== 'odendi') {
        const { data: cancelClaim, error: cancelErr } = await db
          .from('siparisler')
          .update({
            odeme_durumu: 'odendi_iptal_siparis',
            updated_at: new Date().toISOString(),
          })
          .eq('id', siparis.id)
          .neq('odeme_durumu', 'odendi_iptal_siparis')
          .select('id')

        if (cancelErr) {
          console.error('[paytr-callback] İptal sipariş odeme_durumu güncellenirken hata:', cancelErr.message)
          return new NextResponse('DB_ERROR', { status: 500, headers: { 'Content-Type': 'text/plain' } })
        }

        if (cancelClaim && cancelClaim.length > 0) {
          try {
            await sendEmail(
              adminEmail,
              `⚠️ ACİL: İptal Edilmiş Siparişe Ödeme Geldi (#${siparis.siparis_no})`,
              `<p><strong>#${escapeHtml(siparis.siparis_no)}</strong> numaralı iptal edilmiş sipariş için PayTR üzerinden ödeme tahsil edildi.</p>
               <p>Ödenen Tutar: <strong>${escapeHtml((Number(total_amount) / 100).toFixed(2))} TL</strong></p>
               <p>Müşteri: <strong>${escapeHtml(siparis.ad_soyad || '')}</strong> (${escapeHtml(siparis.email || '-')}, ${escapeHtml(siparis.telefon || '-')})</p>
               <p>Lütfen müşteriye iade yapın veya siparişi manuel olarak yeniden işleme alın.</p>`
            )
          } catch (mErr: any) {
            console.error('[paytr-callback] İptal sipariş admin mail hatası:', mErr.message)
          }
        }
      }

      return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    if (isSuccess) {
      // ───────────────────────────────────────────────────────────────────────
      // 6. ÖDEME BAŞARILI: TAKSİT VE TUTAR DOĞRULAMASI
      // ───────────────────────────────────────────────────────────────────────
      const expectedKurus = Math.round(Number(siparis.toplam_tutar) * 100)
      const totalAmountKurus = parseInt(total_amount, 10)
      const basePaymentKurus = payment_amount ? parseInt(payment_amount, 10) : totalAmountKurus

      // Kural: NaN korumalı baz tutar kontrolü + çekilen tutar >= beklenen
      const isAmountMismatch =
        isNaN(totalAmountKurus) ||
        isNaN(basePaymentKurus) ||
        Math.abs(basePaymentKurus - expectedKurus) > 5 ||
        totalAmountKurus < expectedKurus - 5

      if (isAmountMismatch) {
        console.error('[paytr-callback] KRİTİK GÜVENLİK: Tutar uyuşmazlığı tespit edildi!', {
          siparis_no: siparis.siparis_no,
          beklenenTL: siparis.toplam_tutar,
          beklenenKurus: expectedKurus,
          basePaymentKurus,
          totalAmountKurus,
        })

        const { error: mismatchErr } = await db
          .from('siparisler')
          .update({
            odeme_durumu: 'tutar_uyusmazligi',
            updated_at: new Date().toISOString(),
          })
          .eq('id', siparis.id)
          .neq('odeme_durumu', 'odendi')

        if (mismatchErr) {
          console.error('[paytr-callback] Tutar uyuşmazlığı güncellenirken DB hatası:', mismatchErr.message)
        }

        try {
          await sendEmail(
            adminEmail,
            `⚠️ DİKKAT: Şüpheli Ödeme (Tutar Uyuşmazlığı) — #${siparis.siparis_no}`,
            `<p><strong>#${escapeHtml(siparis.siparis_no)}</strong> numaralı sipariş için PayTR'den gelen tutar ile sipariş tutarı uyuşmuyor!</p>
             <p>Sipariş Tutarı: <strong>${escapeHtml(Number(siparis.toplam_tutar).toLocaleString('tr-TR'))} TL</strong></p>
             <p>PayTR Çekilen: <strong>${escapeHtml((totalAmountKurus / 100).toFixed(2))} TL</strong> (Baz Tutar: ${escapeHtml((basePaymentKurus / 100).toFixed(2))} TL)</p>
             <p>Sipariş otomatik onaylanmadı ve 'tutar_uyusmazligi' olarak işaretlendi.</p>`
          )
        } catch (mErr: any) {
          console.error('[paytr-callback] Tutar uyuşmazlığı admin mail hatası:', mErr.message)
        }

        return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
      }

      // ───────────────────────────────────────────────────────────────────────
      // 7. ÖDEME DURUMUNU SAHİPLENME (Atomik Claim — Yarış Korumalı)
      // ───────────────────────────────────────────────────────────────────────
      const isAlreadyPaid = siparis.odeme_durumu === 'odendi'

      if (!isAlreadyPaid) {
        const { data: claimRows, error: claimErr } = await db
          .from('siparisler')
          .update({
            odeme_durumu: 'odendi',
            durum: 'onaylandi',
            updated_at: new Date().toISOString(),
          })
          .eq('id', siparis.id)
          .neq('durum', 'iptal') // Admin tam bu sırada iptal ettiyse ezilmesin
          .or('odeme_durumu.is.null,odeme_durumu.neq.odendi')
          .select('id')

        if (claimErr) {
          console.error('[paytr-callback] Sipariş onay güncellenirken DB hatası:', claimErr.message)
          return new NextResponse('DB_UPDATE_ERROR', { status: 500, headers: { 'Content-Type': 'text/plain' } })
        }

        // KRİTİK: Eğer güncellenen satır 0 ise, başka bir eş zamanlı webhook bu ödemeyi
        // zaten sahiplendi demektir. Stok, kupon ve e-posta işlemlerini TEKRARLAMADAN çık.
        if (!claimRows || claimRows.length === 0) {
          console.log('[paytr-callback] Ödeme zaten başka bir webhook tarafından işlendi, atlanıyor:', merchant_oid)
          return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
        }
      }

      // ───────────────────────────────────────────────────────────────────────
      // 8. EKSİK İŞLEMLERİ TAMAMLAMA (RETRY & ÇÖKME KURTARMA AKIŞI)
      // ───────────────────────────────────────────────────────────────────────
      const isStockAlreadyDone = siparis.stok_dusuldu === true
      const isMailAlreadyDone = siparis.onay_maili_gonderildi === true

      if (isAlreadyPaid && isStockAlreadyDone && isMailAlreadyDone) {
        return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
      }

      // 8.1. STOK DÜŞÜMÜ (Kalem Bazlı Sahiplenme)
      let orderUrunler: Array<{ urun_id: string; ad: string; adet: number; fiyat: number }> = []

      if (!isStockAlreadyDone) {
        const { data: kalemler, error: kalemErr } = await db
          .from('siparis_kalemleri')
          .select('id, urun_id, urun_adi, adet, birim_fiyat, stok_dusuldu')
          .eq('siparis_id', siparis.id)

        if (kalemErr) {
          console.error('[paytr-callback] Sipariş kalemleri okunamadı:', kalemErr.message)
          await db.from('siparisler').update({ stok_dusuldu: false }).eq('id', siparis.id)
        } else {
          orderUrunler = (kalemler || []).map((k: any) => ({
            urun_id: k.urun_id,
            ad: k.urun_adi,
            adet: Number(k.adet || 1),
            fiyat: Number(k.birim_fiyat || 0),
          }))

          const failedStockItems: string[] = []

          for (const k of (kalemler || [])) {
            if (!k.urun_id || !k.adet) continue

            // Kalem bazlı atomik sahiplenme (Kısmi hata koruması)
            const { data: got } = await db
              .from('siparis_kalemleri')
              .update({ stok_dusuldu: true })
              .eq('id', k.id)
              .eq('stok_dusuldu', false)
              .select('id')

            // Bu kalemin stoğu daha önce düşülmüşse atla
            if (!got || got.length === 0) {
              continue
            }

            try {
              await deductSescimStock(db, { id: k.urun_id }, Number(k.adet))
            } catch (stokErr: any) {
              console.error(`[paytr-callback] Ürün stok düşürme hatası (${k.urun_adi}):`, stokErr.message)
              // Başarısız kalemin bayrağını geri al ki sonraki denemede işlensin
              await db.from('siparis_kalemleri').update({ stok_dusuldu: false }).eq('id', k.id)
              failedStockItems.push(`${k.urun_adi} (x${k.adet})`)
            }
          }

          if (failedStockItems.length === 0) {
            await db.from('siparisler').update({ stok_dusuldu: true }).eq('id', siparis.id)
          } else {
            await db.from('siparisler').update({ stok_dusuldu: false }).eq('id', siparis.id)
            try {
              await sendEmail(
                adminEmail,
                `⚠️ UYARI: Sipariş Stok Düşürülemedi (#${siparis.siparis_no})`,
                `<p><strong>#${escapeHtml(siparis.siparis_no)}</strong> numaralı siparişin ödemesi alındı fakat şu ürünlerin stoğu düşürülemedi:</p>
                 <ul>${failedStockItems.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
                 <p>Lütfen Sescim panelinden stokları kontrol edin.</p>`
              )
            } catch (mErr: any) {
              console.error('[paytr-callback] Stok hata admin mail hatası:', mErr.message)
            }
          }
        }
      }

      // 8.2. ONAY E-POSTALARI (Yalnızca tamamlanmadıysa sahiplen)
      if (!isMailAlreadyDone) {
        const { data: mailClaim, error: mClaimErr } = await db
          .from('siparisler')
          .update({ onay_maili_gonderildi: true })
          .eq('id', siparis.id)
          .eq('onay_maili_gonderildi', false)
          .select('id')

        if (mClaimErr) {
          console.error('[paytr-callback] onay_maili_gonderildi bayrak hatası:', mClaimErr.message)
        }

        if (mailClaim && mailClaim.length > 0) {
          if (orderUrunler.length === 0) {
            const { data: kalemler } = await db
              .from('siparis_kalemleri')
              .select('urun_id, urun_adi, adet, birim_fiyat')
              .eq('siparis_id', siparis.id)

            orderUrunler = (kalemler || []).map((k: any) => ({
              urun_id: k.urun_id,
              ad: k.urun_adi,
              adet: Number(k.adet || 1),
              fiyat: Number(k.birim_fiyat || 0),
            }))
          }

          let customerMailSuccess = true

          // Müşteri Onay E-postası
          if (siparis.email && siparis.email.includes('@')) {
            try {
              await sendEmail(
                siparis.email,
                `Ödemeniz Onaylandı — #${siparis.siparis_no} | sescim.com`,
                odemeOnaylandiHTML({
                  siparis_no: siparis.siparis_no,
                  ad_soyad: siparis.ad_soyad,
                  toplam_tutar: Number(siparis.toplam_tutar),
                })
              )
            } catch (mailErr: any) {
              customerMailSuccess = false
              console.error('[paytr-callback] Müşteri onay e-postası hatası:', mailErr.message)
            }
          }

          // Admin Bildirim E-postası
          try {
            await sendEmail(
              adminEmail,
              `💳 PayTR Ödemesi Alındı: #${siparis.siparis_no} — ${Number(siparis.toplam_tutar).toLocaleString('tr-TR')} ₺`,
              odemeAdminBildirimHTML({
                siparis_no: siparis.siparis_no,
                ad_soyad: siparis.ad_soyad,
                email: siparis.email,
                telefon: siparis.telefon,
                toplam_tutar: Number(siparis.toplam_tutar),
                urunler: orderUrunler,
              })
            )
          } catch (adminMailErr: any) {
            console.error('[paytr-callback] Admin bildirim e-postası hatası:', adminMailErr.message)
          }

          // Müşteri maili gönderilemediyse bayrağı geri false yap
          if (!customerMailSuccess) {
            await db.from('siparisler').update({ onay_maili_gonderildi: false }).eq('id', siparis.id)
          }
        }
      }

      // 8.3. KUPON KULLANIMINI KESİNLEŞTİR (Ödeme Başarılı)
      if (siparis.kupon_kodu) {
        try {
          const cleanKodu = siparis.kupon_kodu.trim().toUpperCase()

          // 1. kupon_kullanimlari durumunu onaylandi yap
          await db
            .from('kupon_kullanimlari')
            .update({ durum: 'onaylandi' })
            .eq('siparis_id', siparis.id)

          // 2. kuponlar tablosundaki genel kullanim_sayisi sayacını +1 artır
          const { error: rpcErr } = await db.rpc('increment_kupon_kullanim', { p_kod: cleanKodu })
          if (rpcErr) {
            const { data: kData } = await db
              .from('kuponlar')
              .select('id, kullanim_sayisi')
              .ilike('kod', cleanKodu)
              .maybeSingle()
            if (kData) {
              await db
                .from('kuponlar')
                .update({ kullanim_sayisi: (kData.kullanim_sayisi || 0) + 1 })
                .eq('id', kData.id)
            }
          }

          // 3. Kullanıcının profilindeki cüzdan kuponunu 'kullanildi = true' yap
          if (siparis.user_id) {
            await db
              .from('kullanici_kuponlari')
              .update({
                kullanildi: true,
                kullanilma_tarihi: new Date().toISOString(),
              })
              .eq('user_id', siparis.user_id)
              .ilike('kupon_kodu', cleanKodu)
          }
        } catch (kErr: any) {
          console.warn('[paytr-callback] Kupon onaylama uyarısı:', kErr?.message)
        }
      }
    } else {
      // ───────────────────────────────────────────────────────────────────────
      // 9. ÖDEME BAŞARISIZ / BANKA REDDİ
      // ───────────────────────────────────────────────────────────────────────
      if (status !== 'failed') {
        console.warn('[paytr-callback] Beklenmeyen PayTR status parametresi:', status)
      }

      // Yalnızca henüz ödenmemiş veya beklemede olan siparişlerde güncelle
      const { data: failClaim, error: failErr } = await db
        .from('siparisler')
        .update({
          odeme_durumu: 'odeme_hatasi',
          durum: 'iptal',
          odeme_hata_mesaji: failed_reason_msg || 'Red',
          updated_at: new Date().toISOString(),
        })
        .eq('id', siparis.id)
        .or('odeme_durumu.is.null,odeme_durumu.eq.odeme_bekliyor,odeme_durumu.eq.odeme_hatasi')
        .select('id')

      if (failErr) {
        console.error('[paytr-callback] Başarısız ödeme güncellenirken DB hatası:', failErr.message)
        return new NextResponse('DB_UPDATE_ERROR', { status: 500, headers: { 'Content-Type': 'text/plain' } })
      }

      // KRİTİK KORUMA: Eğer sipariş zaten ödenmiş veya iptal edilmişse failClaim 0 satır döner.
      // Kesinlikle müşteriye yanlışlıkla "Ödemeniz Alınamadı" maili GÖNDERİLMEZ.
      if (!failClaim || failClaim.length === 0) {
        return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
      }

      // Başarısız ödemede kullanıcının beklemedeki kuponunu serbest bırak (tekrar deneyebilsin)
      if (siparis.kupon_kodu) {
        try {
          const cleanKodu = siparis.kupon_kodu.trim().toUpperCase()
          await db
            .from('kupon_kullanimlari')
            .delete()
            .eq('siparis_id', siparis.id)
            .eq('durum', 'beklemede')

          if (siparis.user_id) {
            await db
              .from('kullanici_kuponlari')
              .update({ kullanildi: false, kullanilma_tarihi: null })
              .eq('user_id', siparis.user_id)
              .ilike('kupon_kodu', cleanKodu)
          }
        } catch {}
      }

      // Müşteriye "Tekrar Deneyin" e-postası (Spam engeli: Yalnızca bir kez sahiplen)
      const { data: failMailClaim, error: fmClaimErr } = await db
        .from('siparisler')
        .update({ odeme_hata_maili_gonderildi: true })
        .eq('id', siparis.id)
        .eq('odeme_hata_maili_gonderildi', false)
        .select('id')

      if (fmClaimErr) {
        console.error('[paytr-callback] odeme_hata_maili_gonderildi bayrak hatası:', fmClaimErr.message)
      }

      if (failMailClaim && failMailClaim.length > 0 && siparis.email && siparis.email.includes('@')) {
        try {
          await sendEmail(
            siparis.email,
            `Ödemeniz Alınamadı — #${siparis.siparis_no} | sescim.com`,
            odemeBasarisizHTML({
              siparis_no: siparis.siparis_no,
              ad_soyad: siparis.ad_soyad,
              hata_nedeni: failed_reason_msg || undefined,
            })
          )
        } catch (mailErr: any) {
          console.error('[paytr-callback] Ödeme hata e-postası gönderilemedi:', mailErr.message)
          await db.from('siparisler').update({ odeme_hata_maili_gonderildi: false }).eq('id', siparis.id)
        }
      }
    }

    // PayTR protokolü: İstek başarıyla işlendiğinde yanıt kesinlikle 'OK' metnidir
    return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  } catch (e: any) {
    console.error('[paytr-callback] Beklenmeyen sistem hatası:', e?.message || e)
    return new NextResponse('INTERNAL_ERROR', { status: 500, headers: { 'Content-Type': 'text/plain' } })
  }
}
