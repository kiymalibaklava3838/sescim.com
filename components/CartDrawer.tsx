'use client'

import { useCartStore } from '@/store/useCartStore'
import { getCart, removeFromCart, updateQty, getCartTotal, type CartItem } from '@/lib/cart'
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import CartCrossSell from './CartCrossSell'
import FreeShippingBar from './FreeShippingBar'

export default function CartDrawer() {
  const { isDrawerOpen, toggleDrawer } = useCartStore()
  const [items, setItems] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setItems(getCart())
    const onUpd = () => setItems(getCart())
    window.addEventListener('cart-updated', onUpd)
    return () => window.removeEventListener('cart-updated', onUpd)
  }, [])

  // Mobil ve masaüstünde drawer açıkken arkaplan kaydırmasını kilitle & ESC tuşuyla kapat
  useEffect(() => {
    if (!mounted) return

    if (isDrawerOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') toggleDrawer()
      }
      window.addEventListener('keydown', handleKeyDown)

      return () => {
        document.body.style.overflow = originalOverflow
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isDrawerOpen, toggleDrawer, mounted])

  const subtotal = getCartTotal()

  if (!mounted) return null

  const drawerContent = (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Overlay / Backdrop */}
          <motion.div 
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[99998]"
            onClick={toggleDrawer}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div 
            key="cart-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[440px] max-w-full h-[100dvh] max-h-[100dvh] bg-slate-50 z-[99999] shadow-2xl flex flex-col overflow-hidden gpu-accelerate"
            role="dialog"
            aria-modal="true"
            aria-label="Sepetim"
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-red/10 flex items-center justify-center text-brand-red">
                  <ShoppingBag size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-base sm:text-lg text-slate-800 uppercase tracking-wide">Sepetim</span>
                  <span className="bg-brand-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {items.reduce((acc, item) => acc + item.adet, 0)} Ürün
                  </span>
                </div>
              </div>
              <button 
                onClick={toggleDrawer}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Sepeti Kapat"
              >
                <X size={22} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                    <ShoppingBag size={32} className="opacity-40 text-slate-500" />
                  </div>
                  <div className="text-center px-4">
                    <p className="font-display font-bold text-slate-700 text-base">Sepetiniz şu an boş</p>
                    <p className="font-body text-xs text-slate-400 mt-1">İlham veren setleri ve ürünleri keşfetmeye başlayın.</p>
                  </div>
                  <button 
                    onClick={toggleDrawer}
                    className="mt-2 btn-primary text-xs py-2.5 px-6 rounded-xl font-display font-bold uppercase tracking-wider shadow-sm"
                  >
                    Alışverişe Başla
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-lg flex-shrink-0 relative border border-slate-100 overflow-hidden">
                        {item.fotograf ? (
                          <Image 
                            src={item.fotograf} 
                            alt={item.ad} 
                            fill 
                            sizes="80px"
                            className="object-contain p-1.5"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ShoppingBag size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3 className="font-display font-bold text-xs sm:text-sm text-slate-800 line-clamp-2 leading-snug">
                            {item.ad}
                          </h3>
                          <div className="font-display font-black text-xs sm:text-sm text-brand-red mt-1">
                            {Math.ceil(item.indirimli_fiyat ? item.indirimli_fiyat : item.fiyat).toLocaleString('tr-TR')} ₺
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                          {/* Adet Kontrolü */}
                          <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 sm:p-1 rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, item.adet - 1)}
                              className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-brand-red transition-colors shadow-xs"
                              aria-label="Adet Azalt"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="w-5 text-center font-display font-bold text-xs text-slate-800">
                              {item.adet}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, item.adet + 1)}
                              className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-brand-red transition-colors shadow-xs"
                              aria-label="Adet Artır"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          {/* Silme Butonu */}
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                            title="Ürünü Çıkar"
                            aria-label="Ürünü Sepetten Çıkar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tamamlayıcı Aksesuar Önerisi (Cross-Sell) */}
              {items.length > 0 && (
                <CartCrossSell items={items} isDrawer={true} />
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="shrink-0 bg-white border-t border-slate-200 p-4 sm:p-5 space-y-3 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                {/* Kargo Bedava Barı */}
                <FreeShippingBar total={subtotal} />

                <div className="flex items-center justify-between font-display font-black text-slate-800 uppercase text-base sm:text-lg">
                  <span className="text-slate-500 text-xs tracking-wider">Ara Toplam</span>
                  <span className="text-brand-red font-mono">{subtotal.toLocaleString('tr-TR')} ₺</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button 
                    type="button"
                    onClick={toggleDrawer}
                    className="w-full py-3 px-3 rounded-xl border border-slate-200 text-slate-700 font-display font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors text-center"
                  >
                    Alışverişe Dön
                  </button>
                  <Link 
                    href="/sepet"
                    onClick={toggleDrawer}
                    className="w-full py-3 px-3 rounded-xl bg-brand-red text-white font-display font-bold text-xs uppercase tracking-wider hover:bg-brand-red-dark transition-all shadow-md shadow-brand-red/20 text-center flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    Sepete Git <ArrowRight size={14} />
                  </Link>
                </div>

                <p className="text-[10px] text-slate-400 text-center font-body">Kargo ve kupon indirimleri ödeme adımında hesaplanır.</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(drawerContent, document.body)
}
