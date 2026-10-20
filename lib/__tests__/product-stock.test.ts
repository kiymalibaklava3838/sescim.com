import { describe, it, expect } from 'vitest'
import { resolveStock } from '../product-stock'

describe('resolveStock - Merkezi Stok Motoru Testleri', () => {
  it('Normal stoklu üründe stok_durumu ve adedi doğru çözmelidir', () => {
    const res = resolveStock({
      stok_durumu: 'stokta',
      stok_adedi: 10,
      kritik_stok: 3
    })
    expect(res.durum).toBe('stokta')
    expect(res.canOrder).toBe(true)
    expect(res.isTukendi).toBe(false)
    expect(res.isKritik).toBe(false)
    expect(res.adet).toBe(10)
    expect(res.badgeLabel).toBe('Stokta (10 Adet)')
  })

  it('Durumu stokta olsa bile adedi 0 ise otomatik tükendi saymalıdır', () => {
    const res = resolveStock({
      stok_durumu: 'stokta',
      stok_adedi: 0,
    })
    expect(res.durum).toBe('tukendi')
    expect(res.canOrder).toBe(false)
    expect(res.isTukendi).toBe(true)
    expect(res.badgeLabel).toBe('Tükendi')
  })

  it('stok_durumu tukendi olarak işaretlenmişse adet ne olursa olsun tükenmiş olmalıdır', () => {
    const res = resolveStock({
      stok_durumu: 'tukendi',
      stok_adedi: 5,
    })
    expect(res.durum).toBe('tukendi')
    expect(res.canOrder).toBe(false)
    expect(res.badgeLabel).toBe('Tükendi')
  })

  it('Siparişe göre ürünlerde adet 0 olsa dahi sipariş verilebilir olmalıdır', () => {
    const res = resolveStock({
      stok_durumu: 'siparise_gore',
      stok_adedi: 0,
    })
    expect(res.durum).toBe('siparise_gore')
    expect(res.canOrder).toBe(true)
    expect(res.isTukendi).toBe(false)
    expect(res.badgeLabel).toBe('Siparişe Göre')
  })

  it('Kritik stok eşiğindeki ürünlerde "Son X Adet" uyarısı vermelidir', () => {
    const res = resolveStock({
      stok_durumu: 'stokta',
      stok_adedi: 2,
      kritik_stok: 4
    })
    expect(res.durum).toBe('stokta')
    expect(res.isKritik).toBe(true)
    expect(res.badgeLabel).toBe('Son 2 Adet')
  })

  it('stok_miktari kolonu fallback olarak kullanıldığında doğru çalışmalıdır', () => {
    const res = resolveStock({
      stok_durumu: 'stokta',
      stok_miktari: 7,
    })
    expect(res.durum).toBe('stokta')
    expect(res.adet).toBe(7)
    expect(res.canOrder).toBe(true)
  })

  it('Sescim özel stoğu girildiğinde Akdağ stoğunu ezmeli ve geçerli olmalıdır', () => {
    const res = resolveStock({
      stok_durumu: 'stokta',
      stok_adedi: 50, // Akdağ
      sescim_stok: 3,  // Sescim ayrılmış
      kritik_stok: 5
    })
    expect(res.adet).toBe(3)
    expect(res.isKritik).toBe(true)
    expect(res.badgeLabel).toBe('Son 3 Adet')
  })

  it('Sescim özel stoğu 0 yapıldığında Akdağ stoğu olsa bile tükenmiş saymalıdır', () => {
    const res = resolveStock({
      stok_durumu: 'stokta',
      stok_adedi: 20, // Akdağ'da var
      sescim_stok: 0,  // Sescim'de bitti
    })
    expect(res.durum).toBe('tukendi')
    expect(res.canOrder).toBe(false)
    expect(res.badgeLabel).toBe('Tükendi')
  })

  it('Sescim özel stoğu girilmediğinde (null veya boş string) doğrudan Akdağ stoğunu baz almalıdır', () => {
    const resNull = resolveStock({
      stok_durumu: 'stokta',
      stok_adedi: 8,
      sescim_stok: null,
      sescim_stok_durumu: null
    })
    expect(resNull.durum).toBe('stokta')
    expect(resNull.adet).toBe(8)
    expect(resNull.canOrder).toBe(true)

    const resEmpty = resolveStock({
      stok_durumu: 'siparise_gore',
      stok_adedi: 0,
      sescim_stok: '' as any,
      sescim_stok_durumu: ''
    })
    expect(resEmpty.durum).toBe('siparise_gore')
    expect(resEmpty.adet).toBe(0)
    expect(resEmpty.canOrder).toBe(true)
    expect(resEmpty.isTukendi).toBe(false)
  })
})
