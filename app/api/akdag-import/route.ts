import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const AKDAG_URL = process.env.AKDAG_SUPABASE_URL || 'https://csekzzsaeehakpdmzfam.supabase.co'
const AKDAG_KEY = process.env.AKDAG_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzZWt6enNhZWVoYWtwZG16ZmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzEzMDIsImV4cCI6MjA5MjM0NzMwMn0.mz8y4Stqv4HKqvxxJZZScxeAlENe-VOGjXm5n4AT_ec'

export async function GET(request: NextRequest) {
  try {
    const akdag = createClient(AKDAG_URL, AKDAG_KEY)
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '200')

    let query = akdag
      .from('urunler')
      .select('id, ad, aciklama, kategori, fotograflar, fiyat, para_birimi, marka, stok_durumu')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (search) {
      query = query.ilike('ad', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Only return liste_fiyati (fiyat field), NOT bayi_fiyati
    const products = (data || []).map((p: any) => ({
      id: p.id,
      ad: p.ad,
      aciklama: p.aciklama,
      kategori: p.kategori,
      fotograflar: p.fotograflar || [],
      liste_fiyati: p.fiyat, // liste fiyatı - bayi fiyatı değil
      para_birimi: p.para_birimi || 'TRY',
      marka: p.marka,
      stok_durumu: p.stok_durumu || 'stokta',
    }))

    return NextResponse.json({ products })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
