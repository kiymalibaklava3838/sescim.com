import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { odemeOnaylandiHTML, odemeAdminBildirimHTML } from '@/lib/email'
import { sendEmail } from '@/lib/send-email'
import { deductSescimStock } from '@/lib/product-stock'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

export async function GET(req: NextRequest) {
  return handleFinalizePaidOrders(req)
}

export async function POST(req: NextRequest) {
  return handleFinalizePaidOrders(req)
}

/**
 * Ödemesi alınmış ancak sunucu kesintisi veya zaman aşımı nedeniyle
 * stoğu düşürülememiş veya onay e-postası gönderilememiş siparişleri tamamlar.
 */
async function handleFinalizePaidOrders(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (cronSecret && !isAuthorized) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const db = supabaseAdmin()
    const adminEmail = process.env.ADMIN_EMAIL || 'info@sescim.com'

    // Ödenmiş ama stok veya e-posta bayrağı eksik kalan son 50 siparişi bul
    const { data: pendingOrders, error: fetchErr } = await db
      .from('siparisler')
      .select('id, siparis_no, email, ad_soyad, telefon, toplam_tutar, stok_dusuldu, onay_maili_gonderildi')
      .eq('odeme_durumu', 'odendi')
      .or('stok_dusuldu.eq.false,onay_maili_gonderildi.eq.false')
      .order('created_at', { ascending: false })
      .limit(50)

    if (fetchErr) {
      console.error('[cron/finalize-paid-orders] Sipariş sorgulama hatası:', fetchErr.message)
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({ message: 'Tamamlanması gereken eksik sipariş yok', processed: 0 })
    }

    let processedCount = 0

    for (const siparis of pendingOrders) {
      // 1. Eksik Stok Düşümü (Kalem bazlı atomik kontrol)
      if (siparis.stok_dusuldu === false) {
        const { data: kalemler } = await db
          .from('siparis_kalemleri')
          .select('id, urun_id, urun_adi, adet, stok_dusuldu')
          .eq('siparis_id', siparis.id)

        let allItemsDone = true

        for (const k of (kalemler || [])) {
          if (!k.urun_id || !k.adet) continue

          const { data: got } = await db
            .from('siparis_kalemleri')
            .update({ stok_dusuldu: true })
            .eq('id', k.id)
            .eq('stok_dusuldu', false)
            .select('id')

          if (!got || got.length === 0) continue

          try {
            await deductSescimStock(db, { id: k.urun_id }, Number(k.adet))
          } catch (stokErr: any) {
            allItemsDone = false
            console.error(`[cron/finalize-paid-orders] Stok düşürme hatası (${k.urun_adi}):`, stokErr.message)
            await db.from('siparis_kalemleri').update({ stok_dusuldu: false }).eq('id', k.id)
          }
        }

        if (allItemsDone) {
          await db.from('siparisler').update({ stok_dusuldu: true }).eq('id', siparis.id)
        }
      }

      // 2. Eksik Onay E-postası Gönderimi
      if (siparis.onay_maili_gonderildi === false) {
        const { data: mailClaim } = await db
          .from('siparisler')
          .update({ onay_maili_gonderildi: true })
          .eq('id', siparis.id)
          .eq('onay_maili_gonderildi', false)
          .select('id')

        if (mailClaim && mailClaim.length > 0) {
          let customerSuccess = true

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
            } catch (err: any) {
              customerSuccess = false
              console.error('[cron/finalize-paid-orders] Müşteri onay e-postası hatası:', err.message)
            }
          }

          if (!customerSuccess) {
            await db.from('siparisler').update({ onay_maili_gonderildi: false }).eq('id', siparis.id)
          }
        }
      }

      processedCount++
    }

    return NextResponse.json({
      success: true,
      message: `${processedCount} adet sipariş kontrol edildi ve eksik adımları tamamlandı.`,
      processed: processedCount,
    })
  } catch (error: any) {
    console.error('[cron/finalize-paid-orders] Beklenmeyen hata:', error)
    return NextResponse.json({ error: error.message || 'İşlem başarısız' }, { status: 500 })
  }
}
