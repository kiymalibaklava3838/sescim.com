'use client'

import { ShoppingBag } from 'lucide-react'
import { motion, useAnimation } from 'framer-motion'
import { useCartStore } from '@/store/useCartStore'
import { useEffect, useState } from 'react'
import { getCartCount } from '@/lib/cart'

export default function CartIcon() {
  const { toggleDrawer } = useCartStore()
  
  // Hydration fix for client side state
  const [mounted, setMounted] = useState(false)
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    setMounted(true)
    const updateCount = () => setCount(getCartCount())
    updateCount()
    window.addEventListener('cart-updated', updateCount)
    return () => window.removeEventListener('cart-updated', updateCount)
  }, [])

  const controls = useAnimation()

  useEffect(() => {
    if (mounted && count > 0) {
      controls.start({
        scale: [1, 1.2, 0.9, 1.1, 1],
        transition: { duration: 0.4 }
      })
    }
  }, [count, mounted, controls])

  return (
    <motion.button 
      onClick={toggleDrawer}
      whileTap={{ scale: 0.9 }}
      aria-label="Sepetim" 
      className="relative flex flex-col items-center gap-1 text-slate-700 hover:text-brand-red transition-colors group"
    >
      <motion.div animate={controls} className="p-2 group-hover:bg-brand-red/10 rounded-full transition-colors relative">
        <ShoppingBag size={20} />
        {mounted && count > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-brand-red text-white text-[9px] font-bold flex items-center justify-center rounded-full">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </motion.div>
      <span className="text-[10px] font-semibold -mt-1 hidden lg:block">Sepetim</span>
    </motion.button>
  )
}
