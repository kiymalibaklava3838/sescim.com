import { describe, it, expect } from 'vitest'
import { rateLimit } from './rate-limit'

// Not: rateLimit artık async (Upstash). In-memory fallback env var olmadığında devreye girer.
describe('rateLimit (in-memory fallback)', () => {
  it('allows up to limit then blocks', async () => {
    const k = `burst-${Math.random()}`
    expect(await rateLimit(k, 2, 60_000)).toBe(true)
    expect(await rateLimit(k, 2, 60_000)).toBe(true)
    expect(await rateLimit(k, 2, 60_000)).toBe(false)
  })

  it('isolates keys', async () => {
    const a = `iso-a-${Math.random()}`
    const b = `iso-b-${Math.random()}`
    expect(await rateLimit(a, 1, 60_000)).toBe(true)
    expect(await rateLimit(b, 1, 60_000)).toBe(true)
  })
})
