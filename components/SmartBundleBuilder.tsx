'use client'

import { useState } from 'react'
import SafeProductImage from './SafeProductImage'
import Link from 'next/link'
import { Plus, Check, ShoppingBag, Sparkles } from 'lucide-react'
import { addManyToCart } from '@/lib/cart'
import { dovizToTL, KurData } from '@/lib/kur'
import { isQuoteOnlyProduct } from '@/lib/distributor-rules'

export interface BundleProduct {
  id: string
  slug: string
  ad: string
  kategori: string
  fotograflar?: string[]
  fiyat: number
  indirimli_fiyat?: number | null
  para_birimi?: string
  sescim_fiyat?: number
  sescim_indirimli_fiyat?: number | null
  marka?: string | null
  fiyat_sorunuz?: boolean | null
}

interface Props {
  mainProduct: BundleProduct
  accessories: BundleProduct[]
  kur: KurData
}

export default function SmartBundleBuilder({ mainProduct, accessories, kur }: Props) {
  // 1. Ana ürün distribütör engeli veya Fiyat Sorunuz kapsamındaysa bundle motoru kesinlikle gösterilemez
  const isMainQuoteOnly = isQuoteOnlyProduct({
    marka: mainProduct.marka,
    ad: mainProduct.ad,
    fiyat_sorunuz: mainProduct.fiyat_sorunuz,
  })

  // 2. Tamamlayıcı aksesuarlar arasından distribütör engelli olanları ayıkla
  const safeAccessories = (accessories || []).filter(
    (a) =>
      !isQuoteOnlyProduct({
        marka: a.marka,
        ad: a.ad,
        fiyat_sorunuz: a.fiyat_sorunuz,
      })
  )

  // En fazla 3 uyumlu tamamlayıcı ürün göster
  const bundleAccessories = safeAccessories.slice(0, 3)
  const [selectedIds, setSelectedIds] = useState<string[]>(
    bundleAccessories.map((a) => a.id)
  )
  const [added, setAdded] = useState(false)
  const [adding, setAdding] = useState(false)

  if (!bundleAccessories || bundleAccessories.length === 0) {
    return null
  }

  const getProductTLPrice = (p: BundleProduct) => {
    const rawPrice = p.sescim_indirimli_fiyat ?? p.sescim_fiyat ?? p.indirimli_fiyat ?? p.fiyat
    return dovizToTL(rawPrice, p.para_birimi || 'TRY', kur)
  }

  const mainTL = getProductTLPrice(mainProduct)
  const mainImage = mainProduct.fotograflar?.[0] || '/logo.png'

  const selectedAccessories = bundleAccessories.filter((a) => selectedIds.includes(a.id))
  const totalPrice = mainTL + selectedAccessories.reduce((sum, a) => sum + getProductTLPrice(a), 0)

  const toggleAccessory = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleAddBundleToCart = () => {
    setAdding(true)

    const itemsToAdd = [
      {
        id: mainProduct.id,
        ad: mainProduct.ad,
        kategori: mainProduct.kategori,
        fotograf: mainImage,
        fiyat: Math.round(mainTL),
        fiyat_doviz: mainProduct.fiyat,
        para_birimi: 'TRY',
        indirimli_fiyat: Math.round(mainTL),
        adet: 1,
        marka: mainProduct.marka || undefined,
        fiyat_sorunuz: mainProduct.fiyat_sorunuz || undefined,
      },
      ...selectedAccessories.map((acc) => {
        const accTL = getProductTLPrice(acc)
        return {
          id: acc.id,
          ad: acc.ad,
          kategori: acc.kategori,
          fotograf: acc.fotograflar?.[0] || '/logo.png',
          fiyat: Math.round(accTL),
          fiyat_doviz: acc.fiyat,
          para_birimi: 'TRY',
          indirimli_fiyat: Math.round(accTL),
          adet: 1,
          marka: acc.marka || undefined,
          fiyat_sorunuz: acc.fiyat_sorunuz || undefined,
        }
      }),
    ]

    addManyToCart(itemsToAdd)
    setAdding(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 3000)
  }

  return (
    <div className="mt-16 pt-12 border-t border-slate-200" id="birlikte-al">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-px bg-brand-red" />
          <h3 className="font-display font-black text-sm md:text-base tracking-[0.2em] uppercase text-slate-900 flex items-center gap-2">
            Sıkça Birlikte Alınanlar
          </h3>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200/90 rounded-full text-slate-700 text-xs font-semibold shadow-xs">
          <Sparkles size={13} className="text-brand-red fill-brand-red" />
          <span>Uyumlu & Tamamlayıcı Ekipmanlar</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm w-full min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center w-full min-w-0">
          
          <div className="lg:col-span-8 w-full min-w-0 flex flex-nowrap items-center gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-hide">
            
            {/* Ana Ürün */}
            <div className="flex-1 min-w-[140px] max-w-[200px] border border-slate-200 rounded-xl p-3 bg-slate-50/70 flex flex-col justify-between relative group hover:border-slate-300 transition-colors">
              <div className="absolute top-2 left-2 z-10">
                <span className="bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">
                  Bu Ürün
                </span>
              </div>
              <div className="aspect-square relative mb-2 bg-white rounded-lg p-2 overflow-hidden">
                <SafeProductImage
                  src={mainImage}
                  alt={mainProduct.ad}
                  fill
                  className="object-contain group-hover:scale-105 transition-transform"
                  sizes="(max-width: 768px) 140px, 180px"
                  placeholderIconSize={24}
                />
              </div>
              <div>
                <p className="font-display font-bold text-xs text-slate-800 line-clamp-2 leading-tight mb-1" title={mainProduct.ad}>
                  {mainProduct.ad}
                </p>
                {isMainQuoteOnly ? (
                  <div className="font-display font-black text-xs text-amber-700 uppercase tracking-tight">
                    FİYAT SORUNUZ
                  </div>
                ) : (
                  <div className="font-display font-black text-xs text-brand-red">
                    {mainTL.toLocaleString('tr-TR')} ₺
                  </div>
                )}
              </div>
            </div>

            {/* Tamamlayıcı Aksesuarlar */}
            {bundleAccessories.map((acc) => {
              const accTL = getProductTLPrice(acc)
              const isChecked = selectedIds.includes(acc.id)
              const accImg = acc.fotograflar?.[0] || '/logo.png'

              return (
                <div key={acc.id} className="contents">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                    <Plus size={14} />
                  </div>

                  <div
                    onClick={() => toggleAccessory(acc.id)}
                    className={`flex-1 min-w-[140px] max-w-[200px] border rounded-xl p-3 cursor-pointer select-none transition-all flex flex-col justify-between relative group ${
                      isChecked
                        ? 'border-brand-red/40 bg-red-50/20 shadow-xs'
                        : 'border-slate-200 bg-white opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="absolute top-2 right-2 z-10">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-brand-red focus:ring-brand-red cursor-pointer accent-brand-red"
                      />
                    </div>
                    <div className="aspect-square relative mb-2 bg-white rounded-lg p-2 overflow-hidden border border-slate-100">
                      <SafeProductImage
                        src={accImg}
                        alt={acc.ad}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform"
                        sizes="(max-width: 768px) 140px, 180px"
                        placeholderIconSize={24}
                      />
                    </div>
                    <div>
                      <Link
                        href={`/urun/${acc.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-display font-bold text-xs text-slate-800 line-clamp-2 leading-tight mb-1 hover:text-brand-red transition-colors"
                        title={acc.ad}
                      >
                        {acc.ad}
                      </Link>
                      <div className="font-display font-black text-xs text-slate-900">
                        {accTL.toLocaleString('tr-TR')} ₺
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Fiyat ve Sepete Ekleme Alanı */}
          <div className="lg:col-span-4 bg-slate-50 border border-slate-200/90 rounded-xl p-5 flex flex-col justify-center">
            <div className="text-xs text-slate-500 font-medium mb-1">
              Seçilen Ürün Sayısı: <strong className="text-slate-800">{1 + selectedAccessories.length}</strong>
            </div>

            {isMainQuoteOnly ? (
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-1">
                  Distribütör Satış Kuralı
                </div>
                <div className="font-display font-black text-xl sm:text-2xl text-slate-900 leading-tight uppercase">
                  FİYAT SORUNUZ
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  Seçtiğiniz paket için avantajlı distribütör teklifi alın
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Toplam Tutar
                </div>
                <div className="font-display font-black text-2xl md:text-3xl text-slate-900 leading-none">
                  {totalPrice.toLocaleString('tr-TR')} ₺
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  KDV Dahil • Hızlı & Güvenli Teslimat
                </div>
              </div>
            )}

            {isMainQuoteOnly ? (
              <a
                href={`https://wa.me/908503053870?text=${encodeURIComponent(
                  `Merhaba, sescim.com'da "${mainProduct.ad}" ve seçtiğim tamamlayıcı aksesuarlar için özel paket fiyat teklifi almak istiyorum.\nÜrün: https://www.sescim.com/urun/${mainProduct.slug}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm active:scale-[0.98]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>Paket İçin Fiyat Teklifi Al</span>
              </a>
            ) : (
              <button
                onClick={handleAddBundleToCart}
                disabled={adding}
                className={`w-full py-3 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm ${
                  added
                    ? 'bg-emerald-600 text-white'
                    : 'bg-brand-red hover:bg-brand-red-dark text-white active:scale-[0.98]'
                }`}
              >
                {added ? (
                  <>
                    <Check size={16} />
                    Paket Sepete Eklendi!
                  </>
                ) : (
                  <>
                    <ShoppingBag size={16} />
                    Birlikte Sepete Ekle
                  </>
                )}
              </button>
            )}
            <div className="text-[10px] text-slate-400 text-center mt-2 font-medium">
              Tüm ürünler orijinal ambalajında ve distribütör garantilidir.
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
