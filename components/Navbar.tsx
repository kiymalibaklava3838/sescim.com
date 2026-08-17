'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Search, Phone, Heart, User, Menu, X, ChevronRight, 
  Sparkles, Gift, Zap, Tag, Speaker, Lightbulb, Monitor, 
  Headphones, Music, Mic, Package, Plug, Truck, CircleDot 
} from 'lucide-react'
import CartIcon from './CartIcon'

const categoryIcons: Record<string, any> = {
  'Ses Sistemleri': Speaker,
  'Işık Sistemleri': Lightbulb,
  'Görüntü Sistemleri': Monitor,
  'Kulaklık & Monitör': Headphones,
  'DJ Ekipmanları': Music,
  'Stüdyo Ekipmanları': Mic,
  'Sahne ve Truss': Package,
  'Kablo, Stand ve Aksesuar': Plug,
  'Taşıma ve Altyapı': Truck,
}
import ProductSearch from './ProductSearch'
import { NEW_KATEGORI_HIYERARSI } from '@/lib/categories'
import { createClient } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { pullCartFromSupabase, setCartUserId } from '@/lib/cart'

export default function Navbar() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeMegaCategory, setActiveMegaCategory] = useState<string | null>(null)
  const supabase = useRef(createClient()).current

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      setUser(data.session?.user ?? null)
      setCartUserId(data.session?.user?.id ?? null)
      if (data.session?.user) pullCartFromSupabase()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
      setUser(session?.user ?? null)
      setCartUserId(session?.user?.id ?? null)
      if (session?.user) pullCartFromSupabase()
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setIsScrolled(currentScrollY > 20)
      
      // Aşağı kaydırıldığında gizle (eğer 100px'den fazla inildiyse)
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } 
      // Yukarı kaydırıldığında göster
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true)
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <header className={`bg-white border-b border-slate-200 w-full z-50 sticky top-0 transition-all duration-500 ease-in-out ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    } ${isScrolled ? 'shadow-lg' : ''}`}>
      {/* Top small bar */}
      <div className="bg-slate-100 text-slate-600 text-[11px] sm:text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span className="font-medium hidden sm:block">Türkiye'nin Ses, Işık & Görüntü Marketi</span>
          <span className="font-medium sm:hidden">sescim.com</span>
          <a href="tel:+903522316915" className="flex items-center gap-1.5 font-semibold hover:text-brand-red transition-colors">
            <Phone size={12} />
            +90 352 231 69 15
          </a>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-5 flex items-center justify-between gap-4 md:gap-8">
        
        {/* Mobile Menu Button & Logo */}
        <div className="flex items-center gap-4">
          <button 
            className="md:hidden text-slate-700" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <Link href="/" className="shrink-0">
            <Image 
              src="/logo.png" 
              alt="sescim.com" 
              width={140} 
              height={45} 
              className="object-contain h-8 md:h-10 w-auto" 
              priority
            />
          </Link>
        </div>

        {/* Search Bar - Desktop */}
        <div className="flex-1 max-w-3xl hidden md:block lg:mx-8">
          <ProductSearch fullPage />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4 md:gap-6 shrink-0">
          <Link href={user ? '/hesabim' : '/uye'} className="hidden lg:flex items-center gap-2 text-slate-700 hover:text-brand-red transition-colors group">
            <div className="p-2 bg-slate-100 rounded-full group-hover:bg-brand-red/10 group-hover:text-brand-red transition-colors">
              <User size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-medium leading-tight">Hoş Geldiniz</span>
              <span className="text-sm font-semibold leading-tight">{user ? 'Hesabım' : 'Giriş Yap'}</span>
            </div>
          </Link>
          
          <Link href="/favoriler" className="hidden lg:flex flex-col items-center gap-1 text-slate-700 hover:text-brand-red transition-colors group">
            <div className="p-2 group-hover:bg-brand-red/10 rounded-full group-hover:text-brand-red transition-colors">
              <Heart size={20} />
            </div>
            <span className="text-[10px] font-semibold -mt-1">Favoriler</span>
          </Link>

          <CartIcon />
        </div>
      </div>

      {/* Mobile Search & Menu Expanded */}
      <div className={`md:hidden px-4 pb-4 ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="mb-4">
          <ProductSearch fullPage />
        </div>
        
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-2">
          {NEW_KATEGORI_HIYERARSI.map((kat) => (
            <Link 
              key={kat.slug} 
              href={`/urunler/${kat.slug}`}
              className="py-2 text-sm font-semibold text-slate-700 hover:text-brand-red transition-colors"
            >
              {kat.name}
            </Link>
          ))}
          <Link href={user ? '/hesabim' : '/uye'} className="py-2 text-sm font-semibold text-brand-red flex items-center gap-2 mt-2 border-t border-slate-100 pt-4">
            <User size={18} />
            {user ? 'Hesabım' : 'Giriş Yap / Üye Ol'}
          </Link>
        </div>
      </div>

      {/* Bottom Navbar (Categories) - Desktop */}
      <div className="border-t border-slate-200 hidden md:block bg-white shadow-sm relative z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Left: Mega Menu Trigger */}
            <div className="relative group">
              <Link href="/urunler" className="flex items-center gap-2 bg-brand-red text-white px-5 py-3.5 font-semibold hover:bg-brand-red/90 transition-colors">
                <Menu size={20} />
                <span>Tüm Kategoriler</span>
              </Link>

              {/* Mega Menu Dropdown */}
              <div className="absolute top-full left-0 w-[800px] lg:w-[950px] bg-white shadow-2xl shadow-slate-900/10 border border-slate-200 z-50 flex rounded-b-xl rounded-tr-xl overflow-hidden min-h-[450px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 origin-top-left transform translate-y-2 group-hover:translate-y-0">
                {/* Left Sidebar - Main Categories */}
                <div className="w-1/3 bg-slate-50/80 border-r border-slate-200 flex flex-col py-3">
                  {NEW_KATEGORI_HIYERARSI.map((kat) => {
                    const isActive = (activeMegaCategory || NEW_KATEGORI_HIYERARSI[0]?.slug) === kat.slug
                    const Icon = categoryIcons[kat.name] || ChevronRight
                    return (
                      <Link
                        key={kat.slug}
                        href={`/urunler/${kat.slug}`}
                        className={`group/cat px-6 py-3.5 font-semibold text-[13px] transition-all duration-200 flex items-center justify-between ${
                          isActive
                            ? 'bg-white text-brand-red shadow-[inset_4px_0_0_0_#e11d48]'
                            : 'text-slate-600 hover:text-brand-red hover:bg-slate-100/50'
                        }`}
                        onMouseEnter={() => setActiveMegaCategory(kat.slug)}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} className={`transition-transform duration-300 ${
                            isActive ? 'text-brand-red scale-110' : 'text-slate-400 group-hover/cat:text-brand-red group-hover/cat:scale-110'
                          }`} />
                          {kat.name}
                        </div>
                        <ChevronRight size={16} className={`transition-all duration-300 ${
                          isActive ? 'text-brand-red translate-x-1' : 'text-slate-300 opacity-0 -translate-x-2 group-hover/cat:opacity-100 group-hover/cat:translate-x-0'
                        }`} />
                      </Link>
                    )
                  })}
                </div>

                {/* Right Content - Subcategories */}
                <div className="w-2/3 p-8 bg-white">
                  {NEW_KATEGORI_HIYERARSI.map((kat) => (
                    (activeMegaCategory || NEW_KATEGORI_HIYERARSI[0]?.slug) === kat.slug && (
                      <div key={kat.slug} className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                        {kat.children?.map((sub) => (
                          <div key={sub.slug} className="flex flex-col gap-3 group/sub">
                            <Link 
                              href={`/urunler/${kat.slug}/${sub.slug}`}
                              className="font-bold text-slate-800 text-sm hover:text-brand-red border-b border-slate-100 pb-2 flex items-center gap-2 transition-colors"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover/sub:bg-brand-red transition-colors" />
                              {sub.name}
                            </Link>
                            <ul className="flex flex-col gap-2.5 mt-1">
                              {sub.children?.map((detay) => (
                                <li key={detay.slug}>
                                  <Link
                                    href={`/urunler/${kat.slug}/${sub.slug}/${detay.slug}`}
                                    className="group/item flex items-center gap-2 text-[13px] text-slate-500 hover:text-brand-red transition-all duration-300"
                                  >
                                    <ChevronRight size={12} className="text-slate-300 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300" />
                                    <span className="group-hover/item:translate-x-1 transition-transform duration-300">
                                      {detay.name}
                                    </span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Static Links */}
            <div className="flex items-center gap-6 lg:gap-8">
              <Link href="/firsatlar" className="flex items-center gap-2 font-semibold text-[13px] lg:text-[14px] text-slate-700 hover:text-brand-red transition-all duration-200 group/link">
                <Sparkles size={16} className="text-amber-500 group-hover/link:animate-pulse" />
                Günün Fırsatları
              </Link>
              <Link href="/kampanyalar" className="flex items-center gap-2 font-semibold text-[13px] lg:text-[14px] text-slate-700 hover:text-brand-red transition-all duration-200 group/link">
                <Gift size={16} className="text-brand-red group-hover/link:-translate-y-0.5 transition-transform" />
                Kampanyalar
              </Link>
              <Link href="/yeni-gelenler" className="flex items-center gap-2 font-semibold text-[13px] lg:text-[14px] text-slate-700 hover:text-brand-red transition-all duration-200 group/link">
                <Zap size={16} className="text-blue-500 group-hover/link:rotate-12 transition-transform" />
                Yeni Gelenler
              </Link>
              <Link href="/outlet" className="flex items-center gap-2 font-semibold text-[13px] lg:text-[14px] text-slate-700 hover:text-brand-red transition-all duration-200 group/link">
                <Tag size={16} className="text-green-500 group-hover/link:scale-110 transition-transform" />
                Outlet
              </Link>
              <Link href="/iletisim" className="flex items-center gap-2 font-semibold text-[13px] lg:text-[14px] text-slate-700 hover:text-brand-red transition-all duration-200 group/link">
                <Phone size={16} className="text-slate-400 group-hover/link:text-brand-red transition-colors" />
                İletişim
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
