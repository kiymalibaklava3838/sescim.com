'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, ShoppingCart, User } from 'lucide-react'

export default function MobileBottomNav() {
  const pathname = usePathname()

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
      href: '/uye/panel',
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
