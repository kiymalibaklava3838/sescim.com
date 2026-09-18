import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

export const revalidate = 300 // 5 dakika

// Sunucu içi bellek önbelleği
let memoryKurCache: { data: any; expiresAt: number } | null = null

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  if (!(await rateLimit(`kur:${ip}`, 120, 60_000))) {
    return NextResponse.json({ error: 'Çok fazla istek' }, { status: 429 })
  }

  const now = Date.now()
  if (memoryKurCache && memoryKurCache.expiresAt > now) {
    return NextResponse.json(memoryKurCache.data)
  }

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 300 },
    })
    
    if (!res.ok) throw new Error('Döviz servisi yanıt vermedi')
    const data = await res.json()

    const usdTry = Number(data.rates?.TRY) || 38.0
    const eurTry = usdTry / (Number(data.rates?.EUR) || 1.05)

    const kurResult = {
      USD: parseFloat(usdTry.toFixed(2)),
      EUR: parseFloat(eurTry.toFixed(2)),
      guncelleme: new Date().toISOString(),
      source: 'live',
    }

    memoryKurCache = {
      data: kurResult,
      expiresAt: now + 300_000, // 5 dk
    }

    return NextResponse.json(kurResult, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.warn('Canlı döviz kurları alınamadı, yedek kurlar devrede:', error)
    
    const fallbackResult = {
      USD: 38.00,
      EUR: 41.00,
      guncelleme: new Date().toISOString(),
      fallback: true,
      source: 'fallback',
    }

    return NextResponse.json(fallbackResult, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  }
}
