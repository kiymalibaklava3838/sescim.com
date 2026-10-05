import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  siparisOnaylandiHTML,
  siparisHazirlaniyorHTML,
  siparisKargolandiHTML,
  siparisTeslimEdildiHTML,
  siparisIptalHTML,
} from '@/lib/email'
import { sendEmail } from '@/lib/send-email'
import { restoreSescimStock, deductSescimStock } from '@/lib/product-stock'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

const akdagAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL!, process.env.AKDAG_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

/** Gelen Authorization: Bearer <token> token'ından admin olup olmadığını doğrular. */
async function isAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  const db = supabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return false
  const { data } = await db
    .from('site_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return !!data
}

export async function POST(req: NextRequest) {
  try {
    // Yetki kontrolü — sadece adminler sipariş durumunu güncelleyebilir
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { id, durum, odeme_durumu, kargo_takip_no, kargo_firmasi } = await req.json()
    const db = supabaseAdmin()
    const akdagDb = akdagAdmin()

    // 1. Sipariş bilgilerini al
    const { data: siparis, error: getErr } = await db
      .from('siparisler')
      .select('siparis_no, email, ad_soyad, durum')
      .eq('id', id)
      .single()

    if (getErr || !siparis) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
    }

    const { data: orderKalemler } = await db
      .from('siparis_kalemleri')
      .select('urun_id, adet')
      .eq('siparis_id', id)

    const items = orderKalemler || []
    const eskiDurum = siparis.durum
    const yeniDurum = durum || eskiDurum

    // 2. Stok Yönetimi (Sadece Sescim veritabanı güncellenir, Akdağ DB salt-okunurdur)
    if (durum) {
      if (eskiDurum !== 'iptal' && yeniDurum === 'iptal') {
        // Sipariş iptal: Sescim stoklarını geri yükle
        for (const item of items) {
          if (!item.urun_id || !item.adet) continue
          await restoreSescimStock(db, item.urun_id, item.adet)
        }
      } else if (eskiDurum === 'iptal' && yeniDurum !== 'iptal') {
        // İptal edilmiş sipariş tekrar aktif: Sescim stoklarını düş
        for (const item of items) {
          if (!item.urun_id || !item.adet) continue
          await deductSescimStock(db, { id: item.urun_id }, item.adet)
        }
      }
    }

    // 3. Durumu güncelle
    const updateData: any = {}
    if (durum) updateData.durum = yeniDurum
    if (odeme_durumu !== undefined) updateData.odeme_durumu = odeme_durumu
    if (kargo_takip_no !== undefined) updateData.kargo_takip_no = kargo_takip_no

    const { error: updErr } = await db
      .from('siparisler')
      .update(updateData)
      .eq('id', id)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 })
    }

    // 4. Durum e-postası gönder
    const emailParams = { siparis_no: siparis.siparis_no, ad_soyad: siparis.ad_soyad }

    const durumEmailMap: Record<string, { subject: string; html: string } | null> = {
      onaylandi: {
        subject: `Siparişiniz Onaylandı — ${siparis.siparis_no} | sescim.com`,
        html: siparisOnaylandiHTML(emailParams),
      },
      hazirlaniyor: {
        subject: `Siparişiniz Hazırlanıyor — ${siparis.siparis_no} | sescim.com`,
        html: siparisHazirlaniyorHTML(emailParams),
      },
      kargolandi: {
        subject: `Siparişiniz Kargoya Verildi — ${siparis.siparis_no} | sescim.com`,
        html: siparisKargolandiHTML({ ...emailParams, kargo_takip_no: kargo_takip_no || undefined }),
      },
      teslim_edildi: {
        subject: `Siparişiniz Teslim Edildi 🎉 — ${siparis.siparis_no} | sescim.com`,
        html: siparisTeslimEdildiHTML(emailParams),
      },
      iptal: {
        subject: `Siparişiniz İptal Edildi — ${siparis.siparis_no} | sescim.com`,
        html: siparisIptalHTML(emailParams),
      },
    }

    const emailData = durumEmailMap[yeniDurum]
    if (emailData) {
      try {
        await sendEmail(siparis.email, emailData.subject, emailData.html)
      } catch (mailErr) {
        console.error('[siparis-durum-guncelle] E-posta gönderilemedi:', (mailErr as Error).message)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Sipariş durum güncelleme hatası:', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
