import { unstable_cache } from 'next/cache'
import { createAkdagServerClient } from './supabase-akdag'
import { createServerSupabaseClient } from './supabase-server'
import { isQuoteOnlyProduct } from './distributor-rules'

/**
 * Ürün verisini ID'ye göre getirir ve cache-ler.
 * Önce Sescim Supabase'de arar, bulunamazsa Akdağ Supabase'den çeker.
 */
export const getProduct = unstable_cache(
  async (id: string) => {
    let productData: any = null

    // 1. Akdağ Supabase ana ürün kataloğudur — öncelikle Akdağ'dan çek
    try {
      const akdagDb = await createAkdagServerClient()
      const { data: akdagProduct } = await akdagDb
        .from('urunler')
        .select('id, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, fiyat_guncelleme, created_at, updated_at')
        .eq('id', id)
        .maybeSingle()

      if (akdagProduct) {
        productData = akdagProduct
      }
    } catch (e) {
      console.error('Akdağ DB query error for product id', id, e)
    }

    // 2. Akdağ'da bulunamadıysa, Sescim'e özel bağımsız eklenmiş bir ürün mü diye bak
    if (!productData) {
      try {
        const sescimDb = await createServerSupabaseClient()
        if (sescimDb) {
          const { data: sescimProduct } = await sescimDb
            .from('urunler')
            .select('id, ad, aciklama, kategori:kategori_id, alt_kategori:alt_kategori_id, fotograflar, fiyat, bayi_fiyati, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, model_kodu, slug, is_featured, created_at')
            .eq('id', id)
            .maybeSingle()

          if (sescimProduct) {
            productData = sescimProduct
          }
        }
      } catch (e) {
        console.error('Sescim DB query error for product id', id, e)
      }
    }

    if (!productData) {
      return { data: null, error: { message: 'Ürün bulunamadı' } }
    }

    // 3. Sescim fiyatlarını ve Sescim'e özel stok varsa onu giydir
    try {
      const { getSescimPricing } = await import('./sescim-pricing')
      const pricing = await getSescimPricing(productData.id)
      if (pricing) {
        productData = { ...productData, ...pricing }
      }
    } catch (e) {
      console.error('Sescim pricing fetch failed for product', id, e)
    }

    productData.fiyat_sorunuz = isQuoteOnlyProduct({ marka: productData.marka, fiyat_sorunuz: productData.fiyat_sorunuz })
    const { sanitizeProductForClient } = await import('./pricing-engine')
    return { data: sanitizeProductForClient(productData), error: null }
  },
  ['product-detail'],
  { revalidate: 3600, tags: ['products'] }
)

export const getProductBySlug = unstable_cache(
  async (slug: string) => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
    const queryColumn = isUUID ? 'id' : 'slug'
    let productData: any = null

    // 1. Akdağ Supabase ana ürün kataloğudur — öncelikle Akdağ'dan çek
    try {
      const akdagDb = await createAkdagServerClient()
      const { data: akdagProduct } = await akdagDb
        .from('urunler')
        .select('id, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, fiyat_guncelleme, slug, created_at, updated_at')
        .eq(queryColumn, slug)
        .maybeSingle()

      if (akdagProduct) {
        productData = akdagProduct
      }
    } catch (e) {
      console.error('Akdağ DB query error for product slug', slug, e)
    }

    // 2. Akdağ'da bulunamadıysa, Sescim'e özel bağımsız eklenmiş bir ürün mü diye bak
    if (!productData) {
      try {
        const sescimDb = await createServerSupabaseClient()
        if (sescimDb) {
          const { data: sescimProduct } = await sescimDb
            .from('urunler')
            .select('id, ad, aciklama, kategori:kategori_id, alt_kategori:alt_kategori_id, fotograflar, fiyat, bayi_fiyati, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, model_kodu, slug, is_featured, created_at')
            .eq(queryColumn, slug)
            .maybeSingle()

          if (sescimProduct) {
            productData = sescimProduct
          }
        }
      } catch (e) {
        console.error('Sescim DB query error for product slug', slug, e)
      }
    }

    if (!productData) {
      return { data: null, error: { message: 'Ürün bulunamadı' } }
    }

    // 3. Sescim fiyatlarını ve Sescim'e özel stok varsa onu giydir
    try {
      const { getSescimPricing } = await import('./sescim-pricing')
      const pricing = await getSescimPricing(productData.id)
      if (pricing) {
        productData = { ...productData, ...pricing }
      }
    } catch (e) {
      console.error('Sescim pricing fetch failed for product slug', slug, e)
    }

    productData.fiyat_sorunuz = isQuoteOnlyProduct({ marka: productData.marka, fiyat_sorunuz: productData.fiyat_sorunuz })
    const { sanitizeProductForClient } = await import('./pricing-engine')
    return { data: sanitizeProductForClient(productData), error: null }
  },
  ['product-detail-slug'],
  { revalidate: 3600, tags: ['products'] }
)

