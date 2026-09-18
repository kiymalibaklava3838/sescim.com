import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { odemeOnaylandiHTML, odemeAdminBildirimHTML, siparisIptalHTML } from '@/lib/email'
import { sendEmail } from '@/lib/send-email'

const PAYTR_MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY!
const PAYTR_MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT!

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const merchant_oid = formData.get('merchant_oid') as string
    const status = formData.get('status') as string
    const total_amount = formData.get('total_amount') as string
    const hash = formData.get('hash') as string
    const failed_reason_msg = (formData.get('failed_reason_msg') as string) || ''

    if (!merchant_oid || !status || !hash) {
      return new NextResponse('PAYTR_MISSING_PARAMS', { status: 400 })
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

    // 2. Sipariş bilgilerini veritabanından çek
    const { data: siparis, error: siparisErr } = await supabase
      .from('siparisler')
      .select('id, siparis_no, email, ad_soyad, telefon, toplam_tutar, urunler, durum, odeme_durumu, notlar')
      .eq('siparis_no', merchant_oid)
      .maybeSingle()

    if (siparisErr || !siparis) {
      console.error('[paytr-callback] Sipariş bulunamadı:', merchant_oid)
      return new NextResponse('OK', { status: 200 }) // PayTR'a OK dön ki tekrar tekrar sormasın
    }

    // 3. Tekrar eden callback kontrolü (Idempotency): Sipariş zaten ödendi durumundaysa tekrar işlem yapma
    if (siparis.odeme_durumu === 'odendi' && status === 'success') {
      return new NextResponse('OK', { status: 200 })
    }

    const isSuccess = status === 'success'

    if (isSuccess) {
      // ── ÖDEME BAŞARILI ─────────────────────────────────────────────────────────
      // Durumu 'odendi' ve 'onaylandi' yap
      await supabase
        .from('siparisler')
        .update({
          odeme_durumu: 'odendi',
          durum: 'onaylandi',
          updated_at: new Date().toISOString(),
        })
        .eq('siparis_no', merchant_oid)

      // Kart ödemesi kesinleştiği için ürünlerin stoğunu şimdi düş
      if (Array.isArray(siparis.urunler) && siparis.urunler.length > 0) {
        try {
          const akdagSupabase = createClient(
            process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL!,
            process.env.AKDAG_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
          )

          for (const item of siparis.urunler) {
            const urunId = (item as any).urun_id || (item as any).id
            const adet = Number((item as any).adet || 1)
            if (!urunId) continue

            // Önce Sescim'de var mı bak, yoksa Akdağ'dan düş
            const { data: sescimUrun } = await supabase
              .from('urunler')
              .select('stok_durumu, stok_adedi')
              .eq('id', urunId)
              .maybeSingle()

            const targetDb = sescimUrun ? supabase : akdagSupabase
            const { data: targetUrun } = await targetDb
              .from('urunler')
              .select('stok_durumu, stok_adedi')
              .eq('id', urunId)
              .maybeSingle()

            if (typeof targetUrun?.stok_adedi === 'number') {
              const kalan = Math.max(0, targetUrun.stok_adedi - adet)
              const nextDurum = kalan <= 0 ? 'tukendi' : 'stokta'
              await targetDb
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
            urunler: siparis.urunler,
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
          updated_at: new Date().toISOString(),
        })
        .eq('siparis_no', merchant_oid)

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
