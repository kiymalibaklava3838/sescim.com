import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

export const dynamic = 'force-dynamic'

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    // 1 saatte aynı IP'den en fazla 20 kayıt (spam/bot koruması)
    if (!(await rateLimit(`register:${ip}`, 20, 60 * 60_000))) {
      return NextResponse.json({ error: 'Çok fazla kayıt denemesi yapıldı. Lütfen daha sonra tekrar deneyin.' }, { status: 429 })
    }

    const body = await req.json()
    const { ad, soyad, email, telefon, password } = body

    const cleanAd = (ad || '').trim()
    const cleanSoyad = (soyad || '').trim()
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanTel = (telefon || '').trim()
    const cleanPass = password || ''

    if (!cleanAd || !cleanSoyad || !cleanEmail || !cleanPass) {
      return NextResponse.json({ error: 'Lütfen tüm zorunlu alanları doldurun.' }, { status: 400 })
    }

    if (cleanPass.length < 6) {
      return NextResponse.json({ error: 'Şifre en az 6 karakter olmalıdır.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Lütfen geçerli bir e-posta adresi girin.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Kullanıcıyı doğrudan e-postası onaylanmış (email_confirm: true) olarak oluştur
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPass,
      email_confirm: true, // E-posta onayını otomatik ver, mail bekleme zorunluluğunu kaldır
      user_metadata: {
        full_name: `${cleanAd} ${cleanSoyad}`,
        phone: cleanTel,
      },
    })

    if (createError) {
      const msg = createError.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already exists')) {
        return NextResponse.json({ error: 'Bu e-posta adresiyle zaten kayıtlı bir hesap var. Lütfen giriş yapın.' }, { status: 409 })
      }
      return NextResponse.json({ error: createError.message || 'Kayıt oluşturulamadı.' }, { status: 400 })
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Kullanıcı hesabı oluşturulamadı.' }, { status: 500 })
    }

    // 2. uye_profiller tablosuna profili kaydet
    try {
      await supabaseAdmin.from('uye_profiller').upsert({
        user_id: newUser.user.id,
        ad: cleanAd,
        soyad: cleanSoyad,
        telefon: cleanTel,
      })
    } catch (profErr) {
      console.warn('Profile creation non-fatal warning:', profErr)
    }

    return NextResponse.json({
      success: true,
      user_id: newUser.user.id,
      message: 'Kayıt başarıyla tamamlandı.',
    })
  } catch (err: any) {
    console.error('Kayıt API hatası:', err)
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 })
  }
}
