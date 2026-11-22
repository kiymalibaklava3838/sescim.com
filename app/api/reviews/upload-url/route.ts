import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

export const dynamic = 'force-dynamic'

const ALLOWED_EXTENSIONS = new Set(['webp', 'jpg', 'jpeg', 'png'])
const ALLOWED_MIME_TYPES = new Set(['image/webp', 'image/jpeg', 'image/png'])

/**
 * Fotoğraflı Yorumlar İçin Ön-İmzalı Yükleme Bağlantısı Motoru
 * Yalnızca giriş yapmış üyeler kendi yorumlarına görsel yükleyebilir.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!(await rateLimit(`review-upload:${ip}`, 15, 60_000))) {
      return NextResponse.json(
        { error: 'Çok fazla görsel yükleme isteği. Lütfen biraz bekleyin.' },
        { status: 429 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
    }

    // 1. Zorunlu Üye Oturum Doğrulaması
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '').trim()
    if (!token) {
      return NextResponse.json({ error: 'Görsel yüklemek için üye girişi gereklidir.' }, { status: 401 })
    }

    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş oturum.' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const filename = typeof body.filename === 'string' ? body.filename : ''
    const contentType = typeof body.contentType === 'string' ? body.contentType.toLowerCase() : 'image/webp'

    if (!filename) {
      return NextResponse.json({ error: 'Dosya adı gereklidir.' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Yalnızca WebP, JPG veya PNG görselleri yüklenebilir.' }, { status: 400 })
    }

    // 2. Güvenli dosya uzantısı ve yolu oluştur
    const rawExt = (filename.split('.').pop() || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '')
    const cleanExt = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : 'webp'
    const safeName = `yorum_${authData.user.id.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${cleanExt}`
    const filePath = `yorumlar/${safeName}`

    // 3. İmzalı upload url üret
    const { data, error } = await supabaseAdmin.storage
      .from('urun-yorumlari')
      .createSignedUploadUrl(filePath, { upsert: false })

    if (error || !data?.signedUrl) {
      console.error('Supabase signed URL error:', error)
      return NextResponse.json({ error: 'Görsel yükleme bağlantısı oluşturulamadı.' }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
    let uploadUrl = data.signedUrl
    if (!uploadUrl.startsWith('http')) {
      uploadUrl = uploadUrl.startsWith('/storage/v1')
        ? `${supabaseUrl}${uploadUrl}`
        : `${supabaseUrl}/storage/v1${uploadUrl.startsWith('/') ? '' : '/'}${uploadUrl}`
    }
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/urun-yorumlari/${filePath}`

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      filePath,
    })
  } catch (err: any) {
    console.error('Upload URL error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
