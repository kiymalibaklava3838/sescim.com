import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!(await rateLimit(`stok_bildirim:${ip}`, 5, 60_000))) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz sonra deneyin.' }, { status: 429 })
    }

    const { urun_id, email, telefon } = await req.json()

    if (!urun_id || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Geçerli bir Ürün ID ve E-posta adresi zorunludur' }, { status: 400 })
    }

    const db = supabaseAdmin!

    // Sadece ekliyoruz (eğer varsa hata verir ama ignore the constraint error or handle it)
    const { error } = await db
      .from('stok_talepleri')
      .insert({ urun_id, email, telefon, durum: 'bekliyor' })

    // "duplicate key" hatası (zaten aynı e-postayla talep var) gelirse de success dönelim
    if (error && error.code !== '23505') {
      console.error('Stok bildirim eklenirken hata:', error)
      return NextResponse.json({ error: 'Kayıt başarısız' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
