'use client'

import { useEffect, useState, memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, GitCompare, Heart, Package, Search, ShoppingCart, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { dovizToTL, formatFiyat, type KurData } from '@/lib/kur'
import { addToCart } from '@/lib/cart'
import {
  getCompareList,
  isCompared,
  isFavorite,
  toggleCompare,
  toggleFavorite,
  type SavedProduct,
} from '@/lib/product-lists'

interface Product {
  id: string
  slug?: string
  ad: string
  aciklama?: string
  kategori: string
  fotograflar: string[]
  fiyat?: number
  bayi_fiyati?: number
  para_birimi?: string
  bayi_para_birimi?: string
  stok_durumu?: string
  fiyat_guncelleme?: string
  stok_adedi?: number | null
  kritik_stok?: number | null
  marka?: string | null
  kullanim_alani?: string | null
}

interface Props {
  products: Product[]
  suggested?: Product[] | null
  searchQuery?: string
  isBayi?: boolean
  showPrice?: boolean
}

import { getKurClient } from '@/lib/kur-client'

function useKur() {
  const [kur, setKur] = useState<KurData>({ USD: 32.5, EUR: 35.2, guncelleme: null })
  useEffect(() => {
    getKurClient().then(setKur)
  }, [])
  return kur
}

export default function ProductGrid({ products, suggested, searchQuery, isBayi, showPrice }: Props) {
  const kur = useKur()
  const [compareCount, setCompareCount] = useState(0)

  useEffect(() => {
    const sync = () => setCompareCount(getCompareList().length)
    sync()
    window.addEventListener('product-lists-updated', sync)
    return () => window.removeEventListener('product-lists-updated', sync)
  }, [])

  if (products.length === 0) {
    return (
      <div>
        {compareCount > 0 && (
          <div className="mb-5 flex items-center justify-between border border-slate-200 bg-white px-4 py-3">
            <span className="font-body text-slate-500 text-sm">{compareCount} ürün karşılaştırma listesinde</span>
            <Link href="/karsilastir" className="btn-outline text-xs">Karşılaştırmaya Git</Link>
          </div>
        )}
        <div className="text-center py-20 border border-slate-200 bg-white mb-12">
          <Search size={40} className="text-slate-400 mx-auto mb-4" />
          <p className="font-display font-bold text-lg uppercase text-slate-600 tracking-widest mb-2">Sonuç Bulunamadı</p>
          {searchQuery && (
            <p className="font-body text-slate-500 text-sm">
              &quot;<span className="text-slate-600">{searchQuery}</span>&quot; için ürün bulunamadı.
            </p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/urunler" className="btn-outline text-xs">Tüm Ürünleri Gör</Link>
            <Link href="/iletisim" className="btn-primary text-xs">Ürün Sor <ArrowRight size={13} /></Link>
          </div>
        </div>
        {suggested && suggested.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-px bg-brand-red" />
              <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-slate-400">Bunlara Bakabilirsiniz</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
              {suggested.map(p => <ProductCard key={p.id} product={p} kur={kur} />)}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {compareCount > 0 && (
        <div className="mb-5 flex items-center justify-between border border-slate-200 bg-white px-4 py-3">
          <span className="font-body text-slate-500 text-sm">{compareCount} ürün karşılaştırma listesinde</span>
          <Link href="/karsilastir" className="btn-outline text-xs">Karşılaştırmaya Git</Link>
        </div>
      )}
      <motion.div 
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 md:gap-2"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
      >
        {products.map((p) => (
          <motion.div key={p.id} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300 } } }} className="flex flex-col h-full">
            <ProductCard product={p} kur={kur} />
          </motion.div>
        ))}
      </motion.div>
    </>
  )
}

export const ProductCard = memo(function ProductCard({ product, isBayi, kur, showPrice }: { product: Product; isBayi?: boolean; kur?: KurData; showPrice?: boolean }) {
  const kurData = kur || { USD: 32.5, EUR: 35.2, guncelleme: null }
  const pb = product.para_birimi || 'TRY'

  const stok = product.stok_durumu || 'stokta'
  const isRecentUpdate = product.fiyat_guncelleme
    ? (Date.now() - new Date(product.fiyat_guncelleme).getTime()) < 7 * 24 * 60 * 60 * 1000
    : false

  const normalFiyatTL = product.fiyat ? dovizToTL(product.fiyat, pb, kurData) : null

  const [fav, setFav] = useState(false)
  const [cmp, setCmp] = useState(false)
  const [cartAdded, setCartAdded] = useState(false)
  const stockCount = product.stok_adedi ?? null
  const isCritical =
    stockCount !== null &&
    product.kritik_stok !== null &&
    product.kritik_stok !== undefined &&
    stockCount <= product.kritik_stok

  useEffect(() => {
    setFav(isFavorite(product.id))
    setCmp(isCompared(product.id))
  }, [product.id])

  const asSaved = (): SavedProduct => ({
    id: product.id,
    ad: product.ad,
    kategori: product.kategori,
    fiyat: product.fiyat,
    para_birimi: product.para_birimi,
    stok_durumu: product.stok_durumu,
    stok_adedi: product.stok_adedi ?? null,
    kritik_stok: product.kritik_stok ?? null,
    marka: product.marka ?? null,
    kullanim_alani: product.kullanim_alani ?? null,
  })

  // Sepete ekleme handler
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!product.fiyat || stok === 'tukendi') return

    const fiyatTL = dovizToTL(product.fiyat, pb, kurData)

    addToCart({
      id: product.id,
      ad: product.ad,
      kategori: product.kategori,
      fotograf: product.fotograflar?.[0] || '',
      fiyat: fiyatTL,
      fiyat_doviz: product.fiyat,
      para_birimi: pb,
      bayi_fiyati: null,
      bayi_fiyat_doviz: null,
      bayi_para_birimi: pb,
    })
    setCartAdded(true)
    setTimeout(() => setCartAdded(false), 2000)
  }

  return (
    <div className="product-card group relative bg-white border border-slate-200 overflow-hidden hover:border-brand-red/30 flex flex-col h-full">
      {/* Tıklanabilir alan — Link ile sarılı (SEO + navigasyon) */}
      <Link href={`/urun/${product.slug || product.id}`} className="flex flex-col flex-1">
        {/* Görsel */}
        <div className="aspect-square bg-slate-50 relative overflow-hidden">
          {product.fotograflar?.[0] ? (
            <Image src={product.fotograflar[0]} alt={product.ad} fill
              className="object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={40} className="text-slate-300" />
            </div>
          )}

          {isRecentUpdate && (
            <div className="absolute top-3 left-3 bg-green-600 text-white px-2 py-0.5 font-display font-black text-xs">
              YENİ FİYAT
            </div>
          )}
          {stok === 'tukendi' && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <span className="font-display font-black text-sm uppercase tracking-widest text-slate-800">Tükendi</span>
            </div>
          )}
          {stok === 'siparise_gore' && (
            <div className="absolute top-3 right-3 bg-yellow-500 text-black px-2 py-0.5 font-display font-black text-[9px] uppercase tracking-wider">
              Siparişe Göre
            </div>
          )}
        </div>

        {/* İçerik */}
        <div className="p-4 flex flex-col flex-1">
          <div className="font-display font-semibold text-xs tracking-widest uppercase text-brand-red/60 mb-1">{product.kategori}</div>
          <h3 className="font-display font-bold text-sm uppercase tracking-wide text-slate-800 group-hover:text-brand-red transition-colors leading-tight mb-3 flex-1">
            {product.ad}
          </h3>
          {(product.marka || product.kullanim_alani) && (
            <p className="font-body text-slate-500 text-xs mb-3">
              {product.marka ? `Marka: ${product.marka}` : ''}
              {product.marka && product.kullanim_alani ? ' • ' : ''}
              {product.kullanim_alani || ''}
            </p>
          )}

          <div className="mt-auto space-y-0.5">
            {product.fiyat ? (
              <>
                <div className="font-display font-black text-lg text-slate-800">
                  {formatFiyat(product.fiyat, pb)}
                </div>
                {pb !== 'TRY' && normalFiyatTL && (
                  <div className="font-body text-slate-500 text-xs">
                    ≈ {normalFiyatTL.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                  </div>
                )}
              </>
            ) : (
              <span className="font-body text-slate-500 text-xs">Fiyat Yok</span>
            )}

            {product.fiyat_guncelleme && (
              <div className="font-body text-slate-400 text-[10px]">
                {new Date(product.fiyat_guncelleme).toLocaleDateString('tr-TR')}
              </div>
            )}
            {stockCount !== null && (
              <div className={`mt-2 font-display font-bold text-[10px] tracking-wider uppercase ${isCritical ? 'text-brand-red animate-pulse' : 'text-slate-400'}`}>
                {stockCount <= 0 ? (
                  <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-sm">
                    <div className="w-1 h-1 rounded-full bg-red-500" />
                    STOKTA YOK
                  </span>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1 h-1 rounded-full ${isCritical ? 'bg-brand-red' : 'bg-green-500'}`} />
                      {stockCount > 20 ? 'STOKTA: 20+ ADET' : `STOKTA: ${stockCount} ADET`}
                    </div>
                    {isCritical && <span className="text-[9px] text-brand-red/60 leading-none">SON ÜRÜNLER!</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Alt butonlar — Favori, Karşılaştır, Sepete Ekle */}
      <div className="border-t border-slate-200 p-2">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            className={`flex items-center justify-center px-2 py-1.5 border text-xs transition-all duration-200 ${fav ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-slate-200 text-slate-500 hover:border-brand-red hover:text-brand-red'}`}
            onClick={(e) => { e.stopPropagation(); setFav(toggleFavorite(asSaved())) }}
          >
            <Heart size={12} />
          </button>
          <button
            type="button"
            className={`flex items-center justify-center px-2 py-1.5 border text-xs transition-all duration-200 ${cmp ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-slate-200 text-slate-500 hover:border-brand-red hover:text-brand-red'}`}
            onClick={(e) => {
              e.stopPropagation()
              const next = toggleCompare(asSaved())
              if (next.overflow) { alert('Karşılaştırma listesi en fazla 4 ürün olabilir.'); return }
              setCmp(next.active)
            }}
          >
            <GitCompare size={12} />
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleAddToCart}
            disabled={stok === 'tukendi'}
            className={`flex items-center justify-center gap-1 text-xs font-display font-semibold uppercase tracking-wider px-2 py-1.5 border transition-all duration-300 ${
              stok === 'tukendi'
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                : cartAdded
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-brand-red border-brand-red text-white hover:bg-brand-red/80'
            }`}
          >
            {cartAdded ? <Check size={12} /> : <ShoppingCart size={12} />}
            {cartAdded ? '✓' : 'Ekle'}
          </motion.button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-red group-hover:w-full transition-all duration-500" />
    </div>
  )
})
