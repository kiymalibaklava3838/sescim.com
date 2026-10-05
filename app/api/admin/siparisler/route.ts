import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

const akdagAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL!, process.env.AKDAG_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

async function isAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  const db = supabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return false
  const { data } = await db
    .from('site_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return !!data
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(0, parseInt(searchParams.get('page') || '0'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const from = page * limit
    const to = from + limit - 1

    const db = supabaseAdmin()
    const akdagDb = akdagAdmin()

    // 1. Siparişleri ve sipariş kalemlerini (ürünlerini) birlikte çek
    const { data: siparisler, error: sErr } = await db
      .from('siparisler')
      .select('*, siparis_kalemleri(*)')
      .neq('durum', 'odeme_bekliyor')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (sErr) {
      console.error('[admin/siparisler] Error fetching orders:', sErr)
      return NextResponse.json({ error: sErr.message }, { status: 500 })
    }

    const orderList = siparisler || []

    // 2. Ürün fotoğraflarını çekmek için ID ve isim listesini hazırla
    const allKalemler = orderList.flatMap((s: any) => s.siparis_kalemleri || [])
    const urunIds = Array.from(new Set(allKalemler.map((k: any) => k.urun_id).filter(Boolean))) as string[]
    const urunAdlari = Array.from(new Set(allKalemler.map((k: any) => k.urun_adi).filter(Boolean))) as string[]

    const photoMap = new Map<string, string>()

    try {
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
      console.warn('[admin/siparisler] Error loading product photos:', photoErr)
    }

    // 3. Sipariş kalemlerini Admin arayüz formatına eşle
    const formatted = orderList.map((s: any) => {
      const kalemler = (s.siparis_kalemleri || []).map((k: any) => ({
        urun_id: k.urun_id || k.id,
        ad: k.urun_adi || 'Ürün',
        fiyat: Number(k.birim_fiyat) || 0,
        adet: Number(k.adet) || 1,
        fotograf: photoMap.get(k.urun_id) || photoMap.get(k.urun_adi) || '',
      }))

      return {
        ...s,
        urunler: kalemler,
      }
    })

    return NextResponse.json({
      siparisler: formatted,
      hasMore: formatted.length === limit,
    })
  } catch (e: any) {
    console.error('[admin/siparisler] Unexpected error:', e)
    return NextResponse.json({ error: e.message || 'Sunucu hatası' }, { status: 500 })
  }
}
