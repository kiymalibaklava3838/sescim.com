import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return false

  const db = supabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return false

  const { data: adminRow } = await db
    .from('site_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return !!adminRow
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (!(await rateLimit(`scrape-image:${ip}`, 30, 60_000))) {
      return NextResponse.json({ error: 'Çok fazla görsel arama isteği.' }, { status: 429 })
    }

    // Yalnızca yetkili site yöneticileri erişebilir
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 })
    }

    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Sorgu parametresi (query) gerekli.' }, { status: 400 })
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
    const GOOGLE_CX = process.env.GOOGLE_CX

    // 1) GOOGLE CUSTOM SEARCH API (Önerilen)
    if (GOOGLE_API_KEY && GOOGLE_CX) {
      try {
        const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&searchType=image&num=5`
        const gRes = await fetch(googleUrl)
        if (gRes.ok) {
          const gData = await gRes.json()
          const images = gData.items?.map((item: any) => item.link) || []
          if (images.length > 0) return NextResponse.json({ images, provider: 'google_api' })
        }
      } catch (e) {
        console.error('Google API Error:', e)
      }
    }

    // 2) FALLBACK: GELİŞMİŞ SCRAPING
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}&hl=tr&safe=off`

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        Referer: 'https://www.google.com/',
      },
    })

    if (!res.ok) return NextResponse.json({ images: [], error: 'Google erişim hatası' }, { status: 200 })

    const html = await res.text()
    const imageUrls: string[] = []

    const imgPatterns = [
      /\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif))",\d+,\d+\]/gi,
      /imgurl=(https?:\/\/[^&]+)/gi,
      /"https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)"/gi,
    ]

    for (const pattern of imgPatterns) {
      let match
      while ((match = pattern.exec(html)) !== null && imageUrls.length < 10) {
        const url = match[1] || match[0].replace(/"/g, '')
        if (url.includes('gstatic.com') || url.includes('google.com') || url.includes('encrypted-tbn')) continue
        if (!imageUrls.includes(url)) imageUrls.push(url)
      }
    }

    if (imageUrls.length < 3) {
      const base64Regex = /data:image\/(?:jpeg|png|gif);base64,[^"']+/g
      let b64Match
      while ((b64Match = base64Regex.exec(html)) !== null && imageUrls.length < 10) {
        if (!imageUrls.includes(b64Match[0])) imageUrls.push(b64Match[0])
      }
    }

    return NextResponse.json({
      images: imageUrls.slice(0, 8),
      provider: 'improved_fallback',
      foundCount: imageUrls.length,
    })
  } catch (error: any) {
    return NextResponse.json({ images: [], error: error.message }, { status: 200 })
  }
}
