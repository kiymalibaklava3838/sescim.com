/**
 * Ürün listeleme ekranlarında (katalog, arama, benzer ürünler) 
 * performansı artırmak ve veritabanı trafiğini (egress) azaltmak için
 * sadece gerekli olan kolonları çekeriz.
 * 
 * KRİTİK: 'aciklama' kolonu çok büyük veri içerebileceği için listelerde ASLA çekilmemelidir.
 */
export const LIGHT_PRODUCT_FIELDS = 'id, slug, ad, kategori, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, fiyat_guncelleme, is_featured'.replace(/\s+/g, '').trim()

/**
 * Arama önerileri (dropdown) için daha da hafifletilmiş kolon seti.
 */
export const SEARCH_SUGGESTION_FIELDS = 'id, slug, ad, kategori, fotograflar, fiyat, indirimli_fiyat, para_birimi, marka'.replace(/\s+/g, '').trim()

