'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { isFavorite, toggleFavorite, type SavedProduct } from '@/lib/product-lists'

interface Props {
  product: {
    id: string
    slug: string
    ad: string
    kategori: string
    fiyat?: number | null
    para_birimi?: string | null
    fotograflar?: string[] | null
    indirimli_fiyat?: number | null
    stok_durumu?: string | null
    stok_adedi?: number | null
    marka?: string | null
  }
}

export default function ProductFavoriteButton({ product }: Props) {
  const [favorite, setFavorite] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setFavorite(isFavorite(product.id))
    const handleUpdate = () => setFavorite(isFavorite(product.id))
    window.addEventListener('product-lists-updated', handleUpdate)
    return () => window.removeEventListener('product-lists-updated', handleUpdate)
  }, [product.id])

  const handleToggle = () => {
    const savedItem: SavedProduct = {
      id: product.id,
      slug: product.slug,
      ad: product.ad,
      kategori: product.kategori,
      fiyat: product.fiyat ?? undefined,
      para_birimi: product.para_birimi || 'TRY',
      fotograf: product.fotograflar?.[0] || null,
      fotograflar: product.fotograflar || [],
      indirimli_fiyat: product.indirimli_fiyat ?? null,
      stok_durumu: product.stok_durumu || undefined,
      stok_adedi: product.stok_adedi ?? null,
      marka: product.marka ?? null,
    }

    const added = toggleFavorite(savedItem)
    setFavorite(added)
    setToast(added ? 'Favorilere Eklendi' : 'Favorilerden Çıkarıldı')
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all border ${
          favorite
            ? 'bg-red-50 text-brand-red border-red-200 hover:bg-red-100 shadow-sm'
            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <Heart
          size={16}
          className={`transition-all ${favorite ? 'fill-brand-red text-brand-red scale-110' : 'text-slate-500'}`}
        />
        <span>{favorite ? 'Favorilerinizde' : 'Favorilere Ekle'}</span>
      </button>

      {toast && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-display font-bold px-3 py-1 rounded shadow-lg whitespace-nowrap z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  )
}
