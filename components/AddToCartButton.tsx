'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Check, Minus, Plus, AlertCircle } from 'lucide-react'
import { addToCart } from '@/lib/cart'
import { dovizToTL, DEFAULT_KUR, type KurData } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'

interface Props {
  urun: {
    id: string
    slug?: string
    ad: string
    kategori: string
    fotograflar: string[]
    fiyat: number
    indirimli_fiyat?: number | null
    indirimli_fiyat_doviz?: string | null
    para_birimi?: string
    stok_adedi?: number | null
    marka?: string | null
    fiyat_sorunuz?: boolean
  }
}

export default function AddToCartButton({ urun }: Props) {
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [stockWarn, setStockWarn] = useState<string | null>(null)
  const [flyingItems, setFlyingItems] = useState<{ id: number; x: number; y: number }[]>([])
  const [kur, setKur] = useState<KurData>(DEFAULT_KUR)

  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const maxStock =
    typeof urun.stok_adedi === 'number' && Number.isFinite(urun.stok_adedi) && urun.stok_adedi > 0
      ? Math.floor(urun.stok_adedi)
      : null

  useEffect(() => {
    getKurClient().then(setKur).catch(() => {})
    return () => {
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current)
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
    }
  }, [])

  const handleDecrease = () => {
    setStockWarn(null)
    setQty((prev) => Math.max(1, prev - 1))
  }

  const handleIncrease = () => {
    setStockWarn(null)
    setQty((prev) => {
      if (maxStock !== null && prev >= maxStock) {
        setStockWarn(`Stokta en fazla ${maxStock} adet var`)
        if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
        warnTimerRef.current = setTimeout(() => setStockWarn(null), 2600)
        return maxStock
      }
      return prev + 1
    })
  }

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    setStockWarn(null)
    const pb = urun.para_birimi || 'TRY'
    const indirimPb = urun.indirimli_fiyat_doviz || pb

    const fiyatTL = dovizToTL(urun.fiyat, pb, kur)
    const indirimliFiyatTL = urun.indirimli_fiyat ? dovizToTL(urun.indirimli_fiyat, indirimPb, kur) : null

    const result = addToCart(
      {
        id: urun.id,
        slug: urun.slug,
        ad: urun.ad,
        kategori: urun.kategori,
        fotograf: urun.fotograflar?.[0] || '',
        fiyat: fiyatTL,
        fiyat_doviz: urun.fiyat,
        para_birimi: pb,
        indirimli_fiyat: indirimliFiyatTL,
        indirimli_fiyat_doviz: urun.indirimli_fiyat || null,
        indirimli_fiyat_pb: indirimPb,
        stok_adedi: maxStock,
        marka: urun.marka,
        fiyat_sorunuz: urun.fiyat_sorunuz,
      },
      qty
    )

    if (!result.ok) {
      if (result.reason === 'max_stock' && result.maxStock) {
        setStockWarn(`Sepetinizde stoktaki maks. adet (${result.maxStock}) bulunuyor`)
      } else if (result.reason === 'out_of_stock') {
        setStockWarn('Bu ürün şu anda stokta yok')
      }
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
      warnTimerRef.current = setTimeout(() => setStockWarn(null), 3000)
      return
    }

    setAdded(true)
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current)
    addedTimerRef.current = setTimeout(() => setAdded(false), 2000)

    // Uçan resim animasyonu
    if (urun.fotograflar?.[0] && typeof window !== 'undefined') {
      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
      const newItem = {
        id: Date.now(),
        x: rect.left + rect.width / 2 - 25,
        y: rect.top - 50,
      }
      setFlyingItems((prev) => [...prev, newItem])
      setTimeout(() => {
        setFlyingItems((prev) => prev.filter((i) => i.id !== newItem.id))
      }, 1000)
    }
  }

  const targetX = typeof window !== 'undefined' ? window.innerWidth - 100 : 1000

  return (
    <div className="space-y-1.5">
      <div className="flex items-stretch gap-2">
        {/* Adet Seçici */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-1 shrink-0">
          <button
            type="button"
            onClick={handleDecrease}
            disabled={qty <= 1}
            aria-label="Adet azalt"
            className="w-8 h-full flex items-center justify-center text-slate-600 hover:text-brand-red disabled:opacity-35 transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="w-7 text-center font-display font-bold text-sm text-slate-800 select-none">
            {qty}
          </span>
          <button
            type="button"
            onClick={handleIncrease}
            disabled={maxStock !== null && qty >= maxStock}
            aria-label="Adet artır"
            className="w-8 h-full flex items-center justify-center text-slate-600 hover:text-brand-red disabled:opacity-35 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Sepete Ekle Butonu */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleAdd}
          className={`btn-primary text-sm flex-1 justify-center transition-all duration-300 relative overflow-hidden ${
            added ? '!bg-emerald-500 hover:!bg-emerald-600' : ''
          }`}
        >
          <AnimatePresence mode="wait">
            {added ? (
              <motion.div
                key="added"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="flex items-center gap-2 font-display font-bold"
              >
                <Check size={16} />
                Sepete Eklendi
              </motion.div>
            ) : (
              <motion.div
                key="add"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex items-center gap-2 font-display font-bold"
              >
                <ShoppingCart size={16} />
                Sepete Ekle
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {stockWarn && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
          <AlertCircle size={13} className="shrink-0" />
          <span>{stockWarn}</span>
        </div>
      )}

      {/* Uçan Resim */}
      <AnimatePresence>
        {flyingItems.map((item) => (
          <motion.img
            key={item.id}
            src={urun.fotograflar[0]}
            alt=""
            initial={{
              position: 'fixed',
              left: item.x,
              top: item.y,
              width: '50px',
              height: '50px',
              objectFit: 'contain',
              borderRadius: '8px',
              opacity: 1,
              scale: 1,
              zIndex: 9999,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            animate={{
              left: targetX,
              top: 20,
              scale: 0.1,
              opacity: 0.5,
              rotate: 360,
            }}
            transition={{
              duration: 0.8,
              ease: [0.17, 0.67, 0.83, 0.67],
            }}
            className="pointer-events-none bg-white border border-slate-200 p-1"
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
