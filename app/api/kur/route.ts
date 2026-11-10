import { NextResponse } from 'next/server'
import { getKur } from '@/lib/kur'

export const revalidate = 300 // 5 dakika ISR önbellek

/**
 * Döviz kurları API rotası.
 * - Dinamik request header/ip bağımlılıkları kaldırılarak Vercel Edge CDN'de tam önbelleklenmesi sağlanmıştır.
 * - Her istek için Node.js serverless fonksiyonunun ayağa kalkmasını önler (0 CPU tüketimi).
 */
export async function GET() {
  const kurData = await getKur()
  return NextResponse.json(kurData, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
    },
  })
}
