import { createServerSupabaseClient } from './supabase-server'

export interface SescimPricing {
  urun_id: string
  sescim_fiyat: number | null
  sescim_indirimli_fiyat: number | null
  sescim_aktif: boolean
  is_outlet?: boolean
  outlet_durum?: string | null
  is_firsat?: boolean
  fiyat_sorunuz?: boolean
  updated_at?: string
}

export async function getSescimPricingMap(urunIds: string[]): Promise<Map<string, SescimPricing>> {
  const map = new Map<string, SescimPricing>()
  if (!urunIds.length) return map

  const supabase = await createServerSupabaseClient()
  if (!supabase) return map

  try {
    const { data, error } = await supabase
      .from('sescim_fiyatlar')
      .select('*')
      .in('urun_id', urunIds)

    if (error) {
      console.error('Error fetching Sescim pricing map:', error)
      return map
    }

    if (data) {
      data.forEach(item => {
        map.set(item.urun_id, {
          urun_id: item.urun_id,
          sescim_fiyat: item.sescim_fiyat !== null ? Number(item.sescim_fiyat) : null,
          sescim_indirimli_fiyat: item.sescim_indirimli_fiyat !== null ? Number(item.sescim_indirimli_fiyat) : null,
          sescim_aktif: item.sescim_aktif !== false,
          is_outlet: !!item.is_outlet,
          outlet_durum: item.outlet_durum || 'Teşhir / B-Stock',
          is_firsat: !!item.is_firsat,
          fiyat_sorunuz: !!item.fiyat_sorunuz,
        })
      })
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
    const { data, error } = await supabase
      .from('sescim_fiyatlar')
      .select('*')
      .eq('urun_id', urunId)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') { // not found
        console.error('Error fetching Sescim pricing:', error)
      }
      return null
    }

    if (data) {
      return {
        urun_id: data.urun_id,
        sescim_fiyat: data.sescim_fiyat !== null ? Number(data.sescim_fiyat) : null,
        sescim_indirimli_fiyat: data.sescim_indirimli_fiyat !== null ? Number(data.sescim_indirimli_fiyat) : null,
        sescim_aktif: data.sescim_aktif !== false,
        is_outlet: !!data.is_outlet,
        outlet_durum: data.outlet_durum || 'Teşhir / B-Stock',
        is_firsat: !!data.is_firsat,
        fiyat_sorunuz: !!data.fiyat_sorunuz,
      }
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

    const { error } = await supabase
      .from('sescim_fiyatlar')
      .upsert(payload, { onConflict: 'urun_id' })

    if (error) {
      // Eğer fiyat_sorunuz kolonu henüz DB'de yoksa, fallback olarak onsuz kaydetmeyi dene
      if (error.code === 'PGRST204' && payload.fiyat_sorunuz !== undefined) {
        console.warn('fiyat_sorunuz column not found in sescim_fiyatlar yet. Run migration.')
        delete payload.fiyat_sorunuz
        const retry = await supabase.from('sescim_fiyatlar').upsert(payload, { onConflict: 'urun_id' })
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
