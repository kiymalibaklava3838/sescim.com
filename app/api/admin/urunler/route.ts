import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { upsertSescimPricing } from '@/lib/sescim-pricing'
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

  return { ok: true, user }
}

export async function POST(req: NextRequest) {
  try {
    const sescimDb = getSupabaseAdmin()
    const auth = await verifyAdmin(req, sescimDb)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await req.json()
    const { action, id, kaynak } = body

    if (!id) {
      return NextResponse.json({ error: 'Ürün ID zorunludur' }, { status: 400 })
    }

    // ── AKSIYON 1: Vitrin (Featured) Durumunu Değiştir ──
    if (action === 'toggle_featured') {
      const { is_featured, slug } = body
      const newFeatured = !!is_featured

      if (kaynak === 'akdag') {
        const akdagDb = createAkdagServerClient()
        await akdagDb.from('urunler').update({ is_featured: newFeatured, updated_at: new Date().toISOString() }).eq('id', id)
        // Sescim'deki ayna kaydı da varsa güncelle
        await sescimDb.from('urunler').update({ is_featured: newFeatured }).eq('id', id)
      } else {
        await sescimDb.from('urunler').update({ is_featured: newFeatured }).eq('id', id)
      }

      if (slug) revalidatePath(`/urun/${slug}`)
      revalidatePath('/')
      revalidatePath('/urunler')
      revalidateTag('products')

      return NextResponse.json({ success: true, is_featured: newFeatured })
    }

    // ── AKSIYON 2: Ürün Bilgilerini Güncelle ──
    const {
      ad,
      aciklama,
      kategori,
      alt_kategori,
      urun_tipi,
      fotograflar,
      marka,
      model_kodu,
      kullanim_alani,
      is_featured,
      fiyat,
      para_birimi,
      stok_durumu,
      stok_adedi,
      kritik_stok,
      sescim_fiyat,
      sescim_indirimli_fiyat,
      sescim_aktif,
      fiyat_sorunuz,
      sescim_stok,
      sescim_stok_durumu,
      slug
    } = body

    if (!ad || !ad.trim()) {
      return NextResponse.json({ error: 'Ürün adı zorunludur' }, { status: 400 })
    }
    if (!kategori || !kategori.trim()) {
      return NextResponse.json({ error: 'Ana kategori zorunludur' }, { status: 400 })
    }

    const cleanAd = ad.trim()
    const cleanAciklama = (aciklama || '').trim()
    const cleanKategori = kategori.trim()
    const cleanAltKategori = alt_kategori ? alt_kategori.trim() : null
    const cleanUrunTipi = urun_tipi ? urun_tipi.trim() : null
    const cleanMarka = marka ? marka.trim() : null
    const cleanModelKodu = model_kodu ? model_kodu.trim() : null
    const cleanKullanim = kullanim_alani ? kullanim_alani.trim() : null
    const cleanFotolar = Array.isArray(fotograflar) ? fotograflar : []
    const cleanFeatured = !!is_featured

    if (kaynak === 'akdag') {
      // 1. Akdağ Veritabanını Güncelle
      const akdagDb = createAkdagServerClient()
      const akdagPayload: Record<string, any> = {
        ad: cleanAd,
        aciklama: cleanAciklama,
        kategori: cleanKategori,
        alt_kategori: cleanAltKategori,
        urun_tipi: cleanUrunTipi,
        fotograflar: cleanFotolar,
        marka: cleanMarka,
        model_kodu: cleanModelKodu,
        kullanim_alani: cleanKullanim,
        is_featured: cleanFeatured,
        updated_at: new Date().toISOString()
      }

      const { error: akdagErr } = await akdagDb
        .from('urunler')
        .update(akdagPayload)
        .eq('id', id)

      if (akdagErr) {
        console.error('Akdağ DB update error:', akdagErr)
        return NextResponse.json(
          { error: 'Akdağ kataloğu güncellenirken hata oluştu: ' + akdagErr.message },
          { status: 500 }
        )
      }

      // 2. Sescim DB'deki ayna kaydı varsa senkronize et
      try {
        const { data: mirrorRow } = await sescimDb
          .from('urunler')
          .select('id')
          .eq('id', id)
          .maybeSingle()

        if (mirrorRow) {
          await sescimDb
            .from('urunler')
            .update({
              ad: cleanAd,
              aciklama: cleanAciklama,
              kategori_id: cleanKategori,
              alt_kategori_id: cleanAltKategori,
              fotograflar: cleanFotolar,
              marka: cleanMarka,
              model_kodu: cleanModelKodu,
              kullanim_alani: cleanKullanim,
              is_featured: cleanFeatured
            })
            .eq('id', id)
        }
      } catch (mirrorErr) {
        console.warn('Sescim mirror sync warning:', mirrorErr)
      }

      // 3. Sescim fiyat ve stok override tablosunu güncelle
      try {
        await upsertSescimPricing(id, {
          sescim_fiyat: sescim_fiyat !== null && sescim_fiyat !== undefined && !isNaN(Number(sescim_fiyat)) ? Number(sescim_fiyat) : null,
          sescim_indirimli_fiyat: sescim_indirimli_fiyat !== null && sescim_indirimli_fiyat !== undefined && !isNaN(Number(sescim_indirimli_fiyat)) ? Number(sescim_indirimli_fiyat) : null,
          sescim_aktif: sescim_aktif ?? true,
          fiyat_sorunuz: !!fiyat_sorunuz,
          sescim_stok: sescim_stok !== null && sescim_stok !== undefined && !isNaN(parseInt(sescim_stok)) ? parseInt(sescim_stok) : null,
          sescim_stok_durumu: sescim_stok_durumu || null
        })
      } catch (sfErr) {
        console.warn('sescim_fiyatlar update warning:', sfErr)
      }
    } else {
      // Sescim'e özel bağımsız ürünün güncellenmesi
      const finalPrice = fiyat ? parseFloat(fiyat) : null
      const sescimPayload: Record<string, any> = {
        ad: cleanAd,
        aciklama: cleanAciklama,
        kategori_id: cleanKategori,
        alt_kategori_id: cleanAltKategori,
        fotograflar: cleanFotolar,
        fiyat: finalPrice,
        para_birimi: para_birimi || 'TRY',
        stok_durumu: stok_durumu || 'stokta',
        stok_adedi: Math.max(0, parseInt(stok_adedi || '0')),
        kritik_stok: Math.max(0, parseInt(kritik_stok || '0')),
        marka: cleanMarka,
        model_kodu: cleanModelKodu,
        kullanim_alani: cleanKullanim,
        is_featured: cleanFeatured,
        sescim_fiyat: sescim_fiyat ? parseFloat(sescim_fiyat) : finalPrice,
        sescim_indirimli_fiyat: sescim_indirimli_fiyat ? parseFloat(sescim_indirimli_fiyat) : null,
        fiyat_guncelleme: new Date().toISOString()
      }

      const { error: sErr } = await sescimDb
        .from('urunler')
        .update(sescimPayload)
        .eq('id', id)

      if (sErr) {
        console.error('Sescim DB update error:', sErr)
        return NextResponse.json(
          { error: 'Sescim ürünü güncellenirken hata oluştu: ' + sErr.message },
          { status: 500 }
        )
      }

      try {
        await upsertSescimPricing(id, {
          sescim_fiyat: sescim_fiyat ? parseFloat(sescim_fiyat) : finalPrice,
          sescim_indirimli_fiyat: sescim_indirimli_fiyat ? parseFloat(sescim_indirimli_fiyat) : null,
          sescim_aktif: sescim_aktif ?? true,
          fiyat_sorunuz: !!fiyat_sorunuz,
          sescim_stok: sescim_stok !== null && sescim_stok !== undefined && !isNaN(parseInt(sescim_stok)) ? parseInt(sescim_stok) : null,
          sescim_stok_durumu: sescim_stok_durumu || null
        })
      } catch (sfErr) {
        console.warn('sescim_fiyatlar update warning:', sfErr)
      }
    }

    // ── Cache Revalidation ──
    const targetSlug = slug || id
    try {
      revalidatePath(`/urun/${targetSlug}`)
      revalidatePath('/urunler')
      revalidatePath('/')
      revalidateTag('products')
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Ürün başarıyla güncellendi'
    })
  } catch (err: any) {
    console.error('Admin urun update exception:', err)
    return NextResponse.json(
      { error: 'Beklenmeyen sunucu hatası: ' + (err.message || String(err)) },
      { status: 500 }
    )
  }
}
