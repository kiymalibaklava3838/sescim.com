import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { urun_id, email, telefon } = await req.json()

    if (!urun_id || !email) {
      return NextResponse.json({ error: 'Ürün ID ve E-posta zorunludur' }, { status: 400 })
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
