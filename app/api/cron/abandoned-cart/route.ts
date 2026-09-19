import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { terkedilmisSepetHTML } from '@/lib/email'
import { sendEmail } from '@/lib/send-email'
import { getSiteUrl } from '@/lib/site-url'
import { getKur, dovizToTL } from '@/lib/kur'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

export async function GET(req: NextRequest) {
  return handleAbandonedCarts(req)
}

export async function POST(req: NextRequest) {
  return handleAbandonedCarts(req)
}

async function handleAbandonedCarts(req: NextRequest) {
  try {
    // Güvenlik: Cron secret veya admin oturum doğrulaması
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`

    // Eğer secret tanımlıysa ve uyuşmuyorsa yetkisiz dön
    if (cronSecret && !isAuthorized) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const supabase = supabaseAdmin()
    const baseUrl = getSiteUrl()
    const kur = await getKur()

    // 2 saat öncesi ile 48 saat öncesi arasındaki sepet kayıtları
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    // 1. Sepet verilerini çek
    const { data: sepetEntries, error: sepetErr } = await supabase
      .from('sepet')
      .select('user_id, urun_id, adet, created_at')
      .lt('created_at', twoHoursAgo)
      .gt('created_at', fortyEightHoursAgo)

    if (sepetErr || !sepetEntries || sepetEntries.length === 0) {
      return NextResponse.json({
        message: 'Hatırlatılacak terk edilmiş sepet bulunamadı',
        processed: 0,
      })
    }

    // Kullanıcı bazında sepetleri grupla
    const userCartMap = new Map<string, Array<{ urun_id: string; adet: number }>>()
    for (const item of sepetEntries) {
      if (!item.user_id) continue
      const current = userCartMap.get(item.user_id) || []
      current.push({ urun_id: item.urun_id, adet: item.adet })
      userCartMap.set(item.user_id, current)
    }

    let sentCount = 0
    const processedUsers: string[] = []

    for (const [userId, items] of Array.from(userCartMap.entries())) {
      // 2. Kullanıcının son 48 saatte tamamlanmış siparişi var mı kontrol et
      const { data: recentOrders } = await supabase
        .from('siparisler')
        .select('id')
        .eq('user_id', userId)
        .gt('created_at', fortyEightHoursAgo)
        .limit(1)

      if (recentOrders && recentOrders.length > 0) {
        continue // Kullanıcı zaten sipariş vermiş
      }

      // 3. Kullanıcı bilgilerini çek
      const { data: profile } = await supabase
        .from('uye_profiller')
        .select('ad, soyad')
        .eq('user_id', userId)
        .maybeSingle()

      const userName = profile ? `${profile.ad || ''} ${profile.soyad || ''}`.trim() : ''

      // auth.users üzerinden e-posta bul
      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      const userEmail = authUser?.user?.email

      if (!userEmail) continue

      // 4. Sepetteki ürünlerin detaylarını çek
      const urunIds = items.map((i: any) => i.urun_id)
      const { data: products } = await supabase
        .from('urunler')
        .select('id, ad, fotograflar, fiyat, indirimli_fiyat, sescim_fiyat, sescim_indirimli_fiyat, para_birimi')
        .in('id', urunIds)

      if (!products || products.length === 0) continue

      let totalTL = 0
      const formattedUrunler = products.map((p) => {
        const cartItem = items.find((i: any) => i.urun_id === p.id)
        const adet = cartItem?.adet || 1
        const pb = p.para_birimi || 'TRY'
        const rawFiyat = p.sescim_indirimli_fiyat || p.sescim_fiyat || p.indirimli_fiyat || p.fiyat || 0
        const fiyatTL = dovizToTL(rawFiyat, pb, kur)
        totalTL += fiyatTL * adet

        return {
          ad: p.ad,
          fiyat: fiyatTL,
          adet,
          fotograf: Array.isArray(p.fotograflar) && p.fotograflar[0] ? p.fotograflar[0] : undefined,
        }
      })

      // 5. Hatırlatma e-postasını oluştur ve gönder
      const html = terkedilmisSepetHTML({
        ad_soyad: userName || undefined,
        urunler: formattedUrunler,
        toplam_tutar: totalTL,
        sepet_url: `${baseUrl}/sepet`,
        kupon_kodu: 'SESCIM5',
      })

      await sendEmail(
        userEmail,
        'Sepetinizde kalan ürünleri sizin için ayırdık! 🎵',
        html
      )

      sentCount++
      processedUsers.push(userEmail)
    }

    return NextResponse.json({
      success: true,
      message: `${sentCount} adet terk edilmiş sepet hatırlatması gönderildi.`,
      processed: sentCount,
      recipients: processedUsers,
    })
  } catch (error: any) {
    console.error('Abandoned cart cron error:', error)
    return NextResponse.json({ error: error.message || 'İşlem başarısız' }, { status: 500 })
  }
}
