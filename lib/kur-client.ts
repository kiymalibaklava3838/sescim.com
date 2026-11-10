'use client'

import { DEFAULT_KUR, KurData } from './kur'

let cachedKur: KurData | null = null
let lastFetch = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 dakika bellek önbelleği
let inFlightPromise: Promise<KurData> | null = null

/**
 * İstemci tarafında döviz kurunu çeker.
 * - In-flight promise deduplication ile aynı anda mount olan tüm bileşenler tek bir HTTP isteğini paylaşır.
 * - 5 dakika boyunca bellekten anında yanıt vererek /api/kur istek sayısını ve Vercel CPU tüketimini minimize eder.
 */
export async function getKurClient(): Promise<KurData> {
  const now = Date.now()
  if (cachedKur && (now - lastFetch < CACHE_DURATION)) {
    return cachedKur
  }

  // Eşzamanlı çağrıları tekilleştir
  if (inFlightPromise) {
    return inFlightPromise
  }

  inFlightPromise = (async () => {
    try {
      const res = await fetch('/api/kur')
      if (!res.ok) throw new Error('Kur yanıtı başarısız')
      const data = await res.json()
      cachedKur = data
      lastFetch = Date.now()
      return data
    } catch (err) {
      console.error('Kur çekilemedi:', err)
      return cachedKur || DEFAULT_KUR
    } finally {
      inFlightPromise = null
    }
  })()

  return inFlightPromise
}
