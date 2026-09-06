export interface CouponItemLike {
  id?: string
  urun_id?: string
  ad: string
  kategori?: string | null
  alt_kategori?: string | null
  adet: number
  fiyat: number
}

export interface KuponLike {
  id?: string
  kod: string
  indirim_tipi: 'yuzde' | 'sabit' | string
  indirim_miktari: number
  min_tutar?: number | null
  max_kullanim?: number | null
  kullanim_sayisi?: number
  gecerlilik_tarihi?: string | null
  aktif?: boolean
  ozel_mi?: boolean
  kategori?: string | null
  aciklama?: string | null
}

const STOP_WORDS = new Set([
  'sistemleri',
  'sistem',
  'sistemi',
  'ekipmanlari',
  'ekipman',
  'urunleri',
  'urun',
  've',
  'ile',
  'pro',
  'audio',
  'lighting'
])

export function normalizeCategoryText(str: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/mikser/g, 'mixer')
    .trim()
}

/**
 * Ürünün verilen kategori kriterine uyup uymadığını kontrol eder.
 * @param targetCat Kuponun geçerli olduğu kategori (boş, null veya 'tum' ise tüm ürünler geçerli)
 * @param item Kontrol edilecek ürün nesnesi
 */
export function matchesCategory(
  targetCat?: string | null,
  item?: { kategori?: string | null; alt_kategori?: string | null; ad?: string | null }
): boolean {
  if (!targetCat || targetCat === 'tum' || targetCat.trim() === '') {
    return true
  }
  if (!item) return false

  const targetNorm = normalizeCategoryText(targetCat)
  const itemCat = normalizeCategoryText(item.kategori || '')
  const itemSub = normalizeCategoryText(item.alt_kategori || '')
  const itemAd = normalizeCategoryText(item.ad || '')

  // 1. Doğrudan tam dize eşleşmesi
  if (itemCat && (itemCat.includes(targetNorm) || targetNorm.includes(itemCat))) return true
  if (itemSub && (itemSub.includes(targetNorm) || targetNorm.includes(itemSub))) return true

  // 2. Anlamlı anahtar kelime eşleşmesi (stop-word ayıklanmış)
  const tokens = targetNorm
    .split(/[\s,&+/()\-]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t))

  if (tokens.length === 0) {
    return itemCat.includes(targetNorm) || itemSub.includes(targetNorm) || itemAd.includes(targetNorm)
  }

  for (const token of tokens) {
    const rootToken = token.endsWith('ler') || token.endsWith('lar') ? token.slice(0, -3) : token

    if (
      itemCat.includes(token) || itemCat.includes(rootToken) ||
      itemSub.includes(token) || itemSub.includes(rootToken) ||
      itemAd.includes(token) || itemAd.includes(rootToken)
    ) {
      return true
    }
  }

  return false
}

/**
 * Kupon indirimini hesaplar. Kategori kısıtlaması varsa yalnızca o kategorideki ürünleri kapsar.
 */
export function calculateCouponDiscount(
  kupon: KuponLike | null | undefined,
  items: CouponItemLike[],
  overrideSubtotal?: number
): {
  discount: number
  eligibleItemsCount: number
  eligibleSubtotal: number
  hasCategoryRestriction: boolean
  categoryName: string | null
  error?: string
} {
  if (!kupon) {
    return {
      discount: 0,
      eligibleItemsCount: 0,
      eligibleSubtotal: 0,
      hasCategoryRestriction: false,
      categoryName: null
    }
  }

  const subtotal = overrideSubtotal !== undefined
    ? overrideSubtotal
    : items.reduce((sum, it) => sum + (it.fiyat * it.adet), 0)

  if (kupon.min_tutar && subtotal < kupon.min_tutar) {
    return {
      discount: 0,
      eligibleItemsCount: 0,
      eligibleSubtotal: 0,
      hasCategoryRestriction: false,
      categoryName: kupon.kategori || null,
      error: `Bu kupon en az ${kupon.min_tutar.toLocaleString('tr-TR')} ₺ tutarındaki sepetlerde geçerlidir.`
    }
  }

  const hasCategoryRestriction = !!kupon.kategori && kupon.kategori !== 'tum' && kupon.kategori.trim() !== ''

  // Kategoriye uygun ürünleri filtrele
  const eligibleItems = hasCategoryRestriction
    ? items.filter(it => matchesCategory(kupon.kategori, it))
    : items

  const eligibleSubtotal = eligibleItems.reduce((sum, it) => sum + (it.fiyat * it.adet), 0)

  if (hasCategoryRestriction && (eligibleItems.length === 0 || eligibleSubtotal <= 0)) {
    return {
      discount: 0,
      eligibleItemsCount: 0,
      eligibleSubtotal: 0,
      hasCategoryRestriction: true,
      categoryName: kupon.kategori || null,
      error: `"${kupon.kod}" kuponu yalnızca "${kupon.kategori}" kategorisindeki ürünlerde geçerlidir. Sepetinizde bu kategoriye ait ürün bulunmuyor.`
    }
  }

  let discount = 0
  if (kupon.indirim_tipi === 'yuzde') {
    discount = eligibleSubtotal * (Number(kupon.indirim_miktari) / 100)
  } else {
    // Sabit indirim, kategorideki ürünlerin tutarını aşamaz
    discount = Math.min(Number(kupon.indirim_miktari), eligibleSubtotal)
  }

  return {
    discount: Math.round(discount),
    eligibleItemsCount: eligibleItems.length,
    eligibleSubtotal,
    hasCategoryRestriction,
    categoryName: kupon.kategori || null
  }
}
