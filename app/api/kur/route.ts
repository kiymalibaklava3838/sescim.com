import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

export const revalidate = 300

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  if (!(await rateLimit(`kur:${ip}`, 90, 60_000))) {
    return NextResponse.json({ error: 'Çok fazla istek' }, { status: 429 })
  }

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 300 },
    })
    const data = await res.json()

    const usdTry = data.rates?.TRY || 0
    const eurTry = usdTry / (data.rates?.EUR || 1)

    return NextResponse.json({
      USD: parseFloat(usdTry.toFixed(2)),
      EUR: parseFloat(eurTry.toFixed(2)),
      guncelleme: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({
      USD: 32.5,
      EUR: 35.2,
      guncelleme: null,
      fallback: true,
    })
  }
}
