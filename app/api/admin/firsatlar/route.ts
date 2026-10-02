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

const ADMIN_EMAILS = [
  'ahmetakdag1355@gmail.com',
  'ahmetakdag1660@gmail.com',
  'info@akdagelektronik.com.tr'
]

async function verifyAdmin(req: NextRequest, db: any) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return { ok: false, status: 401, error: 'Yetkisiz erişim: Oturum anahtarı bulunamadı' }
  }
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authErr } = await db.auth.getUser(token)

  if (authErr || !user) {
    return { ok: false, status: 401, error: 'Geçersiz oturum' }
  }

  // 1. site_admins tablosundan kontrol
  const { data: adminCheck } = await db
    .from('site_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  // 2. Yedek e-posta kontrolü
  const isEmailAdmin = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

  if (!adminCheck && !isEmailAdmin) {
    return { ok: false, status: 403, error: 'Admin yetkisi gerekli' }
  }

  // Self-healing: E-posta ile doğrulanmış admin'i site_admins tablosuna otomatik kaydet
  if (!adminCheck && isEmailAdmin) {
    try {
      await db.from('site_admins').insert({ user_id: user.id })
    } catch {}
  }

  return { ok: true, user }
}

/**
 * Akdağ veritabanından gelen ürünün, Sescim foreign key kısıtını
 * ihlal etmemesi için Sescim urunler tablosunda ayna (mirror) kaydını sağlar.
 */
async function ensureMirrorProduct(db: any, product: any) {
  if (!product || !product.id) return

  const { data: existing } = await db
    .from('urunler')
    .select('id')
    .eq('id', product.id)
    .maybeSingle()

  if (!existing) {
    const mirrorPayload: Record<string, any> = {
      id: product.id,
      ad: product.ad || 'Ürün',
      aciklama: product.aciklama || product.ad || 'Profesyonel Ses Ekipmanı',
      fotograflar: Array.isArray(product.fotograflar) ? product.fotograflar : [],
      fiyat: Number(product.fiyat) || 0,
      para_birimi: product.para_birimi || 'TRY',
      marka: product.marka || null,
      model_kodu: product.model_kodu || null,
      slug: product.slug || null,
      stok_durumu: product.stok_durumu || 'stokta',
      aktif: true,
      sescim_aktif: true
    }

    const { error: mirrorErr } = await db.from('urunler').insert(mirrorPayload)
    if (mirrorErr) {
      console.warn('Mirror product creation warning:', mirrorErr.message)
    }
  }
}

function triggerCacheRevalidation(slug?: string) {
  try {
    revalidatePath('/')
    revalidatePath('/firsatlar')
    revalidatePath('/outlet')
    if (slug) {
      revalidatePath(`/urun/${slug}`)
    }
    revalidateTag('products')
    revalidateTag('product-detail')
  } catch (e) {
    console.warn('Cache revalidation notice:', e)
  }
}

