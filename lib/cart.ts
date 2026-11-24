import { isQuoteOnlyProduct } from './distributor-rules'
import { createClient } from '@/lib/supabase'

export interface CartItem {
  id: string
  slug?: string
  ad: string
  kategori: string
  fotograf: string
  fiyat: number                          // TL karşılığı (ödeme için)
  fiyat_doviz?: number                   // Orijinal döviz fiyatı (gösterim için)
  para_birimi?: string                   // USD / EUR / TRY
  indirimli_fiyat: number | null         // TL karşılığı
  indirimli_fiyat_doviz?: number | null  // Orijinal döviz
  indirimli_fiyat_pb?: string | null     // İndirimin para birimi (TRY / USD / EUR)
  adet: number
  stok_adedi?: number | null             // Bilinen maksimum stok (null/undefined = limitsiz)
  marka?: string | null
  fiyat_sorunuz?: boolean
}

export interface AddToCartResult {
  ok: boolean
  reason?: 'quote_only' | 'out_of_stock' | 'max_stock'
  maxStock?: number
  newQty?: number
}

const CART_KEY = 'akdag-sepet'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let syncTimeout: ReturnType<typeof setTimeout> | null = null
let cachedUserId: string | null = null
let storageListenerAttached = false

function ensureStorageListener() {
  if (typeof window === 'undefined' || storageListenerAttached) return
  storageListenerAttached = true
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) {
      window.dispatchEvent(new Event('cart-updated'))
    }
  })
}

async function getUserId() {
  if (cachedUserId) return cachedUserId
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  cachedUserId = data.session?.user?.id || null
  return cachedUserId
}

// Global olarak kullanıcı değiştiğinde çağrılması için:
export function setCartUserId(uid: string | null) {
  cachedUserId = uid
}

export async function pullCartFromSupabase() {
  const uid = await getUserId()
  if (!uid) return

  const supabase = createClient()
  try {
    const { data: sepetData, error } = await supabase.from('sepet').select('urun_id, adet').eq('user_id', uid)
    if (error || !sepetData || sepetData.length === 0) return

    const localCart = getCart()
    const merged = [...localCart]
    let changed = false

    for (const dbItem of sepetData) {
      const existing = merged.find((c) => c.id === dbItem.urun_id)
      if (existing && existing.adet < dbItem.adet) {
        const limit = typeof existing.stok_adedi === 'number' && existing.stok_adedi > 0 ? existing.stok_adedi : null
        existing.adet = limit !== null ? Math.min(dbItem.adet, limit) : dbItem.adet
        changed = true
      }
    }

    if (changed) {
      saveCart(merged)
    }
  } catch {}
}

function syncCartToSupabase(items: CartItem[]) {
  if (syncTimeout) clearTimeout(syncTimeout)
  syncTimeout = setTimeout(async () => {
    try {
      const uid = await getUserId()
      if (!uid) return

      const supabase = createClient()
      const validItems = items.filter((i) => UUID_RE.test(i.id))
      const itemIds = validItems.map((i) => i.id)

      if (itemIds.length > 0) {
        await supabase.from('sepet').delete().eq('user_id', uid).not('urun_id', 'in', `(${itemIds.join(',')})`)
        const upsertData = validItems.map((i) => ({ user_id: uid, urun_id: i.id, adet: i.adet }))
        await supabase.from('sepet').upsert(upsertData, { onConflict: 'user_id,urun_id' })
      } else {
        await supabase.from('sepet').delete().eq('user_id', uid)
      }
    } catch {
      // Ağ veya RLS hatasında yerel sepet akışını bozma
    }
  }, 1500)
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  ensureStorageListener()
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return
  ensureStorageListener()
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  } catch {}
  window.dispatchEvent(new Event('cart-updated'))
  syncCartToSupabase(items)
}

export function addToCart(item: Omit<CartItem, 'adet'>, qty = 1): AddToCartResult {
  if (isQuoteOnlyProduct({ marka: item.marka, ad: item.ad, fiyat_sorunuz: item.fiyat_sorunuz })) {
    return { ok: false, reason: 'quote_only' }
  }

  const incomingStock =
    typeof item.stok_adedi === 'number' && Number.isFinite(item.stok_adedi) && item.stok_adedi >= 0
      ? Math.floor(item.stok_adedi)
      : null

  if (incomingStock === 0) {
    return { ok: false, reason: 'out_of_stock', maxStock: 0 }
  }

  const addQty = Math.max(1, Math.floor(qty || 1))
  const cart = getCart()
  const existing = cart.find((c) => c.id === item.id)

  let newQty = addQty

  if (existing) {
    const existingStock =
      typeof existing.stok_adedi === 'number' && Number.isFinite(existing.stok_adedi) && existing.stok_adedi >= 0
        ? Math.floor(existing.stok_adedi)
        : null
    const limit = incomingStock ?? existingStock

    // Fiyat ve meta bilgilerini güncel tut
    existing.fiyat = item.fiyat
    existing.fiyat_doviz = item.fiyat_doviz ?? existing.fiyat_doviz
    existing.para_birimi = item.para_birimi ?? existing.para_birimi
    existing.indirimli_fiyat = item.indirimli_fiyat
    existing.indirimli_fiyat_pb = item.indirimli_fiyat_pb
    existing.indirimli_fiyat_doviz = item.indirimli_fiyat_doviz
    if (item.slug) existing.slug = item.slug
    if (limit !== null) existing.stok_adedi = limit

    if (limit !== null && existing.adet >= limit) {
      saveCart(cart)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cart-stock-limit', {
            detail: { id: item.id, ad: item.ad, maxStock: limit },
          })
        )
      }
      return { ok: false, reason: 'max_stock', maxStock: limit, newQty: existing.adet }
    }

    newQty = limit !== null ? Math.min(existing.adet + addQty, limit) : existing.adet + addQty
    existing.adet = newQty
  } else {
    newQty = incomingStock !== null ? Math.min(addQty, incomingStock) : addQty
    cart.push({
      ...item,
      stok_adedi: incomingStock,
      adet: newQty,
    })
  }

  saveCart(cart)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cart-item-added', {
        detail: {
          id: item.id,
          ad: item.ad,
          fotograf: item.fotograf,
          fiyat: item.indirimli_fiyat || item.fiyat,
          adet: addQty,
        },
      })
    )
  }

  return { ok: true, newQty }
}

