'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Plus, Check, ShoppingBag, Sparkles, Tag } from 'lucide-react'
import { addManyToCart } from '@/lib/cart'
import { dovizToTL, KurData } from '@/lib/kur'

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
}

interface Props {
  mainProduct: BundleProduct
  accessories: BundleProduct[]
  kur: KurData
}

export default function SmartBundleBuilder({ mainProduct, accessories, kur }: Props) {
  const bundleAccessories = accessories.slice(0, 2)
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
  const rawTotal = mainTL + selectedAccessories.reduce((sum, a) => sum + getProductTLPrice(a), 0)

  const hasBundleDiscount = selectedAccessories.length > 0
  const discountRate = hasBundleDiscount ? 0.10 : 0.0
  const discountAmount = Math.round(rawTotal * discountRate)
  const discountedTotal = rawTotal - discountAmount

  const toggleAccessory = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleAddBundleToCart = () => {
    setAdding(true)
    const multiplier = hasBundleDiscount ? 0.90 : 1.0

    const itemsToAdd = [
      {
        id: mainProduct.id,
        ad: mainProduct.ad,
        kategori: mainProduct.kategori,
        fotograf: mainImage,
        fiyat: Math.round(mainTL * multiplier),
        fiyat_doviz: mainProduct.fiyat,
        para_birimi: 'TRY',
        indirimli_fiyat: Math.round(mainTL * multiplier),
        adet: 1,
      },
      ...selectedAccessories.map((acc) => {
        const accTL = getProductTLPrice(acc)
        return {
          id: acc.id,
          ad: acc.ad,
          kategori: acc.kategori,
          fotograf: acc.fotograflar?.[0] || '/logo.png',
          fiyat: Math.round(accTL * multiplier),
          fiyat_doviz: acc.fiyat,
          para_birimi: 'TRY',
          indirimli_fiyat: Math.round(accTL * multiplier),
          adet: 1,
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/80 rounded-full text-amber-800 text-xs font-semibold shadow-xs">
          <Sparkles size={13} className="text-amber-600 fill-amber-500" />
          <span>Paket Alımında Anında %10 Ekstra İndirim</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm w-full min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center w-full min-w-0">
          
          <div className="lg:col-span-8 w-full min-w-0 flex flex-nowrap items-center gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-hide">
            
            <div className="flex-1 min-w-[140px] max-w-[200px] border border-slate-200 rounded-xl p-3 bg-slate-50/70 flex flex-col justify-between relative group hover:border-slate-300 transition-colors">
              <div className="absolute top-2 left-2 z-10">
                <span className="bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">
                  Bu Ürün
                </span>
              </div>
              <div className="aspect-square relative mb-2 bg-white rounded-lg p-2 overflow-hidden">
                <Image
                  src={mainImage}
                  alt={mainProduct.ad}
                  fill
                  className="object-contain group-hover:scale-105 transition-transform"
                  sizes="(max-width: 768px) 140px, 180px"
                />
              </div>
              <div>
                <p className="font-display font-bold text-xs text-slate-800 line-clamp-2 leading-tight mb-1">
                  {mainProduct.ad}
                </p>
                <div className="font-display font-black text-xs text-brand-red">
                  {mainTL.toLocaleString('tr-TR')} ₺
                </div>
              </div>
            </div>

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
                      <Image
                        src={accImg}
                        alt={acc.ad}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform"
                        sizes="(max-width: 768px) 140px, 180px"
                      />
                    </div>
                    <div>
                      <Link
                        href={`/urun/${acc.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-display font-bold text-xs text-slate-800 line-clamp-2 leading-tight mb-1 hover:text-brand-red transition-colors"
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

          <div className="lg:col-span-4 bg-slate-50 border border-slate-200/90 rounded-xl p-5 flex flex-col justify-center">
            <div className="text-xs text-slate-500 font-medium mb-1">
              Seçilen Ürün Sayısı: <strong className="text-slate-800">{1 + selectedAccessories.length}</strong>
            </div>

            <div className="mb-4">
              {hasBundleDiscount ? (
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs text-slate-400 line-through">
                      {rawTotal.toLocaleString('tr-TR')} ₺
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                      <Tag size={10} />
                      %{Math.round(discountRate * 100)} Paket İndirimi
                    </span>
                  </div>
                  <div className="font-display font-black text-2xl md:text-3xl text-brand-red leading-none">
                    {discountedTotal.toLocaleString('tr-TR')} ₺
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                    Kazancınız: {discountAmount.toLocaleString('tr-TR')} ₺
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-display font-black text-2xl text-slate-900">
                    {rawTotal.toLocaleString('tr-TR')} ₺
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Aksesuar ekleyerek %10 indirim kazanın!
                  </div>
                </div>
              )}
            </div>

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
                  {hasBundleDiscount ? 'Paketi %10 İndirimle Al' : 'Seçilenleri Sepete Ekle'}
                </>
              )}
            </button>
            <div className="text-[10px] text-slate-400 text-center mt-2 font-medium">
              Tüm ürünler orijinal ambalajında ve distribütör garantilidir.
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
