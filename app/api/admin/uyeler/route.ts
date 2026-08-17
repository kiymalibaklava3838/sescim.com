import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export async function GET(req: NextRequest) {
  try {
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

    // 2. Tüm Kullanıcıları Çek
    const { data, error } = await db.auth.admin.listUsers({
      perPage: 1000 // Get up to 1000 users for the admin panel
    })

    if (error) {
      console.error('Kullanıcıları çekerken hata:', error)
      return NextResponse.json({ error: 'Kullanıcılar alınamadı' }, { status: 500 })
    }

    // Harita: sadece UI'ın ihtiyacı olan alanları dön
    const users = data.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      user_metadata: u.user_metadata || {},
    }))

    // Opsiyonel olarak, sipariş sayılarını da çekebiliriz, ancak basitlik için mevcut UI sadece bu alanları kullanıyor
    return NextResponse.json({ users })

  } catch (e) {
    console.error('Uyeler api hatası:', e)
    return NextResponse.json({ error: 'Sunucu hatası oluştu' }, { status: 500 })
  }
}
