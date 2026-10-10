import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateOrderStatus, OrderStatus, ORDER_STATUSES } from '@/lib/order-status'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

/** Gelen Authorization: Bearer <token> token'ından admin olup olmadığını doğrular. */
async function getAdminUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return null
  const db = supabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return null
  const { data } = await db
    .from('site_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return data ? user : null
}

export async function POST(req: NextRequest) {
  try {
    // 1. Yetki kontrolü — sadece adminler sipariş durumunu güncelleyebilir
    const adminUser = await getAdminUser(req)
    if (!adminUser) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { id, durum, odeme_durumu, kargo_takip_no, kargo_firmasi } = body

    if (!id) {
      return NextResponse.json({ error: 'Sipariş ID zorunludur' }, { status: 400 })
    }

    // 2. Durum doğrulaması
    if (durum && !ORDER_STATUSES.includes(durum as OrderStatus)) {
      return NextResponse.json(
        { error: `Geçersiz sipariş durumu: "${durum}". İzin verilenler: ${ORDER_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // 3. Merkezi sipariş durum servisini çağır
    const result = await updateOrderStatus({
      orderId: id,
      newStatus: durum as OrderStatus,
      odeme_durumu,
      kargo_takip_no: kargo_takip_no !== undefined ? String(kargo_takip_no).trim() : undefined,
      kargo_firmasi: kargo_firmasi !== undefined ? String(kargo_firmasi).trim() : undefined,
      updatedBy: adminUser.email ? `admin (${adminUser.email})` : 'admin',
      forceTransition: true,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Sipariş güncellenemedi' },
        { status: result.statusCode || 400 }
      )
    }

    return NextResponse.json({
      success: true,
      unchanged: result.unchanged || false,
      oldStatus: result.oldStatus,
      newStatus: result.newStatus,
      emailSent: result.emailSent || false,
    })
  } catch (e: any) {
    console.error('[siparis-durum-guncelle] Sunucu hatası:', e)
    return NextResponse.json({ error: 'Sunucu hatası: ' + (e?.message || 'Bilinmeyen hata') }, { status: 500 })
  }
}
