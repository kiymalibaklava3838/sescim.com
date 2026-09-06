'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Sparkles, Plus, Check, ShieldCheck, Headphones, Mic, Volume2, Cable } from 'lucide-react'
import { addToCart, type CartItem } from '@/lib/cart'

interface AccessoryItem {
  id: string
  ad: string
  kategori: string
  fiyat: number
  fotograf: string
  aciklama?: string
}

interface Props {
  items: CartItem[]
  isDrawer?: boolean
  onAdded?: () => void
}

const ACCESSORIES_DB: Record<string, AccessoryItem[]> = {
  microphone: [
    {
      id: 'f72f1d4e-c42d-4640-8f05-99639f22d403',
      ad: 'Hercules HCMS-300B+ Mikrofon Standı',
      kategori: 'Kablo, Stand ve Aksesuar',
      fiyat: 1650,
      fotograf: 'https://csekzzsaeehakpdmzfam.supabase.co/storage/v1/object/public/urun-fotograflari/urunler/1785333078360_eaaqazwvveg.jpg',
      aciklama: 'Ağır döküm tabanlı, ayarlanabilir profesyonel bomlu stand'
    },
    {
      id: 'acc-xlr-3m',
      ad: 'Dengeli XLR Erkek - Dişi Mikrofon Kablosu (3 Metre)',
      kategori: 'Kablo, Stand ve Aksesuar',
      fiyat: 349,
      fotograf: 'https://csekzzsaeehakpdmzfam.supabase.co/storage/v1/object/public/urun-fotograflari/urunler/1778157024282_e0zx9bp73f8.jpg',
      aciklama: 'Oksijensiz bakır, parazit önleyici stüdyo sinyal kablosu'
    },
    {
      id: 'acc-pop-filter',
      ad: 'Çift Katmanlı Esnek Akustik Pop Filtre',
      kategori: 'Kablo, Stand ve Aksesuar',
      fiyat: 290,
      fotograf: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=400&auto=format&fit=crop',
      aciklama: 'Patlayıcı p/t seslerini engelleyen 360 derece esnek boyun'
    }
  ],
  speaker: [
    {
      id: 'e4b94ed2-5e9b-413a-9771-6ee6572d05ad',
      ad: 'FENİX SS005 TRİPOD HOPARLÖR STANDI',
      kategori: 'Kablo, Stand ve Aksesuar',
      fiyat: 2340,
      fotograf: 'https://csekzzsaeehakpdmzfam.supabase.co/storage/v1/object/public/urun-fotograflari/urunler/1778767759402_u1xladpuug.jpg',
      aciklama: '50 kg taşıma kapasiteli, güvenlik pimli alüminyum sehpa'
    },
    {
      id: '691eb41b-1d59-4360-b44b-6f795db618e6',
      ad: 'GOLD AUDIO NB-050 Sub Üstü Ara Sehpa',
      kategori: 'Kablo, Stand ve Aksesuar',
      fiyat: 715,
      fotograf: 'https://csekzzsaeehakpdmzfam.supabase.co/storage/v1/object/public/urun-fotograflari/urunler/1778236707120_ecofzmlm6sn.jpg',
      aciklama: 'Subwoofer üzeri kabin bağlantı direği M20 vida dişli'
    },
    {
      id: 'acc-spk-cable',
      ad: 'İVOX Speakon to Speakon 5 Metre Hoparlör Kablosu',
      kategori: 'Kablo, Stand ve Aksesuar',
      fiyat: 450,
      fotograf: 'https://csekzzsaeehakpdmzfam.supabase.co/storage/v1/object/public/urun-fotograflari/urunler/1784799850309_glp5h8th8co.jpg',
      aciklama: '2x1.50mm twinax yüksek iletkenlikli sahne hoparlör kablosu'
    }
  ],
  headphone: [
    {
      id: 'acc-headphone-stand',
      ad: 'Alüminyum Masaüstü Stüdyo Kulaklık Standı',
      kategori: 'Kablo, Stand ve Aksesuar',
      fiyat: 390,
      fotograf: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=400&auto=format&fit=crop',
      aciklama: 'Kaydırmaz silikon tabanlı, kulaklık yastığını koruyan tasarım'
    },
    {
      id: 'acc-jack-adapter',
      ad: 'Altın Kaplama 6.35mm to 3.5mm Stereo Jak Adaptörü',
      kategori: 'Kablo, Stand ve Aksesuar',
      fiyat: 149,
      fotograf: 'https://csekzzsaeehakpdmzfam.supabase.co/storage/v1/object/public/urun-fotograflari/urunler/1778156950887_24gsjmfvggy.jpg',
      aciklama: 'Kayıpsız ses iletimi sağlayan vidalı stüdyo jak çevirici'
    }
  ],
  general: [
    {
      id: 'acc-xlr-3m',
      ad: 'Dengeli XLR Erkek - Dişi Mikrofon Kablosu (3 Metre)',
      kategori: 'Kablo, Stand ve Aksesuar',
      fiyat: 349,
      fotograf: 'https://csekzzsaeehakpdmzfam.supabase.co/storage/v1/object/public/urun-fotograflari/urunler/1778157024282_e0zx9bp73f8.jpg',
      aciklama: 'Oksijensiz bakır, parazit önleyici stüdyo sinyal kablosu'
    },
    {
      id: 'e4b94ed2-5e9b-413a-9771-6ee6572d05ad',
      ad: 'FENİX SS005 TRİPOD HOPARLÖR STANDI',
      kategori: 'Kablo, Stand ve Aksesuar',
      fiyat: 2340,
      fotograf: 'https://csekzzsaeehakpdmzfam.supabase.co/storage/v1/object/public/urun-fotograflari/urunler/1778767759402_u1xladpuug.jpg',
      aciklama: '50 kg taşıma kapasiteli, güvenlik pimli alüminyum sehpa'
    },
    {
      id: 'acc-jack-adapter',
      ad: 'Altın Kaplama 6.35mm to 3.5mm Stereo Jak Adaptörü',
      kategori: 'Kablo, Stand ve Aksesuar',
      fiyat: 149,
      fotograf: 'https://csekzzsaeehakpdmzfam.supabase.co/storage/v1/object/public/urun-fotograflari/urunler/1778156950887_24gsjmfvggy.jpg',
      aciklama: 'Kayıpsız ses iletimi sağlayan vidalı stüdyo jak çevirici'
    }
  ]
}

