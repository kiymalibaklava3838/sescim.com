import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

export const dynamic = 'force-dynamic'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB

function isPrivateOrBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().trim()
  if (
    !h ||
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h === '[::1]'
  ) {
    return true
  }

  // IPv4 özel / metadata aralıkları (SSRF koruması)
  const ipv4Match = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4Match) {
    const [a, b] = [Number(ipv4Match[1]), Number(ipv4Match[2])]
    if (a === 10) return true
    if (a === 127) return true
    if (a === 0) return true
    if (a === 169 && b === 254) return true // AWS/GCP/Vercel cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
  }

  return false
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (!(await rateLimit(`proxy-image:${ip}`, 60, 60_000))) {
      return NextResponse.json({ error: 'Çok fazla görsel isteği.' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL parametresi gerekli.' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(imageUrl)
    } catch {
      return NextResponse.json({ error: 'Geçersiz URL formatı.' }, { status: 400 })
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Geçersiz URL protokolü.' }, { status: 400 })
    }

    if (isPrivateOrBlockedHost(parsedUrl.hostname)) {
      return NextResponse.json({ error: 'Bu adrese erişim güvenlik politikası gereği engellendi.' }, { status: 403 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    let res: Response
    try {
      res = await fetch(parsedUrl.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Görsel indirilemedi (HTTP ${res.status})` },
        { status: res.status }
      )
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase()
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Hedef adres geçerli bir görsel dosyası döndürmedi.' },
        { status: 415 }
      )
    }

    const contentLength = Number(res.headers.get('content-length') || 0)
    if (contentLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Görsel boyutu 8 MB sınırını aşıyor.' }, { status: 413 })
    }

    const arrayBuffer = await res.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Görsel boyutu 8 MB sınırını aşıyor.' }, { status: 413 })
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error: any) {
    console.error('Image proxy error:', error)
    return NextResponse.json(
      { error: error?.message || 'Görsel sunucu üzerinden indirilemedi.' },
      { status: 500 }
    )
  }
}
