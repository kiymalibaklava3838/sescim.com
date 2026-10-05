import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

const akdagAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL!, process.env.AKDAG_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const db = supabaseAdmin()
    const { data: { user }, error: userErr } = await db.auth.getUser(token)

    if (userErr || !user) {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 })
    }

    const userEmail = (user.email || '').trim().toLowerCase()

    // 1. Kullanıcının siparişlerini ve sipariş kalemlerini çek
    const { data: orders, error: oErr } = await db
      .from('siparisler')
      .select('*, siparis_kalemleri(*)')
      .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
      .neq('durum', 'odeme_bekliyor')
      .order('created_at', { ascending: false })
      .limit(50)

    if (oErr) {
      console.error('[hesabim/siparisler] Error fetching orders:', oErr)
      return NextResponse.json({ error: oErr.message }, { status: 500 })
    }

    const orderList = orders || []

    // 2. Ürün fotoğraflarını çekmek için ID ve isim listesini hazırla
    const allKalemler = orderList.flatMap((s: any) => s.siparis_kalemleri || [])
    const urunIds = Array.from(new Set(allKalemler.map((k: any) => k.urun_id).filter(Boolean))) as string[]
    const urunAdlari = Array.from(new Set(allKalemler.map((k: any) => k.urun_adi).filter(Boolean))) as string[]

    const photoMap = new Map<string, string>()

    try {
      const akdagDb = akdagAdmin()
      const [sescimRes, akdagRes] = await Promise.all([
        urunIds.length > 0
          ? db.from('urunler').select('id, fotograflar').in('id', urunIds)
          : Promise.resolve({ data: [] }),
        urunAdlari.length > 0
          ? akdagDb.from('urunler').select('id, ad, fotograflar').in('ad', urunAdlari.slice(0, 50))
          : Promise.resolve({ data: [] })
      ])

      ;(sescimRes.data || []).forEach((p: any) => {
        if (p.fotograflar && p.fotograflar[0]) photoMap.set(p.id, p.fotograflar[0])
      })
      ;(akdagRes.data || []).forEach((p: any) => {
        if (p.fotograflar && p.fotograflar[0]) {
          photoMap.set(p.id, p.fotograflar[0])
          photoMap.set(p.ad, p.fotograflar[0])
        }
      })
    } catch (photoErr) {
      console.warn('[hesabim/siparisler] Error loading product photos:', photoErr)
    }

    // 3. Kalemleri formatla
    const formatted = orderList.map((o: any) => {
      const dekontMatch = o.notlar?.match(/Dekont yüklendi - ([^\s\]]+)/)
      const dekontUrl = o.dekont_url || (dekontMatch ? dekontMatch[1] : undefined)

      const kalemler = (o.siparis_kalemleri || []).map((k: any) => ({
        urun_id: k.urun_id || k.id,
        ad: k.urun_adi || 'Ürün',
        fiyat: Number(k.birim_fiyat) || 0,
        adet: Number(k.adet) || 1,
        fotograf: photoMap.get(k.urun_id) || photoMap.get(k.urun_adi) || '',
      }))

      return {
        ...o,
        dekont_url: dekontUrl,
        urunler: kalemler,
      }
    })

    return NextResponse.json({
      success: true,
      siparisler: formatted,
    })
  } catch (e: any) {
    console.error('[hesabim/siparisler] Unexpected error:', e)
    return NextResponse.json({ error: e.message || 'Sunucu hatası' }, { status: 500 })
  }
}
