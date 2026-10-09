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

async function findUserByEmail(supabaseAdmin: any, email: string) {
  const targetEmail = email.toLowerCase().trim()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error || !data || !data.users || data.users.length === 0) break
    const match = data.users.find((u: any) => u.email?.toLowerCase().trim() === targetEmail)
    if (match) return match
    if (data.users.length < perPage) break
    page++
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    // IP başına 10 dakikada en fazla 10 doğrulama denemesi (brute-force koruması)
    if (!(await rateLimit(`pwd-reset-verify:${ip}`, 10, 10 * 60_000))) {
      return NextResponse.json(
        { error: 'Çok fazla hatalı deneme yapıldı. Lütfen daha sonra tekrar deneyin.' },
        { status: 429 }
      )
    }

    const { email, code, newPassword } = await req.json()
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanCode = (code || '').toString().trim()
    const cleanPass = newPassword || ''

    if (!cleanEmail || !cleanCode || !cleanPass) {
      return NextResponse.json({ error: 'Lütfen tüm alanları doldurun.' }, { status: 400 })
    }

    if (cleanPass.length < 6) {
      return NextResponse.json({ error: 'Yeni şifreniz en az 6 karakter olmalıdır.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const user = await findUserByEmail(supabaseAdmin, cleanEmail)

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı veya kod geçersiz.' }, { status: 400 })
    }

    const meta = user.user_metadata || {}
    const storedOtp = meta.recovery_otp
    const expiresAt = meta.recovery_otp_expires_at
    const attempts = meta.recovery_otp_attempts || 0

    if (!storedOtp || !expiresAt) {
      return NextResponse.json(
        { error: 'Aktif bir şifre sıfırlama talebi bulunamadı. Lütfen yeni bir kod isteyin.' },
        { status: 400 }
      )
    }

    if (Date.now() > expiresAt) {
      return NextResponse.json(
        { error: 'Doğrulama kodunun süresi dolmuş (15 dakika). Lütfen yeni bir kod isteyin.' },
        { status: 400 }
      )
    }

    if (attempts >= 5) {
      // 5 kez yanlış girildiyse kodu sıfırla
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...meta,
          recovery_otp: null,
          recovery_otp_expires_at: null,
        },
      })
      return NextResponse.json(
        { error: 'Çok fazla hatalı kod girildi. Güvenliğiniz için lütfen yeni bir kod isteyin.' },
        { status: 400 }
      )
    }

    if (storedOtp !== cleanCode) {
      // Hatalı deneme sayısını artır
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...meta,
          recovery_otp_attempts: attempts + 1,
        },
      })
      return NextResponse.json({ error: 'Girdiğiniz 6 haneli kod hatalı. Lütfen kontrol edin.' }, { status: 400 })
    }

    // Kod doğru! Kullanıcının şifresini güncelle ve kodları temizle
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: cleanPass,
      user_metadata: {
        ...meta,
        recovery_otp: null,
        recovery_otp_expires_at: null,
        recovery_otp_attempts: null,
      },
    })

    if (updateError) {
      console.error('Şifre güncelleme hatası:', updateError)
      return NextResponse.json({ error: 'Şifre güncellenirken bir hata oluştu.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Şifreniz başarıyla güncellendi.',
    })
  } catch (err: any) {
    console.error('Şifre doğrulama ve güncelleme hatası:', err)
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 })
  }
}
