import { createServerSupabaseClient } from './supabase-server'

export interface SescimPricing {
  urun_id: string
  sescim_fiyat: number | null
  sescim_indirimli_fiyat: number | null
  sescim_indirimli_fiyat_pb?: string | null
  is_flas_aktif?: boolean
  flas_bitis_tarihi?: string | null
  sescim_aktif: boolean
  is_outlet?: boolean
  outlet_durum?: string | null
  is_firsat?: boolean
  fiyat_sorunuz?: boolean
  sescim_stok?: number | null
  sescim_stok_durumu?: string | null
  updated_at?: string
}

export async function getSescimPricingMap(urunIds: string[]): Promise<Map<string, SescimPricing>> {
  const map = new Map<string, SescimPricing>()
  if (!urunIds.length) return map

  const supabase = await createServerSupabaseClient()
  if (!supabase) return map

  try {
    const nowIso = new Date().toISOString()
    // URL uzunluğu ve header taşmasını önlemek için 50'şerli parçalarla çek
    const BATCH_SIZE = 50
    for (let i = 0; i < urunIds.length; i += BATCH_SIZE) {
      const batchIds = urunIds.slice(i, i + BATCH_SIZE)
      const [sfRes, flasRes, outletRes] = await Promise.all([
        supabase
          .from('sescim_fiyatlar')
          .select('urun_id, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, is_outlet, outlet_durum, is_firsat, fiyat_sorunuz, sescim_stok, sescim_stok_durumu, updated_at')
          .in('urun_id', batchIds),
        supabase
          .from('flas_indirimler')
          .select('urun_id, indirimli_fiyat, fiyat_para_birimi, baslangic_tarihi, bitis_tarihi, aktif')
          .in('urun_id', batchIds)
          .eq('aktif', true)
          .gt('bitis_tarihi', nowIso)
          .lte('baslangic_tarihi', nowIso),
        supabase
          .from('outlet_urunler')
          .select('urun_id, outlet_fiyat, fiyat_para_birimi, durum_aciklamasi, stok_adedi, aktif')
          .in('urun_id', batchIds)
          .eq('aktif', true)
      ])

      const sfData = sfRes.data || []
      const flasData = flasRes.data || []
      const outletData = outletRes.data || []

      const sfMap = new Map<string, any>(sfData.map(item => [item.urun_id, item]))
      const flasMap = new Map<string, any>(flasData.map(item => [item.urun_id, item]))
      const outletMap = new Map<string, any>(outletData.map(item => [item.urun_id, item]))

      for (const id of batchIds) {
        const sf = sfMap.get(id)
        const flas = flasMap.get(id)
        const outlet = outletMap.get(id)

        if (!sf && !flas && !outlet) continue

        let indirimliFiyat: number | null = null
        let indirimliPB: string | null = null
        let isFlasAktif = false
        let flasBitis: string | null = null
        let isFirsat = false

        // 1. Öncelik: Aktif Flaş İndirim (kendi para birimiyle: TRY, USD, EUR)
        if (flas && flas.indirimli_fiyat !== null && flas.indirimli_fiyat !== undefined) {
          indirimliFiyat = Number(flas.indirimli_fiyat)
          indirimliPB = flas.fiyat_para_birimi || 'TRY'
          isFlasAktif = true
          flasBitis = flas.bitis_tarihi
          isFirsat = true
        } else if (outlet && outlet.outlet_fiyat !== null && outlet.outlet_fiyat !== undefined) {
          indirimliFiyat = Number(outlet.outlet_fiyat)
          indirimliPB = outlet.fiyat_para_birimi || 'TRY'
        } else if (sf && sf.sescim_indirimli_fiyat !== null && sf.sescim_indirimli_fiyat !== undefined) {
          indirimliFiyat = Number(sf.sescim_indirimli_fiyat)
          indirimliPB = 'TRY'
          isFirsat = !!sf.is_firsat
        }

        map.set(id, {
          urun_id: id,
          sescim_fiyat: sf?.sescim_fiyat !== null && sf?.sescim_fiyat !== undefined ? Number(sf.sescim_fiyat) : null,
          sescim_indirimli_fiyat: indirimliFiyat,
          sescim_indirimli_fiyat_pb: indirimliPB,
          is_flas_aktif: isFlasAktif,
          flas_bitis_tarihi: flasBitis,
          sescim_aktif: sf?.sescim_aktif !== false,
          is_outlet: !!(outlet?.aktif || sf?.is_outlet),
          outlet_durum: outlet?.durum_aciklamasi || sf?.outlet_durum || 'Teşhir / B-Stock',
          is_firsat: isFirsat,
          fiyat_sorunuz: !!sf?.fiyat_sorunuz,
          sescim_stok: outlet ? (outlet.stok_adedi ?? 1) : (sf?.sescim_stok !== null && sf?.sescim_stok !== undefined ? Number(sf.sescim_stok) : null),
          sescim_stok_durumu: sf?.sescim_stok_durumu || null,
        })
      }
    }
  } catch (error) {
    console.error('Exception fetching Sescim pricing map:', error)
  }

  return map
}

