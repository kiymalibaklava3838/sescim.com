'use client'

import { useState, useEffect, useMemo } from 'react'
import SafeProductImage from './SafeProductImage'
import Link from 'next/link'
import { Sparkles, Plus, Check, ShieldCheck, Headphones, Mic, Volume2 } from 'lucide-react'
import { addToCart, type CartItem } from '@/lib/cart'

interface AccessoryItem {
  id: string
  slug?: string
  ad: string
  kategori: string
  fiyat: number
  fiyat_doviz?: number
  para_birimi?: string
  indirimli_fiyat: number | null
  indirimli_fiyat_doviz?: number | null
  indirimli_fiyat_pb?: string | null
  stok_adedi?: number | null
  marka?: string | null
  fotograf: string
}

interface Props {
  items: CartItem[]
  isDrawer?: boolean
  onAdded?: () => void
}

// İstemci içi önbellek — çekmece açılıp kapandığında tekrar API çağrısı yapmaz
const crossSellCache: Record<string, AccessoryItem[]> = {}

export default function CartCrossSell({ items, isDrawer = false, onAdded }: Props) {
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({})
  const [candidates, setCandidates] = useState<AccessoryItem[]>([])

  const cartText = useMemo(
    () => (items || []).map((i) => `${i.ad} ${i.kategori}`).join(' ').toLowerCase(),
    [items]
  )

  const { categoryKey, sectionTitle, SectionIcon } = useMemo(() => {
    if (
      cartText.includes('mikrofon') ||
      cartText.includes('shure') ||
      cartText.includes('rode') ||
      cartText.includes('vokal') ||
      cartText.includes('yaka')
    ) {
      return {
        categoryKey: 'microphone',
        sectionTitle: 'Mikrofonunuz İçin Önerilen Aksesuarlar',
        SectionIcon: Mic,
      }
    }
    if (
      cartText.includes('hoparl') ||
      cartText.includes('kabin') ||
      cartText.includes('speaker') ||
      cartText.includes('sub')
    ) {
      return {
        categoryKey: 'speaker',
        sectionTitle: 'Hoparlörünüz İçin Önerilen Aksesuarlar',
        SectionIcon: Volume2,
      }
    }
    if (cartText.includes('kulakl') || cartText.includes('headphone')) {
      return {
        categoryKey: 'headphone',
        sectionTitle: 'Kulaklığınız İçin Önerilen Aksesuarlar',
        SectionIcon: Headphones,
      }
    }
    return {
      categoryKey: 'general',
      sectionTitle: 'Tamamlayıcı Aksesuar Önerileri',
      SectionIcon: Sparkles,
    }
  }, [cartText])

  useEffect(() => {
    if (!items || items.length === 0) return

    if (crossSellCache[categoryKey]) {
      setCandidates(crossSellCache[categoryKey])
      return
    }

    let cancelled = false
    fetch(`/api/cross-sell?type=${encodeURIComponent(categoryKey)}`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (cancelled) return
        const list: AccessoryItem[] = Array.isArray(data?.items) ? data.items : []
        crossSellCache[categoryKey] = list
        setCandidates(list)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [categoryKey, items])

  if (!items || items.length === 0) return null

  const inCartIds = new Set(items.map((i) => i.id))
  const filtered = candidates.filter((acc) => !inCartIds.has(acc.id))

  if (filtered.length === 0) return null

  const displayItems = filtered.slice(0, isDrawer ? 2 : 3)

  const handleAdd = (acc: AccessoryItem) => {
    const res = addToCart({
      id: acc.id,
      slug: acc.slug,
      ad: acc.ad,
      kategori: acc.kategori,
      fotograf: acc.fotograf,
      fiyat: acc.fiyat,
      fiyat_doviz: acc.fiyat_doviz,
      para_birimi: acc.para_birimi || 'TRY',
      indirimli_fiyat: acc.indirimli_fiyat,
      indirimli_fiyat_doviz: acc.indirimli_fiyat_doviz,
      indirimli_fiyat_pb: acc.indirimli_fiyat_pb,
      stok_adedi: acc.stok_adedi,
      marka: acc.marka,
    })

    if (!res.ok) return

    setAddedMap((prev) => ({ ...prev, [acc.id]: true }))
    onAdded?.()
    setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [acc.id]: false }))
    }, 2000)
  }

  if (isDrawer) {
    return (
      <div className="bg-slate-50 border-t border-b border-slate-200 p-4 my-2">
        <div className="flex items-center gap-1.5 text-xs font-display font-black text-slate-800 uppercase tracking-wide mb-2.5">
          <SectionIcon size={14} className="text-brand-red shrink-0" />
          <span>{sectionTitle}</span>
        </div>
        <div className="space-y-2.5">
          {displayItems.map((acc) => {
            const isAdded = addedMap[acc.id]
            const displayPrice = Math.ceil(acc.indirimli_fiyat || acc.fiyat)
            return (
              <div
                key={acc.id}
                className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-xs hover:border-brand-red/30 transition-colors"
              >
                <Link
                  href={`/urun/${acc.slug || acc.id}`}
                  className="relative w-12 h-12 bg-slate-50 rounded-lg overflow-hidden shrink-0 border border-slate-100"
                >
                  <SafeProductImage
                    src={acc.fotograf}
                    alt={acc.ad}
                    fill
                    unoptimized={true}
                    className="object-contain p-1"
                    sizes="48px"
                    placeholderIconSize={20}
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/urun/${acc.slug || acc.id}`}
                    className="block text-xs font-display font-bold text-slate-800 hover:text-brand-red truncate transition-colors"
                  >
                    {acc.ad}
                  </Link>
                  <div className="text-xs font-black text-brand-red font-display mt-0.5">
                    ₺{displayPrice.toLocaleString('tr-TR')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(acc)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-display font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                    isAdded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check size={13} /> Eklendi
                    </>
                  ) : (
                    <>
                      <Plus size={13} /> Ekle
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-red-50/50 via-white to-orange-50/30 border-2 border-dashed border-brand-red/25 rounded-2xl p-5 sm:p-6 mt-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0">
            <SectionIcon size={18} />
          </div>
          <div>
            <h3 className="font-display font-black text-sm sm:text-base text-slate-900 uppercase tracking-tight">
              {sectionTitle}
            </h3>
            <p className="text-[11px] text-slate-500 font-body">
              Ekipmanınızın tam performans çalışması için birlikte en çok tercih edilen tamamlayıcı ürünler:
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[11px] font-display font-bold text-slate-400 uppercase tracking-widest">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Uyumlu Aksesuar</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {displayItems.map((acc) => {
          const isAdded = addedMap[acc.id]
          const displayPrice = Math.ceil(acc.indirimli_fiyat || acc.fiyat)
          return (
            <div
              key={acc.id}
              className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between hover:shadow-md hover:border-brand-red/40 transition-all group"
            >
              <div className="flex items-start gap-3 mb-3">
                <Link
                  href={`/urun/${acc.slug || acc.id}`}
                  className="relative w-16 h-16 bg-slate-50 rounded-lg overflow-hidden shrink-0 border border-slate-100"
                >
                  <SafeProductImage
                    src={acc.fotograf}
                    alt={acc.ad}
                    fill
                    unoptimized={true}
                    className="object-contain p-1 group-hover:scale-105 transition-transform"
                    sizes="64px"
                    placeholderIconSize={24}
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-[9px] font-display font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mb-1">
                    Tamamlayıcı
                  </span>
                  <Link
                    href={`/urun/${acc.slug || acc.id}`}
                    className="block text-xs font-display font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-brand-red transition-colors"
                  >
                    {acc.ad}
                  </Link>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                <div className="font-display font-black text-sm text-slate-900">
                  ₺{displayPrice.toLocaleString('tr-TR')}
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(acc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    isAdded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-brand-red text-white hover:bg-red-700 shadow-xs'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check size={14} /> Eklendi
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> Sepete Ekle
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
