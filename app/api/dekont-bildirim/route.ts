import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dekontAlindiHTML, dekontAdminHTML } from '@/lib/email'
import { sendEmail } from '@/lib/send-email'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export async function POST(req: NextRequest) {
  try {
    // 1. Oturum kontrolü — sadece giriş yapmış kullanıcılar
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const db = supabaseAdmin()
    const { data: { user }, error: authErr } = await db.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
    }

    const { siparis_id, siparis_no, dekont_url, ad_soyad } = await req.json()

    if (!siparis_id || !siparis_no || !dekont_url) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    // 2. Sipariş sahiplik kontrolü — dekont bildirimi sadece siparişin sahibi tarafından yapılabilir
    const { data: siparis } = await db
      .from('siparisler')
      .select('email, user_id')
      .eq('id', siparis_id)
      .single()

    if (!siparis) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
    }

    if (siparis.user_id !== user.id) {
      return NextResponse.json({ error: 'Bu siparişe erişim yetkiniz yok' }, { status: 403 })
    }

    const musteriEmail = siparis.email

    // Admin'e dekont bildirimi
    const adminEmail = process.env.ADMIN_EMAIL || 'info@akdagelektronik.com'
    await sendEmail(
      adminEmail,
      `📄 Yeni Dekont Yüklendi: ${siparis_no}`,
      dekontAdminHTML({ siparis_no, ad_soyad, dekont_url })
    )

    // Müşteriye "dekontu aldık" bildirimi
    if (musteriEmail) {
      await sendEmail(
        musteriEmail,
        `Dekontunuz Alındı — ${siparis_no} | Akdağ Elektronik`,
        dekontAlindiHTML({ siparis_no, ad_soyad })
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Dekont bildirim hatası:', e)
    return NextResponse.json({ error: 'Bildirim gönderilemedi' }, { status: 500 })
  }
}
