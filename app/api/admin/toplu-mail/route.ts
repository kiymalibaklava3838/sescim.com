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
    const { konu, baslik, icerik, resim_url, link_url, hedef_bayiler } = body

    if (!konu || !baslik || !icerik || !hedef_bayiler) {
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

    // 2. Hedef Bayilerin E-postalarını Topla
    let bayiUserIds: string[] = []
    let hedefKitleMetni = 'Tüm Bayiler'

    if (hedef_bayiler === 'all') {
      const { data: bayiler } = await db.from('bayiler').select('user_id').eq('onaylandi', true)
      if (bayiler) bayiUserIds = bayiler.map(b => b.user_id)
    } else if (Array.isArray(hedef_bayiler)) {
      // hedef_bayiler id'lerin array'i ise (bayiler.id)
      const { data: bayiler } = await db.from('bayiler').select('user_id').in('id', hedef_bayiler).eq('onaylandi', true)
      if (bayiler) bayiUserIds = bayiler.map(b => b.user_id)
      hedefKitleMetni = `Seçili ${hedef_bayiler.length} Bayi`
    }

    if (bayiUserIds.length === 0) {
      return NextResponse.json({ error: 'Gönderilecek bayi bulunamadı' }, { status: 404 })
    }

    // E-postaları al (Toplu sorgu)
    // Auth users için admin.getUserById'yi map ile çağırıyoruz. Limitlere takılmamak için batch (20'şer)
    const emails: string[] = []
    
    // Güvenli işleme için 20'şerli parçalar
    for (let i = 0; i < bayiUserIds.length; i += 20) {
      const chunk = bayiUserIds.slice(i, i + 20)
      const promises = chunk.map(id => db.auth.admin.getUserById(id))
      const results = await Promise.all(promises)
      results.forEach(res => {
        if (res.data?.user?.email) {
          emails.push(res.data.user.email)
        }
      })
    }

    if (emails.length === 0) {
      return NextResponse.json({ error: 'Geçerli e-posta adresi bulunamadı' }, { status: 404 })
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
      mesaj: `${emails.length} bayiye kampanya başarıyla gönderildi.`
    })

  } catch (e) {
    console.error('Toplu mail hatası:', e)
    return NextResponse.json({ error: 'Sunucu hatası oluştu' }, { status: 500 })
  }
}
