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
    // IP başına dakikada en fazla 5 kod talebi
    if (!(await rateLimit(`pwd-reset-req:${ip}`, 5, 60_000))) {
      return NextResponse.json(
        { error: 'Çok sık kod talebinde bulunuldu. Lütfen biraz bekleyip tekrar deneyin.' },
        { status: 429 }
      )
    }

    const { email } = await req.json()
    const cleanEmail = (email || '').trim().toLowerCase()

    if (!cleanEmail) {
      return NextResponse.json({ error: 'Lütfen geçerli bir e-posta adresi girin.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Lütfen geçerli bir e-posta adresi girin.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const user = await findUserByEmail(supabaseAdmin, cleanEmail)

    if (!user) {
      // Güvenlik: Kullanıcı olmasa da başarı döner gibi davran (kullanıcı ifşa koruması)
      return NextResponse.json({
        success: true,
        message: 'Doğrulama kodu e-posta adresinize gönderildi.',
      })
    }

    // 6 haneli rastgele kod üret
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 15 * 60 * 1000 // 15 dakika geçerli

    // user_metadata içine kodu kaydet
    const existingMeta = user.user_metadata || {}
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...existingMeta,
        recovery_otp: code,
        recovery_otp_expires_at: expiresAt,
        recovery_otp_attempts: 0,
      },
    })

    // Resend ile Sescim markalı HTML e-posta gönder
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sescim - Şifre Sıfırlama Kodu</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #0f172a; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Sescim</h1>
      <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">Profesyonel Ses, Işık ve Görüntü Marketi</p>
    </div>

    <div style="padding: 36px 32px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Şifre Sıfırlama Kodunuz</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Sescim.com hesabınız için şifre sıfırlama talebinde bulundunuz. Yeni şifrenizi belirlemek için aşağıdaki 6 haneli doğrulama kodunu kullanabilirsiniz:
      </p>

      <div style="background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%); border: 2px dashed #e11d48; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #e11d48; display: inline-block; padding-left: 12px;">${code}</span>
      </div>

      <div style="background-color: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
          ⏱️ Bu kod güvenlik sebebiyle <strong>15 dakika</strong> boyunca geçerlidir.
        </p>
      </div>

      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
        Eğer bu talebi siz yapmadıysanız lütfen bu e-postayı dikkate almayınız. Hesabınız tamamen güvendedir.
      </p>
    </div>

    <div style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">
        © 2026 Sescim (Akdağ Elektronik). Tüm hakları saklıdır.<br>
        <a href="https://www.sescim.com" style="color: #e11d48; text-decoration: none; font-weight: 600;">www.sescim.com</a>
      </p>
    </div>
  </div>
</body>
</html>
      `.trim()

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Sescim <info@sescim.com>',
          to: [cleanEmail],
          reply_to: 'info@sescim.com',
          subject: `Sescim - Şifre Sıfırlama Kodunuz: ${code}`,
          html: emailHtml,
        }),
      })

      if (!emailRes.ok) {
        const errJson = await emailRes.json().catch(() => ({}))
        console.error('Resend e-posta gönderim hatası:', errJson)
        return NextResponse.json({ error: 'E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.' }, { status: 500 })
      }
    } else {
      console.warn('RESEND_API_KEY tanımlı değil, kod konsola yazıldı:', code)
    }

    return NextResponse.json({
      success: true,
      message: 'Doğrulama kodu e-posta adresinize gönderildi.',
    })
  } catch (err: any) {
    console.error('Şifre sıfırlama kod gönderme hatası:', err)
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 })
  }
}
