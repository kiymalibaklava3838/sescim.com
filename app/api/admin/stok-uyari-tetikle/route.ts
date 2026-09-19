import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, akdagAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendEmail } from '@/lib/send-email'
import { stokBildirimHTML } from '@/lib/email'
import { getSiteUrl } from '@/lib/site-url'

// Admin yetki kontrolü
async function isAdmin(req: NextRequest) {
  const cookieStore = cookies()
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { user } } = await db.auth.getUser()
  if (!user) return false

  const { data } = await supabaseAdmin!
    .from('site_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return !!data
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const db = supabaseAdmin!
    const akdagDb = akdagAdmin!
    const siteUrl = getSiteUrl()

    // Bekleyen tüm talepleri getir
    const { data: talepler, error } = await db
      .from('stok_talepleri')
      .select('id, urun_id, email, telefon')
      .eq('durum', 'bekliyor')

    if (error) throw error

    if (!talepler || talepler.length === 0) {
      return NextResponse.json({ message: 'Bekleyen talep yok', islenen: 0 })
    }

    let islenenAdet = 0

    // Talepleri ürün ID'lerine göre grupla, akdagDb'den tek sorguda çekmek için
    const urunIds = Array.from(new Set(talepler.map(t => t.urun_id)))
    
    // Akdağ DB'den bu ürünlerin stok durumunu çek
    const { data: urunler } = await akdagDb
      .from('urunler')
      .select('id, slug, ad, stok_adedi, fiyat')
      .in('id', urunIds)

    if (!urunler) {
      return NextResponse.json({ message: 'Ürün verisi okunamadı', islenen: 0 })
    }

    const stoktakiUrunler = urunler.filter(u => (u.stok_adedi || 0) > 0)
    const stoktaOlanUrunIdleri = stoktakiUrunler.map(u => u.id)

    // Sadece stokta olanların taleplerini filtrele
    const gonderilecekTalepler = talepler.filter(t => stoktaOlanUrunIdleri.includes(t.urun_id))

    for (const talep of gonderilecekTalepler) {
      const urun = stoktakiUrunler.find(u => u.id === talep.urun_id)
      if (talep.email && urun) {
        try {
          const urunSlug = urun.slug || urun.id
          await sendEmail(
            talep.email,
            `Müjde! "${urun.ad}" Yeniden Stoklarımızda! 🔔 | sescim.com`,
            stokBildirimHTML({
              urun_adi: urun.ad,
              urun_url: `${siteUrl}/urun/${urunSlug}`,
              fiyat: urun.fiyat,
            })
          )
        } catch (mailErr) {
          console.error('[STOK BİLDİRİMİ] E-posta gönderilemedi:', mailErr)
        }
      }
      
      // Talebi "bildirildi" olarak işaretle
      await db
        .from('stok_talepleri')
        .update({ durum: 'bildirildi', updated_at: new Date().toISOString() })
        .eq('id', talep.id)

      islenenAdet++
    }

    return NextResponse.json({ 
      success: true, 
      message: `${islenenAdet} adet stok uyarısı e-postası müşterilere başarıyla gönderildi.`,
      islenen: islenenAdet 
    })
  } catch (error: any) {
    console.error('Stok uyarı API hatası:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
