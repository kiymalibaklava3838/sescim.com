'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { getFavorites, toggleFavorite, type SavedProduct } from '@/lib/product-lists'
import { formatFiyat } from '@/lib/kur'

export default function FavorilerPage() {
  const [items, setItems] = useState<SavedProduct[]>([])

  useEffect(() => {
    const sync = () => setItems(getFavorites())
    sync()
    window.addEventListener('product-lists-updated', sync)
    return () => window.removeEventListener('product-lists-updated', sync)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center justify-center mb-12 text-center">
          <Heart className="w-12 h-12 text-brand-red mb-4" />
          <h1 className="font-display font-black text-4xl md:text-5xl uppercase text-slate-800">
            Favoriler
          </h1>
          <p className="text-slate-500 font-body mt-4">Kişisel listenizdeki ürünler.</p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-white shadow-sm rounded-2xl border border-slate-100 max-w-2xl mx-auto">
            <Heart size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="font-body text-slate-500 mb-8 text-lg">Favorilerinizde henüz ürün yok.</p>
            <Link href="/urunler" className="inline-flex items-center justify-center px-8 py-3 bg-brand-red text-white font-medium rounded-lg hover:bg-brand-red/90 transition-colors">
              Ürünleri Keşfet
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((x) => (
              <div key={x.id} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md border border-slate-100 transition-all flex flex-col h-full group">
                <div className="flex-1">
                  <div className="font-display text-[10px] uppercase tracking-widest text-slate-400 mb-2">{x.kategori}</div>
                  <h3 className="font-display font-bold uppercase text-slate-800 mb-2 text-sm line-clamp-2 group-hover:text-brand-red transition-colors">{x.ad}</h3>
                  <p className="font-body text-slate-500 text-xs mb-4 line-clamp-2">
                    {x.marka ? `Marka: ${x.marka}` : ''} {x.kullanim_alani ? `• ${x.kullanim_alani}` : ''}
                  </p>
                </div>
                <div>
                  {x.fiyat && (
                    <div className="font-display font-bold text-slate-800 mb-4">{formatFiyat(x.fiyat, x.para_birimi || 'TRY')}</div>
                  )}
                  <div className="flex gap-2">
                    <Link href={`/urun/${x.slug || x.id}`} className="flex-1 text-center py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded transition-colors">
                      Detay
                    </Link>
                    <button
                      type="button"
                      className="py-2 px-3 border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs font-medium rounded transition-colors"
                      onClick={() => {
                        toggleFavorite(x)
                        setItems(getFavorites())
                      }}
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
