import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'
import { isCouponAlreadyUsedByUser } from '@/lib/coupon-helper'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!(await rateLimit(`kupon:${ip}`, 30, 60_000))) {
      return NextResponse.json({ error: 'Çok fazla kupon denemesi. Lütfen bir dakika bekleyin.' }, { status: 429 })
    }

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '').trim()
    const db = supabaseAdmin()

    // 1. Üyelik Zorunluluğu: Kuponlar yalnızca kayıtlı ve giriş yapmış üyelere özeldir
    let user: any = null
    if (token) {
      const { data: authData, error: authErr } = await db.auth.getUser(token)
      if (!authErr && authData?.user) {
        user = authData.user
      }
    }

    const body = await req.json().catch(() => ({}))
    const rawKod = typeof body.kod === 'string' ? body.kod.trim().toUpperCase() : ''

    if (!rawKod) {
      return NextResponse.json({ error: 'Lütfen bir kupon kodu giriniz.' }, { status: 400 })
    }

    if (!user) {
      return NextResponse.json({
        valid: false,
        error: 'İndirim kuponu kullanabilmek için üye girişi yapmanız gerekmektedir.',
        requireLogin: true,
      }, { status: 401 })
    }

    // 2. Kuponu Veritabanında Ara
    const { data: kupon, error: kErr } = await db
      .from('kuponlar')
      .select('*')
      .ilike('kod', rawKod)
      .eq('aktif', true)
      .maybeSingle()

    if (kErr || !kupon) {
      return NextResponse.json({
        valid: false,
        error: 'Geçersiz veya süresi dolmuş kupon kodu.',
      }, { status: 404 })
    }

    // 3. Geçerlilik Tarihi Kontrolü
    if (kupon.gecerlilik_tarihi && new Date(kupon.gecerlilik_tarihi).getTime() < Date.now()) {
      return NextResponse.json({
        valid: false,
        error: 'Bu kuponun kullanım süresi dolmuştur.',
      }, { status: 400 })
    }

    // 4. Genel Kullanım Kotası Kontrolü
    if (kupon.max_kullanim && (kupon.kullanim_sayisi || 0) >= kupon.max_kullanim) {
      return NextResponse.json({
        valid: false,
        error: 'Bu kuponun toplam kullanım limiti dolmuştur.',
      }, { status: 400 })
    }

    // 5. Hesap Başına Tek Seferlik Kullanım Kontrolü
    const alreadyUsed = await isCouponAlreadyUsedByUser(db, {
      userId: user.id,
      email: user.email,
      couponCode: rawKod,
    })

    if (alreadyUsed) {
      return NextResponse.json({
        valid: false,
        error: `"${rawKod}" kupon kodu bu hesap tarafından daha önce kullanılmıştır. Her kupon hesap başına yalnızca 1 kez kullanılabilir.`,
        alreadyUsed: true,
      }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      kupon: {
        id: kupon.id,
        kod: kupon.kod,
        indirim_tipi: kupon.indirim_tipi,
        indirim_miktari: Number(kupon.indirim_miktari),
        min_tutar: kupon.min_tutar ? Number(kupon.min_tutar) : null,
        kategori: kupon.kategori || null,
        aciklama: kupon.aciklama || null,
        ozel_mi: kupon.ozel_mi || false,
      },
    })
  } catch (err: any) {
    console.error('[kupon-dogrula] Beklenmeyen hata:', err)
    return NextResponse.json({ error: 'Kupon doğrulanamadı. Lütfen tekrar deneyiniz.' }, { status: 500 })
  }
}
