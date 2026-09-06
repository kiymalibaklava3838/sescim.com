import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    if (!(await rateLimit(`revalidate:${ip}`, 30, 60_000))) {
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
      revalidatePath(path)
    }

    // Her revalidation tetiklendiğinde anasayfa ve ürün kataloğunu
    // dinamik olarak güncelliyoruz.
    revalidatePath('/')
    revalidatePath('/urunler')

    return NextResponse.json({
      revalidated: true,
      path: path || 'all',
      now: Date.now()
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
