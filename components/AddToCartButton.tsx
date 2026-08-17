'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Check } from 'lucide-react'
import { addToCart } from '@/lib/cart'
import { dovizToTL, type KurData } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'

interface Props {
  urun: {
    id: string
    ad: string
    kategori: string
    fotograflar: string[]
    fiyat: number
    indirimli_fiyat?: number | null
    indirimli_fiyat_doviz?: string | null
    para_birimi?: string
  }
}

export default function AddToCartButton({ urun }: Props) {
  const [added, setAdded] = useState(false)
  const [flyingItems, setFlyingItems] = useState<{id: number, x: number, y: number}[]>([])
  const [kur, setKur] = useState<KurData>({ USD: 32.5, EUR: 35.2, guncelleme: null })

  useEffect(() => {
    getKurClient().then(setKur).catch(() => {})
  }, [])

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    const pb = urun.para_birimi || 'TRY'
    const indirimPb = urun.indirimli_fiyat_doviz || pb

    const fiyatTL = dovizToTL(urun.fiyat, pb, kur)
    const indirimliFiyatTL = urun.indirimli_fiyat ? dovizToTL(urun.indirimli_fiyat, indirimPb, kur) : null

    addToCart({
      id: urun.id,
      ad: urun.ad,
      kategori: urun.kategori,
      fotograf: urun.fotograflar?.[0] || '',
      fiyat: fiyatTL,
      fiyat_doviz: urun.fiyat,
      para_birimi: pb,
      indirimli_fiyat: indirimliFiyatTL,
      indirimli_fiyat_doviz: urun.indirimli_fiyat || null,
    })
    
    // Sepete Eklendi State
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)

    // Uçan resim animasyonu
    if (urun.fotograflar?.[0]) {
      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
      const newItem = {
        id: Date.now(),
        x: rect.left + rect.width / 2 - 25, // Button center
        y: rect.top - 50 // Slightly above button
      }
      setFlyingItems(prev => [...prev, newItem])
      
      // Remove item after animation completes
      setTimeout(() => {
        setFlyingItems(prev => prev.filter(i => i.id !== newItem.id))
      }, 1000)
    }
  }

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleAdd}
        className={`btn-primary text-sm w-full justify-center transition-all duration-300 relative overflow-hidden ${added ? '!bg-emerald-500 hover:!bg-emerald-600' : ''}`}
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

      {/* Uçan Resim (Portallar vasıtasıyla z-index en üstte) */}
      <AnimatePresence>
        {flyingItems.map(item => (
          <motion.img
            key={item.id}
            src={urun.fotograflar[0]}
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
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
            animate={{
              left: window.innerWidth - 100, // Sağ üstteki sepet ikonunun tahmini koordinatı (Desktop için)
              top: 20,
              scale: 0.1,
              opacity: 0.5,
              rotate: 360
            }}
            transition={{ 
              duration: 0.8,
              ease: [0.17, 0.67, 0.83, 0.67] // Custom beizer for floating effect
            }}
            className="pointer-events-none bg-white border border-slate-200 p-1"
          />
        ))}
      </AnimatePresence>
    </>
  )
}