export async function getSescimPricing(urunId: string): Promise<SescimPricing | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const nowIso = new Date().toISOString()
    const [sfRes, flasRes, outletRes] = await Promise.all([
      supabase
        .from('sescim_fiyatlar')
        .select('urun_id, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, is_outlet, outlet_durum, is_firsat, fiyat_sorunuz, sescim_stok, sescim_stok_durumu, updated_at')
        .eq('urun_id', urunId)
        .maybeSingle(),
      supabase
        .from('flas_indirimler')
        .select('indirimli_fiyat, fiyat_para_birimi, baslangic_tarihi, bitis_tarihi, aktif')
        .eq('urun_id', urunId)
        .eq('aktif', true)
        .gt('bitis_tarihi', nowIso)
        .lte('baslangic_tarihi', nowIso)
        .order('bitis_tarihi', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('outlet_urunler')
        .select('outlet_fiyat, fiyat_para_birimi, durum_aciklamasi, stok_adedi, aktif')
        .eq('urun_id', urunId)
        .eq('aktif', true)
        .limit(1)
        .maybeSingle()
    ])

    const sf = sfRes.data
    const flas = flasRes.data
    const outlet = outletRes.data

    if (!sf && !flas && !outlet) return null

    let indirimliFiyat: number | null = null
    let indirimliPB: string | null = null
    let isFlasAktif = false
    let flasBitis: string | null = null
    let isFirsat = false

    // 1. Öncelik: Aktif Flaş İndirim (kendi para birimiyle: TRY, USD, EUR)
    if (flas && flas.indirimli_fiyat !== null && flas.indirimli_fiyat !== undefined) {
      indirimliFiyat = Number(flas.indirimli_fiyat)
      indirimliPB = flas.fiyat_para_birimi || 'TRY'
      isFlasAktif = true
      flasBitis = flas.bitis_tarihi
      isFirsat = true
    } else if (outlet && outlet.outlet_fiyat !== null && outlet.outlet_fiyat !== undefined) {
      indirimliFiyat = Number(outlet.outlet_fiyat)
      indirimliPB = outlet.fiyat_para_birimi || 'TRY'
    } else if (sf && sf.sescim_indirimli_fiyat !== null && sf.sescim_indirimli_fiyat !== undefined) {
      indirimliFiyat = Number(sf.sescim_indirimli_fiyat)
      indirimliPB = 'TRY'
      isFirsat = !!sf.is_firsat
    }

    return {
      urun_id: urunId,
      sescim_fiyat: sf?.sescim_fiyat !== null && sf?.sescim_fiyat !== undefined ? Number(sf.sescim_fiyat) : null,
      sescim_indirimli_fiyat: indirimliFiyat,
      sescim_indirimli_fiyat_pb: indirimliPB,
      is_flas_aktif: isFlasAktif,
      flas_bitis_tarihi: flasBitis,
      sescim_aktif: sf?.sescim_aktif !== false,
      is_outlet: !!(outlet?.aktif || sf?.is_outlet),
      outlet_durum: outlet?.durum_aciklamasi || sf?.outlet_durum || 'Teşhir / B-Stock',
      is_firsat: isFirsat,
      fiyat_sorunuz: !!sf?.fiyat_sorunuz,
      sescim_stok: outlet ? (outlet.stok_adedi ?? 1) : (sf?.sescim_stok !== null && sf?.sescim_stok !== undefined ? Number(sf.sescim_stok) : null),
      sescim_stok_durumu: sf?.sescim_stok_durumu || null,
      updated_at: sf?.updated_at
    }
  } catch (error) {
    console.error('Exception fetching Sescim pricing:', error)
  }
  return null
}

export async function upsertSescimPricing(
  urunId: string, 
  data: { 
    sescim_fiyat?: number | null
    sescim_indirimli_fiyat?: number | null
    sescim_aktif?: boolean
    is_outlet?: boolean
    outlet_durum?: string | null
    is_firsat?: boolean
    fiyat_sorunuz?: boolean
    sescim_stok?: number | null
    sescim_stok_durumu?: string | null
  }
): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return false

  try {
    const payload: any = {
      urun_id: urunId,
      sescim_fiyat: data.sescim_fiyat,
      sescim_indirimli_fiyat: data.sescim_indirimli_fiyat,
      sescim_aktif: data.sescim_aktif,
      is_outlet: data.is_outlet,
      outlet_durum: data.outlet_durum,
      is_firsat: data.is_firsat,
      updated_at: new Date().toISOString()
    }

    if (data.fiyat_sorunuz !== undefined) {
      payload.fiyat_sorunuz = data.fiyat_sorunuz
    }

    if (data.sescim_stok !== undefined) {
      payload.sescim_stok = data.sescim_stok
    }

    if (data.sescim_stok_durumu !== undefined) {
      payload.sescim_stok_durumu = data.sescim_stok_durumu
    }

    const { error } = await supabase
      .from('sescim_fiyatlar')
      .upsert(payload, { onConflict: 'urun_id' })

    if (error) {
      // Eğer yeni eklenen kolonlar henüz DB'de yoksa, fallback olarak onları çıkarıp tekrar dene
      if (error.code === 'PGRST204') {
        console.warn('Bazı kolonlar henüz sescim_fiyatlar tablosunda yok. Migration çalıştırın. Fallback uygulanıyor...')
        const fallbackPayload = { ...payload }
        delete fallbackPayload.sescim_stok
        delete fallbackPayload.sescim_stok_durumu
        delete fallbackPayload.fiyat_sorunuz
        const retry = await supabase.from('sescim_fiyatlar').upsert(fallbackPayload, { onConflict: 'urun_id' })
        return !retry.error
      }
      console.error('Error upserting Sescim pricing:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Exception upserting Sescim pricing:', error)
    return false
  }
}
