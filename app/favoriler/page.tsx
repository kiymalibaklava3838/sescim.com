'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, ShoppingCart, Trash2, ArrowRight, Check } from 'lucide-react'
import { getFavorites, toggleFavorite, type SavedProduct } from '@/lib/product-lists'
import { formatFiyat, dovizToTL, type KurData } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'
import { addToCart } from '@/lib/cart'

export default function FavorilerPage() {
  const [items, setItems] = useState<SavedProduct[]>([])
  const [kur, setKur] = useState<KurData>({ USD: 32.5, EUR: 35.2, guncelleme: null })
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const sync = () => setItems(getFavorites())
    sync()
    getKurClient().then(setKur).catch(() => {})
    window.addEventListener('product-lists-updated', sync)
    return () => window.removeEventListener('product-lists-updated', sync)
  }, [])

  const handleAddToCart = (item: SavedProduct) => {
    if (!item.fiyat) return
    const pb = item.para_birimi || 'TRY'
    const fiyatTL = dovizToTL(item.fiyat, pb, kur)
    const indirimliTL = item.indirimli_fiyat ? dovizToTL(item.indirimli_fiyat, pb, kur) : null

    addToCart({
      id: item.id,
      ad: item.ad,
      kategori: item.kategori,
      fotograf: item.fotograf || item.fotograflar?.[0] || '',
      fiyat: fiyatTL,
      fiyat_doviz: item.fiyat,
      para_birimi: pb,
      indirimli_fiyat: indirimliTL,
      indirimli_fiyat_doviz: item.indirimli_fiyat || null,
    })

    setAddedMap((prev) => ({ ...prev, [item.id]: true }))
    setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [item.id]: false }))
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center justify-center mb-12 text-center">
          <div className="w-14 h-14 bg-red-50 text-brand-red rounded-2xl flex items-center justify-center mb-4">
            <Heart size={28} className="fill-brand-red" />
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-slate-900">
            Favorilerim ({items.length})
          </h1>
          <p className="text-slate-500 font-body text-sm mt-2 max-w-md">
            Beğendiğiniz ürünleri daha sonra incelemek veya doğrudan sepete eklemek için takip edin.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-white shadow-sm rounded-2xl border border-slate-200/80 max-w-xl mx-auto p-8">
            <Heart size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="font-display font-bold text-lg text-slate-800 mb-2">Favori listeniz henüz boş</h3>
            <p className="font-body text-slate-500 mb-6 text-sm">
              Gözünüze çarpan ses ve müzik ekipmanlarını kalp simgesine tıklayarak buraya ekleyebilirsiniz.
            </p>
            <Link
              href="/urunler"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-red text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl hover:bg-red-700 transition-colors shadow-sm"
            >
              Ürünleri Keşfet <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {items.map((x) => {
              const img = x.fotograf || x.fotograflar?.[0]
              const pb = x.para_birimi || 'TRY'
              const fiyatTL = x.fiyat ? dovizToTL(x.fiyat, pb, kur) : null
              const isAdded = addedMap[x.id]

              return (
                <div
                  key={x.id}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md border border-slate-200/80 transition-all flex flex-col h-full group relative"
                >
                  {/* Image */}
                  <Link href={`/urun/${x.slug || x.id}`} className="block relative aspect-square bg-slate-50 rounded-xl overflow-hidden mb-4 border border-slate-100">
                    {img ? (
                      <Image
                        src={img}
                        alt={x.ad}
                        fill
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Heart size={36} />
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex-1 flex flex-col">
                    <div className="font-display text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {x.kategori}
                    </div>
                    <Link
                      href={`/urun/${x.slug || x.id}`}
                      className="font-display font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-brand-red transition-colors mb-2"
                    >
                      {x.ad}
                    </Link>

                    {x.marka && (
                      <p className="text-[11px] text-slate-500 mb-3">
                        Marka: <span className="font-semibold text-slate-700">{x.marka}</span>
                      </p>
                    )}

                    {/* Price */}
                    <div className="mt-auto mb-4">
                      {fiyatTL ? (
                        <div>
                          <span className="text-xs text-slate-400 font-medium mr-1">Fiyat:</span>
                          <span className="font-display font-black text-lg text-slate-900">
                            {formatFiyat(fiyatTL, 'TRY')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Fiyat bilgisi için inceleyin</span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      {x.fiyat && x.stok_durumu !== 'tukendi' && (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(x)}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                            isAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-brand-red text-white hover:bg-red-700 shadow-sm'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check size={14} /> Eklendi
                            </>
                          ) : (
                            <>
                              <ShoppingCart size={14} /> Sepete Ekle
                            </>
                          )}
                        </button>
                      )}

                      <div className="flex gap-2">
                        <Link
                          href={`/urun/${x.slug || x.id}`}
                          className="flex-1 text-center py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-display font-semibold rounded-lg transition-colors"
                        >
                          İncele
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            toggleFavorite(x)
                            setItems(getFavorites())
                          }}
                          className="py-2 px-3 border border-slate-200 text-slate-500 hover:text-brand-red hover:border-red-200 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center"
                          title="Favorilerden Kaldır"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

