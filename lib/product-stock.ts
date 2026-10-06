/**
 * Sescim.com - Merkezi Stok ve Tedarik Çözümleyici (Product Stock Engine)
 *
 * İş Kuralı:
 * 1. Ana ürün kataloğu ve ana fiziksel stok Akdağ Elektronik veritabanında tutulur (örn: 8 adet).
 * 2. Sescim admini dilerse Sescim mağazasına özel bir stok ayırabilir (sescim_stok, örn: 5 adet).
 * 3. Sescim'e özel stok girildiğinde:
 *    - Sescim frontend'i, sepeti, ödeme kontrolü ve XML feed'leri 5 adedi baz alır.
 *    - Akdağ Elektronik ana veritabanındaki stok (8 adet) KESİNLİKLE değiştirilmez, korunur.
 * 4. Sescim stoğu girilmemişse (null ise):
 *    - Akdağ veritabanındaki stok_durumu ve stok_adedi varsayılan olarak kullanılır.
 * 5. Stok Durumları:
 *    - 'stokta': Normal stoklu ürün. Tükendiğinde veya sescim_stok <= 0 olduğunda 'tukendi' olur.
 *    - 'siparise_gore': Siparişe göre temin edilen ürün. Adet 0 olsa bile 'Tükendi' YAZMAZ, sipariş edilebilir.
 *    - 'tukendi': Stok tükenmiş, sipariş verilemez.
 */

export interface ResolvedStock {
  durum: 'stokta' | 'siparise_gore' | 'tukendi'
  status: 'stokta' | 'siparise_gore' | 'tukendi'
  adet: number | null
  isTukendi: boolean
  isSipariseGore: boolean
  isStokta: boolean
  isKritik: boolean
  canOrder: boolean
  isOrderable: boolean
  badgeLabel: string
  badgeColor: 'emerald' | 'amber' | 'slate' | 'rose'
}

export function resolveStock(product: {
  stok_durumu?: string | null
  stok_adedi?: number | null
  kritik_stok?: number | null
  sescim_stok?: number | null
  sescim_stok_durumu?: string | null
}): ResolvedStock {
  // 1. Sescim'e özel atanmış stok var mı?
  const hasSescimStok = product.sescim_stok !== null && product.sescim_stok !== undefined
  const sescimAdet = hasSescimStok ? Number(product.sescim_stok) : null

  // 2. Ham durumları normalize et
  const rawSescimDurum = product.sescim_stok_durumu?.toLowerCase().trim() || null
  const rawAkdagDurum = (product.stok_durumu || 'stokta').toLowerCase().trim()
  
  const isAkdagSipariseGore = 
    rawAkdagDurum === 'siparise_gore' || 
    rawAkdagDurum === 'siparise-gore' || 
    rawAkdagDurum === 'siparişe göre' || 
    rawAkdagDurum === 'siparise gore'

  const isAkdagTukendi = 
    rawAkdagDurum === 'tukendi' || 
    rawAkdagDurum === 'tükendi'

  let durum: 'stokta' | 'siparise_gore' | 'tukendi' = 'stokta'
  let adet: number | null = null

  if (hasSescimStok) {
    // Sescim'e özel ayrılan stok geçerlidir
    adet = Math.max(0, sescimAdet!)
    if (rawSescimDurum === 'tukendi' || rawSescimDurum === 'tükendi' || adet <= 0) {
      durum = 'tukendi'
    } else if (rawSescimDurum === 'siparise_gore' || rawSescimDurum === 'siparise-gore' || rawSescimDurum === 'siparişe göre') {
      durum = 'siparise_gore'
    } else {
      durum = 'stokta'
    }
  } else {
    // Sescim'e özel stok girilmemiş -> Akdağ ortak stoğu geçerlidir
    adet = product.stok_adedi !== null && product.stok_adedi !== undefined ? Number(product.stok_adedi) : null

    if (isAkdagTukendi) {
      durum = 'tukendi'
    } else if (isAkdagSipariseGore) {
      durum = 'siparise_gore'
      // Siparişe göre ürünlerde adet 0 olsa dahi bu 'tükendi' DEĞİLDİR, sipariş verilebilir
    } else {
      // Durum 'stokta' olarak işaretli ama adet 0 veya negatif ise fiilen tükenmiştir
      if (adet !== null && adet <= 0) {
        durum = 'tukendi'
      } else {
        durum = 'stokta'
      }
    }
  }

  const isTukendi = durum === 'tukendi'
  const isSipariseGore = durum === 'siparise_gore'
  const isStokta = durum === 'stokta'
  const canOrder = !isTukendi // Stokta veya Siparişe Göre ise sipariş edilebilir

  const kritikEşik = product.kritik_stok ?? 5
  const isKritik = isStokta && adet !== null && adet > 0 && adet <= kritikEşik

  let badgeLabel = 'Stokta'
  let badgeColor: 'emerald' | 'amber' | 'slate' | 'rose' = 'emerald'

  if (isTukendi) {
    badgeLabel = 'Tükendi'
    badgeColor = 'slate'
  } else if (isSipariseGore) {
    badgeLabel = 'Siparişe Göre'
    badgeColor = 'amber'
  } else if (isKritik) {
    badgeLabel = `Son ${adet} Adet`
    badgeColor = 'amber'
  } else if (adet !== null && adet > 20) {
    badgeLabel = 'Stokta (20+ Adet)'
  } else if (adet !== null && adet > 0) {
    badgeLabel = `Stokta (${adet} Adet)`
  }

  return {
    durum,
    status: durum,
    adet,
    isTukendi,
    isSipariseGore,
    isStokta,
    isKritik,
    canOrder,
    isOrderable: canOrder,
    badgeLabel,
    badgeColor
  }
}

