'use client'

import { KurData } from './kur'

let cachedKur: KurData | null = null
let lastFetch = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getKurClient(): Promise<KurData> {
  const now = Date.now()
  if (cachedKur && (now - lastFetch < CACHE_DURATION)) {
    return cachedKur
  }

  try {
    const res = await fetch('/api/kur')
    const data = await res.json()
    cachedKur = data
    lastFetch = now
    return data
  } catch (err) {
    console.error('Kur çekilemedi:', err)
    return cachedKur || { USD: 32.5, EUR: 35.2, guncelleme: null }
  }
}
