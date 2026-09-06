'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, ShoppingCart, Check, Heart, GitCompare, Package, ShieldCheck, Truck, ArrowRight, Minus, Plus, Star } from 'lucide-react'
import { addToCart } from '@/lib/cart'
import { formatFiyat, dovizToTL, type KurData } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'
import { isFavorite, toggleFavorite, isCompared, toggleCompare } from '@/lib/product-lists'

export interface QuickViewProduct {
  id: string
  slug?: string
  ad: string
  aciklama?: string
  kategori: string
  fotograflar: string[]
  fiyat?: number
  indirimli_fiyat?: number
  sescim_fiyat?: number
  sescim_indirimli_fiyat?: number
  para_birimi?: string
  stok_durumu?: string
  stok_adedi?: number | null
  kritik_stok?: number | null
  marka?: string | null
  kullanim_alani?: string | null
}

export default function QuickViewModal() {
  const [product, setProduct] = useState<QuickViewProduct | null>(null)
  const [activePhoto, setActivePhoto] = useState(0)
  const [adet, setAdet] = useState(1)
  const [cartAdded, setCartAdded] = useState(false)
  const [fav, setFav] = useState(false)
  const [cmp, setCmp] = useState(false)
  const [kur, setKur] = useState<KurData>({ USD: 38.0, EUR: 41.0, guncelleme: null })

  useEffect(() => {
    getKurClient().then(setKur).catch(() => {})

    const handleOpen = (e: CustomEvent<QuickViewProduct>) => {
      if (e.detail) {
        setProduct(e.detail)
        setActivePhoto(0)
        setAdet(1)
        setCartAdded(false)
        setFav(isFavorite(e.detail.id))
        setCmp(isCompared(e.detail.id))
      }
    }

    window.addEventListener('open-quick-view' as any, handleOpen)
    return () => window.removeEventListener('open-quick-view' as any, handleOpen)
  }, [])

  useEffect(() => {
    if (product) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [product])

  if (!product) return null

  const pb = product.para_birimi || 'TRY'
  const rawPrice = product.sescim_fiyat ?? product.fiyat ?? 0
  const rawIndirimli = product.sescim_indirimli_fiyat ?? product.indirimli_fiyat
  const priceTL = dovizToTL(rawPrice, pb, kur)
  const indirimliPriceTL = rawIndirimli ? dovizToTL(rawIndirimli, pb, kur) : null
  const aktifFiyatTL = indirimliPriceTL || priceTL
  const isOutOfStock = product.stok_durumu === 'tukendi' || product.stok_durumu === 'tükendi'

  const photos = Array.isArray(product.fotograflar) && product.fotograflar.length > 0
    ? product.fotograflar
    : []

  const handleAddToCart = () => {
    if (isOutOfStock || !aktifFiyatTL) return

    addToCart({
      id: product.id,
      ad: product.ad,
      kategori: product.kategori,
      fotograf: photos[0] || '',
      fiyat: priceTL,
      fiyat_doviz: rawPrice,
      para_birimi: pb,
      indirimli_fiyat: indirimliPriceTL,
      indirimli_fiyat_doviz: rawIndirimli || null,
    })

    setCartAdded(true)
    setTimeout(() => setCartAdded(false), 2200)
  }

  const asSaved = () => ({
    id: product.id,
    slug: product.slug,
    ad: product.ad,
    kategori: product.kategori,
    fiyat: product.sescim_fiyat ?? product.fiyat,
    para_birimi: product.para_birimi,
    stok_durumu: product.stok_durumu,
    stok_adedi: product.stok_adedi ?? null,
    kritik_stok: product.kritik_stok ?? null,
    marka: product.marka ?? null,
    kullanim_alani: product.kullanim_alani ?? null,
    fotograf: photos[0] || null,
    fotograflar: photos,
    indirimli_fiyat: product.sescim_indirimli_fiyat ?? null,
  })

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm transition-all animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={() => setProduct(null)} />

      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col md:flex-row max-h-[90vh]">
        {/* Kapat Butonu */}
        <button
          onClick={() => setProduct(null)}
          className="absolute top-4 right-4 z-20 w-9 h-9 bg-white/90 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-brand-red transition-colors shadow-sm"
        >
          <X size={18} />
        </button>

        {/* Sol Sütun: Fotoğraf Galerisi */}
        <div className="w-full md:w-1/2 p-6 bg-slate-50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200">
          <div className="aspect-square bg-white border border-slate-200 rounded-lg overflow-hidden relative mb-4">
            {photos[activePhoto] ? (
              <Image
                src={photos[activePhoto]}
                alt={product.ad}
                fill
                className="object-contain p-4 transition-all duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <Package size={56} />
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.slice(0, 5).map((photo, i) => (
                <button
                  key={i}
                  onClick={() => setActivePhoto(i)}
                  className={`w-14 h-14 bg-white border rounded overflow-hidden relative shrink-0 transition-all ${
                    activePhoto === i ? 'border-brand-red ring-2 ring-brand-red/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Image src={photo} alt="" fill className="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sağ Sütun: Ürün Bilgileri ve Satın Alma */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col overflow-y-auto">
          {/* Kategori ve Marka */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-display font-black text-[10px] tracking-widest uppercase text-brand-red bg-brand-red/10 px-2 py-0.5 rounded">
              {product.kategori}
            </span>
            {product.marka && (
              <span className="text-xs font-semibold text-slate-500">
                {product.marka}
              </span>
            )}
          </div>

          {/* Başlık */}
          <h2 className="font-display font-black text-xl sm:text-2xl text-slate-900 uppercase tracking-tight leading-snug mb-4">
            {product.ad}
          </h2>

          {/* Fiyat Alanı */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg mb-6">
            <div className="flex items-baseline gap-3">
              {indirimliPriceTL ? (
                <>
                  <span className="font-display font-black text-2xl sm:text-3xl text-brand-red">
                    {formatFiyat(indirimliPriceTL, 'TRY')}
                  </span>
                  <span className="text-sm text-slate-400 line-through">
                    {formatFiyat(priceTL, 'TRY')}
                  </span>
                </>
              ) : (
                <span className="font-display font-black text-2xl sm:text-3xl text-slate-900">
                  {formatFiyat(priceTL, 'TRY')}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
              <span>KDV Dahil</span> • <span>12 Aya Varan Taksit İmkanı</span>
            </div>
          </div>

          {/* Stok ve Güven Rozetleri */}
          <div className="space-y-2.5 text-xs text-slate-600 mb-6">
            <div className="flex items-center gap-2">
              <Truck size={15} className="text-brand-red" />
              <span>₺1.999 Üzeri <strong>Ücretsiz Sigortalı Kargo</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-600" />
              <span>Akdağ Elektronik <strong>2 Yıl Resmi Garanti</strong></span>
            </div>
            {product.stok_adedi !== null && product.stok_adedi !== undefined && product.stok_adedi > 0 && (
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Stok Durumu: <strong>{product.stok_adedi > 20 ? '20+ Adet Stokta' : `${product.stok_adedi} Adet Stokta`}</strong></span>
              </div>
            )}
          </div>

          {/* Adet ve Sepete Ekle */}
          <div className="mt-auto pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 py-3.5 px-6 font-display font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 rounded-md shadow transition-all ${
                  isOutOfStock
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : cartAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-brand-red hover:bg-red-700 text-white'
                }`}
              >
                {cartAdded ? <Check size={16} /> : <ShoppingCart size={16} />}
                {isOutOfStock ? 'Tükendi' : cartAdded ? 'Sepete Eklendi ✓' : 'Sepete Ekle'}
              </button>

              <button
                type="button"
                onClick={() => setFav(toggleFavorite(asSaved()))}
                className={`w-12 h-12 border rounded-md flex items-center justify-center transition-colors ${
                  fav ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-slate-200 text-slate-500 hover:border-brand-red hover:text-brand-red'
                }`}
                title="Favorilere Ekle"
              >
                <Heart size={18} fill={fav ? 'currentColor' : 'none'} />
              </button>
            </div>

            <Link
              href={`/urun/${product.slug || product.id}`}
              onClick={() => setProduct(null)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-600 hover:text-brand-red transition-colors"
            >
              Ürün Detay Sayfasına Git <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
