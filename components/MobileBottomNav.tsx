'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, ShoppingCart, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCartCount } from '@/lib/cart'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    setMounted(true)
    const updateCount = () => setCount(getCartCount())
    updateCount()
    window.addEventListener('cart-updated', updateCount)
    return () => window.removeEventListener('cart-updated', updateCount)
  }, [])

  const tabs = [
    {
      name: 'Ana Sayfa',
      href: '/',
      icon: Home,
    },
    {
      name: 'Kategoriler',
      href: '#', // placeholder, can be expanded to a state or category page
      icon: LayoutGrid,
    },
    {
      name: 'Sepet',
      href: '/sepet',
      icon: ShoppingCart,
    },
    {
      name: 'Hesabım',
      href: '/hesabim',
      icon: User,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = tab.href !== '#' && pathname === tab.href
          const Icon = tab.icon

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${
                isActive ? 'text-brand-red' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div
                className={`relative transition-transform duration-300 ${
                  isActive ? '-translate-y-1 scale-110' : ''
                }`}
              >
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-all duration-300 ${
                    isActive ? 'fill-brand-red/10 text-brand-red' : 'fill-transparent'
                  }`}
                />
                {tab.name === 'Sepet' && mounted && count > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-red text-white text-[8px] font-bold flex items-center justify-center rounded-full">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-display uppercase tracking-wider transition-all duration-300 ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {tab.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
