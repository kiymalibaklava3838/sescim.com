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
    let merchant_oid = ''
    let status = ''
    let total_amount = ''
    let hash = ''
    let failed_reason_msg = ''

    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        const json = await req.json()
        merchant_oid = json.merchant_oid || ''
        status = json.status || ''
        total_amount = json.total_amount || ''
        hash = json.hash || ''
        failed_reason_msg = json.failed_reason_msg || ''
      } catch {}
    } else {
      try {
        const formData = await req.formData()
        merchant_oid = (formData.get('merchant_oid') as string) || ''
        status = (formData.get('status') as string) || ''
        total_amount = (formData.get('total_amount') as string) || ''
        hash = (formData.get('hash') as string) || ''
        failed_reason_msg = (formData.get('failed_reason_msg') as string) || ''
      } catch {
        try {
          const text = await req.text()
          const params = new URLSearchParams(text)
          merchant_oid = params.get('merchant_oid') || ''
          status = params.get('status') || ''
          total_amount = params.get('total_amount') || ''
          hash = params.get('hash') || ''
          failed_reason_msg = params.get('failed_reason_msg') || ''
        } catch {}
      }
    }

    if (!merchant_oid || !status || !hash) {
      // PayTR panelinden atılan boş test pingleri durumunda OK dönerek entegrasyon kontrolünü geç
      return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    // 1. PayTR HMAC-SHA256 Hash Doğrulama (Güvenlik Kalkanı)
    const hashStr = merchant_oid + PAYTR_MERCHANT_SALT + status + total_amount
    const expectedHash = crypto
      .createHmac('sha256', PAYTR_MERCHANT_KEY)
      .update(hashStr)
      .digest('base64')

    if (hash !== expectedHash) {
      console.error('[paytr-callback] Sahte veya geçersiz PayTR hash imzası:', { merchant_oid, hash, expectedHash })
      return new NextResponse('PAYTR_INVALID_HASH', { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 2. Sipariş bilgilerini veritabanından çek (Tireli ve tiresiz format desteği)
    const formattedWithHyphen = merchant_oid.startsWith('SCM') && !merchant_oid.includes('-')
      ? `SCM-${merchant_oid.slice(3)}`
      : merchant_oid

    const { data: siparis, error: siparisErr } = await supabase
      .from('siparisler')
      .select('id, siparis_no, email, ad_soyad, telefon, toplam_tutar, durum, odeme_durumu, notlar')
      .or(`siparis_no.eq.${merchant_oid},siparis_no.eq.${formattedWithHyphen}`)
      .maybeSingle()

    if (siparisErr || !siparis) {
      console.error('[paytr-callback] Sipariş bulunamadı:', merchant_oid)
      return new NextResponse('OK', { status: 200 }) // PayTR'a OK dön ki tekrar tekrar sormasın
    }

    // 3. Tekrar eden callback kontrolü (Idempotency): Sipariş zaten ödendi durumundaysa tekrar işlem yapma
    if (siparis.odeme_durumu === 'odendi' && status === 'success') {
      return new NextResponse('OK', { status: 200 })
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
    return new NextResponse('OK', { status: 200 })
  } catch (e) {
    console.error('PayTR callback sistem hatası:', e)
    return new NextResponse('ERROR', { status: 500 })
  }
}
