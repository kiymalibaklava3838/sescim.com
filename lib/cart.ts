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
  const { data: sepetData } = await supabase.from('sepet').select('*, urunler(ad, kategori, fotograflar, fiyat, indirimli_fiyat, para_birimi)').eq('user_id', uid)
  
  if (sepetData && sepetData.length > 0) {
    const localCart = getCart()
    const merged = [...localCart]
    let changed = false
    
    for (const dbItem of sepetData) {
      const u = dbItem.urunler as any
      if (!u) continue 
      
      const existing = merged.find(c => c.id === dbItem.urun_id)
      if (!existing) {
        merged.push({
          id: dbItem.urun_id,
          ad: u.ad,
          kategori: u.kategori,
          fotograf: u.fotograflar?.[0] || '',
          fiyat: u.fiyat,
          fiyat_doviz: u.fiyat,
          para_birimi: u.para_birimi || 'TRY',
          indirimli_fiyat: u.indirimli_fiyat,
          indirimli_fiyat_doviz: u.indirimli_fiyat,
          adet: dbItem.adet
        })
        changed = true
      } else if (existing.adet < dbItem.adet) {
        existing.adet = dbItem.adet
        changed = true
      }
    }
    
    if (changed) {
      localStorage.setItem(CART_KEY, JSON.stringify(merged))
      window.dispatchEvent(new Event('cart-updated'))
      syncCartToSupabase(merged)
    }
  }
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
}

export function addManyToCart(items: Array<Omit<CartItem, 'adet'> & { adet: number }>) {
  const cart = getCart()
  for (const incoming of items) {
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
