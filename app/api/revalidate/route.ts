import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
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
