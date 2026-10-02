import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { packBannerSubtitle, DEFAULT_HERO_SLIDES } from '@/lib/banner-service'

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

// GET: Tüm bannerları getir
export async function GET(req: NextRequest) {
  try {
    const db = getSupabaseAdmin()
    const auth = await verifyAdmin(req, db)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await db
      .from('store_banners')
      .select('id, title, subtitle, image_url, link_url, is_active, sort_order, created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ banners: data || [] })
  } catch (err: any) {
    console.error('Banners GET error:', err)
    return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}

// POST: Yeni banner ekle VEYA varsayılanları yükle
export async function POST(req: NextRequest) {
  try {
    const db = getSupabaseAdmin()
    const auth = await verifyAdmin(req, db)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const contentType = req.headers.get('content-type') || ''

    // 1. Durum: FormData (dosya yüklemesi ile)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const action = formData.get('action') as string | null

      if (action === 'seed') {
        for (const slide of DEFAULT_HERO_SLIDES) {
          const packed = packBannerSubtitle(slide.subtitle, slide.description, slide.ctaText, {
            showOverlay: slide.showOverlay,
            showButton: slide.showButton
          })
          await db.from('store_banners').insert({
            title: slide.title,
            subtitle: packed,
            image_url: slide.image,
            link_url: slide.ctaLink,
            sort_order: slide.sortOrder,
            is_active: true
          })
        }
        revalidatePath('/')
        revalidatePath('/urunler')
        return NextResponse.json({ success: true, message: 'Varsayılan bannerlar eklendi' })
      }

      const file = formData.get('file') as File | null
      const mobileFile = formData.get('mobile_file') as File | null
      let imageUrl = formData.get('image_url') as string || ''
      let mobileImageUrl = formData.get('mobile_image_url') as string || ''
      const title = formData.get('title') as string || ''
      let subtitle = formData.get('subtitle') as string || ''
      const linkUrl = formData.get('link_url') as string || ''
      const sortOrder = Number(formData.get('sort_order')) || 0
      const isActive = formData.get('is_active') !== 'false'

      const rawShowOverlay = formData.get('show_overlay')
      const rawShowButton = formData.get('show_button')

      // 1. Ana görsel dosyası varsa yükle
      if (file && typeof file === 'object' && file.size > 0) {
        const fileExt = file.name.split('.').pop() || 'jpg'
        const fileName = `banner-${Date.now()}.${fileExt}`
        const buffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadError } = await db.storage
          .from('kampanya-gorselleri')
          .upload(fileName, buffer, {
            contentType: file.type || 'image/jpeg',
            upsert: true
          })

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          return NextResponse.json({ error: 'Görsel yüklenemedi: ' + uploadError.message }, { status: 500 })
        }

        const { data: urlData } = db.storage
          .from('kampanya-gorselleri')
          .getPublicUrl(fileName)

        imageUrl = urlData.publicUrl
      }

      // 2. Mobil görsel dosyası varsa yükle
      if (mobileFile && typeof mobileFile === 'object' && mobileFile.size > 0) {
        const mExt = mobileFile.name.split('.').pop() || 'jpg'
        const mFileName = `banner-mobile-${Date.now()}.${mExt}`
        const mBuffer = Buffer.from(await mobileFile.arrayBuffer())

        const { error: mUploadError } = await db.storage
          .from('kampanya-gorselleri')
          .upload(mFileName, mBuffer, {
            contentType: mobileFile.type || 'image/jpeg',
            upsert: true
          })

        if (!mUploadError) {
          const { data: mUrlData } = db.storage
            .from('kampanya-gorselleri')
            .getPublicUrl(mFileName)
          mobileImageUrl = mUrlData.publicUrl
        }
      }

      // Subtitle JSON içine mobile_image_url paketle
      try {
        const parsed = JSON.parse(subtitle)
        if (parsed && typeof parsed === 'object') {
          if (rawShowOverlay !== null) parsed.show_overlay = rawShowOverlay === 'true'
          if (rawShowButton !== null) parsed.show_button = rawShowButton === 'true'
          parsed.mobile_image_url = mobileImageUrl || parsed.mobile_image_url || null
          subtitle = JSON.stringify(parsed)
        }
      } catch {
        subtitle = packBannerSubtitle(subtitle, '', '', {
          showOverlay: rawShowOverlay === 'true',
          showButton: rawShowButton === 'true',
          mobile_image_url: mobileImageUrl || null
        })
      }

      if (!imageUrl) {
        return NextResponse.json({ error: 'Görsel zorunludur' }, { status: 400 })
      }

      const { data: newBanner, error: insertError } = await db
        .from('store_banners')
        .insert({
          title: title.trim() || null,
          subtitle: subtitle || null,
          image_url: imageUrl,
          link_url: linkUrl.trim() || null,
          sort_order: sortOrder,
          is_active: isActive
        })
        .select()
        .single()

      if (insertError) {
        console.error('Banner insert error:', insertError)
        return NextResponse.json({ error: 'Kayıt hatası: ' + insertError.message }, { status: 500 })
      }

      revalidatePath('/')
      revalidatePath('/urunler')
      return NextResponse.json({ success: true, banner: newBanner })
    }

    // 2. Durum: JSON isteği
    const body = await req.json()
    if (body.action === 'seed') {
      for (const slide of DEFAULT_HERO_SLIDES) {
        const packed = packBannerSubtitle(slide.subtitle, slide.description, slide.ctaText, {
          showOverlay: slide.showOverlay,
          showButton: slide.showButton
        })
        await db.from('store_banners').insert({
          title: slide.title,
          subtitle: packed,
          image_url: slide.image,
          link_url: slide.ctaLink,
          sort_order: slide.sortOrder,
          is_active: true
        })
      }
      revalidatePath('/')
      revalidatePath('/urunler')
      return NextResponse.json({ success: true, message: 'Varsayılan bannerlar eklendi' })
    }

    const { title, image_url, mobile_image_url, link_url, sort_order, is_active, show_overlay, show_button } = body
    let subtitle = body.subtitle || ''
    try {
      const parsed = typeof subtitle === 'string' ? JSON.parse(subtitle) : subtitle
      if (parsed && typeof parsed === 'object') {
        if (typeof show_overlay === 'boolean') parsed.show_overlay = show_overlay
        if (typeof show_button === 'boolean') parsed.show_button = show_button
        if (mobile_image_url !== undefined) parsed.mobile_image_url = mobile_image_url || null
        subtitle = JSON.stringify(parsed)
      }
    } catch {
      subtitle = packBannerSubtitle(String(subtitle), '', '', {
        showOverlay: Boolean(show_overlay),
        showButton: Boolean(show_button),
        mobile_image_url: mobile_image_url || null
      })
    }

    if (!image_url) {
      return NextResponse.json({ error: 'Görsel URL zorunludur' }, { status: 400 })
    }

    const { data: newBanner, error: insertError } = await db
      .from('store_banners')
      .insert({
        title: title?.trim() || null,
        subtitle: subtitle || null,
        image_url: image_url,
        link_url: link_url?.trim() || null,
        sort_order: Number(sort_order) || 0,
        is_active: is_active !== false
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/urunler')
    return NextResponse.json({ success: true, banner: newBanner })
  } catch (err: any) {
    console.error('Banners POST error:', err)
    return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}

// PUT: Var olan banner'ı güncelle
export async function PUT(req: NextRequest) {
  try {
    const db = getSupabaseAdmin()
    const auth = await verifyAdmin(req, db)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const id = formData.get('id') as string
      if (!id) return NextResponse.json({ error: 'Banner ID zorunludur' }, { status: 400 })

      const file = formData.get('file') as File | null
      const mobileFile = formData.get('mobile_file') as File | null
      let imageUrl = formData.get('image_url') as string || ''
      let mobileImageUrl = formData.get('mobile_image_url') as string || ''
      const title = formData.get('title') as string || ''
      let subtitle = formData.get('subtitle') as string || ''
      const linkUrl = formData.get('link_url') as string || ''
      const sortOrder = Number(formData.get('sort_order')) || 0
      const isActive = formData.get('is_active') === 'true'

      const rawShowOverlay = formData.get('show_overlay')
      const rawShowButton = formData.get('show_button')

      if (file && typeof file === 'object' && file.size > 0) {
        const fileExt = file.name.split('.').pop() || 'jpg'
        const fileName = `banner-${Date.now()}.${fileExt}`
        const buffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadError } = await db.storage
          .from('kampanya-gorselleri')
          .upload(fileName, buffer, {
            contentType: file.type || 'image/jpeg',
            upsert: true
          })

        if (uploadError) {
          return NextResponse.json({ error: 'Görsel yüklenemedi: ' + uploadError.message }, { status: 500 })
        }

        const { data: urlData } = db.storage
          .from('kampanya-gorselleri')
          .getPublicUrl(fileName)

        imageUrl = urlData.publicUrl
      }

      // Mobil görsel dosyası varsa yükle
      if (mobileFile && typeof mobileFile === 'object' && mobileFile.size > 0) {
        const mExt = mobileFile.name.split('.').pop() || 'jpg'
        const mFileName = `banner-mobile-${Date.now()}.${mExt}`
        const mBuffer = Buffer.from(await mobileFile.arrayBuffer())

        const { error: mUploadError } = await db.storage
          .from('kampanya-gorselleri')
          .upload(mFileName, mBuffer, {
            contentType: mobileFile.type || 'image/jpeg',
            upsert: true
          })

        if (!mUploadError) {
          const { data: mUrlData } = db.storage
            .from('kampanya-gorselleri')
            .getPublicUrl(mFileName)
          mobileImageUrl = mUrlData.publicUrl
        }
      }

      // Subtitle JSON içine mobile_image_url paketle
      try {
        const parsed = JSON.parse(subtitle)
        if (parsed && typeof parsed === 'object') {
          if (rawShowOverlay !== null) parsed.show_overlay = rawShowOverlay === 'true'
          if (rawShowButton !== null) parsed.show_button = rawShowButton === 'true'
          // Eğer mobile_image_url açıkça gönderilmişse (veya yeni yüklendiyse) güncelle
          if (mobileImageUrl !== '') {
            parsed.mobile_image_url = mobileImageUrl
          } else if (formData.has('mobile_image_url') && formData.get('mobile_image_url') === '') {
            parsed.mobile_image_url = null
          }
          subtitle = JSON.stringify(parsed)
        }
      } catch {
        subtitle = packBannerSubtitle(subtitle, '', '', {
          showOverlay: rawShowOverlay === 'true',
          showButton: rawShowButton === 'true',
          mobile_image_url: mobileImageUrl || null
        })
      }

      const updatePayload: any = {
        title: title.trim() || null,
        subtitle: subtitle || null,
        link_url: linkUrl.trim() || null,
        sort_order: sortOrder,
        is_active: isActive
      }
      if (imageUrl) {
        updatePayload.image_url = imageUrl
      }

      const { data: updated, error: updateError } = await db
        .from('store_banners')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      revalidatePath('/')
      revalidatePath('/urunler')
      return NextResponse.json({ success: true, banner: updated })
    }

    const body = await req.json()
    const { id, title, image_url, mobile_image_url, link_url, sort_order, is_active, show_overlay, show_button } = body
    if (!id) return NextResponse.json({ error: 'Banner ID zorunludur' }, { status: 400 })

    let subtitle = body.subtitle || ''
    try {
      const parsed = typeof subtitle === 'string' ? JSON.parse(subtitle) : subtitle
      if (parsed && typeof parsed === 'object') {
        if (typeof show_overlay === 'boolean') parsed.show_overlay = show_overlay
        if (typeof show_button === 'boolean') parsed.show_button = show_button
        if (mobile_image_url !== undefined) parsed.mobile_image_url = mobile_image_url || null
        subtitle = JSON.stringify(parsed)
      }
    } catch {
      subtitle = packBannerSubtitle(String(subtitle), '', '', {
        showOverlay: Boolean(show_overlay),
        showButton: Boolean(show_button),
        mobile_image_url: mobile_image_url || null
      })
    }

    const { data: updated, error: updateError } = await db
      .from('store_banners')
      .update({
        title: title?.trim() || null,
        subtitle: subtitle || null,
        image_url: image_url,
        link_url: link_url?.trim() || null,
        sort_order: Number(sort_order) || 0,
        is_active: is_active
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/urunler')
    return NextResponse.json({ success: true, banner: updated })
  } catch (err: any) {
    console.error('Banners PUT error:', err)
    return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}

// PATCH: Durum değiştir (aktif/pasif) veya sırala
export async function PATCH(req: NextRequest) {
  try {
    const db = getSupabaseAdmin()
    const auth = await verifyAdmin(req, db)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await req.json()
    const { id, is_active, sort_order } = body
    if (!id) return NextResponse.json({ error: 'Banner ID zorunludur' }, { status: 400 })

    const payload: any = {}
    if (typeof is_active === 'boolean') payload.is_active = is_active
    if (typeof sort_order === 'number') payload.sort_order = sort_order

    const { error } = await db
      .from('store_banners')
      .update(payload)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/urunler')
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Banners PATCH error:', err)
    return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}

// DELETE: Banner sil
export async function DELETE(req: NextRequest) {
  try {
    const db = getSupabaseAdmin()
    const auth = await verifyAdmin(req, db)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Banner ID zorunludur' }, { status: 400 })

    const { error } = await db
      .from('store_banners')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/urunler')
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Banners DELETE error:', err)
    return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}
