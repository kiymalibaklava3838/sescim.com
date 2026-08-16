export interface SavedProduct {
  id: string
  slug?: string
  ad: string
  kategori: string
  fiyat?: number
  para_birimi?: string
  stok_durumu?: string
  stok_adedi?: number | null
  kritik_stok?: number | null
  marka?: string | null
  kullanim_alani?: string | null
}

const FAV_KEY = 'akdag-favoriler'
const CMP_KEY = 'akdag-karsilastirma'
const MAX_COMPARE = 4

function getList(key: string): SavedProduct[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function setList(key: string, items: SavedProduct[]) {
  localStorage.setItem(key, JSON.stringify(items))
  window.dispatchEvent(new Event('product-lists-updated'))
}

export function getFavorites() {
  return getList(FAV_KEY)
}

export function getCompareList() {
  return getList(CMP_KEY)
}

export function isFavorite(id: string) {
  return getFavorites().some((x) => x.id === id)
}

export function isCompared(id: string) {
  return getCompareList().some((x) => x.id === id)
}

export function toggleFavorite(product: SavedProduct) {
  const list = getFavorites()
  if (list.some((x) => x.id === product.id)) {
    setList(
      FAV_KEY,
      list.filter((x) => x.id !== product.id)
    )
    return false
  }
  setList(FAV_KEY, [product, ...list])
  return true
}

export function toggleCompare(product: SavedProduct) {
  const list = getCompareList()
  if (list.some((x) => x.id === product.id)) {
    setList(
      CMP_KEY,
      list.filter((x) => x.id !== product.id)
    )
    return { active: false, overflow: false }
  }
  if (list.length >= MAX_COMPARE) {
    return { active: false, overflow: true }
  }
  setList(CMP_KEY, [...list, product])
  return { active: true, overflow: false }
}

export function clearCompareList() {
  setList(CMP_KEY, [])
}
