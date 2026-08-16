import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Helper function to create the admin (service_role) client to bypass RLS
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Security middleware to verify if the request comes from an authenticated site admin
async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const token = authHeader.split('Bearer ')[1]
  if (!token) return null

  // Validate the token using a standard Supabase client (anon)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  // Check if the user ID is in the site_admins table using the admin client
  const adminClient = createAdminClient()
  const { data: isAdmin, error: adminErr } = await adminClient
    .from('site_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminErr || !isAdmin) return null

  return user
}

// GET: Fetch admin proposals (where bayi_id IS NULL)
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAdmin(req)
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('teklifler')
      .select('id, teklif_no, musteri_adi, tarih, genel_toplam, kur_usd, kur_eur, ozel_not, urunler, created_at')
      .is('bayi_id', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data || [])
  } catch (e: any) {
    console.error('Admin Proposals GET error:', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// POST: Save (insert or update) an admin proposal
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAdmin(req)
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 })
    }

    const body = await req.json()
    const { isNewVersion, currentProposalId, payload } = body

    if (!payload || !payload.musteri_adi || !payload.urunler || payload.urunler.length === 0) {
      return NextResponse.json({ error: 'Geçersiz teklif verisi.' }, { status: 400 })
    }

    // Force bayi_id to null so it is identified as an admin proposal and bypasses dealer constraints
    const finalPayload = {
      ...payload,
      bayi_id: null
    }

    const adminClient = createAdminClient()
    let result;

    if (isNewVersion || !currentProposalId) {
      // Insert new proposal
      result = await adminClient
        .from('teklifler')
        .insert([finalPayload])
        .select('id, teklif_no')
        .single()
    } else {
      // Update existing proposal
      result = await adminClient
        .from('teklifler')
        .update(finalPayload)
        .eq('id', currentProposalId)
        .select('id, teklif_no')
        .single()
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })
  } catch (e: any) {
    console.error('Admin Proposals POST error:', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// DELETE: Delete an admin proposal
export async function DELETE(req: NextRequest) {
  try {
    const user = await verifyAdmin(req)
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID parametresi gereklidir.' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('teklifler')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Admin Proposals DELETE error:', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
