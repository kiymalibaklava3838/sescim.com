import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    if (!(await rateLimit(`revalidate:${ip}`, 60, 60_000))) {
      return NextResponse.json({ error: 'Çok fazla istek.' }, { status: 429 })
    }

    const secret = request.headers.get('x-revalidate-secret')
    const expectedSecret = process.env.REVALIDATE_SECRET

    // Eğer sunucuda REVALIDATE_SECRET tanımlanmışsa kontrol et
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Geçersiz gizli anahtar.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { path } = body

    if (path) {
      try {
        revalidatePath(path)
      } catch {}
    }

    // Ürün önbelleklerini anında temizle (Detay sayfaları vb.)
    try {
      revalidateTag('products')
      revalidateTag('product-detail')
      revalidateTag('product-detail-slug')
    } catch (e) {
      console.warn('revalidateTag error:', e)
    }

    // Her revalidation tetiklendiğinde anasayfa, katalog, feed ve sitemap rotalarını temizle
    try {
      revalidatePath('/')
      revalidatePath('/urunler')
      revalidatePath('/api/feed/google-merchant')
      revalidatePath('/api/feed/cimri')
      revalidatePath('/api/feed/akakce')
      revalidatePath('/sitemap.xml')
    } catch {}

    return NextResponse.json({
      revalidated: true,
      path: path || 'all',
      now: Date.now()
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

