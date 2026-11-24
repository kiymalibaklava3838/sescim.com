import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

export const dynamic = 'force-dynamic'

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

function hashOtp(userId: string, code: string): string {
  return crypto.createHash('sha256').update(`${userId}:${code}`).digest('hex')
}

function safeCompareHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex')
    const bufB = Buffer.from(b, 'hex')
    if (bufA.length === 0 || bufA.length !== bufB.length) return false
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

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

    if (!/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json({ error: 'Doğrulama kodu 6 haneli olmalıdır.' }, { status: 400 })
    }

    if (cleanPass.length < 6) {
      return NextResponse.json({ error: 'Yeni şifreniz en az 6 karakter olmalıdır.' }, { status: 400 })
    }

    // E-posta bazlı brute-force koruması
    if (!(await rateLimit(`pwd-reset-verify-email:${cleanEmail}`, 10, 15 * 60_000))) {
      return NextResponse.json(
        { error: 'Çok fazla hatalı deneme yapıldı. Lütfen yeni bir kod isteyin.' },
        { status: 429 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const user = await findUserByEmail(supabaseAdmin, cleanEmail)

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı veya kod geçersiz.' }, { status: 400 })
    }

    const appMeta = user.app_metadata || {}
    const storedHash = appMeta.recovery_otp_hash
    const expiresAt = appMeta.recovery_otp_expires_at
    const attempts = appMeta.recovery_otp_attempts || 0

    if (!storedHash || !expiresAt) {
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
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          ...appMeta,
          recovery_otp_hash: null,
          recovery_otp_expires_at: null,
          recovery_otp_attempts: null,
        },
      })
      return NextResponse.json(
        { error: 'Çok fazla hatalı kod girildi. Güvenliğiniz için lütfen yeni bir kod isteyin.' },
        { status: 400 }
      )
    }

    const candidateHash = hashOtp(user.id, cleanCode)
    if (!safeCompareHex(storedHash, candidateHash)) {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          ...appMeta,
          recovery_otp_attempts: attempts + 1,
        },
      })
      return NextResponse.json({ error: 'Girdiğiniz 6 haneli kod hatalı. Lütfen kontrol edin.' }, { status: 400 })
    }

    // Kod doğru! Şifreyi güncelle ve app_metadata + olası eski user_metadata OTP alanlarını temizle
    const userMeta = user.user_metadata || {}
    const updatePayload: Record<string, any> = {
      password: cleanPass,
      app_metadata: {
        ...appMeta,
        recovery_otp_hash: null,
        recovery_otp_expires_at: null,
        recovery_otp_attempts: null,
      },
    }
    if ('recovery_otp' in userMeta || 'recovery_otp_expires_at' in userMeta) {
      updatePayload.user_metadata = {
        ...userMeta,
        recovery_otp: null,
        recovery_otp_expires_at: null,
        recovery_otp_attempts: null,
      }
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, updatePayload)

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
