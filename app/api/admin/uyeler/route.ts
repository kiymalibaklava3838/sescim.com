import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

const ADMIN_EMAILS = [
  'ahmetakdag1355@gmail.com',
  'ahmetakdag1660@gmail.com',
  'info@akdagelektronik.com.tr',
  'info@sescim.com'
]

async function verifyAdmin(req: NextRequest, db: any) {
  const authHeader = req.headers.get('Authorization')
  let token = authHeader ? authHeader.replace('Bearer ', '').trim() : ''

  if (!token) {
    // Cookie'den token aramayı dene (sb-access-token vb.)
    for (const cookie of req.cookies.getAll()) {
      if (cookie.name.includes('auth-token') || cookie.name.includes('access-token')) {
        try {
          const parsed = JSON.parse(cookie.value)
          if (Array.isArray(parsed) && parsed[0]) token = parsed[0]
          else if (parsed.access_token) token = parsed.access_token
        } catch {
          token = cookie.value
        }
      }
    }
  }

  if (!token) {
    return { ok: false, status: 401, error: 'Yetkisiz erişim: Oturum anahtarı bulunamadı' }
  }

  const { data: { user }, error: authErr } = await db.auth.getUser(token)
  if (authErr || !user) {
    return { ok: false, status: 401, error: 'Geçersiz oturum' }
  }

  // 1. site_admins tablosundan kontrol
  const { data: adminCheck } = await db
    .from('site_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  // 2. Yedek e-posta kontrolü
  const isEmailAdmin = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

  if (!adminCheck && !isEmailAdmin) {
    return { ok: false, status: 403, error: 'Admin yetkisi gerekli' }
  }

  // Self-healing: E-posta ile doğrulanmış admin'i site_admins tablosuna otomatik kaydet
  if (!adminCheck && isEmailAdmin) {
    try {
      await db.from('site_admins').insert({ user_id: user.id })
    } catch {}
  }

  return { ok: true, user }
}

export async function GET(req: NextRequest) {
  try {
    const db = supabaseAdmin()

    // 1. Yetki Kontrolü
    const auth = await verifyAdmin(req, db)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // 2. Aktif Supabase Auth Kullanıcıları, Üye Profilleri ve Siparişleri Paralel Çek
    const [authRes, uyeProfillerRes, legacyProfilesRes, ordersRes] = await Promise.all([
      db.auth.admin.listUsers({ perPage: 1000 }),
      db.from('uye_profiller').select('*'),
      db.from('profiles').select('*'),
      db.from('siparisler').select('user_id, toplam_tutar, durum')
    ])

    if (authRes.error) {
      console.error('Kullanıcıları çekerken hata:', authRes.error)
      return NextResponse.json({ error: 'Kullanıcılar alınamadı' }, { status: 500 })
    }

    // Profil Haritası (user_id -> profil): Önce profiles, sonra asıl kaynak uye_profiller ile üzerine yaz
    const profileMap = new Map<string, any>()
    for (const p of (legacyProfilesRes.data || [])) {
      if (p.id) profileMap.set(p.id, p)
      if (p.user_id) profileMap.set(p.user_id, p)
    }
    for (const p of (uyeProfillerRes.data || [])) {
      if (p.user_id) profileMap.set(p.user_id, p)
      if (p.id) profileMap.set(p.id, p)
    }

    // Sipariş İstatistikleri (user_id -> adet, harcama)
    const orderStatsMap = new Map<string, { siparis_sayisi: number; toplam_harcama: number }>()
    for (const order of (ordersRes.data || [])) {
      if (!order.user_id) continue
      const current = orderStatsMap.get(order.user_id) || { siparis_sayisi: 0, toplam_harcama: 0 }
      current.siparis_sayisi += 1
      if (order.durum !== 'iptal_edildi' && order.durum !== 'odeme_bekliyor') {
        current.toplam_harcama += Number(order.toplam_tutar) || 0
      }
      orderStatsMap.set(order.user_id, current)
    }

    // 3. Kullanıcıları Birleştir ve Zenginleştir
    const users = (authRes.data.users || []).map(u => {
      const profile = profileMap.get(u.id)
      const stats = orderStatsMap.get(u.id) || { siparis_sayisi: 0, toplam_harcama: 0 }
      const meta = u.user_metadata || {}

      const fullName = (
        meta.full_name ||
        meta.name ||
        (profile ? `${profile.ad || ''} ${profile.soyad || ''}`.trim() : '') ||
        meta.ad_soyad ||
        ''
      ).trim()

      const phone = (
        meta.phone ||
        meta.telefon ||
        profile?.telefon ||
        ''
      ).trim()

      return {
        id: u.id,
        email: u.email || '—',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        ad_soyad: fullName || '—',
        telefon: phone || '—',
        user_metadata: {
          full_name: fullName || '—',
          phone: phone || '—',
        },
        siparis_sayisi: stats.siparis_sayisi,
        toplam_harcama: stats.toplam_harcama,
        email_confirmed: !!u.email_confirmed_at,
      }
    })

    // En yeni kayıtlar en üstte olacak şekilde sırala
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json(
      { users },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    )
  } catch (e: any) {
    console.error('Uyeler api hatası:', e)
    return NextResponse.json({ error: e?.message || 'Sunucu hatası oluştu' }, { status: 500 })
  }
}
