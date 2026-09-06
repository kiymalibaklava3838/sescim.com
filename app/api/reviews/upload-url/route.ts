import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * Fotoğraflı Yorumlar İçin Ön-İmzalı Yükleme Bağlantısı Motoru
 * Vercel sunucusuna hiçbir fotoğraf verisi gönderilmez.
 * Sadece dosya adı gelir, Supabase Storage için doğrudan yükleme URL'si üretilir.
 */
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
    }

    const { filename, contentType = 'image/webp' } = await req.json()
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 })
    }

    // Güvenli dosya yolu oluştur
    const cleanExt = filename.split('.').pop() || 'webp'
    const safeName = `yorum_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${cleanExt}`
    const filePath = `yorumlar/${safeName}`

    // İmzalı upload url üret
    const { data, error } = await supabaseAdmin.storage
      .from('urun-yorumlari')
      .createSignedUploadUrl(filePath, { upsert: false })

    if (error || !data?.signedUrl) {
      console.error('Supabase signed URL error:', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
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