export const getRelatedProducts = unstable_cache(
  async (kategori: string, excludeId: string) => {
    const supabase = await createAkdagServerClient()
    const { data } = await supabase
      .from('urunler')
      .select('id, slug, ad, kategori, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, fiyat_guncelleme')
      .eq('kategori', kategori)
      .neq('id', excludeId)
      .limit(50) // Daha fazla ürün çek

    if (data && data.length > 0) {
      // Rastgele karıştır ve ilk 4 tanesini al
      const shuffled = data.sort(() => 0.5 - Math.random())
      const selected = shuffled.slice(0, 4)

      try {
        const { getSescimPricingMap } = await import('./sescim-pricing')
        const urunIds = selected.map((p: any) => p.id)
        const pricingMap = await getSescimPricingMap(urunIds)
        
        return selected.map((p: any) => {
          const pricing = pricingMap.get(p.id)
          if (pricing) {
            return { 
              ...p, 
              sescim_fiyat: pricing.sescim_fiyat, 
              sescim_indirimli_fiyat: pricing.sescim_indirimli_fiyat, 
              sescim_aktif: pricing.sescim_aktif,
              sescim_stok: pricing.sescim_stok,
              sescim_stok_durumu: pricing.sescim_stok_durumu,
              fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: pricing.fiyat_sorunuz })
            }
          }
          return { ...p, sescim_aktif: true, fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: false }) }
        }).filter((p: any) => p.sescim_aktif)
      } catch (e) {
        return selected
      }
    }
    return data || []
  },
  ['product-related'],
  { revalidate: 3600, tags: ['products'] }
)

