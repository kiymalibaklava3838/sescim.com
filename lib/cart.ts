import { isQuoteOnlyProduct } from './distributor-rules'

export interface CartItem {
  id: string
  ad: string
  kategori: string
  fotograf: string
  fiyat: number           // TL karşılığı (ödeme için)
  fiyat_doviz?: number    // Orijinal döviz fiyatı (gösterim için)
  para_birimi?: string    // USD / EUR / TRY
  indirimli_fiyat: number | null      // TL karşılığı
  indirimli_fiyat_doviz?: number | null // Orijinal döviz
  adet: number
  marka?: string
  fiyat_sorunuz?: boolean
}

import { createClient } from '@/lib/supabase'

const CART_KEY = 'akdag-sepet'

let syncTimeout: any = null
let cachedUserId: string | null = null

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
      const existing = merged.find(c => c.id === dbItem.urun_id)
      if (existing && existing.adet < dbItem.adet) {
        existing.adet = dbItem.adet
        changed = true
      }
    }
    
    if (changed) {
      saveCart(merged)
    }
  } catch {}
}

function syncCartToSupabase(items: CartItem[]) {
  clearTimeout(syncTimeout)
  syncTimeout = setTimeout(async () => {
    const uid = await getUserId()
    if (!uid) return 
    
    const supabase = createClient()
    const itemIds = items.map(i => i.id)
    
    if (itemIds.length > 0) {
      // Önce sepetten çıkarılan ürünleri temizle
      await supabase.from('sepet').delete().eq('user_id', uid).not('urun_id', 'in', `(${itemIds.join(',')})`)
      
      // Sonra güncel ürünleri/adetleri kaydet
      const upsertData = items.map(i => ({ user_id: uid, urun_id: i.id, adet: i.adet }))
      await supabase.from('sepet').upsert(upsertData, { onConflict: 'user_id,urun_id' })
    } else {
      await supabase.from('sepet').delete().eq('user_id', uid)
    }
  }, 2000)
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]') }
  catch { return [] }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('cart-updated'))
  syncCartToSupabase(items)
}

export function addToCart(item: Omit<CartItem, 'adet'>) {
  if (isQuoteOnlyProduct({ marka: item.marka, fiyat_sorunuz: item.fiyat_sorunuz })) {
    return
  }
  const cart = getCart()
  const existing = cart.find(c => c.id === item.id)
  if (existing) {
    // Kur güncellenmiş olabilir, fiyatı güncelle
    existing.adet += 1
    existing.fiyat = item.fiyat
    existing.indirimli_fiyat = item.indirimli_fiyat
  } else {
    cart.push({ ...item, adet: 1 })
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
        },
      })
    )
  }
}

export function addManyToCart(items: Array<Omit<CartItem, 'adet'> & { adet: number }>) {
  const allowed = items.filter(i => !isQuoteOnlyProduct({ marka: i.marka, fiyat_sorunuz: i.fiyat_sorunuz }))
  if (allowed.length === 0) return
  const cart = getCart()
  for (const incoming of allowed) {
    const existing = cart.find(c => c.id === incoming.id)
    if (existing) {
      existing.adet += incoming.adet
      existing.fiyat = incoming.fiyat
      existing.indirimli_fiyat = incoming.indirimli_fiyat
    } else {
      cart.push({ ...incoming })
    }
  }
  saveCart(cart)
}

export function removeFromCart(id: string) {
  saveCart(getCart().filter(c => c.id !== id))
}

export function updateQty(id: string, adet: number) {
  if (adet <= 0) { removeFromCart(id); return }
  const cart = getCart()
  const item = cart.find(c => c.id === id)
  if (item) { item.adet = adet; saveCart(cart) }
}

export function clearCart() { saveCart([]) }

export function getCartCount(): number {
  return getCart().reduce((sum, i) => sum + i.adet, 0)
}

export function getCartTotal(): number {
  return Math.ceil(getCart().reduce((sum, i) => {
    const price = i.indirimli_fiyat ? i.indirimli_fiyat : i.fiyat
    return sum + price * i.adet
  }, 0))
}
