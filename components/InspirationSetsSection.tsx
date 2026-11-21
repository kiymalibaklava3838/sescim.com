'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Sparkles,
  ArrowRight,
  ShoppingCart,
  Check,
  X,
  Package,
  SlidersHorizontal,
  ExternalLink,
  CheckCircle2,
  Layers,
} from 'lucide-react'
import { InspirationSet, InspirationSetProduct } from '@/lib/ilham-setleri'
import SafeProductImage from './SafeProductImage'
import { dovizToTL, formatFiyat, DEFAULT_KUR, type KurData } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'
import { addManyToCart } from '@/lib/cart'
import { resolveStock } from '@/lib/product-stock'

interface Props {
  sets: InspirationSet[]
}

export default function InspirationSetsSection({ sets }: Props) {
  const [kur, setKur] = useState<KurData>(DEFAULT_KUR)
  const [activeSet, setActiveSet] = useState<InspirationSet | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [addedSetId, setAddedSetId] = useState<string | null>(null)
  const [modalAdded, setModalAdded] = useState(false)

  useEffect(() => {
    getKurClient().then(setKur).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeSet) {
      document.body.style.overflow = 'hidden'
      const orderableIds = (activeSet.products || [])
        .filter((p) => {
          if (p.fiyat_sorunuz) return false
          const st = resolveStock({
            stok_durumu: p.stok_durumu,
            stok_adedi: p.stok_adedi,
            kritik_stok: p.kritik_stok,
            sescim_stok: p.sescim_stok,
            sescim_stok_durumu: p.sescim_stok_durumu,
          })
          return st.canOrder && !st.isTukendi
        })
        .map((p) => p.id)
      setSelectedProductIds(orderableIds)
      setModalAdded(false)
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [activeSet])

  if (!sets || sets.length === 0) return null

  const getProductPricing = (p: InspirationSetProduct) => {
    if (p.fiyat_sorunuz) {
      return { baseTL: 0, discountTL: null, effectiveTL: 0, hasDiscount: false, pb: 'TRY', indirimPB: 'TRY', rawBase: 0, rawDiscount: null }
    }
    const pb = p.para_birimi || 'TRY'
    const indirimPB = p.sescim_indirimli_fiyat_pb || pb
    const rawBase = Number(p.sescim_fiyat ?? p.fiyat ?? 0)
    const baseTL = rawBase > 0 ? dovizToTL(rawBase, pb, kur) : 0

    const rawDiscount = p.sescim_indirimli_fiyat ?? p.indirimli_fiyat ?? null
    const discountTL =
      rawDiscount !== null && rawDiscount !== undefined && Number(rawDiscount) > 0
        ? dovizToTL(Number(rawDiscount), indirimPB, kur)
        : null

    const hasDiscount = discountTL !== null && discountTL > 0 && baseTL > 0 && discountTL < baseTL
    const effectiveTL = hasDiscount && discountTL ? discountTL : baseTL

    return { baseTL, discountTL, effectiveTL, hasDiscount, pb, indirimPB, rawBase, rawDiscount }
  }

  const handleQuickAddSet = (set: InspirationSet, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const prods = set.products || []
    const itemsToAdd = prods
      .filter((p) => {
        if (p.fiyat_sorunuz) return false
        const st = resolveStock({
          stok_durumu: p.stok_durumu,
          stok_adedi: p.stok_adedi,
          kritik_stok: p.kritik_stok,
          sescim_stok: p.sescim_stok,
          sescim_stok_durumu: p.sescim_stok_durumu,
        })
        const { effectiveTL } = getProductPricing(p)
        return st.canOrder && !st.isTukendi && effectiveTL > 0
      })
      .map((p) => {
        const { baseTL, discountTL, hasDiscount, pb, indirimPB, rawBase, rawDiscount } = getProductPricing(p)
        return {
          id: p.id,
          ad: p.ad,
          kategori: p.kategori,
          fotograf: p.fotograflar?.[0] || '/logo.png',
          fiyat: baseTL,
          fiyat_doviz: rawBase,
          para_birimi: pb,
          indirimli_fiyat: hasDiscount ? discountTL : null,
          indirimli_fiyat_doviz: hasDiscount && rawDiscount ? Number(rawDiscount) : null,
          indirimli_fiyat_pb: hasDiscount ? indirimPB : null,
          adet: 1,
          marka: p.marka || undefined,
        }
      })

    if (itemsToAdd.length === 0) return
    addManyToCart(itemsToAdd)
    setAddedSetId(set.id)
    setTimeout(() => setAddedSetId(null), 2500)
  }

  const handleModalAddSelected = () => {
    if (!activeSet || !activeSet.products) return
    const selectedProds = activeSet.products.filter((p) => selectedProductIds.includes(p.id))
    const itemsToAdd = selectedProds
      .map((p) => {
        const { baseTL, discountTL, hasDiscount, pb, indirimPB, rawBase, rawDiscount } = getProductPricing(p)
        return {
          id: p.id,
          ad: p.ad,
          kategori: p.kategori,
          fotograf: p.fotograflar?.[0] || '/logo.png',
          fiyat: baseTL,
          fiyat_doviz: rawBase,
          para_birimi: pb,
          indirimli_fiyat: hasDiscount ? discountTL : null,
          indirimli_fiyat_doviz: hasDiscount && rawDiscount ? Number(rawDiscount) : null,
          indirimli_fiyat_pb: hasDiscount ? indirimPB : null,
          adet: 1,
          marka: p.marka || undefined,
        }
      })
      .filter((item) => item.fiyat > 0)

    if (itemsToAdd.length === 0) return
    addManyToCart(itemsToAdd)
    setModalAdded(true)
    setTimeout(() => setModalAdded(false), 2500)
  }

  const toggleProductInModal = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <section className="mb-14">
      {/* BAŞLIK VE AÇIKLAMA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-red text-xs font-display font-black uppercase tracking-[0.25em] mb-1.5">
            <Sparkles size={14} className="text-brand-red" />
            <span>Hazır Çözüm Paketleri</span>
          </div>
          <h2 className="font-display font-black text-2xl sm:text-3xl uppercase text-slate-900 tracking-tight">
            İlham Veren Setler
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Tek tek ürün aramak yerine ihtiyacınıza göre uzmanlarca eşleştirilmiş eksiksiz ses, kayıt ve sahne setlerini inceleyin, dilediğiniz parçaları seçip tek tıkla sepetinize ekleyin.
          </p>
        </div>

        <div className="text-[11px] font-display font-semibold uppercase tracking-wider text-slate-400 hidden sm:flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/80">
          <Layers size={13} className="text-brand-red" />
          <span>{sets.length} Uzman Kombini</span>
        </div>
      </div>

      {/* KARTLAR: MOBİLDE YATAY SNAP SCROLL, DESKTOPTA 3 SÜTUNLU GRID */}
      <div className="flex overflow-x-auto pb-4 gap-5 snap-x no-scrollbar -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
        {sets.map((set) => {
          const components = set.alt_yazi
            ? set.alt_yazi.split('+').map((c) => c.trim()).filter(Boolean)
            : []

          const setProducts = set.products || []
          const hasProducts = setProducts.length > 0

          let totalEffectiveTL = 0
          let totalBaseTL = 0
          for (const p of setProducts) {
            const { baseTL, effectiveTL } = getProductPricing(p)
            totalBaseTL += baseTL
            totalEffectiveTL += effectiveTL
          }

          const hasSetSaving = totalBaseTL > totalEffectiveTL && totalEffectiveTL > 0
          const isQuickAdded = addedSetId === set.id

          return (
            <div
              key={set.id}
              onClick={() => {
                if (hasProducts) setActiveSet(set)
              }}
              className={`snap-start shrink-0 w-[300px] sm:w-[330px] md:w-auto bg-slate-900 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group flex flex-col justify-between border border-slate-800 hover:border-brand-red/50 relative ${
                hasProducts ? 'cursor-pointer' : ''
              }`}
            >
              {/* Görsel Katmanı */}
              <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-950">
                {set.resim_url && (
                  <Image
                    src={set.resim_url}
                    alt={set.baslik}
                    fill
                    sizes="(max-width: 768px) 320px, 33vw"
                    unoptimized={true}
                    className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-75 group-hover:opacity-90"
                  />
                )}
                {/* Gradient Karartma */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

                {/* Üst Rozetler */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                  <span className="bg-brand-red text-white text-[9px] font-display font-black uppercase px-2.5 py-1 rounded-md tracking-wider shadow-xs">
                    {set.rozet || 'HAZIR SET'}
                  </span>
                  {hasProducts && (
                    <span className="bg-black/60 backdrop-blur-md text-amber-300 border border-amber-400/30 text-[10px] font-display font-bold uppercase px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1">
                      <Package size={11} />
                      {setProducts.length} Ürünlük Set
                    </span>
                  )}
                </div>

                {/* Başlık ve Bileşen Etiketleri */}
                <div className="absolute bottom-3 left-3.5 right-3.5">
                  <h3 className="font-display font-black text-lg sm:text-xl uppercase text-white tracking-wide leading-tight drop-shadow-sm group-hover:text-amber-300 transition-colors">
                    {set.baslik}
                  </h3>
                  {components.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {components.map((comp, idx) => (
                        <span
                          key={idx}
                          className="bg-white/10 backdrop-blur-xs text-slate-200 text-[10px] font-medium px-2 py-0.5 rounded border border-white/10 whitespace-nowrap"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Orta Katman: Set İçindeki Gerçek Ürünler Şeridi */}
              <div className="p-4 bg-slate-900 flex-1 flex flex-col justify-between space-y-4">
                {hasProducts ? (
                  <div className="space-y-2">
                    <div className="text-[10px] font-display font-bold uppercase tracking-widest text-slate-400 flex items-center justify-between">
                      <span>Set İçeriği</span>
                      <span className="text-amber-400/90">Özelleştirilebilir</span>
                    </div>
                    <div className="space-y-1.5">
                      {setProducts.slice(0, 3).map((prod) => {
                        const { effectiveTL } = getProductPricing(prod)
                        return (
                          <div
                            key={prod.id}
                            className="flex items-center gap-2.5 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-1.5 pr-2.5 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-lg bg-white p-1 shrink-0 relative overflow-hidden">
                              <SafeProductImage
                                src={prod.fotograflar?.[0]}
                                alt={prod.ad}
                                fill
                                sizes="36px"
                                className="object-contain p-0.5"
                                placeholderIconSize={14}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-semibold text-slate-200 truncate">
                                {prod.ad}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {prod.marka || prod.kategori}
                              </div>
                            </div>
                            {effectiveTL > 0 && (
                              <div className="text-[11px] font-display font-bold text-amber-300 shrink-0">
                                {formatFiyat(effectiveTL, 'TRY')}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {setProducts.length > 3 && (
                        <div className="text-[11px] text-center text-slate-400 font-medium pt-0.5">
                          + {setProducts.length - 3} tamamlayıcı ekipman daha
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {set.aciklama || 'İhtiyacınıza uygun profesyonel ses ve stüdyo ekipmanı kombinasyonu.'}
                  </p>
                )}

                {/* Alt Fiyat & Aksiyon Barı */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  {hasProducts && totalEffectiveTL > 0 && (
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-400">
                        Set Toplamı:
                      </span>
                      <div className="flex items-baseline gap-2">
                        {hasSetSaving && (
                          <span className="text-xs text-slate-500 line-through font-medium">
                            {formatFiyat(totalBaseTL, 'TRY')}
                          </span>
                        )}
                        <span className="text-base sm:text-lg font-display font-black text-white">
                          {formatFiyat(totalEffectiveTL, 'TRY')}
                        </span>
                      </div>
                    </div>
                  )}

                  {hasProducts ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveSet(set)
                        }}
                        className="flex-1 py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-brand-red text-white text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 group-hover:bg-brand-red shadow-xs cursor-pointer"
                      >
                        <SlidersHorizontal size={13} />
                        <span>Seti İncele & Seç</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleQuickAddSet(set, e)}
                        title="Tüm Seti Tek Tıkla Sepete Ekle"
                        className={`py-2.5 px-3 rounded-xl text-xs font-display font-bold uppercase transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                          isQuickAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isQuickAdded ? <Check size={15} /> : <ShoppingCart size={15} />}
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={set.link || '/urunler'}
                      className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-brand-red text-white text-xs font-display font-bold uppercase tracking-wider flex items-center justify-between transition-all duration-300 group-hover:bg-brand-red shadow-xs"
                    >
                      <span>Seti Gör</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* İNTERAKTİF SET DETAY & ÖZELLEŞTİRME MODALI */}
      {activeSet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveSet(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Üst Kapak */}
            <div className="relative h-40 sm:h-48 w-full bg-slate-900 shrink-0 overflow-hidden">
              {activeSet.resim_url && (
                <Image
                  src={activeSet.resim_url}
                  alt={activeSet.baslik}
                  fill
                  sizes="672px"
                  unoptimized={true}
                  className="object-cover opacity-65"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />

              <button
                type="button"
                onClick={() => setActiveSet(null)}
                className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/50 hover:bg-brand-red text-white flex items-center justify-center transition-colors z-10 cursor-pointer"
                aria-label="Kapat"
              >
                <X size={18} />
              </button>

              <div className="absolute bottom-4 left-5 right-5 text-white">
                <div className="inline-flex items-center gap-1.5 bg-brand-red text-white text-[10px] font-display font-black uppercase px-2.5 py-0.5 rounded tracking-wider mb-2">
                  <Sparkles size={11} />
                  <span>{activeSet.rozet || 'HAZIR SET'}</span>
                </div>
                <h3 className="font-display font-black text-xl sm:text-2xl uppercase tracking-wide">
                  {activeSet.baslik}
                </h3>
                {activeSet.aciklama && (
                  <p className="text-xs text-slate-200 mt-1 line-clamp-2 max-w-xl">
                    {activeSet.aciklama}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Orta: Özelleştirilebilir Ürün Listesi */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                <span className="font-display font-bold uppercase tracking-wider text-slate-700">
                  Set İçindeki Ekipmanlar ({(activeSet.products || []).length} Ürün)
                </span>
                <span>İstemediğiniz ürünün işaretini kaldırabilirsiniz</span>
              </div>

              {(activeSet.products || []).map((prod) => {
                const st = resolveStock({
                  stok_durumu: prod.stok_durumu,
                  stok_adedi: prod.stok_adedi,
                  kritik_stok: prod.kritik_stok,
                  sescim_stok: prod.sescim_stok,
                  sescim_stok_durumu: prod.sescim_stok_durumu,
                })
                const { baseTL, effectiveTL, hasDiscount } = getProductPricing(prod)
                const canSelect = st.canOrder && !st.isTukendi && !prod.fiyat_sorunuz && effectiveTL > 0
                const isSelected = selectedProductIds.includes(prod.id)

                return (
                  <div
                    key={prod.id}
                    onClick={() => {
                      if (canSelect) toggleProductInModal(prod.id)
                    }}
                    className={`flex items-center gap-3.5 p-3 rounded-xl border bg-white transition-all ${
                      canSelect ? 'cursor-pointer' : 'opacity-60'
                    } ${
                      isSelected
                        ? 'border-brand-red/60 ring-1 ring-brand-red/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="shrink-0">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-brand-red border-brand-red text-white'
                            : 'bg-slate-100 border-slate-300 text-transparent'
                        }`}
                      >
                        <Check size={13} strokeWidth={3} />
                      </div>
                    </div>

                    {/* Ürün Görseli */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-slate-50 border border-slate-100 p-1.5 shrink-0 relative overflow-hidden">
                      <SafeProductImage
                        src={prod.fotograflar?.[0]}
                        alt={prod.ad}
                        fill
                        sizes="64px"
                        className="object-contain p-1"
                        placeholderIconSize={20}
                      />
                    </div>

                    {/* Ürün Bilgisi */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {prod.marka && (
                          <span className="text-[10px] font-display font-bold uppercase tracking-wider text-brand-red bg-red-50 px-1.5 py-0.5 rounded">
                            {prod.marka}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium">
                          {prod.kategori}
                        </span>
                      </div>

                      <Link
                        href={`/urun/${prod.slug || prod.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-display font-bold text-xs sm:text-sm text-slate-900 hover:text-brand-red transition-colors line-clamp-2 mt-0.5 inline-flex items-center gap-1"
                      >
                        <span>{prod.ad}</span>
                        <ExternalLink size={11} className="text-slate-400 shrink-0" />
                      </Link>

                      <div className="mt-1 flex items-center gap-2">
                        {st.isTukendi ? (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                            Tükendi
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 size={10} /> Stokta Hazır
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fiyat */}
                    <div className="text-right shrink-0">
                      {prod.fiyat_sorunuz ? (
                        <span className="text-xs font-display font-bold text-amber-700">
                          Fiyat Sorunuz
                        </span>
                      ) : effectiveTL > 0 ? (
                        <div>
                          {hasDiscount && (
                            <div className="text-[11px] text-slate-400 line-through">
                              {formatFiyat(baseTL, 'TRY')}
                            </div>
                          )}
                          <div className="font-display font-black text-sm sm:text-base text-slate-900">
                            {formatFiyat(effectiveTL, 'TRY')}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Modal Alt: Toplam Fiyat ve Sepete Ekle */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 shrink-0 space-y-3">
              {(() => {
                const selectedProds = (activeSet.products || []).filter((p) =>
                  selectedProductIds.includes(p.id)
                )
                let selEffectiveTL = 0
                let selBaseTL = 0
                for (const p of selectedProds) {
                  const { baseTL, effectiveTL } = getProductPricing(p)
                  selBaseTL += baseTL
                  selEffectiveTL += effectiveTL
                }
                const hasSaving = selBaseTL > selEffectiveTL && selEffectiveTL > 0

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-500">
                          Seçili Ekipman ({selectedProds.length} Ürün)
                        </div>
                        <div className="text-[11px] text-slate-400">
                          KDV Dahil Toplam Set Tutarı
                        </div>
                      </div>
                      <div className="text-right">
                        {hasSaving && (
                          <div className="text-xs text-slate-400 line-through">
                            {formatFiyat(selBaseTL, 'TRY')}
                          </div>
                        )}
                        <div className="font-display font-black text-xl sm:text-2xl text-brand-red">
                          {formatFiyat(selEffectiveTL, 'TRY')}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <button
                        type="button"
                        disabled={selectedProds.length === 0}
                        onClick={handleModalAddSelected}
                        className={`flex-1 py-3.5 px-5 rounded-xl font-display font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          modalAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-brand-red hover:bg-red-700 text-white'
                        }`}
                      >
                        {modalAdded ? (
                          <>
                            <Check size={17} />
                            <span>Seçili Ürünler Sepete Eklendi!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={17} />
                            <span>
                              Seçili Ürünleri Sepete Ekle ({selectedProds.length} Ürün)
                            </span>
                          </>
                        )}
                      </button>

                      {activeSet.link && (
                        <Link
                          href={activeSet.link}
                          onClick={() => setActiveSet(null)}
                          className="py-3.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shrink-0"
                        >
                          <span>Kategoriyi Gör</span>
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
