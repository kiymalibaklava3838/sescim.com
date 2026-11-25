import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  getFlashCampaignMetaMap,
  setFlashCampaignMeta,
  deleteFlashCampaignMeta,
  normalizeFlashMeta,
} from '@/lib/flash-campaign'

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

  const stokAdedi = typeof product.stok_adedi === 'number'
    ? product.stok_adedi
    : (parseInt(product.stok_adedi) || 0)
  const stokDurumu = product.stok_durumu || (stokAdedi > 0 ? 'stokta' : 'tukendi')

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
      stok_adedi: stokAdedi,
      stok_durumu: stokDurumu,
      aktif: true,
      sescim_aktif: true,
      kategori_id: product.kategori || null,
      alt_kategori_id: product.alt_kategori || null
    }

    const { error: mirrorErr } = await db.from('urunler').insert(mirrorPayload)
    if (mirrorErr) {
      console.warn('Mirror product creation warning:', mirrorErr.message)
    }
  } else {
    // Mevcut ayna kaydının stok ve durumunu da güncelle
    try {
      await db
        .from('urunler')
        .update({
          stok_adedi: stokAdedi,
          stok_durumu: stokDurumu,
          fiyat: Number(product.fiyat) || undefined,
          slug: product.slug || undefined,
          kategori_id: product.kategori || undefined,
          alt_kategori_id: product.alt_kategori || undefined
        })
        .eq('id', product.id)
    } catch {}
  }
}

function triggerCacheRevalidation(slug?: string, kampanyaSlug?: string) {
  try {
    revalidatePath('/')
    revalidatePath('/firsatlar')
    revalidatePath('/outlet')
    revalidatePath('/urunler')
    revalidatePath('/arama')
    revalidatePath('/api/feed/google-merchant')
    if (slug) {
      revalidatePath(`/urun/${slug}`)
    }
    if (kampanyaSlug && kampanyaSlug !== 'sescim-haftasi') {
      revalidatePath(`/kampanya/${kampanyaSlug}`)
    }
    revalidateTag('products')
    revalidateTag('product-detail')
    revalidateTag('flash-meta')
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

    const [firsatRes, outletRes, metaMap] = await Promise.all([
      db.from('flas_indirimler').select('*').order('created_at', { ascending: false }),
      db.from('outlet_urunler').select('*').order('created_at', { ascending: false }),
      getFlashCampaignMetaMap({ noCache: true }),
    ])

    const firsatlar = (firsatRes.data || []).map((f: any) => ({
      ...f,
      kampanya: normalizeFlashMeta(metaMap[f.id]),
    }))

    return NextResponse.json({
      firsatlar,
      outlet: outletRes.data || [],
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
    const { action, urun_id, indirimli_fiyat, fiyat_para_birimi, baslangic_tarihi, bitis_tarihi, durum_aciklamasi, stok_adedi, product, kampanya } = body

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

      const startDate = new Date(baslangic_tarihi)
      const endDate = new Date(bitis_tarihi)
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Geçersiz başlangıç veya bitiş tarihi' }, { status: 400 })
      }
      if (endDate.getTime() <= startDate.getTime()) {
        return NextResponse.json({ error: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır.' }, { status: 400 })
      }
      if (endDate.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'Bitiş tarihi ileri bir tarih olmalıdır.' }, { status: 400 })
      }

      // Aynı ürün için halihazırda aktif ve süresi dolmamış başka bir kampanya var mı kontrol et
      const { data: activeExisting } = await db
        .from('flas_indirimler')
        .select('id')
        .eq('urun_id', urun_id)
        .eq('aktif', true)
        .gt('bitis_tarihi', new Date().toISOString())
        .limit(1)

      if (activeExisting && activeExisting.length > 0) {
        return NextResponse.json(
          { error: 'Bu ürün zaten aktif bir kampanyada yer alıyor. Önce mevcut kampanyayı pasife alın veya silin.' },
          { status: 409 }
        )
      }

      // Flaş indirim tablosuna ekle
      const indirimliFiyatPB = fiyat_para_birimi || 'TRY'
      const { data: firsatRow, error: firsatErr } = await db
        .from('flas_indirimler')
        .insert({
          urun_id,
          indirimli_fiyat: fiyatNum,
          fiyat_para_birimi: indirimliFiyatPB,
          baslangic_tarihi: startDate.toISOString(),
          bitis_tarihi: endDate.toISOString(),
          aktif: true
        })
        .select()
        .single()

      if (firsatErr) {
        console.error('Flas indirim insert error:', firsatErr)
        return NextResponse.json({ error: firsatErr.message }, { status: 500 })
      }

      // Kampanya tipini ve özelleştirilmiş rozet ayarlarını kaydet
      const savedMeta = await setFlashCampaignMeta(firsatRow.id, kampanya)
      const isSescimHaftasi = savedMeta.kampanya_tipi === 'sescim_haftasi'

      // sescim_fiyatlar tablosuna SADECE is_firsat ve sescim_aktif durumunu işle;
      // sescim_indirimli_fiyat'ı ezme (süresi dolan flaş fiyatının kalıcı olmasını önler)
      try {
        await db.from('sescim_fiyatlar').upsert({
          urun_id,
          is_firsat: isSescimHaftasi,
          sescim_aktif: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'urun_id' })
      } catch (sfErr) {
        console.warn('sescim_fiyatlar sync warning:', sfErr)
      }

      triggerCacheRevalidation(product?.slug, savedMeta.kampanya_slug)
      return NextResponse.json({ success: true, item: { ...firsatRow, kampanya: savedMeta } })
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
          fiyat_para_birimi: fiyat_para_birimi || 'TRY',
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
    const { type, id, urun_id, new_status, slug, kampanya } = body

    if (!id || !urun_id) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
    }

    if (type === 'firsat') {
      // Kampanya rozet / tip güncellemesi gönderildiyse kaydet
      if (kampanya) {
        const updatedMeta = await setFlashCampaignMeta(id, kampanya)
        try {
          await db
            .from('sescim_fiyatlar')
            .update({ is_firsat: updatedMeta.kampanya_tipi === 'sescim_haftasi' })
            .eq('urun_id', urun_id)
        } catch {}
        triggerCacheRevalidation(slug)
        if (typeof new_status !== 'boolean') {
          return NextResponse.json({ success: true, kampanya: updatedMeta })
        }
      }

      if (typeof new_status !== 'boolean') {
        return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
      }

      const { error } = await db.from('flas_indirimler').update({ aktif: new_status }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const metaMap = await getFlashCampaignMetaMap({ noCache: true })
      const dealMeta = normalizeFlashMeta(metaMap[id])

      try {
        if (!new_status) {
          await db.from('sescim_fiyatlar').update({ is_firsat: false }).eq('urun_id', urun_id)
        } else {
          await db.from('sescim_fiyatlar').upsert({
            urun_id,
            is_firsat: dealMeta.kampanya_tipi === 'sescim_haftasi',
            updated_at: new Date().toISOString()
          }, { onConflict: 'urun_id' })
        }
      } catch {}

      triggerCacheRevalidation(slug, dealMeta.kampanya_slug)
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
      const metaMap = await getFlashCampaignMetaMap({ noCache: true })
      const dealMeta = normalizeFlashMeta(metaMap[id])

      const { error } = await db.from('flas_indirimler').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await deleteFlashCampaignMeta(id)

      try {
        await db.from('sescim_fiyatlar').update({ is_firsat: false }).eq('urun_id', urun_id)
      } catch {}

      triggerCacheRevalidation(slug, dealMeta.kampanya_slug)
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
