'use client'

import { useEffect, useState, memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, GitCompare, Heart, Package, Search, ShoppingCart, Check, Eye, MessageSquareText } from 'lucide-react'
import { motion } from 'framer-motion'
import { dovizToTL, formatFiyat, type KurData } from '@/lib/kur'
import { addToCart } from '@/lib/cart'
import ProductBadges from './ProductBadges'
import {
  getCompareList,
  isCompared,
  isFavorite,
  toggleCompare,
  toggleFavorite,
  type SavedProduct,
} from '@/lib/product-lists'
import { isQuoteOnlyProduct } from '@/lib/distributor-rules'

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
  sescim_fiyat?: number
  sescim_indirimli_fiyat?: number
  sescim_aktif?: boolean
  fiyat_sorunuz?: boolean
  created_at?: string | null
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
        key={products.map(p => p.id).slice(0, 5).join('-')}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 md:gap-2"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {products.map((p) => (
          <div key={p.id} className="flex flex-col h-full">
            <ProductCard product={p} kur={kur} />
          </div>
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

  const isFiyatSorunuz = isQuoteOnlyProduct({ marka: product.marka, fiyat_sorunuz: product.fiyat_sorunuz })
  const aktifFiyat = product.sescim_fiyat ?? product.fiyat
  const normalFiyatTL = (!isFiyatSorunuz && aktifFiyat) ? dovizToTL(aktifFiyat, pb, kurData) : null

  const [fav, setFav] = useState(false)
  const [cmp, setCmp] = useState(false)
  const [cartAdded, setCartAdded] = useState(false)
  const router = useRouter()
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

  const handlePrefetch = () => {
    const slug = product.slug || product.id
    if (slug) {
      router.prefetch(`/urun/${slug}`)
    }
  }

  const asSaved = (): SavedProduct => ({
    id: product.id,
    slug: product.slug,
    ad: product.ad,
    kategori: product.kategori,
    fiyat: normalFiyatTL ?? (product.sescim_fiyat ?? product.fiyat),
    para_birimi: 'TRY',
    stok_durumu: product.stok_durumu,
    stok_adedi: product.stok_adedi ?? null,
    kritik_stok: product.kritik_stok ?? null,
    marka: product.marka ?? null,
    kullanim_alani: product.kullanim_alani ?? null,
    fotograf: product.fotograflar?.[0] || null,
    fotograflar: product.fotograflar || [],
    indirimli_fiyat: product.sescim_indirimli_fiyat ?? null,
    fiyat_sorunuz: isFiyatSorunuz,
  })

  // Sepete ekleme handler
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const finalFiyat = product.sescim_fiyat ?? product.fiyat
    if (isFiyatSorunuz || !finalFiyat || stok === 'tukendi') return

    const fiyatTL = dovizToTL(finalFiyat, pb, kurData)
    const indirimliFiyatTL = product.sescim_indirimli_fiyat ? dovizToTL(product.sescim_indirimli_fiyat, pb, kurData) : null

    addToCart({
      id: product.id,
      ad: product.ad,
      kategori: product.kategori,
      fotograf: product.fotograflar?.[0] || '',
      fiyat: fiyatTL,
      fiyat_doviz: finalFiyat,
      para_birimi: pb,
      indirimli_fiyat: indirimliFiyatTL,
      indirimli_fiyat_doviz: product.sescim_indirimli_fiyat || null,
    })
    setCartAdded(true)
    setTimeout(() => setCartAdded(false), 2000)
  }

  const indirimliFiyatTL = product.sescim_indirimli_fiyat ? dovizToTL(product.sescim_indirimli_fiyat, pb, kurData) : null
  const isNewProduct = product.created_at ? (Date.now() - new Date(product.created_at).getTime() < 30 * 24 * 60 * 60 * 1000) : false

  return (
    <div 
      className="product-card group relative bg-white border border-slate-200 overflow-hidden hover:border-brand-red/30 flex flex-col h-full gpu-accelerate transition-all duration-200 hover:shadow-md"
      onMouseEnter={handlePrefetch}
    >
      {/* Tıklanabilir alan — Link ile sarılı (SEO + navigasyon) */}
      <Link href={`/urun/${product.slug || product.id}`} className="flex flex-col flex-1">
        {/* Görsel */}
        <div className="aspect-square bg-slate-100 skeleton-shimmer relative overflow-hidden">
          {product.fotograflar?.[0] ? (
            <Image 
              src={product.fotograflar[0]} 
              alt={product.ad} 
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              loading="lazy"
              className="object-cover transition-transform duration-500 group-hover:scale-105" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={40} className="text-slate-300" />
            </div>
          )}

          {/* Dinamik Rozetler (İndirim / YENİ / Stok) */}
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
            {isNewProduct && (
              <span className="bg-blue-600 text-white text-[9px] font-display font-black uppercase px-2 py-0.5 rounded tracking-wider shadow-xs">
                YENİ
              </span>
            )}
            <ProductBadges
              stokAdedi={product.stok_adedi}
              kritikStok={product.kritik_stok}
              stokDurumu={stok}
              fiyat={product.fiyat_sorunuz ? undefined : (normalFiyatTL || undefined)}
              indirimliFiyat={product.fiyat_sorunuz ? undefined : (indirimliFiyatTL || undefined)}
              kategori={product.kategori}
              compact
            />
          </div>

          {/* Hızlı Bakış Butonu (Hover'da belirir) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              window.dispatchEvent(new CustomEvent('open-quick-view', { detail: product }))
            }}
            className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-white/95 hover:bg-white text-slate-800 hover:text-brand-red border border-slate-200 text-[10px] font-display font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 hover:scale-105 z-20 cursor-pointer"
          >
            <Eye size={12} /> Hızlı Bakış
          </button>

          {/* Mobil Favori Butonu (Sağ Üst, Dokunmatik Dostu) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setFav(toggleFavorite(asSaved()))
            }}
            className="md:hidden absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-sm flex items-center justify-center text-slate-400 active:scale-90 transition-all"
            aria-label="Favoriye Ekle"
          >
            <Heart size={14} fill={fav ? '#DA291C' : 'none'} className={fav ? 'text-brand-red' : ''} />
          </button>

          {isRecentUpdate && !indirimliFiyatTL && !product.fiyat_sorunuz && (
            <div className="absolute top-2.5 right-2.5 hidden md:block bg-green-600 text-white px-2 py-0.5 font-display font-black text-xs rounded-xs">
              YENİ FİYAT
            </div>
          )}
          {stok === 'tukendi' && (
            <div className="absolute inset-0 bg-white/85 flex items-center justify-center z-10">
              <span className="font-display font-black text-sm uppercase tracking-widest text-slate-800 bg-slate-100 px-3 py-1 rounded border border-slate-200">Tükendi</span>
            </div>
          )}
          {stok === 'siparise_gore' && (
            <div className="absolute top-2.5 right-2.5 bg-yellow-500 text-black px-2 py-0.5 font-display font-black text-[9px] uppercase tracking-wider rounded-xs">
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
            {isFiyatSorunuz ? (
              <div className="flex flex-col py-1">
                <span className="font-display font-black text-sm sm:text-base text-slate-900 tracking-tight uppercase">
                  FİYAT SORUNUZ
                </span>
                <span className="text-[10px] font-semibold text-amber-700">
                  Distribütör Özel Teklifi
                </span>
              </div>
            ) : indirimliFiyatTL ? (
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 line-through">
                  {formatFiyat(normalFiyatTL || 0, 'TRY')}
                </span>
                <span className="font-display font-black text-lg text-brand-red">
                  {formatFiyat(indirimliFiyatTL, 'TRY')}
                </span>
              </div>
            ) : aktifFiyat ? (
              <div className="font-display font-black text-lg text-slate-800">
                {formatFiyat(normalFiyatTL || 0, 'TRY')}
              </div>
            ) : (
              <span className="font-body text-slate-500 text-xs">Fiyat Yok</span>
            )}

            {product.fiyat_guncelleme && !isFiyatSorunuz && (
              <div className="font-body text-slate-400 text-[10px]">
                {new Date(product.fiyat_guncelleme).toLocaleDateString('tr-TR')}
              </div>
            )}
            {/* Sade Mikro Bilgi (Stokta / Son X Adet) */}
            {stockCount !== null && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold">
                {stockCount <= 0 ? (
                  <span className="text-slate-400">Tükendi</span>
                ) : isCritical ? (
                  <span className="text-amber-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Son {stockCount} Adet
                  </span>
                ) : (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Stokta
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Alt butonlar — Mobilde Geniş Dokunmatik Buton, Masaüstünde 3'lü Buton Grubu */}
      <div className="border-t border-slate-200 p-2">
        {/* Mobilde Tam Genişlikte Buton */}
        <div className="md:hidden">
          {isFiyatSorunuz ? (
            <Link
              href={`/urun/${product.slug || product.id}`}
              className="w-full h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider bg-slate-900 hover:bg-brand-red text-white transition-all shadow-xs"
            >
              <MessageSquareText size={14} />
              <span>Fiyat Teklifi Al</span>
            </Link>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleAddToCart}
              disabled={stok === 'tukendi'}
              className={`w-full h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider transition-all duration-200 shadow-xs ${
                stok === 'tukendi'
                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  : cartAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-brand-red hover:bg-brand-red-dark text-white'
              }`}
            >
              {cartAdded ? (
                <>
                  <Check size={14} />
                  <span>Eklendi</span>
                </>
              ) : stok === 'tukendi' ? (
                <span>Tükendi</span>
              ) : (
                <>
                  <ShoppingCart size={14} />
                  <span>Sepete Ekle</span>
                </>
              )}
            </motion.button>
          )}
        </div>

        {/* Masaüstünde: 3'lü Buton Düzeni */}
        <div className="hidden md:grid md:grid-cols-3 gap-1.5">
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            className={`flex items-center justify-center px-2 py-1.5 border text-xs transition-all duration-300 ${fav ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-slate-200 text-slate-500 hover:border-brand-red hover:text-brand-red'}`}
            onClick={(e) => { e.stopPropagation(); setFav(toggleFavorite(asSaved())) }}
          >
            <motion.div animate={{ scale: fav ? [1, 1.3, 1] : 1 }} transition={{ duration: 0.3 }}>
              <Heart size={12} fill={fav ? 'currentColor' : 'none'} className={fav ? 'text-brand-red' : ''} />
            </motion.div>
          </motion.button>
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
          {isFiyatSorunuz ? (
            <Link
              href={`/urun/${product.slug || product.id}`}
              className="flex items-center justify-center gap-1 text-[11px] font-display font-bold uppercase tracking-wider px-2 py-1.5 border border-slate-900 bg-slate-900 text-white hover:bg-brand-red hover:border-brand-red transition-all"
              title="Fiyat Teklifi İsteyin"
            >
              <MessageSquareText size={12} />
              <span>Teklif</span>
            </Link>
          ) : (
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
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-red group-hover:w-full transition-all duration-500" />
    </div>
  )
})
