import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath, revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

export async function POST(req: NextRequest) {
  try {
    const db = getSupabaseAdmin()

    // 1. Yetki Kontrolü
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await db.auth.getUser(token)

    if (authErr || !user) {
      return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
    }

    const { data: adminCheck } = await db
      .from('site_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminCheck) {
      return NextResponse.json({ error: 'Admin yetkisi gerekli' }, { status: 403 })
    }

    const body = await req.json()
    const { product, sira } = body

    if (!product || !product.id) {
      return NextResponse.json({ error: 'Ürün bilgisi eksik' }, { status: 400 })
    }

    // 2. Akdağ kataloğundan gelen ürün Sescim veritabanında yoksa,
    // foreign key kısıtını aşmak için Sescim urunler tablosuna ayna (mirror) kaydı oluştur
    const { data: existing } = await db
      .from('urunler')
      .select('id')
      .eq('id', product.id)
      .maybeSingle()

    if (!existing) {
      const { error: mirrorErr } = await db.from('urunler').insert({
        id: product.id,
        ad: product.ad || 'Ürün',
        aciklama: product.aciklama || product.ad || 'Profesyonel Ses Ekipmanı',
        kategori: product.kategori || 'Ses Sistemleri',
        alt_kategori: product.alt_kategori || null,
        fotograflar: Array.isArray(product.fotograflar) ? product.fotograflar : [],
        fiyat: product.fiyat ?? 0,
        para_birimi: product.para_birimi || 'TRY',
        stok_durumu: product.stok_durumu || 'stokta',
        marka: product.marka || null,
        slug: product.slug || product.id,
      })

      if (mirrorErr) {
        console.warn('Sescim urunler tablosuna ayna kayıt oluşturulurken hata:', mirrorErr.message)
      }
    }

    // 3. ozel_urunler tablosuna ekle
    const { data: ozelData, error: ozelErr } = await db
      .from('ozel_urunler')
      .insert([{
        urun_id: product.id,
        tip: 'profesyonellerin_tercihi',
        sira: sira || 1
      }])
      .select()

    if (ozelErr) {
      console.error('ozel_urunler ekleme hatası:', ozelErr)
      return NextResponse.json({ 
        error: `Eklenemedi: ${ozelErr.message}. Supabase SQL Editor'da 'ALTER TABLE ozel_urunler DROP CONSTRAINT IF EXISTS ozel_urunler_urun_id_fkey;' komutunu çalıştırmanız gerekebilir.` 
      }, { status: 400 })
    }

    // 4. Anında önbellekleri temizle
    try {
      revalidatePath('/')
      revalidatePath('/urunler')
      revalidateTag('products')
    } catch {}

    return NextResponse.json({
      success: true,
      data: ozelData?.[0]
    })
  } catch (err: any) {
    console.error('Pro Tercih API Error:', err)
    return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getSupabaseAdmin()

    // 1. Yetki Kontrolü
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await db.auth.getUser(token)

    if (authErr || !user) {
      return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
    }

    const { data: adminCheck } = await db
      .from('site_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminCheck) {
      return NextResponse.json({ error: 'Admin yetkisi gerekli' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const ozelId = searchParams.get('id')

    if (!ozelId) {
      return NextResponse.json({ error: 'Kayıt ID eksik' }, { status: 400 })
    }

    const { error: delErr } = await db
      .from('ozel_urunler')
      .delete()
      .eq('id', ozelId)

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 })
    }

    // Önbellekleri temizle
    try {
      revalidatePath('/')
      revalidatePath('/urunler')
      revalidateTag('products')
    } catch {}

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}
