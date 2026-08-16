import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { bayiDavetSchema } from '@/lib/api-schemas'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'
import { bayiOnaylandiHTML } from '@/lib/email'
import { sendEmail } from '@/lib/send-email'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!(await rateLimit(`bayi-davet:${ip}`, 10, 60_000))) {
      return NextResponse.json({ error: 'Çok fazla istek.' }, { status: 429 })
    }

    const raw = await req.json()
    const parsed = bayiDavetSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 })
    }

    const { email, firma_adi, yetkili_adi, sehir, telefon } = parsed.data

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const siteUrl = origin.replace(/\/$/, '')

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Supabase davet — redirectTo verilmiyor.
    // Bu sayede Supabase kendi supabase.co linkli davet mailini GÖNDERMEZ.
    // Biz zaten aşağıda kendi markalı onay mailimizi Resend ile gönderiyoruz.
    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { firma_adi, yetkili_adi: yetkili_adi || '' },
    })

    if (inviteErr) {
      // Kullanıcı zaten kayıtlı — filtrelenmiş sorgu ile sadece o kullanıcıyı çek
      if (inviteErr.message.includes('already been registered')) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
          filter: `email=${email}`,
        } as Parameters<typeof supabaseAdmin.auth.admin.listUsers>[0])
        const user = existingUsers?.users?.[0]
        if (user) {
          await supabaseAdmin.from('bayiler').upsert(
            {
              user_id: user.id,
              firma_adi,
              yetkili_adi: yetkili_adi || '',
              telefon: telefon || '',
              sehir: sehir || '',
              onaylandi: true,
            },
            { onConflict: 'user_id' }
          )

          // Mevcut kullanıcıya onay e-postası gönder
          await sendEmail(
            email,
            'Bayi Hesabınız Onaylandı 🎉 | Akdağ Elektronik',
            bayiOnaylandiHTML({
              firma_adi,
              yetkili_adi: yetkili_adi || '',
              panel_url: `${siteUrl}/bayi/panel`,
              otp_url: `${siteUrl}/bayi/sifre-sifirla`,
              is_yeni_kullanici: false,
            })
          )

          return NextResponse.json({ success: true, note: 'Mevcut kullanıcı güncellendi ve bilgilendirildi' })
        }
      }
      return NextResponse.json({ error: inviteErr.message }, { status: 400 })
    }

    if (!inviteData?.user?.id) {
      return NextResponse.json({ error: 'Davet oluşturulamadı' }, { status: 400 })
    }

    // Yeni kullanıcı — bayi kaydı oluştur
    const { error: dbErr } = await supabaseAdmin.from('bayiler').insert({
      user_id: inviteData.user.id,
      firma_adi,
      yetkili_adi: yetkili_adi || '',
      telefon: telefon || '',
      sehir: sehir || '',
      onaylandi: true,
    })

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 400 })
    }

    // Yeni kullanıcıya onay + şifre belirleme talimatı içeren markalı mail gönder.
    // Supabase'in supabase.co linkli davet maili gönderilmediği için
    // kullanıcı şifresini /bayi/sifre-sifirla sayfasından OTP ile belirleyecek.
    await sendEmail(
      email,
      'Bayi Hesabınız Onaylandı 🎉 | Akdağ Elektronik',
      bayiOnaylandiHTML({
        firma_adi,
        yetkili_adi: yetkili_adi || '',
        panel_url: `${siteUrl}/bayi/panel`,
        otp_url: `${siteUrl}/bayi/sifre-sifirla`,
        is_yeni_kullanici: true,
      })
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Bayi davet:', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
