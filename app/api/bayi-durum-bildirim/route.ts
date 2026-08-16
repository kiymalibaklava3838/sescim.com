import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { bayiOnaylandiHTML, bayiAskiyaAlindiHTML } from '@/lib/email'
import { sendEmail } from '@/lib/send-email'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export async function POST(req: NextRequest) {
  try {
    const { bayi_id, firma_adi, yetkili_adi, onaylandi } = await req.json()

    if (!bayi_id || firma_adi === undefined || onaylandi === undefined) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    const db = supabaseAdmin()

    // Bayinin e-posta adresini auth.users üzerinden al
    const { data: bayi } = await db
      .from('bayiler')
      .select('user_id')
      .eq('id', bayi_id)
      .single()

    if (!bayi?.user_id) {
      return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })
    }

    const { data: authUser } = await db.auth.admin.getUserById(bayi.user_id)
    const email = authUser?.user?.email

    if (!email) {
      return NextResponse.json({ error: 'Bayi e-posta adresi bulunamadı' }, { status: 404 })
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.akdagelektronik.com').replace(/\/$/, '')

    if (onaylandi) {
      await sendEmail(
        email,
        'Bayi Hesabınız Onaylandı 🎉 | Akdağ Elektronik',
        bayiOnaylandiHTML({
          firma_adi,
          yetkili_adi,
          panel_url: `${siteUrl}/bayi/panel`,
        })
      )
    } else {
      await sendEmail(
        email,
        'Bayi Hesabınız Askıya Alındı | Akdağ Elektronik',
        bayiAskiyaAlindiHTML({ firma_adi, yetkili_adi })
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Bayi durum bildirim hatası:', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
