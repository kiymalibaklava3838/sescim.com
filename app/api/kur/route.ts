import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'
import { getKur } from '@/lib/kur'

export const revalidate = 300 // 5 dakika

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  if (!(await rateLimit(`kur:${ip}`, 120, 60_000))) {
    return NextResponse.json({ error: 'Çok fazla istek' }, { status: 429 })
  }

  const kurData = await getKur()
  return NextResponse.json(kurData, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
