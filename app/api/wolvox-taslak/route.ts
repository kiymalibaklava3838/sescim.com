import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Service Role Key ile Supabase bağlantısı - RLS'i bypass eder
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Admin session kontrolü
async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data } = await supabaseAdmin
      .from('site_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    return !!data
  } catch {
    return false
  }
}

const SAYFA_BOYUTU = 50

export async function GET(request: Request) {
  // Admin kontrolü
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const yil = searchParams.get('yil')
  const search = searchParams.get('search') || ''

  const from = (page - 1) * SAYFA_BOYUTU
  const to = from + SAYFA_BOYUTU - 1

  let query = supabaseAdmin
    .from('wolvox_taslak')
    .select('*', { count: 'exact' })
    .or('is_processed.eq.false,is_processed.is.null')
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (yil) {
    query = query.eq('yil', parseInt(yil))
  }

  if (search) {
    query = query.or(`stok_adi.ilike.%${search}%,stok_kodu.ilike.%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mevcut yılları getir (filtre için) - Optimizasyon: Sadece benzersiz yılları çek
  const { data: yillar } = await supabaseAdmin
    .from('wolvox_taslak')
    .select('yil')
    .or('is_processed.eq.false,is_processed.is.null')
    .not('yil', 'is', null)
    .order('yil', { ascending: false })
    .limit(100) // Aşırı veri çekimini engellemek için limit koyuldu (genelde zaten 3-5 farklı yıl olur)

  const uniqueYillar = Array.from(new Set((yillar || []).map(r => r.yil).filter(Boolean)))

  const totalPages = Math.ceil((count || 0) / SAYFA_BOYUTU)

  return NextResponse.json({
    data,
    total: count || 0,
    page,
    totalPages,
    yillar: uniqueYillar
  })
}

export async function DELETE(request: Request) {
  // Admin kontrolü
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
  }

  const { id } = await request.json()

  const { error } = await supabaseAdmin
    .from('wolvox_taslak')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
