import { createClient } from '@supabase/supabase-js'

const BUCKET = 'kampanya-gorselleri'
const OVERRIDE_PATH = 'config/fiyat-acik-urunler.json'

function getAdminStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function fetchFreshPriceOverrides(): Promise<string[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!baseUrl) return []

  if (serviceKey) {
    try {
      const url = `${baseUrl}/storage/v1/object/${BUCKET}/${OVERRIDE_PATH}?t=${Date.now()}`
      const res = await fetch(url, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: 'no-store',
      })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) return json.filter((x): x is string => typeof x === 'string')
      }
    } catch {}
  }

  try {
    const url = `${baseUrl}/storage/v1/object/public/${BUCKET}/${OVERRIDE_PATH}?t=${Date.now()}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    if (Array.isArray(json)) return json.filter((x): x is string => typeof x === 'string')
    return []
  } catch {
    return []
  }
}

/**
 * Kısıtlı markalarda Admin tarafından açıkça "Fiyatı Göster / Satışa Aç"
 * istisnası tanımlanan ürün ID'lerini döndürür.
 */
export async function getPriceOverrideSet(options?: { noCache?: boolean }): Promise<Set<string>> {
  if (options?.noCache) {
    const list = await fetchFreshPriceOverrides()
    return new Set(list)
  }

  try {
    const { unstable_cache } = await import('next/cache')
    const cached = unstable_cache(
      fetchFreshPriceOverrides,
      ['price-override-ids'],
      { revalidate: 300, tags: ['products', 'price-overrides'] }
    )
    const list = await cached()
    return new Set(list)
  } catch {
    const list = await fetchFreshPriceOverrides()
    return new Set(list)
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
