import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import { getSescimPricingMap } from '@/lib/sescim-pricing'
import { getKur, dovizToTL, formatFiyat } from '@/lib/kur'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Flame, Percent, Zap } from 'lucide-react'
import DailyDealsTimer from './DailyDealsTimer'
import { StaggerContainer, StaggerItem } from './MotionComponents'

export default async function DailyDealsSection() {
  const akdagSupabase = await createAkdagServerClient()
  const sescimSupabase = await createServerSupabaseClient()
  const kur = await getKur()

  // 1. Sescim aktif flaş indirimlerini çek
  let flasUrunIds: string[] = []
  let enYakinBitis: string | undefined = undefined

  if (sescimSupabase) {
    try {
      const { data: flasData } = await sescimSupabase
        .from('flas_indirimler')
        .select('*')
        .eq('aktif', true)
        .gt('bitis_tarihi', new Date().toISOString())
        .order('bitis_tarihi', { ascending: true })

      if (flasData && flasData.length > 0) {
        flasUrunIds = flasData.map((f: any) => f.urun_id)
        enYakinBitis = flasData[0].bitis_tarihi
      }
    } catch (e) {
      console.error('Flas indirimler fetch error:', e)
    }
  }

  // 2. Ürünleri çek
  let products: any[] = []

  if (flasUrunIds.length > 0) {
    const { data } = (await akdagSupabase
      .from('urunler')
      .select(LIGHT_PRODUCT_FIELDS)
      .in('id', flasUrunIds)) as any
    products = data || []
  }

  // Yeterli flaş indirim yoksa, indirimli_fiyat'ı olan ürünlerle tamamla
  if (products.length < 10) {
    const { data: indirimli } = (await akdagSupabase
      .from('urunler')
      .select(LIGHT_PRODUCT_FIELDS)
      .not('indirimli_fiyat', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)) as any

    if (indirimli) {
      const existingIds = new Set(products.map(p => p.id))
      for (const u of indirimli) {
        if (!existingIds.has(u.id)) {
          products.push(u)
          existingIds.add(u.id)
        }
      }
    }
  }

  // Hala yetersizse en son eklenenlerden al
  if (products.length === 0) {
    const { data: fallback } = (await akdagSupabase
      .from('urunler')
      .select(LIGHT_PRODUCT_FIELDS)
      .order('created_at', { ascending: false })
      .limit(10)) as any
    products = fallback || []
  }

  // Sescim fiyatlarını eşle
  const urunIds = products.map((p: any) => p.id)
  const pricingMap = await getSescimPricingMap(urunIds)

  const dealsProducts = products.map((p: any) => {
    const pricing = pricingMap.get(p.id)
    return {
      ...p,
      sescim_fiyat: pricing?.sescim_fiyat ?? null,
      sescim_indirimli_fiyat: pricing?.sescim_indirimli_fiyat ?? p.indirimli_fiyat ?? null,
      sescim_aktif: pricing?.sescim_aktif ?? true,
    }
  }).filter(p => p.sescim_aktif !== false).slice(0, 10)

  if (dealsProducts.length === 0) return null

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-white via-red-50/20 to-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Üst Başlık & Geri Sayım Barı */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-brand-red font-display font-bold text-[11px] uppercase tracking-wider">
                <Zap size={13} className="text-brand-red fill-brand-red" />
                Fırsat Köşesi
              </span>
              <DailyDealsTimer targetDate={enYakinBitis} />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-slate-900 uppercase">
              Günün Fırsatları
            </h2>
            <p className="text-xs md:text-sm text-slate-500 font-body mt-1">
              Sınırlı süreye özel indirimli profesyonel ses, stüdyo ve sahne ekipmanları
            </p>
          </div>

          <Link 
            href="/firsatlar" 
            className="inline-flex items-center gap-2 text-xs md:text-sm font-display font-bold text-brand-red hover:text-red-700 transition-colors group shrink-0"
          >
            <span>Tüm Fırsatları İncele</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Ürün Izgarası */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {dealsProducts.map((product) => {
            const pb = product.para_birimi || 'TRY'
            const normalFiyatRaw = product.sescim_fiyat ?? product.fiyat ?? 0
            const indirimliFiyatRaw = product.sescim_indirimli_fiyat ?? null

            const normalFiyatTL = dovizToTL(normalFiyatRaw, pb, kur)
            const indirimliFiyatTL = indirimliFiyatRaw ? dovizToTL(indirimliFiyatRaw, pb, kur) : null

            const gecerliFiyatTL = indirimliFiyatTL || normalFiyatTL
            const indirimOrani = (indirimliFiyatTL && normalFiyatTL > indirimliFiyatTL)
              ? Math.round(((normalFiyatTL - indirimliFiyatTL) / normalFiyatTL) * 100)
              : null

            return (
              <StaggerItem key={product.id} className="flex flex-col h-full">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden group hover:shadow-lg hover:border-brand-red/30 transition-all flex flex-col h-full relative">
                  
                  {/* İndirim Rozeti */}
                  {indirimOrani && indirimOrani > 0 && (
                    <div className="absolute top-2.5 left-2.5 z-10 bg-brand-red text-white text-[10px] font-display font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                      <Percent size={10} strokeWidth={3} />
                      %{indirimOrani} İndirim
                    </div>
                  )}

                  {/* Ürün Görseli */}
                  <Link 
                    href={`/urun/${product.slug || product.id}`} 
                    prefetch={true} 
                    className="block relative aspect-square bg-slate-50 p-4 overflow-hidden"
                  >
                    {product.fotograflar && product.fotograflar.length > 0 ? (
                      <Image 
                        src={product.fotograflar[0]} 
                        alt={product.ad} 
                        fill 
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                        className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Flame size={28} />
                      </div>
                    )}
                  </Link>

                  {/* Ürün Bilgileri */}
                  <div className="p-3.5 flex flex-col flex-1 justify-between bg-white">
                    <div>
                      {product.marka && (
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate mb-1">
                          {product.marka}
                        </span>
                      )}
                      <Link 
                        href={`/urun/${product.slug || product.id}`}
                        className="font-display font-bold text-xs sm:text-sm text-slate-800 group-hover:text-brand-red transition-colors line-clamp-2 leading-snug"
                        title={product.ad}
                      >
                        {product.ad}
                      </Link>
                    </div>

                    {/* Fiyat Alanı - Kesinlikle TL */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col">
                      {indirimliFiyatTL && normalFiyatTL > indirimliFiyatTL && (
                        <span className="text-[11px] text-slate-400 line-through font-body leading-none mb-1">
                          {formatFiyat(normalFiyatTL, 'TRY')}
                        </span>
                      )}
                      <span className="font-display font-black text-brand-red text-sm sm:text-base leading-none">
                        {gecerliFiyatTL > 0 ? formatFiyat(gecerliFiyatTL, 'TRY') : 'Fiyat Sorun'}
                      </span>
                    </div>
                  </div>

                </div>
              </StaggerItem>
            )
          })}
        </StaggerContainer>

      </div>
    </section>
  )
}