export default function CartCrossSell({ items, isDrawer = false, onAdded }: Props) {
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({})

  if (!items || items.length === 0) return null

  // Cart text checking
  const cartText = items.map(i => `${i.ad} ${i.kategori}`.toLowerCase()).join(' ')
  const inCartIds = new Set(items.map(i => i.id))

  let categoryKey = 'general'
  let sectionTitle = 'Tamamlayıcı Aksesuar Önerileri'
  let SectionIcon = Sparkles

  if (cartText.includes('mikrofon') || cartText.includes('shure') || cartText.includes('rode') || cartText.includes('vokal') || cartText.includes('yaka')) {
    categoryKey = 'microphone'
    sectionTitle = 'Mikrofonunuz İçin Önerilen Aksesuarlar'
    SectionIcon = Mic
  } else if (cartText.includes('hoparl') || cartText.includes('kabin') || cartText.includes('speaker') || cartText.includes('sub')) {
    categoryKey = 'speaker'
    sectionTitle = 'Hoparlörünüz İçin Önerilen Aksesuarlar'
    SectionIcon = Volume2
  } else if (cartText.includes('kulakl') || cartText.includes('headphone')) {
    categoryKey = 'headphone'
    sectionTitle = 'Kulaklığınız İçin Önerilen Aksesuarlar'
    SectionIcon = Headphones
  }

  // Filter recommendations: eliminate items already in cart
  const candidates = (ACCESSORIES_DB[categoryKey] || ACCESSORIES_DB.general)
    .filter(acc => !inCartIds.has(acc.id))

  if (candidates.length === 0) return null

  // Show up to 2 items in drawer, 3 on page
  const displayItems = candidates.slice(0, isDrawer ? 2 : 3)

  const handleAdd = (acc: AccessoryItem) => {
    addToCart({
      id: acc.id,
      ad: acc.ad,
      kategori: acc.kategori,
      fotograf: acc.fotograf,
      fiyat: acc.fiyat,
      para_birimi: 'TRY',
      indirimli_fiyat: null,
    })

    setAddedMap(prev => ({ ...prev, [acc.id]: true }))
    onAdded?.()
    setTimeout(() => {
      setAddedMap(prev => ({ ...prev, [acc.id]: false }))
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
          {displayItems.map(acc => {
            const isAdded = addedMap[acc.id]
            return (
              <div
                key={acc.id}
                className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-xs hover:border-brand-red/30 transition-colors"
              >
                <div className="relative w-12 h-12 bg-slate-50 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                  <Image
                    src={acc.fotograf}
                    alt={acc.ad}
                    fill
                    className="object-contain p-1"
                    sizes="48px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-display font-bold text-slate-800 truncate">
                    {acc.ad}
                  </h4>
                  <div className="text-xs font-black text-brand-red font-display mt-0.5">
                    ₺{acc.fiyat.toLocaleString('tr-TR')}
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
        {displayItems.map(acc => {
          const isAdded = addedMap[acc.id]
          return (
            <div
              key={acc.id}
              className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between hover:shadow-md hover:border-brand-red/40 transition-all group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="relative w-16 h-16 bg-slate-50 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                  <Image
                    src={acc.fotograf}
                    alt={acc.ad}
                    fill
                    className="object-contain p-1 group-hover:scale-105 transition-transform"
                    sizes="64px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-[9px] font-display font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mb-1">
                    Tamamlayıcı
                  </span>
                  <h4 className="text-xs font-display font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-brand-red transition-colors">
                    {acc.ad}
                  </h4>
                  {acc.aciklama && (
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-1 font-body">
                      {acc.aciklama}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                <div className="font-display font-black text-sm text-slate-900">
                  ₺{acc.fiyat.toLocaleString('tr-TR')}
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
