'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Sparkles, Star, Flame, History, Package, ChevronRight, 
  ArrowRight, ShieldCheck, Tag, Zap, Music, Mic, Headphones, Speaker, Lightbulb, Truck
} from 'lucide-react'
import InspirationSetsSection from './InspirationSetsSection'
import { InspirationSet } from '@/lib/ilham-setleri'
import { formatFiyat, dovizToTL, DEFAULT_KUR, type KurData } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'
import { getRecentlyViewed, ViewedProductItem } from '@/lib/personalized-discover'
import { NEW_KATEGORI_HIYERARSI } from '@/lib/categories'
import { isQuoteOnlyProduct } from '@/lib/distributor-rules'

const categoryIcons: Record<string, any> = {
  'Ses Sistemleri': Speaker,
  'Işık Sistemleri': Lightbulb,
  'Görüntü Sistemleri': Zap,
  'Kulaklık & Monitör': Headphones,
  'DJ Ekipmanları': Music,
  'Stüdyo Ekipmanları': Mic,
  'Sahne ve Truss': Package,
  'Kablo, Stand ve Aksesuar': Tag,
  'Taşıma ve Altyapı': Truck,
}

interface Props {
  inspirationSets: InspirationSet[]
  proTercihProducts: any[]
  newArrivals: any[]
  bestSellers: any[]
  forYouProducts: any[]
  markalar?: string[]
}