/**
 * Sipariş tamamlandığında Sescim stoğunu güvenli şekilde düşürür.
 * Akdağ veritabanına ASLA dokunmaz.
 */
export async function deductSescimStock(
  sescimDb: any,
  product: { id: string; stok_adedi?: number | null },
  adet: number
) {
  if (!sescimDb || !product?.id || adet <= 0) return

  try {
    // 1. Varsa atomik PostgreSQL fonksiyonu ile tek işlemde düş
    const { error: rpcErr } = await sescimDb.rpc('deduct_sescim_stock', {
      p_urun_id: product.id,
      p_adet: adet
    })

    if (!rpcErr) {
      return
    }

    // 2. RPC yoksa manuel okuma ve yazma ile devam et
    const { data: sf } = await sescimDb
      .from('sescim_fiyatlar')
      .select('urun_id, sescim_stok, sescim_stok_durumu')
      .eq('urun_id', product.id)
      .maybeSingle()

    let mevcutStok: number
    if (sf && sf.sescim_stok !== null && sf.sescim_stok !== undefined) {
      mevcutStok = Number(sf.sescim_stok)
    } else {
      // Sescim'e özel stok daha önce girilmemişse, başlangıç Akdağ stoğundan alınır
      mevcutStok = typeof product.stok_adedi === 'number' ? product.stok_adedi : 10
    }

    const yeniStok = Math.max(0, mevcutStok - adet)
    const yeniDurum = yeniStok <= 0 ? 'tukendi' : (sf?.sescim_stok_durumu === 'tukendi' ? 'stokta' : (sf?.sescim_stok_durumu || 'stokta'))

    const payload: any = {
      urun_id: product.id,
      sescim_stok: yeniStok,
      sescim_stok_durumu: yeniDurum,
      updated_at: new Date().toISOString()
    }

    const { error } = await sescimDb
      .from('sescim_fiyatlar')
      .upsert(payload, { onConflict: 'urun_id' })

    if (error) {
      // Eğer henüz sescim_stok kolonu migration yapılmamışsa sessizce logla
      if (error.code === 'PGRST204') {
        console.warn('[deductSescimStock] sescim_stok kolonu bulunamadı, migration çalıştırın.')
      } else {
        console.error('[deductSescimStock] Hata:', error)
      }
    }
  } catch (err) {
    console.error('[deductSescimStock] Beklenmeyen istisna:', err)
  }
}

/**
 * İptal edilen siparişlerde Sescim stoğunu geri iade eder.
 * Akdağ veritabanına ASLA dokunmaz.
 */
export async function restoreSescimStock(
  sescimDb: any,
  urunId: string,
  adet: number
) {
  if (!sescimDb || !urunId || adet <= 0) return

  try {
    const { data: sf } = await sescimDb
      .from('sescim_fiyatlar')
      .select('sescim_stok, sescim_stok_durumu')
      .eq('urun_id', urunId)
      .maybeSingle()

    if (sf && typeof sf.sescim_stok === 'number') {
      const yeniStok = sf.sescim_stok + adet
      const yeniDurum = yeniStok > 0 && sf.sescim_stok_durumu === 'tukendi' ? 'stokta' : sf.sescim_stok_durumu

      await sescimDb
        .from('sescim_fiyatlar')
        .update({
          sescim_stok: yeniStok,
          sescim_stok_durumu: yeniDurum,
          updated_at: new Date().toISOString()
        })
        .eq('urun_id', urunId)
    }
  } catch (err) {
    console.error('[restoreSescimStock] Hata:', err)
  }
}
