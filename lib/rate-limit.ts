import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─── In-Memory Fallback ──────────────────────────────────────────────────────
// Upstash env vars tanımlı değilse in-memory bucket ile çalışır (dev/test için).

type Bucket = { count: number; resetAt: number }
const memBuckets = new Map<string, Bucket>()
const MAX_BUCKETS = 50_000

function memRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  if (memBuckets.size > MAX_BUCKETS) {
    memBuckets.forEach((b, k) => { if (now > b.resetAt) memBuckets.delete(k) })
  }
  let b = memBuckets.get(key)
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs }
    memBuckets.set(key, b)
  }
  b.count += 1
  return b.count <= limit
}

// ─── Upstash Redis Rate Limiter (üretim) ────────────────────────────────────

let upstashLimiterCache: Map<string, Ratelimit> | null = null

function getUpstashLimiter(limit: number, windowSec: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  // Placeholder veya geçersiz URL ise in-memory fallback'e geç
  if (!url || !token || !url.startsWith('https://')) return null

  const cacheKey = `${limit}:${windowSec}`
  if (!upstashLimiterCache) upstashLimiterCache = new Map()
  if (upstashLimiterCache.has(cacheKey)) return upstashLimiterCache.get(cacheKey)!

  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    analytics: false,
  })
  upstashLimiterCache.set(cacheKey, limiter)
  return limiter
}

/**
 * Sliding window rate limiter.
 * - Upstash env vars tanımlıysa Redis ile kalıcı ve dağıtık rate limit uygular.
 * - Tanımlı değilse in-memory fallback kullanır (dev/test).
 * @returns true = istek izinli, false = limit aşıldı
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const windowSec = Math.ceil(windowMs / 1000)
  const upstash = getUpstashLimiter(limit, windowSec)

  if (upstash) {
    const { success } = await upstash.limit(key)
    return success
  }

  // Fallback: in-memory (dev ortamı)
  return memRateLimit(key, limit, windowMs)
}
