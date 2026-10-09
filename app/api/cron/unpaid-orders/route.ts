import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

export async function GET(req: NextRequest) {
  return handleCancelUnpaidOrders(req)
}

export async function POST(req: NextRequest) {
  return handleCancelUnpaidOrders(req)
}

/**
 * 24 saatten uzun süredir 'odeme_bekliyor' veya 'odeme_hatasi' durumunda kalan
 * ve ödemesi tamamlanmamış kart siparişlerini otomatik olarak iptal eder.
 */
async function handleCancelUnpaidOrders(req: NextRequest) {
  try {
    // Cron yetki kontrolü
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (cronSecret && !isAuthorized) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const db = supabaseAdmin()
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const timeStr = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })

    // 24 saatten eski, tamamlanmamış kart siparişlerini bul
    const { data: expiredOrders, error: fetchErr } = await db
      .from('siparisler')
      .select('id, siparis_no, user_id, kupon_kodu, notlar, created_at')
      .in('odeme_durumu', ['odeme_bekliyor', 'odeme_hatasi'])
      .in('durum', ['odeme_bekliyor', 'beklemede'])
      .lt('created_at', twentyFourHoursAgo)
      .limit(100)

    if (fetchErr) {
      console.error('[cron/unpaid-orders] Sipariş sorgulama hatası:', fetchErr)
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      return NextResponse.json({ message: 'Zaman aşımına uğramış ödenmemiş sipariş yok', processed: 0 })
    }

    let canceledCount = 0

    for (const order of expiredOrders) {
      const cancelNote = `[${timeStr}] 24 saatlik ödeme süresi dolduğu için sistem tarafından otomatik iptal edildi.`
      const updatedNotes = order.notlar ? `${order.notlar}\n${cancelNote}` : cancelNote

      const { error: updErr } = await db
        .from('siparisler')
        .update({
          durum: 'iptal',
          odeme_durumu: 'zaman_asimi',
          notlar: updatedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .neq('odeme_durumu', 'odendi') // Güvenlik kilidi: Asla ödenmiş siparişe dokunma

      if (!updErr) {
        canceledCount++

        // Kilitlenmiş kuponları serbest bırak (Terk edilmiş checkout'larda kupon rehinede kalmasın)
        if (order.kupon_kodu) {
          try {
            await db
              .from('kupon_kullanimlari')
              .delete()
              .eq('siparis_id', order.id)
              .eq('durum', 'beklemede')

            if (order.user_id) {
              await db
                .from('kullanici_kuponlari')
                .update({ kullanildi: false, kullanilma_tarihi: null })
                .eq('user_id', order.user_id)
                .ilike('kupon_kodu', order.kupon_kodu.trim().toUpperCase())
            }
          } catch {}
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${canceledCount} adet zaman aşımına uğramış sipariş iptal edildi.`,
      processed: canceledCount,
    })
  } catch (error: any) {
    console.error('[cron/unpaid-orders] Beklenmeyen hata:', error)
    return NextResponse.json({ error: error.message || 'İşlem başarısız' }, { status: 500 })
  }
}
