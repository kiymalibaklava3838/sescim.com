import { createClient } from '@supabase/supabase-js'

const BUCKET = 'kampanya-gorselleri'
const OVERRIDE_PATH = 'config/fiyat-acik-urunler.json'

function getAdminStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/**
 * Kısıtlı markalarda Admin tarafından açıkça "Fiyatı Göster / Satışa Aç"
 * istisnası tanımlanan ürün ID'lerini döndürür.
 * Next.js 14 native fetch tag önbelleği (`price-overrides`, 60 sn) kullanır.
 */
export async function getPriceOverrideSet(options?: { noCache?: boolean }): Promise<Set<string>> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!baseUrl) return new Set()

  const noCache = options?.noCache === true
  const cacheBust = noCache ? `?t=${Date.now()}` : ''
  const fetchInit: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = noCache
    ? { cache: 'no-store' }
    : { next: { revalidate: 60, tags: ['products', 'price-overrides'] } }

  if (serviceKey) {
    try {
      const url = `${baseUrl}/storage/v1/object/${BUCKET}/${OVERRIDE_PATH}${cacheBust}`
      const res = await fetch(url, {
        ...fetchInit,
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) return new Set(json.filter((x): x is string => typeof x === 'string'))
      }
    } catch {}
  }

  try {
    const url = `${baseUrl}/storage/v1/object/public/${BUCKET}/${OVERRIDE_PATH}${cacheBust}`
    const res = await fetch(url, fetchInit)
    if (!res.ok) return new Set()
    const json = await res.json()
    if (Array.isArray(json)) return new Set(json.filter((x): x is string => typeof x === 'string'))
    return new Set()
  } catch {
    return new Set()
  }
}

export async function setProductPriceOverride(urunId: string, allowPrice: boolean): Promise<boolean> {
  const admin = getAdminStorageClient()
  if (!admin || !urunId) return false

  try {
    const current = await getPriceOverrideSet({ noCache: true })
    if (allowPrice) {
      current.add(urunId)
    } else {
      current.delete(urunId)
    }

    const payload = JSON.stringify(Array.from(current))
    const { error } = await admin.storage.from(BUCKET).upload(OVERRIDE_PATH, payload, {
      contentType: 'application/json',
      upsert: true,
      cacheControl: '0',
    })
    if (error) {
      console.error('[price-overrides] Save error:', error)
      return false
    }
    return true
  } catch (e) {
    console.error('[price-overrides] Save exception:', e)
    return false
  }
}