// GET: Tüm fırsatları ve outletleri getir
export async function GET(req: NextRequest) {
  try {
    const db = getSupabaseAdmin()
    const auth = await verifyAdmin(req, db)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const [firsatRes, outletRes] = await Promise.all([
      db.from('flas_indirimler').select('*').order('created_at', { ascending: false }),
      db.from('outlet_urunler').select('*').order('created_at', { ascending: false })
    ])

    return NextResponse.json({
      firsatlar: firsatRes.data || [],
      outlet: outletRes.data || []
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}

// POST: Yeni Fırsat veya Outlet ekle
export async function POST(req: NextRequest) {
  try {
    const db = getSupabaseAdmin()
    const auth = await verifyAdmin(req, db)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await req.json()
    const { action, urun_id, indirimli_fiyat, baslangic_tarihi, bitis_tarihi, durum_aciklamasi, stok_adedi, product } = body

    if (!urun_id) {
      return NextResponse.json({ error: 'Ürün ID zorunludur' }, { status: 400 })
    }

    // 1. Akdağ ürününü Sescim DB'sine ayna olarak kaydet (Foreign Key garantisi)
    await ensureMirrorProduct(db, product || { id: urun_id })

    if (action === 'create_firsat') {
      const fiyatNum = Number(indirimli_fiyat)
      if (isNaN(fiyatNum) || fiyatNum <= 0) {
        return NextResponse.json({ error: 'Geçerli bir fırsat indirimli fiyatı giriniz' }, { status: 400 })
      }
      if (!baslangic_tarihi || !bitis_tarihi) {
        return NextResponse.json({ error: 'Başlangıç ve bitiş tarihi zorunludur' }, { status: 400 })
      }

      // Flaş indirim tablosuna ekle
      const { data: firsatRow, error: firsatErr } = await db
        .from('flas_indirimler')
        .insert({
          urun_id,
          indirimli_fiyat: fiyatNum,
          baslangic_tarihi: new Date(baslangic_tarihi).toISOString(),
          bitis_tarihi: new Date(bitis_tarihi).toISOString(),
          aktif: true
        })
        .select()
        .single()

      if (firsatErr) {
        console.error('Flas indirim insert error:', firsatErr)
        return NextResponse.json({ error: firsatErr.message }, { status: 500 })
      }

      // sescim_fiyatlar tablosunu senkronize et
      try {
        await db.from('sescim_fiyatlar').upsert({
          urun_id,
          sescim_indirimli_fiyat: fiyatNum,
          is_firsat: true,
          sescim_aktif: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'urun_id' })
      } catch (sfErr) {
        console.warn('sescim_fiyatlar sync warning:', sfErr)
      }

      triggerCacheRevalidation(product?.slug)
      return NextResponse.json({ success: true, item: firsatRow })
    }

    if (action === 'create_outlet') {
      const outletFiyatNum = Number(indirimli_fiyat)
      if (isNaN(outletFiyatNum) || outletFiyatNum <= 0) {
        return NextResponse.json({ error: 'Geçerli bir outlet fiyatı giriniz' }, { status: 400 })
      }

      const { data: outletRow, error: outletErr } = await db
        .from('outlet_urunler')
        .insert({
          urun_id,
          outlet_fiyat: outletFiyatNum,
          durum_aciklamasi: durum_aciklamasi || 'Teşhir Ürünü - 1 Yıl Distribütör Garantili',
          stok_adedi: parseInt(stok_adedi) || 1,
          aktif: true
        })
        .select()
        .single()

      if (outletErr) {
        return NextResponse.json({ error: outletErr.message }, { status: 500 })
      }

      // sescim_fiyatlar tablosuna da yansıt
      try {
        await db.from('sescim_fiyatlar').upsert({
          urun_id,
          sescim_indirimli_fiyat: outletFiyatNum,
          is_outlet: true,
          outlet_durum: durum_aciklamasi || 'Teşhir Ürünü - 1 Yıl Distribütör Garantili',
          sescim_aktif: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'urun_id' })
      } catch {}

      triggerCacheRevalidation(product?.slug)
      return NextResponse.json({ success: true, item: outletRow })
    }

    return NextResponse.json({ error: 'Geçersiz işlem tipi' }, { status: 400 })
  } catch (err: any) {
    console.error('Deal admin post error:', err)
    return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}

// PUT: Aktif / Pasif durumunu değiştir
export async function PUT(req: NextRequest) {
  try {
    const db = getSupabaseAdmin()
    const auth = await verifyAdmin(req, db)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await req.json()
    const { type, id, urun_id, new_status, slug } = body

    if (!id || !urun_id || typeof new_status !== 'boolean') {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
    }

    if (type === 'firsat') {
      const { error } = await db.from('flas_indirimler').update({ aktif: new_status }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      try {
        if (!new_status) {
          await db.from('sescim_fiyatlar').update({ is_firsat: false, sescim_indirimli_fiyat: null }).eq('urun_id', urun_id)
        } else {
          const { data: fItem } = await db.from('flas_indirimler').select('indirimli_fiyat').eq('id', id).maybeSingle()
          if (fItem) {
            await db.from('sescim_fiyatlar').upsert({
              urun_id,
              sescim_indirimli_fiyat: fItem.indirimli_fiyat,
              is_firsat: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'urun_id' })
          }
        }
      } catch {}

      triggerCacheRevalidation(slug)
      return NextResponse.json({ success: true })
    }

    if (type === 'outlet') {
      const { error } = await db.from('outlet_urunler').update({ aktif: new_status }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      try {
        await db.from('sescim_fiyatlar').update({ is_outlet: new_status }).eq('urun_id', urun_id)
      } catch {}

      triggerCacheRevalidation(slug)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Geçersiz tip' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}

// DELETE: Fırsatı veya Outlet'i sil
export async function DELETE(req: NextRequest) {
  try {
    const db = getSupabaseAdmin()
    const auth = await verifyAdmin(req, db)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')
    const urun_id = searchParams.get('urun_id')
    const slug = searchParams.get('slug') || undefined

    if (!id || !urun_id || !type) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
    }

    if (type === 'firsat') {
      const { error } = await db.from('flas_indirimler').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      try {
        await db.from('sescim_fiyatlar').update({ is_firsat: false, sescim_indirimli_fiyat: null }).eq('urun_id', urun_id)
      } catch {}

      triggerCacheRevalidation(slug)
      return NextResponse.json({ success: true })
    }

    if (type === 'outlet') {
      const { error } = await db.from('outlet_urunler').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      try {
        await db.from('sescim_fiyatlar').update({ is_outlet: false }).eq('urun_id', urun_id)
      } catch {}

      triggerCacheRevalidation(slug)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Geçersiz tip' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}
