'use client'

import { useCartStore } from '@/store/useCartStore'
import { getCart, removeFromCart, getCartTotal, type CartItem } from '@/lib/cart'
import { X, Trash2, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CartCrossSell from './CartCrossSell'
import FreeShippingBar from './FreeShippingBar'

export default function CartDrawer() {
  const { isDrawerOpen, toggleDrawer } = useCartStore()
  const [items, setItems] = useState<CartItem[]>([])
  
  useEffect(() => {
    setItems(getCart())
    const onUpd = () => setItems(getCart())
    window.addEventListener('cart-updated', onUpd)
    return () => window.removeEventListener('cart-updated', onUpd)
  }, [])

  const subtotal = getCartTotal()

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Overlay */}
          <motion.div 
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
            onClick={toggleDrawer}
          />

          {/* Drawer */}
          <motion.div 
            key="cart-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-slate-50 z-50 shadow-2xl flex flex-col gpu-accelerate"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-brand-red" size={20} />
            <span className="font-display font-black text-lg text-slate-800 uppercase tracking-wide">Sepetim</span>
            <span className="bg-brand-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {items.reduce((acc, item) => acc + item.adet, 0)}
            </span>
          </div>
          <button 
            onClick={toggleDrawer}
            className="text-slate-400 hover:text-brand-red transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
              <ShoppingBag size={48} className="opacity-20" />
              <p className="font-body text-sm">Sepetiniz şu an boş.</p>
              <button 
                onClick={toggleDrawer}
                className="mt-4 border border-slate-300 text-slate-600 px-6 py-2 font-display font-bold text-xs uppercase tracking-widest hover:border-brand-red hover:text-brand-red transition-all"
              >
                Alışverişe Başla
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 bg-white p-4 border border-slate-100 shadow-sm">
                  <div className="w-20 h-20 bg-slate-100 flex-shrink-0 relative border border-slate-200">
                    {item.fotograf ? (
                      <Image 
                        src={item.fotograf} 
                        alt={item.ad} 
                        fill 
                        className="object-contain p-2"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ShoppingBag size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-body font-semibold text-sm text-slate-800 line-clamp-2 leading-tight">
                        {item.ad}
                      </h3>
                      <div className="font-display font-bold text-sm text-brand-red mt-1">
                        {Math.ceil(item.indirimli_fiyat ? item.indirimli_fiyat : item.fiyat).toLocaleString('tr-TR')} TL
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs font-medium text-slate-500">
                        Adet: {item.adet}
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-400 hover:text-brand-red transition-colors"
                      >
                        <Trash2 size={16} />
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
          <div className="bg-white border-t border-slate-200 p-6 space-y-4">
            
            {/* Kargo Bedava Barı */}
            <FreeShippingBar total={subtotal} />

            <div className="flex items-center justify-between font-display font-black text-slate-800 uppercase text-lg">
              <span>Ara Toplam</span>
              <span>{subtotal.toLocaleString('tr-TR')} TL</span>
            </div>
            <p className="text-xs text-slate-500 text-center pb-2">Kargo ve vergiler ödeme sayfasında hesaplanır.</p>
            <Link 
              href="/sepet"
              onClick={toggleDrawer}
              className="w-full flex items-center justify-center bg-brand-red text-white py-4 font-display font-bold text-sm uppercase tracking-widest hover:bg-red-700 transition-colors"
            >
              Sepete Git & Tamamla
            </Link>
            </div>
          )}
        </motion.div>
      </>
    )}
  </AnimatePresence>
  )
}