export default function DiscoverCuratedSections({
  inspirationSets,
  proTercihProducts,
  newArrivals,
  bestSellers,
  forYouProducts,
  markalar = []
}: Props) {
  const [recentlyViewed, setRecentlyViewed] = useState<ViewedProductItem[]>([])
  const [kur, setKur] = useState<KurData>(DEFAULT_KUR)

  useEffect(() => {
    getKurClient().then(setKur).catch(() => {})
  }, [])

  useEffect(() => {
    const update = () => setRecentlyViewed(getRecentlyViewed())
    update()
    window.addEventListener('sescim-personalization-updated', update)
    return () => window.removeEventListener('sescim-personalization-updated', update)
  }, [])

  // Yardımcı Mini Ürün Kartı (Yatay Scroll vitrini için - Her zaman TL olarak hesaplanır)
  const renderProductCard = (product: any, badge?: { text: string; color: string }) => {
    const img = product.fotograflar?.[0] || null
    const pb = product.para_birimi || 'TRY'
    const rawPrice = product.sescim_indirimli_fiyat || product.sescim_fiyat || product.fiyat
    const rawOldPrice = product.sescim_indirimli_fiyat ? (product.sescim_fiyat || product.fiyat) : null

    const priceTL = rawPrice ? dovizToTL(rawPrice, pb, kur) : null
    const oldPriceTL = rawOldPrice ? dovizToTL(rawOldPrice, pb, kur) : null
    const isQuoteOnly = isQuoteOnlyProduct({ marka: product.marka, fiyat_sorunuz: product.fiyat_sorunuz })

    // Stok Mikro Bilgisi
    let stockInfo = { text: 'Stokta', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
    if (product.kritik_stok && product.stok_adedi > 0 && product.stok_adedi <= 3) {
      stockInfo = { text: `Son ${product.stok_adedi} Adet`, color: 'text-amber-700 bg-amber-50 border-amber-200' }
    } else if (product.stok_durumu === 'siparise_gore') {
      stockInfo = { text: 'Siparişe Göre', color: 'text-blue-700 bg-blue-50 border-blue-200' }
    }

    return (
      <Link
        key={product.id}
        href={`/urun/${product.slug || product.id}`}
        className="snap-start shrink-0 w-[180px] sm:w-[220px] bg-white border border-slate-200 hover:border-brand-red/40 rounded-2xl p-3 flex flex-col justify-between transition-all duration-300 hover:shadow-md group relative"
      >
        {/* Özel Rozet (YENİ / ÇOK SATAN vb.) */}
        {badge && (
          <span className={`absolute top-2.5 left-2.5 z-10 text-[9px] font-display font-black uppercase px-2 py-0.5 rounded shadow-xs ${badge.color}`}>
            {badge.text}
          </span>
        )}

        {/* Görsel */}
        <div className="w-full aspect-square relative bg-slate-50 rounded-xl mb-3 overflow-hidden flex items-center justify-center p-2">
          {img ? (
            <Image
              src={img}
              alt={product.ad}
              fill
              sizes="(max-width: 640px) 180px, 220px"
              className="object-contain p-2 group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <Package size={28} className="text-slate-300" />
          )}
        </div>

        {/* İçerik */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-display font-bold uppercase text-brand-red/70 truncate mb-0.5">
              {product.marka || product.kategori}
            </div>
            <h4 className="font-display font-bold text-xs uppercase text-slate-800 line-clamp-2 leading-tight group-hover:text-brand-red transition-colors mb-2">
              {product.ad}
            </h4>
          </div>

          {/* Fiyat ve Sade Mikro Stok Bilgisi */}
          <div className="pt-2 border-t border-slate-100 flex items-end justify-between gap-1">
            <div className="min-w-0">
              {isQuoteOnly ? (
                <div className="font-display font-bold text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase leading-tight">
                  Fiyat Sorunuz
                </div>
              ) : (
                <>
                  {oldPriceTL && (
                    <div className="text-[10px] text-slate-400 line-through leading-none mb-0.5 font-mono">
                      {formatFiyat(oldPriceTL, 'TRY')}
                    </div>
                  )}
                  <div className="font-display font-black text-sm sm:text-base text-slate-900 leading-tight">
                    {priceTL ? formatFiyat(priceTL, 'TRY') : 'Fiyat Yok'}
                  </div>
                </>
              )}
            </div>

            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${stockInfo.color} whitespace-nowrap shrink-0`}>
              {stockInfo.text}
            </span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-16 mt-6">
      {/* 1. İLHAM VEREN SETLER */}
      <InspirationSetsSection sets={inspirationSets} />

      {/* 2. SENİN İÇİN SEÇTİKLERİMİZ */}
      {forYouProducts && forYouProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5 text-brand-red text-xs font-display font-black uppercase tracking-wider mb-1">
                <Sparkles size={13} />
                <span>Kişisel Keşif</span>
              </div>
              <h3 className="font-display font-black text-xl sm:text-2xl uppercase text-slate-900 tracking-tight">
                Senin İçin Seçtiklerimiz
              </h3>
            </div>
            <Link href="/urunler/studyo-ekipmanlari" className="text-xs font-display font-bold uppercase tracking-wider text-slate-500 hover:text-brand-red flex items-center gap-1">
              <span>Tümü</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="flex overflow-x-auto pb-4 gap-3.5 snap-x no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {forYouProducts.map((p) => renderProductCard(p))}
          </div>
        </section>
      )}

      {/* 3. YENİ GELENLER */}
      {newArrivals && newArrivals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-display font-black uppercase tracking-wider text-blue-600 mb-1">
                Taze Ekipmanlar
              </div>
              <h3 className="font-display font-black text-xl sm:text-2xl uppercase text-slate-900 tracking-tight">
                Yeni Gelenler
              </h3>
            </div>
            <Link href="/urunler?sirala=yeni" className="text-xs font-display font-bold uppercase tracking-wider text-slate-500 hover:text-brand-red flex items-center gap-1">
              <span>Tümü</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="flex overflow-x-auto pb-4 gap-3.5 snap-x no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {newArrivals.map((p) => renderProductCard(p, { text: 'YENİ', color: 'bg-blue-600 text-white' }))}
          </div>
        </section>
      )}

      {/* 4. ÇOK SATANLAR */}
      {bestSellers && bestSellers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-1 text-brand-red text-xs font-display font-black uppercase tracking-wider mb-1">
                <Flame size={14} />
                <span>Popüler Tercihler</span>
              </div>
              <h3 className="font-display font-black text-xl sm:text-2xl uppercase text-slate-900 tracking-tight">
                🔥 Çok Satanlar
              </h3>
            </div>
            <Link href="/urunler?sirala=fiyat_azalan" className="text-xs font-display font-bold uppercase tracking-wider text-slate-500 hover:text-brand-red flex items-center gap-1">
              <span>Tümü</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="flex overflow-x-auto pb-4 gap-3.5 snap-x no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {bestSellers.map((p) => renderProductCard(p, { text: 'ÇOK SATAN', color: 'bg-brand-red text-white' }))}
          </div>
        </section>
      )}

      {/* 5. PROFESYONELLERİN TERCİHİ (Admin tarafından seçilenler) */}
      {proTercihProducts && proTercihProducts.length > 0 && (
        <section className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-slate-800">
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-display font-black uppercase tracking-wider mb-1">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <span>Teknik &amp; Uzman Seçimi</span>
              </div>
              <h3 className="font-display font-black text-xl sm:text-2xl uppercase text-white tracking-tight">
                ⭐ Profesyonellerin Tercihi
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Ses mühendisleri, prodüktörler ve canlı sahne profesyonelleri tarafından teknik performansı tescillenmiş ekipmanlar.
              </p>
            </div>
          </div>

          <div className="flex overflow-x-auto pb-2 gap-3.5 snap-x no-scrollbar -mx-2 px-2 relative z-10">
            {proTercihProducts.map((p) => renderProductCard(p, { text: 'PRO SEÇİM', color: 'bg-amber-500 text-slate-950 font-black' }))}
          </div>
        </section>
      )}

      {/* 6. MARKALARA GÖRE KEŞFET */}
      {markalar && markalar.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-black text-xl sm:text-2xl uppercase text-slate-900 tracking-tight">
              Markalara Göre Keşfet
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {markalar.slice(0, 20).map((marka) => (
              <Link
                key={marka}
                href={`/urunler?marka=${encodeURIComponent(marka)}`}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-brand-red hover:bg-red-50 text-slate-700 hover:text-brand-red text-xs font-display font-bold uppercase tracking-wider transition-all shadow-2xs"
              >
                {marka}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 7. KATEGORİLERE GÖRE KEŞFET (9 Ana Kategori Görsel Kartları) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-black text-xl sm:text-2xl uppercase text-slate-900 tracking-tight">
            Kategorilere Göre Keşfet
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
          {NEW_KATEGORI_HIYERARSI.map((kat) => {
            const Icon = categoryIcons[kat.name] || Package
            return (
              <Link
                key={kat.slug}
                href={`/urunler/${kat.slug}`}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-brand-red/40 hover:shadow-md transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-brand-red/10 text-slate-600 group-hover:text-brand-red flex items-center justify-center transition-colors">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-xs uppercase text-slate-800 group-hover:text-brand-red transition-colors leading-tight">
                      {kat.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">Kataloğu Gör</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-slate-300 group-hover:text-brand-red group-hover:translate-x-1 transition-all" />
              </Link>
            )
          })}
        </div>
      </section>

      {/* 8. SON İNCELEDİKLERİN · [ADET] (Sayaç Formatı) */}
      {recentlyViewed && recentlyViewed.length > 0 && (
        <section className="pt-8 border-t border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History size={16} className="text-slate-400" />
              <h3 className="font-display font-black text-xl sm:text-2xl uppercase text-slate-900 tracking-tight">
                Son İncelediklerin · <span className="text-brand-red">{recentlyViewed.length}</span>
              </h3>
            </div>
          </div>

          <div className="flex overflow-x-auto pb-4 gap-3 snap-x no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {recentlyViewed.map((item) => (
              <Link
                key={item.id}
                href={`/urun/${item.slug}`}
                className="snap-start shrink-0 w-36 sm:w-40 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-brand-red/40 hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="w-full aspect-square relative bg-slate-50 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="160px"
                      className="object-contain p-1.5 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Package size={24} className="text-slate-300" />
                  )}
                </div>
                <div className="text-[11px] font-medium text-slate-800 line-clamp-2 group-hover:text-brand-red leading-tight">
                  {item.name}
                </div>
                {item.price !== null && (
                  <div className="text-xs font-bold text-brand-red mt-1">
                    {formatFiyat(
                      item.currency && item.currency !== 'TRY'
                        ? dovizToTL(item.price, item.currency, kur)
                        : item.price,
                      'TRY'
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