export function addManyToCart(items: Array<Omit<CartItem, 'adet'> & { adet: number }>): number {
  const allowed = items.filter(
    (i) => !isQuoteOnlyProduct({ marka: i.marka, ad: i.ad, fiyat_sorunuz: i.fiyat_sorunuz })
  )
  if (allowed.length === 0) return 0

  const cart = getCart()
  let addedProducts = 0
  let firstAdded: (Omit<CartItem, 'adet'> & { adet: number }) | null = null

  for (const incoming of allowed) {
    const incomingStock =
      typeof incoming.stok_adedi === 'number' && Number.isFinite(incoming.stok_adedi) && incoming.stok_adedi >= 0
        ? Math.floor(incoming.stok_adedi)
        : null
    if (incomingStock === 0) continue

    const addQty = Math.max(1, Math.floor(incoming.adet || 1))
    const existing = cart.find((c) => c.id === incoming.id)

    if (existing) {
      const limit = incomingStock ?? (typeof existing.stok_adedi === 'number' ? existing.stok_adedi : null)
      if (limit !== null) existing.stok_adedi = limit
      existing.fiyat = incoming.fiyat
      existing.indirimli_fiyat = incoming.indirimli_fiyat
      existing.indirimli_fiyat_pb = incoming.indirimli_fiyat_pb
      existing.indirimli_fiyat_doviz = incoming.indirimli_fiyat_doviz
      if (incoming.slug) existing.slug = incoming.slug

      const nextQty = limit !== null ? Math.min(existing.adet + addQty, limit) : existing.adet + addQty
      if (nextQty > existing.adet) {
        existing.adet = nextQty
        addedProducts += 1
        if (!firstAdded) firstAdded = incoming
      }
    } else {
      const nextQty = incomingStock !== null ? Math.min(addQty, incomingStock) : addQty
      cart.push({ ...incoming, stok_adedi: incomingStock, adet: nextQty })
      addedProducts += 1
      if (!firstAdded) firstAdded = incoming
    }
  }

  if (addedProducts === 0) return 0

  saveCart(cart)

  if (typeof window !== 'undefined' && firstAdded) {
    window.dispatchEvent(
      new CustomEvent('cart-item-added', {
        detail: {
          id: firstAdded.id,
          ad: addedProducts === 1 ? firstAdded.ad : `${addedProducts} ürün sepete eklendi`,
          fotograf: firstAdded.fotograf,
          fiyat: firstAdded.indirimli_fiyat || firstAdded.fiyat,
        },
      })
    )
  }

  return addedProducts
}

export function removeFromCart(id: string) {
  saveCart(getCart().filter((c) => c.id !== id))
}

export function updateQty(id: string, adet: number): { ok: boolean; reason?: 'max_stock'; maxStock?: number } {
  if (adet <= 0) {
    removeFromCart(id)
    return { ok: true }
  }
  const cart = getCart()
  const item = cart.find((c) => c.id === id)
  if (!item) return { ok: false }

  const limit =
    typeof item.stok_adedi === 'number' && Number.isFinite(item.stok_adedi) && item.stok_adedi > 0
      ? Math.floor(item.stok_adedi)
      : null

  if (limit !== null && adet > limit) {
    item.adet = limit
    saveCart(cart)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cart-stock-limit', {
          detail: { id: item.id, ad: item.ad, maxStock: limit },
        })
      )
    }
    return { ok: false, reason: 'max_stock', maxStock: limit }
  }

  item.adet = Math.floor(adet)
  saveCart(cart)
  return { ok: true }
}

export function clearCart() {
  saveCart([])
}

export function getCartCount(): number {
  return getCart().reduce((sum, i) => sum + i.adet, 0)
}

export function getCartTotal(): number {
  return Math.ceil(
    getCart().reduce((sum, i) => {
      const price = i.indirimli_fiyat ? i.indirimli_fiyat : i.fiyat
      return sum + price * i.adet
    }, 0)
  )
}
