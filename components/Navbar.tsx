'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Search, Phone, Heart, User, Menu, X, ChevronRight, Compass,
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
  const [mounted, setMounted] = useState(false)
  const supabase = useRef(createClient()).current

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setMobileMenuOpen(false)
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleKeyDown)
      }
    } else {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

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
  const [announcementCoupon, setAnnouncementCoupon] = useState<{ kod: string; miktar: string } | null>({ kod: 'SESCIM5', miktar: '%5' })

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('kuponlar')
      .select('kod, indirim_tipi, indirim_miktari')
      .eq('aktif', true)
      .or('ozel_mi.is.null,ozel_mi.eq.false')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }: any) => {
        if (data && data.length > 0) {
          const k = data[0]
          setAnnouncementCoupon({
            kod: k.kod,
            miktar: k.indirim_tipi === 'yuzde' ? `%${k.indirim_miktari}` : `${k.indirim_miktari} ₺`
          })
        } else {
          setAnnouncementCoupon(null)
        }
      })
      .catch(() => {})
  }, [])

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

  // Mobil menü açıkken arkadaki sayfanın kaydırılmasını kilitle
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <header className={`bg-white border-b border-slate-200 w-full z-50 sticky top-0 transition-all duration-500 ease-in-out ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    } ${isScrolled ? 'shadow-lg' : ''}`}>
      {/* Top announcement bar */}
      <div className="bg-slate-900 text-slate-200 text-[11px] sm:text-xs py-1.5 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="bg-brand-red text-white text-[9px] font-display font-black uppercase px-2 py-0.5 rounded tracking-wider shrink-0">
              FIRSAT
            </span>
            <Link href="/kampanyalar" className="truncate hover:text-amber-300 transition-colors font-medium">
              {announcementCoupon ? (
                <>
                  🎉 İlk Siparişinize Özel <span className="font-mono font-bold text-amber-300">{announcementCoupon.kod}</span> Koduyla {announcementCoupon.miktar} İndirim! | ₺1.999 Üzeri Kargo Bedava
                </>
              ) : (
                <>
                  🎉 Güncel Kampanyalar &amp; İndirim Kuponlarını Keşfedin! | ₺1.999 Üzeri Kargo Bedava
                </>
              )}
            </Link>
          </div>
          <a href="tel:+903522316915" className="flex items-center gap-1.5 font-semibold text-slate-300 hover:text-white transition-colors shrink-0 ml-4">
            <Phone size={12} className="text-brand-red" />
            <span className="hidden sm:inline">+90 352 231 69 15</span>
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
            aria-label="Menüyü aç"
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
        <div className="flex-1 max-w-3xl hidden md:flex items-center lg:mx-8">
          <div className="w-full">
            <ProductSearch fullPage />
          </div>
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

      {/* Mobil Kalıcı Arama Çubuğu */}
      <div className="md:hidden px-4 pb-3 pt-0.5 bg-white border-b border-slate-100">
        <ProductSearch fullPage />
      </div>

      {/* Mobil Kayar Menü Çekmecesi (Off-Canvas Drawer - React Portal ile Body'ye bağlanır) */}
      {mounted && createPortal(
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-[9999] md:hidden">
              {/* Arka Plan Karartma (Tam Ekran) */}
              <motion.div 
                key="mobile-menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />

              {/* Çekmece Paneli (Tam Ekran Yüksekliği - Sol taraftan akıcı animasyon) */}
              <motion.div
                key="mobile-menu-panel"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="fixed inset-y-0 left-0 w-[85%] max-w-[320px] h-[100dvh] bg-white shadow-2xl flex flex-col z-[10000]"
              >
                {/* Çekmece Başlığı */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                  <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                    <Image 
                      src="/logo.png" 
                      alt="sescim.com" 
                      width={120} 
                      height={38} 
                      className="object-contain h-7 w-auto" 
                      priority
                    />
                  </Link>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-brand-red active:scale-95 transition-all shadow-xs"
                    aria-label="Menüyü Kapat"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Kullanıcı Giriş Durumu */}
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red shrink-0">
                      <User size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-400 font-medium leading-none mb-1">Hoş Geldiniz</div>
                      <div className="text-sm font-bold truncate max-w-[150px]">
                        {user ? (user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hesabım') : 'Giriş Yap / Üye Ol'}
                      </div>
                    </div>
                  </div>
                  <Link 
                    href={user ? '/hesabim' : '/uye'} 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded font-display uppercase tracking-wider font-semibold transition-colors shrink-0"
                  >
                    {user ? 'Hesap' : 'Giriş'}
                  </Link>
                </div>

                {/* Hızlı Kısayollar (Fırsatlar, Kuponlar, Outlet, Favoriler) */}
                <div className="grid grid-cols-4 gap-1 p-2 bg-slate-100 border-b border-slate-200 text-center shrink-0">
                  <Link
                    href="/firsatlar"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-1 rounded bg-white hover:bg-red-50 text-[10px] font-display font-bold uppercase text-slate-800 hover:text-brand-red flex flex-col items-center gap-1 shadow-xs transition-colors"
                  >
                    <Zap size={14} className="text-brand-red" />
                    <span>Fırsat</span>
                  </Link>
                  <Link
                    href="/kampanyalar"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-1 rounded bg-white hover:bg-amber-50 text-[10px] font-display font-bold uppercase text-slate-800 hover:text-amber-700 flex flex-col items-center gap-1 shadow-xs transition-colors"
                  >
                    <Gift size={14} className="text-amber-600" />
                    <span>Kupon</span>
                  </Link>
                  <Link
                    href="/outlet"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-1 rounded bg-white hover:bg-purple-50 text-[10px] font-display font-bold uppercase text-slate-800 hover:text-purple-700 flex flex-col items-center gap-1 shadow-xs transition-colors"
                  >
                    <Tag size={14} className="text-purple-600" />
                    <span>Outlet</span>
                  </Link>
                  <Link
                    href="/favoriler"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-1 rounded bg-white hover:bg-rose-50 text-[10px] font-display font-bold uppercase text-slate-800 hover:text-rose-600 flex flex-col items-center gap-1 shadow-xs transition-colors"
                  >
                    <Heart size={14} className="text-rose-500" />
                    <span>Favori</span>
                  </Link>
                </div>

                {/* Kategoriler Listesi (Scroll edilebilir alan) */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-white custom-scrollbar">
                  <div className="text-[10px] font-display font-black uppercase tracking-widest text-slate-400 mb-2 px-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Compass size={13} className="text-brand-red" />
                      Tüm Kategoriler
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">9 Kategori</span>
                  </div>
                  {NEW_KATEGORI_HIYERARSI.map((kat) => {
                    const Icon = categoryIcons[kat.name] || ChevronRight
                    return (
                      <Link 
                        key={kat.slug} 
                        href={`/urunler/${kat.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-brand-red transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={16} className="text-slate-400 group-hover:text-brand-red" />
                          <span>{kat.name}</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-300" />
                      </Link>
                    )
                  })}
                </div>

                {/* Alt Destek & İletişim */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 pb-safe shrink-0">
                  <a 
                    href="https://wa.me/905323934370"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold font-display uppercase tracking-wider shadow-xs transition-colors"
                  >
                    WhatsApp Destek
                  </a>
                  <a 
                    href="tel:+903522316915"
                    className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold font-display uppercase tracking-wider transition-colors"
                  >
                    <Phone size={13} className="text-brand-red" />
                    +90 352 231 69 15
                  </a>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

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
