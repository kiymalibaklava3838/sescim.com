'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ShoppingBag, ArrowRight, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/store/useCartStore'

interface ToastData {
  id: number
  ad: string
  fotograf?: string
  fiyat?: number
}

export default function CartToast() {
  const [toast, setToast] = useState<ToastData | null>(null)
  const { toggleDrawer } = useCartStore()

  useEffect(() => {
    const handleItemAdded = (e: any) => {
      const detail = e.detail || {}
      setToast({
        id: Date.now(),
        ad: detail.ad || 'Ürün',
        fotograf: detail.fotograf,
        fiyat: detail.fiyat,
      })
    }

    window.addEventListener('cart-item-added', handleItemAdded)
    return () => window.removeEventListener('cart-item-added', handleItemAdded)
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
            className="pointer-events-auto bg-slate-900/95 text-white backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl flex items-center gap-3"
          >
            {/* Görsel veya İkon */}
            <div className="relative w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
              {toast.fotograf ? (
                <Image
                  src={toast.fotograf}
                  alt={toast.ad}
                  fill
                  className="object-cover"
                />
              ) : (
                <ShoppingBag size={20} className="text-brand-red" />
              )}
            </div>

            {/* Bilgi */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1 text-[11px] font-display font-bold uppercase tracking-wider text-emerald-400">
                <Check size={12} strokeWidth={3} />
                <span>Sepete Eklendi</span>
              </div>
              <p className="text-xs font-display font-bold text-white truncate mt-0.5">
                {toast.ad}
              </p>
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