export const getCrossSellProducts = unstable_cache(
  async (
    productId: string,
    ad: string = '',
    kategori: string = '',
    alt_kategori: string = '',
    urun_tipi: string = ''
  ) => {
    let mainId = productId
    let productAd = ad
    let productCat = kategori
    let productSub = alt_kategori
    let productType = urun_tipi

    // Geriye dönük uyumluluk: Eğer tek parametre (kategori string'i) verilmişse
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)
    if (!isUUID && !ad && !kategori) {
      productCat = productId
      mainId = ''
    }

    const normalize = (str: string) =>
      (str || '')
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')

    const normAd = normalize(productAd)
    const normCat = normalize(productCat)
    const normSub = normalize(productSub)
    const normType = normalize(productType)
    const allText = `${normAd} ${normCat} ${normSub} ${normType}`

    // 1. Hoparlörler (Speakers)
    const isPasifHoparlor =
      normAd.includes('pasif') ||
      normType.includes('pasif hoparlor') ||
      normSub.includes('pasif hoparlor') ||
      (allText.includes('hoparlor') &&
        !normAd.includes('aktif') &&
        !normType.includes('aktif') &&
        !normSub.includes('aktif') &&
        !normSub.includes('tasinabilir') &&
        !normAd.includes('tasinabilir') &&
        !normAd.includes('portatif') &&
        !normAd.includes('bluetooth'))

    const isAktifHoparlor =
      normAd.includes('aktif') ||
      normType.includes('aktif hoparlor') ||
      normSub.includes('aktif hoparlor') ||
      (allText.includes('hoparlor') && normAd.includes('aktif'))

    const isSubwoofer =
      normAd.includes('subwoofer') ||
      normType.includes('subwoofer') ||
      normSub.includes('subwoofer') ||
      normAd.includes(' sub ')

    // 2. Mikrofonlar (Microphones)
    const isMikrofon =
      (allText.includes('mikrofon') || normCat.includes('mikrofon') || normSub.includes('mikrofon')) &&
      !allText.includes('kulaklik') &&
      !allText.includes('kablo') &&
      !allText.includes('stand')

    // 3. Mikser & Amfi (Mixers & Amps)
    const isPowerAmfi =
      (allText.includes('power amfi') ||
        normType.includes('power (guc) amfileri') ||
        normSub.includes('power amfileri') ||
        (normAd.includes('amplifikator') && !normAd.includes('kulaklik'))) &&
      !allText.includes('hoparlor')

    const isMixer =
      (allText.includes('mikser') || allText.includes('mixer')) &&
      !allText.includes('hoparlor') &&
      !allText.includes('mikrofon')

    // 4. Stüdyo & Ses Kartı
    const isStudioMonitor =
      allText.includes('studyo monitor') ||
      normType.includes('studyo monitor') ||
      normSub.includes('studyo monitor')

    const isAudioInterface =
      allText.includes('ses kart') ||
      allText.includes('audio interface')

    // 5. Kulaklıklar
    const isHeadphone =
      (allText.includes('kulaklik') || allText.includes('headphone') || allText.includes('iem') || allText.includes('in-ear')) &&
      !allText.includes('hoparlor')

    // 6. DJ Ekipmanları
    const isDj =
      (allText.includes('dj controller') ||
        allText.includes('turntable') ||
        normSub.includes('dj') ||
        normCat.includes('dj')) &&
      !allText.includes('isik')

    // 7. Işık Sistemleri (Lighting)
    const isLighting =
      allText.includes('isik') ||
      allText.includes('lighting') ||
      allText.includes('moving head') ||
      allText.includes('led par') ||
      allText.includes('lazer') ||
      allText.includes('spot') ||
      allText.includes('beam') ||
      allText.includes('blinder') ||
      allText.includes('strobe')

    // 8. Efekt Makineleri
    const isEffect =
      allText.includes('sis') ||
      allText.includes('duman') ||
      allText.includes('hazer') ||
      allText.includes('likit') ||
      allText.includes('kopuk') ||
      allText.includes('kivilcim')

    type FilterFn = (q: any) => any
    let slotFilters: FilterFn[] = []

    if (isPasifHoparlor) {
      // Pasif Hoparlör: 1) Speakon konnektör / kablo, 2) Power Amfi / Mikser, 3) Hoparlör Standı
      slotFilters = [
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%SPEAKON%,ad.ilike.%SPEKON%,ad.ilike.%HOPARL%R KABLO%'),
        (q) => q.ilike('urun_tipi', '%Amfi%').or('ad.ilike.%AMPL%F%KATOR%,ad.ilike.%POWER M%KSER%,ad.ilike.%POWER AMPL%'),
        (q) => q.ilike('kategori', '%Kablo%').or('urun_tipi.ilike.%Hoparlör Stand%,ad.ilike.%HOPARL%R STAND%,ad.ilike.%HOPARL%R SEHPA%'),
      ]
    } else if (isAktifHoparlor) {
      // Aktif Hoparlör: 1) Hoparlör Standı, 2) XLR Balanslı Kablo, 3) Deck / Analog Mikser
      slotFilters = [
        (q) => q.ilike('kategori', '%Kablo%').or('urun_tipi.ilike.%Hoparlör Stand%,ad.ilike.%HOPARL%R STAND%,ad.ilike.%HOPARL%R SEHPA%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%XLR KONNEKT%R%,ad.ilike.%XLR KABLO%,ad.ilike.%M%KROFON KABLO%'),
        (q) => q.or('urun_tipi.ilike.%Analog Mikser%,ad.ilike.%DECK M%KSER%,urun_tipi.ilike.%Mikser%'),
      ]
    } else if (isSubwoofer) {
      // Subwoofer: 1) Ara Bağlantı Borusu / Stand, 2) Speakon veya XLR kablo, 3) Power Amfi / Mikser
      slotFilters = [
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%ARA BORU%,ad.ilike.%HOPARL%R STAND%,ad.ilike.%SEHPA%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%SPEAKON%,ad.ilike.%XLR%'),
        (q) => q.or('urun_tipi.ilike.%Amfi%,urun_tipi.ilike.%Mikser%'),
      ]
    } else if (isMikrofon) {
      // Mikrofon: 1) Mikrofon Standı / Sehpası, 2) XLR Mikrofon Kablosu, 3) Mikrofon Tutacağı / Pop Filtre
      slotFilters = [
        (q) => q.ilike('kategori', '%Kablo%').or('urun_tipi.ilike.%Mikrofon Stand%,ad.ilike.%M%KROFON SEHBA%,ad.ilike.%M%KROFON STAND%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%XLR KONNEKT%R%,ad.ilike.%BALANSLI M%KROFON KABLOSU%,ad.ilike.%M%KROFON KABLO%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%M%KROFON TUTACA%,ad.ilike.%POP F%LTRE%,ad.ilike.%SUNG%R%'),
      ]
    } else if (isStudioMonitor) {
      // Stüdyo Monitör: 1) Ses Kartı / Stüdyo Kulaklığı, 2) Balanslı Sinyal Kablosu, 3) Monitör İzolasyon Pedi / Standı
      slotFilters = [
        (q) => q.or('ad.ilike.%SES KART%,urun_tipi.ilike.%Kulaklık%,ad.ilike.%KULAKL%K%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%XLR%,ad.ilike.%TRS%,ad.ilike.%JAK%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%STAND%,ad.ilike.%SEHPA%,ad.ilike.%PED%'),
      ]
    } else if (isAudioInterface) {
      // Ses Kartı: 1) Stüdyo Condenser Mikrofon, 2) XLR Mikrofon Kablosu, 3) Stüdyo Referans Kulaklığı
      slotFilters = [
        (q) => q.or('urun_tipi.ilike.%Kondenser%,urun_tipi.ilike.%Mikrofon%,ad.ilike.%M%KROFON%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%XLR%,ad.ilike.%M%KROFON KABLO%'),
        (q) => q.or('ad.ilike.%KULAKL%K%,ad.ilike.%HEADPHONE%'),
      ]
    } else if (isMixer) {
      // Mikser: 1) Vokal Mikrofonu, 2) XLR Sinyal Kablosu, 3) Stüdyo / DJ Kulaklığı
      slotFilters = [
        (q) => q.or('urun_tipi.ilike.%Kablolu Dinamik%,ad.ilike.%VOKAL M%KROFON%,ad.ilike.%M%KROFON%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%XLR%,ad.ilike.%M%KROFON KABLO%,urun_tipi.ilike.%Multicore%'),
        (q) => q.or('ad.ilike.%KULAKL%K%,ad.ilike.%HEADPHONE%'),
      ]
    } else if (isPowerAmfi) {
      // Power Amfi: 1) Pasif Kabin Hoparlör, 2) Speakon Konnektör/Kablo, 3) XLR Sinyal Kablosu
      slotFilters = [
        (q) => q.or('urun_tipi.ilike.%Pasif Hoparlör%,ad.ilike.%PAS%F%,ad.ilike.%KAB%N HOPARL%R%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%SPEAKON%,ad.ilike.%SPEKON%,ad.ilike.%HOPARL%R KABLO%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%XLR%,ad.ilike.%KABLO%'),
      ]
    } else if (isDj) {
      // DJ Ekipmanları: 1) DJ Kulaklığı, 2) Laptop/DJ Standı, 3) RCA/XLR Sinyal Kablosu
      slotFilters = [
        (q) => q.or('ad.ilike.%KULAKL%K%,ad.ilike.%HEADPHONE%'),
        (q) => q.or('ad.ilike.%STAND%,ad.ilike.%SEHPA%,ad.ilike.%CANTAS%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%RCA%,ad.ilike.%XLR%,ad.ilike.%KABLO%'),
      ]
    } else if (isLighting) {
      // Işık: 1) Işık Kancası / Kelepçesi (Clamp), 2) DMX Dağıtıcı / Kablo, 3) Işık Standı / Masası
      slotFilters = [
        (q) => q.or('ad.ilike.%KANCA%,ad.ilike.%KELEPCE%,ad.ilike.%CLAMP%'),
        (q) => q.or('urun_tipi.ilike.%DMX%,ad.ilike.%DMX%'),
        (q) => q.or('urun_tipi.ilike.%Stand%,alt_kategori.ilike.%Işık Kontrol%'),
      ]
    } else if (isEffect) {
      // Efekt Makineleri: 1) Sis/Duman Likiti, 2) DMX Kablosu, 3) Güç/Sinyal Kablosu
      slotFilters = [
        (q) => q.or('ad.ilike.%L%K%T%,ad.ilike.%SIVI%,ad.ilike.%DUMAN%'),
        (q) => q.or('ad.ilike.%DMX%,urun_tipi.ilike.%DMX%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%KABLO%,ad.ilike.%KUMANDA%'),
      ]
    } else if (isHeadphone) {
      // Kulaklık: 1) Kulaklık Standı / Askısı, 2) Çevirici Adaptör Jak, 3) Uzatma Kablosu
      slotFilters = [
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%STAND%,ad.ilike.%SEHPA%,ad.ilike.%ASKI%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%ADAPTOR%,ad.ilike.%JAK%,ad.ilike.%CEV%R%C%'),
        (q) => q.or('ad.ilike.%UZATMA%,ad.ilike.%KULAKL%K AMF%S%'),
      ]
    } else {
      // Genel Aksesuar & Kablo Tamamlayıcıları
      slotFilters = [
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%KABLO%,ad.ilike.%JAK%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%STAND%,ad.ilike.%SEHPA%'),
        (q) => q.ilike('kategori', '%Kablo%').or('ad.ilike.%KONNEKT%R%,ad.ilike.%ADAPTOR%'),
      ]
    }

    const supabase = await createAkdagServerClient()
    const selectedProducts: any[] = []
    const pickedIds = new Set<string>()
    if (mainId) pickedIds.add(mainId)

    const baseColumns =
      'id, slug, ad, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, fiyat_guncelleme'

    for (const filterFn of slotFilters) {
      try {
        let q = supabase
          .from('urunler')
          .select(baseColumns)
          .gt('fiyat', 0)

        if (pickedIds.size > 0) {
          q = q.not('id', 'in', `(${Array.from(pickedIds).join(',')})`)
        }

        q = filterFn(q)
        const { data } = await q.limit(1)

        if (data && data.length > 0 && data[0].fotograflar && data[0].fotograflar.length > 0) {
          pickedIds.add(data[0].id)
          selectedProducts.push(data[0])
        }
      } catch (err) {
        console.error('Error in bundle slot query:', err)
      }
    }

    // Eğer 3 üründen az bulunduysa, genel kaliteli aksesuarlarla tamamla
    if (selectedProducts.length < 3) {
      try {
        let fallbackQuery = supabase
          .from('urunler')
          .select(baseColumns)
          .ilike('kategori', '%Kablo%')
          .gt('fiyat', 0)
          .limit(3 - selectedProducts.length)

        if (pickedIds.size > 0) {
          fallbackQuery = fallbackQuery.not('id', 'in', `(${Array.from(pickedIds).join(',')})`)
        }

        const { data: fallbackData } = await fallbackQuery
        if (fallbackData) {
          for (const item of fallbackData) {
            if (item.fotograflar && item.fotograflar.length > 0) {
              pickedIds.add(item.id)
              selectedProducts.push(item)
            }
          }
        }
      } catch (fallbackErr) {
        console.error('Error in fallback query:', fallbackErr)
      }
    }

    if (selectedProducts.length > 0) {
      try {
        const { getSescimPricingMap } = await import('./sescim-pricing')
        const urunIds = selectedProducts.map((p) => p.id)
        const pricingMap = await getSescimPricingMap(urunIds)

        return selectedProducts
          .map((p) => {
            const pricing = pricingMap.get(p.id)
            if (pricing) {
              return {
                ...p,
                sescim_fiyat: pricing.sescim_fiyat,
                sescim_indirimli_fiyat: pricing.sescim_indirimli_fiyat,
                sescim_aktif: pricing.sescim_aktif,
                sescim_stok: pricing.sescim_stok,
                sescim_stok_durumu: pricing.sescim_stok_durumu,
                fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: pricing.fiyat_sorunuz }),
              }
            }
            return {
              ...p,
              sescim_aktif: true,
              fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: false }),
            }
          })
          .filter((p) => p.sescim_aktif !== false && !p.fiyat_sorunuz && (p.sescim_fiyat || p.fiyat) > 0)
      } catch (e) {
        return selectedProducts
      }
    }

    return selectedProducts
  },
  ['product-cross-sell-smart'],
  { revalidate: 3600, tags: ['products'] }
)

