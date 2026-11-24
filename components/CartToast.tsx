'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ShoppingBag, ArrowRight, X, AlertTriangle } from 'lucide-react'
import SafeProductImage from './SafeProductImage'
import { useCartStore } from '@/store/useCartStore'

interface ToastData {
  id: number
  type: 'added' | 'stock_limit'
  ad: string
  fotograf?: string
  fiyat?: number
  maxStock?: number
}

export default function CartToast() {
  const [toast, setToast] = useState<ToastData | null>(null)
  const { toggleDrawer } = useCartStore()

  useEffect(() => {
    const handleItemAdded = (e: any) => {
      const detail = e.detail || {}
      setToast({
        id: Date.now(),
        type: 'added',
        ad: detail.ad || 'Ürün',
        fotograf: detail.fotograf,
        fiyat: detail.fiyat,
      })
    }

    const handleStockLimit = (e: any) => {
      const detail = e.detail || {}
      setToast({
        id: Date.now(),
        type: 'stock_limit',
        ad: detail.ad || 'Ürün',
        maxStock: detail.maxStock,
      })
    }

    window.addEventListener('cart-item-added', handleItemAdded)
    window.addEventListener('cart-stock-limit', handleStockLimit)
    return () => {
      window.removeEventListener('cart-item-added', handleItemAdded)
      window.removeEventListener('cart-stock-limit', handleStockLimit)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      setToast(null)
    }, 3200)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <div className="fixed top-20 right-4 z-[99998] pointer-events-none max-w-sm w-full sm:w-auto">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-auto text-white backdrop-blur-md border rounded-2xl p-3.5 shadow-2xl flex items-center gap-3 ${
              toast.type === 'stock_limit'
                ? 'bg-amber-950/95 border-amber-500/60'
                : 'bg-slate-900/95 border-slate-700/80'
            }`}
          >
            {/* Görsel veya İkon */}
            <div className="relative w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
              {toast.type === 'stock_limit' ? (
                <AlertTriangle size={20} className="text-amber-400" />
              ) : toast.fotograf ? (
                <SafeProductImage
                  src={toast.fotograf}
                  alt={toast.ad}
                  fill
                  unoptimized={true}
                  className="object-cover"
                  placeholderIconSize={18}
                />
              ) : (
                <ShoppingBag size={20} className="text-brand-red" />
              )}
            </div>

            {/* Bilgi */}
            <div className="flex-1 min-w-0 pr-1">
              {toast.type === 'stock_limit' ? (
                <>
                  <div className="flex items-center gap-1 text-[11px] font-display font-bold uppercase tracking-wider text-amber-400">
                    <span>Stok Sınırı</span>
                  </div>
                  <p className="text-xs font-body text-white/90 mt-0.5 leading-snug">
                    Bu üründen stokta en fazla <strong>{toast.maxStock} adet</strong> bulunmaktadır.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 text-[11px] font-display font-bold uppercase tracking-wider text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                    <span>Sepete Eklendi</span>
                  </div>
                  <p className="text-xs font-display font-bold text-white truncate mt-0.5">
                    {toast.ad}
                  </p>
                </>
              )}
            </div>

            {/* Aksiyon */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setToast(null)
                  toggleDrawer()
                }}
                className="px-2.5 py-1.5 bg-brand-red hover:bg-red-700 text-white rounded-lg text-[11px] font-display font-bold uppercase tracking-wider transition-colors flex items-center gap-1 shadow-sm"
              >
                <span>Sepet</span>
                <ArrowRight size={11} />
              </button>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Kapat"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
