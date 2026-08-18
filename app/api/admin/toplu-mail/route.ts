import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { kampanyaHTML } from '@/lib/email'
import { sendBulkEmail } from '@/lib/send-email'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { konu, baslik, icerik, resim_url, link_url, hedef_kullanicilar } = body

    if (!konu || !baslik || !icerik || !hedef_kullanicilar) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik' }, { status: 400 })
    }

    const db = supabaseAdmin()

    // 1. Yetki Kontrolü
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await db.auth.getUser(token)

    if (authErr || !user) {
      return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
    }

    const { data: adminCheck } = await db
      .from('site_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!adminCheck) {
      return NextResponse.json({ error: 'Admin yetkisi gerekli' }, { status: 403 })
    }

    // 2. Hedef Kullanıcıların E-postalarını Topla
    let emails: string[] = []
    let hedefKitleMetni = 'Tüm Üyeler'

    const { data: usersData, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 })
    
    if (listErr || !usersData) {
      return NextResponse.json({ error: 'Kullanıcı listesi alınamadı' }, { status: 500 })
    }

    if (hedef_kullanicilar === 'all') {
      emails = usersData.users.filter(u => u.email).map(u => u.email!)
    } else if (Array.isArray(hedef_kullanicilar)) {
      // hedef_kullanicilar = array of user_id
      emails = usersData.users
        .filter(u => hedef_kullanicilar.includes(u.id) && u.email)
        .map(u => u.email!)
      hedefKitleMetni = `Seçili ${emails.length} Üye`
    }

    if (emails.length === 0) {
      return NextResponse.json({ error: 'Gönderilecek üye bulunamadı' }, { status: 404 })
    }



    // 3. E-Postaları Gönder
    const htmlContent = kampanyaHTML({
      baslik,
      icerik,
      resim_url,
      link_url
    })

    await sendBulkEmail(emails, konu, htmlContent)

    // 4. Veritabanına Log Kaydet
    const { error: dbError } = await db.from('kampanya_gecmisi').insert({
      konu,
      baslik,
      icerik,
      resim_url: resim_url || null,
      link_url: link_url || null,
      hedef_kitle: hedefKitleMetni,
      gonderilen_kisi_sayisi: emails.length
    })

    if (dbError) {
      console.error('Kampanya loglanırken hata:', dbError)
      // Gönderim yapıldı, log hatası işlemi kesmesin
    }

    return NextResponse.json({ 
      success: true, 
      gonderilen: emails.length,
      mesaj: `${emails.length} üyeye kampanya başarıyla gönderildi.`
    })

  } catch (e) {
    console.error('Toplu mail hatası:', e)
    return NextResponse.json({ error: 'Sunucu hatası oluştu' }, { status: 500 })
  }
}
