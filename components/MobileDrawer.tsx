'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { 
  X, User, ChevronRight, ChevronLeft, Zap, Gift, Tag, Heart, 
  Search, Phone, ShieldCheck, Check, Copy, 
  Truck, RotateCcw, HelpCircle, LogOut, ArrowRight,
  Speaker, Lightbulb, Monitor, Headphones, Music, Mic, Package, Plug,
  Layers, Award, HelpCircle as SupportIcon, Sparkles
} from 'lucide-react'
import { HIERARCHY_DATA, type CategoryNode } from '@/lib/categories'
import { createClient } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

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

export const TOP_PRO_BRANDS = [
  { id: 'yamaha', name: 'Yamaha', query: 'YAMAHA', logo: '/brands/yamaha-clean.webp', desc: 'Mikser, Hoparlör & Amfi' },
  { id: 'jbl', name: 'JBL', query: 'JBL', logo: '/brands/jbl-clean.webp', desc: 'Hoparlör & Sahne Monitör' },
  { id: 'soundcraft', name: 'Soundcraft', query: 'SOUNDCRAFT', logo: '/brands/soundcraft-clean.webp', desc: 'Dijital & Analog Mikser' },
  { id: 'rcf', name: 'RCF', query: 'RCF', logo: '/brands/rcf-clean.webp', desc: 'Aktif Hoparlör & Line Array' },
  { id: 'ld-systems', name: 'LD Systems', query: 'LD SYSTEMS', logo: '/brands/ld-systems-clean.webp', desc: 'Taşınabilir Sütun Sistemleri' },
  { id: 'allen-heath', name: 'Allen & Heath', query: 'ALLEN&HEATH', logo: '/brands/allen-heath-clean.webp', desc: 'Konser & Stüdyo Mikserleri' },
  { id: 'db-technologies', name: 'dB Technologies', query: 'DB TECHNOLOGIES', logo: '/brands/db-technologies-clean.webp', desc: 'Pro Audio Hoparlör Sistemleri' },
  { id: 'mackie', name: 'Mackie', query: 'MACKIE', logo: '/brands/mackie-clean.webp', desc: 'Mikser & Stüdyo Monitör' },
  { id: 'martin-audio', name: 'Martin Audio', query: 'MARTIN AUDIO', logo: '/brands/martin-audio-clean.webp', desc: 'Premium İngiliz Sahne Sesi' },
  { id: 'audac', name: 'Audac', query: 'AUDAC', logo: '/brands/audac-clean.webp', desc: 'Kurulum & Ticari Ses' },
  { id: 'alto', name: 'Alto Professional', query: 'ALTO', logo: '/brands/alto-clean.webp', desc: 'Aktif PA Hoparlörleri' },
  { id: 'shure', name: 'Shure', query: 'SHURE', logo: '/brands/shure-clean.webp', desc: 'Kablosuz & Vokal Mikrofonları' },
  { id: 'sennheiser', name: 'Sennheiser', query: 'SENNHEISER', logo: '/brands/sennheiser-clean.webp', desc: 'Kulaklık & Telsiz Sistemleri' },
  { id: 'behringer', name: 'Behringer', query: 'BEHRINGER', logo: '/brands/behringer-clean.webp', desc: 'Stüdyo, Mikser & Efektler' },
]

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  user: SupabaseUser | null
  announcementCoupon?: { kod: string; miktar: string } | null
}

type TabType = 'categories' | 'brands' | 'services'

export default function MobileDrawer({
  isOpen,
  onClose,
  user,
  announcementCoupon
}: MobileDrawerProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('categories')
  const [mounted, setMounted] = useState(false)
  const [couponCopied, setCouponCopied] = useState(false)
  const [orderTrackNo, setOrderTrackNo] = useState('')
  const [brandSearch, setBrandSearch] = useState('')
  
  // Drill-down kategori gezinti yığını (Native Slide Navigation)
  // [Level 0 Node, Level 1 Node, ...]
  const [drillStack, setDrillStack] = useState<CategoryNode[]>([])
  const [drillDirection, setDrillDirection] = useState<'forward' | 'backward'>('forward')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Menü kapandığında state'i sıfırla
  useEffect(() => {
    if (!isOpen) {
      setDrillStack([])
      setBrandSearch('')
      setOrderTrackNo('')
    }
  }, [isOpen])

  // ESC tuşu ve scroll lock desteği
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleKeyDown)
      }
    } else {
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleCopyCoupon = () => {
    const code = announcementCoupon?.kod || 'SESCIM5'
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code)
    }
    setCouponCopied(true)
    setTimeout(() => setCouponCopied(false), 2200)
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      onClose()
      window.location.reload()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleOrderTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = orderTrackNo.trim()
    onClose()
    if (clean) {
      router.push(`/siparis-takip?no=${encodeURIComponent(clean)}`)
    } else {
      router.push('/siparis-takip')
    }
  }

  // Drill down aksiyonları
  const pushDrill = (node: CategoryNode) => {
    setDrillDirection('forward')
    setDrillStack((prev) => [...prev, node])
  }

  const popDrill = () => {
    setDrillDirection('backward')
    setDrillStack((prev) => prev.slice(0, -1))
  }

  const resetDrill = () => {
    setDrillDirection('backward')
    setDrillStack([])
  }

  // Aktif drill seviyesi ve listesi
  const currentDepth = drillStack.length
  const currentParent = currentDepth > 0 ? drillStack[currentDepth - 1] : null
  const currentItems = useMemo(() => {
    if (currentDepth === 0) return HIERARCHY_DATA
    return currentParent?.children || []
  }, [currentDepth, currentParent])

  // Markalar sekmesi filtreleme
  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return TOP_PRO_BRANDS
    const q = brandSearch.toLocaleLowerCase('tr')
    return TOP_PRO_BRANDS.filter((b) => 
      b.name.toLocaleLowerCase('tr').includes(q) ||
      b.desc.toLocaleLowerCase('tr').includes(q) ||
      b.query.toLocaleLowerCase('tr').includes(q)
    )
  }, [brandSearch])

  if (!mounted) return null

  // Drill seviyesindeki tam URL yolu
  const getFullCategoryUrl = (extraSlug?: string) => {
    const segments = drillStack.map((n) => n.slug)
    if (extraSlug) segments.push(extraSlug)
    return `/urunler/${segments.join('/')}`
  }

  const couponCode = announcementCoupon?.kod || 'SESCIM5'
  const couponDiscount = announcementCoupon?.miktar || '%5'

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] md:hidden">
          {/* Arka Plan Karartma (Backdrop Blur) */}
          <motion.div
            key="mobile-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Çekmece Paneli (Off-Canvas Drawer) */}
          <motion.div
            key="mobile-drawer-panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 290 }}
            className="fixed inset-y-0 left-0 w-[88%] max-w-[340px] sm:max-w-[360px] h-[100dvh] bg-white shadow-2xl flex flex-col z-[10000] overflow-hidden"
          >
            {/* 1. ÜST HEADER (Logo + Kapat Butonu) */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <Link href="/" onClick={onClose} className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="sescim.com"
                  width={124}
                  height={38}
                  className="object-contain h-7 w-auto"
                  priority
                />
              </Link>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-brand-red active:scale-95 transition-all shadow-xs"
                aria-label="Menüyü Kapat"
              >
                <X size={18} />
              </button>
            </div>

            {/* 2. KULLANICI / GİRİŞ ŞERİDİ */}
            <div className="p-3.5 bg-slate-950 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red shrink-0">
                  <User size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-medium leading-none mb-1">
                    {user ? 'Hoş Geldiniz' : 'Sescim Dünyası'}
                  </div>
                  <div className="text-xs sm:text-sm font-bold truncate max-w-[150px] text-white">
                    {user ? (user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hesabım') : 'Giriş Yap / Üye Ol'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={user ? '/hesabim' : '/uye'}
                  onClick={onClose}
                  className="text-[11px] bg-brand-red hover:bg-red-700 text-white px-3 py-1.5 rounded-md font-display uppercase tracking-wider font-bold transition-all shadow-2xs active:scale-95"
                >
                  {user ? 'Hesabım' : 'Giriş'}
                </Link>
                {user && (
                  <button
                    onClick={handleLogout}
                    title="Çıkış Yap"
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
                  >
                    <LogOut size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* 3. HIZLI KISAYOLLAR ŞERİDİ (Fırsat, Kupon, Outlet, Favoriler) */}
            <div className="grid grid-cols-4 gap-1 p-2 bg-slate-100 border-b border-slate-200 text-center shrink-0">
              <Link
                href="/firsatlar"
                onClick={onClose}
                className="py-2 px-1 rounded-lg bg-white hover:bg-red-50 text-[10px] font-display font-bold uppercase text-slate-800 hover:text-brand-red flex flex-col items-center gap-1 shadow-2xs transition-all active:scale-95"
              >
                <Zap size={15} className="text-brand-red" />
                <span>Fırsat</span>
              </Link>
              <Link
                href="/kampanyalar"
                onClick={onClose}
                className="py-2 px-1 rounded-lg bg-white hover:bg-amber-50 text-[10px] font-display font-bold uppercase text-slate-800 hover:text-amber-700 flex flex-col items-center gap-1 shadow-2xs transition-all active:scale-95"
              >
                <Gift size={15} className="text-amber-600" />
                <span>Kupon</span>
              </Link>
              <Link
                href="/outlet"
                onClick={onClose}
                className="py-2 px-1 rounded-lg bg-white hover:bg-purple-50 text-[10px] font-display font-bold uppercase text-slate-800 hover:text-purple-700 flex flex-col items-center gap-1 shadow-2xs transition-all active:scale-95"
              >
                <Tag size={15} className="text-purple-600" />
                <span>Outlet</span>
              </Link>
              <Link
                href="/favoriler"
                onClick={onClose}
                className="py-2 px-1 rounded-lg bg-white hover:bg-rose-50 text-[10px] font-display font-bold uppercase text-slate-800 hover:text-rose-600 flex flex-col items-center gap-1 shadow-2xs transition-all active:scale-95"
              >
                <Heart size={15} className="text-rose-500" />
                <span>Favori</span>
              </Link>
            </div>

            {/* 4. GÜNÜN KUPONU KARTI (Tek Dokunuşla Kopyalama) */}
            <div className="px-3 pt-2.5 pb-2 bg-white border-b border-slate-100 shrink-0">
              <div 
                onClick={handleCopyCoupon}
                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                  couponCopied 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs' 
                    : 'bg-gradient-to-r from-red-50/60 via-amber-50/40 to-slate-50 border-dashed border-brand-red/30 hover:border-brand-red text-slate-800'
                }`}
                role="button"
                tabIndex={0}
                aria-label={`Kupon kodunu kopyala: ${couponCode}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${couponCopied ? 'bg-emerald-500 text-white' : 'bg-brand-red/10 text-brand-red'}`}>
                    {couponCopied ? <Check size={14} className="stroke-[3]" /> : <Sparkles size={14} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      İlk Siparişe <span className="text-brand-red font-black">{couponDiscount} İndirim</span>
                    </div>
                    <div className="font-mono text-xs font-black tracking-wider text-slate-900 flex items-center gap-1">
                      <span>{couponCode}</span>
                    </div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 transition-colors flex items-center gap-1 ${
                  couponCopied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-brand-red'
                }`}>
                  {couponCopied ? (
                    <>
                      <Check size={11} />
                      <span>Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>Kopyala</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 5. SEKMELER (TABS: Kategoriler | Markalar | Hizmetler) */}
            <div className="flex items-center bg-slate-100/90 border-b border-slate-200 shrink-0 p-1 gap-1">
              <button
                onClick={() => setActiveTab('categories')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-display font-bold uppercase tracking-wider rounded-md transition-all ${
                  activeTab === 'categories'
                    ? 'bg-white text-brand-red shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Layers size={13} className={activeTab === 'categories' ? 'text-brand-red' : 'text-slate-400'} />
                <span>Kategoriler</span>
              </button>

              <button
                onClick={() => setActiveTab('brands')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-display font-bold uppercase tracking-wider rounded-md transition-all ${
                  activeTab === 'brands'
                    ? 'bg-white text-brand-red shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Award size={13} className={activeTab === 'brands' ? 'text-brand-red' : 'text-slate-400'} />
                <span>Markalar</span>
              </button>

              <button
                onClick={() => setActiveTab('services')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-display font-bold uppercase tracking-wider rounded-md transition-all ${
                  activeTab === 'services'
                    ? 'bg-white text-brand-red shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <SupportIcon size={13} className={activeTab === 'services' ? 'text-brand-red' : 'text-slate-400'} />
                <span>Hizmetler</span>
              </button>
            </div>

            {/* 6. SEKME İÇERİK ALANI (Scrollable Body) */}
            <div className="flex-1 overflow-y-auto bg-white custom-scrollbar relative">
              {/* SEKME 1: KATEGORİLER (NATIVE DRILL-DOWN KAYDIRMALI EKRAN) */}
              {activeTab === 'categories' && (
                <div className="p-3">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`drill-level-${currentDepth}-${currentParent?.slug || 'root'}`}
                      initial={{ 
                        opacity: 0, 
                        x: drillDirection === 'forward' ? 30 : -30 
                      }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ 
                        opacity: 0, 
                        x: drillDirection === 'forward' ? -30 : 30 
                      }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="space-y-1.5"
                    >
                      {/* ROOT SEVİYESİNDE: "Tüm Ürünler" Hızlı Butonu */}
                      {currentDepth === 0 && (
                        <div className="mb-2">
                          <Link
                            href="/urunler"
                            onClick={onClose}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 text-white hover:bg-brand-red transition-all shadow-xs group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-brand-red group-hover:bg-white transition-colors" />
                              <span className="text-xs font-display font-black uppercase tracking-wider">
                                Tüm Kataloğu İncele
                              </span>
                            </div>
                            <ArrowRight size={14} className="text-slate-400 group-hover:text-white transition-colors" />
                          </Link>
                        </div>
                      )}

                      {/* DERİN SEVİYELERDE (Level 1 & 2): "← Geri" Başlığı ve Doğrudan Kategoriye Git Linki */}
                      {currentDepth > 0 && currentParent && (
                        <div className="mb-3 space-y-2 pb-2 border-b border-slate-200">
                          {/* Geri Butonu */}
                          <button
                            onClick={popDrill}
                            className="inline-flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider text-slate-600 hover:text-brand-red px-2 py-1 rounded bg-slate-100 hover:bg-red-50 transition-colors"
                          >
                            <ChevronLeft size={16} />
                            <span>
                              {currentDepth === 1 ? 'Tüm Kategoriler' : drillStack[currentDepth - 2]?.name}
                            </span>
                          </button>

                          {/* Aktif Kategori Başlığı ve Doğrudan Tüm Ürünlerine Git Butonu */}
                          <div className="p-2.5 rounded-lg bg-red-50/70 border border-red-200/60">
                            <div className="text-[10px] font-display font-bold uppercase text-brand-red tracking-wider mb-0.5">
                              Seçili Kategori
                            </div>
                            <div className="font-display font-black text-sm text-slate-900 uppercase tracking-tight mb-2">
                              {currentParent.name}
                            </div>
                            <Link
                              href={getFullCategoryUrl()}
                              onClick={onClose}
                              className="w-full flex items-center justify-between px-3 py-1.5 bg-brand-red hover:bg-red-700 text-white rounded-md text-xs font-display font-bold uppercase tracking-wider transition-all shadow-2xs"
                            >
                              <span>Tüm {currentParent.name} Ürünleri</span>
                              <ArrowRight size={13} />
                            </Link>
                          </div>

                          <div className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-400 px-1 pt-1">
                            Alt Kategoriler ({currentItems.length})
                          </div>
                        </div>
                      )}

                      {/* Kategori Öğeleri Listesi */}
                      {currentItems.map((item) => {
                        const hasChildren = Boolean(item.children && item.children.length > 0)
                        const Icon = currentDepth === 0 ? (categoryIcons[item.name] || ChevronRight) : null

                        if (hasChildren) {
                          // Alt kategorileri olan öğe: Tıklayınca daha derine kayar (Drill-Down)
                          return (
                            <button
                              key={item.slug}
                              onClick={() => pushDrill(item)}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-brand-red active:bg-red-50 transition-all group border border-transparent hover:border-slate-200"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {Icon && (
                                  <div className="w-6 h-6 rounded bg-slate-100 group-hover:bg-red-100 text-slate-500 group-hover:text-brand-red flex items-center justify-center shrink-0 transition-colors">
                                    <Icon size={14} />
                                  </div>
                                )}
                                <span className="truncate text-left">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 text-slate-400 group-hover:text-brand-red">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {item.children?.length}
                                </span>
                                <ChevronRight size={15} />
                              </div>
                            </button>
                          )
                        }

                        // En uç yaprak kategori: Doğrudan ürün sayfasına gider
                        const itemUrl = getFullCategoryUrl(item.slug)
                        return (
                          <Link
                            key={item.slug}
                            href={itemUrl}
                            onClick={onClose}
                            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-brand-red transition-all group"
                          >
                            <span className="truncate">{item.name}</span>
                            <ArrowRight size={13} className="text-slate-300 group-hover:text-brand-red transition-colors shrink-0" />
                          </Link>
                        )
                      })}
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}

              {/* SEKME 2: POPÜLER MARKALAR VİTRİNİ */}
              {activeTab === 'brands' && (
                <div className="p-3 space-y-3">
                  {/* Marka Arama Kutusu */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      placeholder="Marka ara (Yamaha, JBL, RCF...)"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-brand-red focus:bg-white transition-all"
                    />
                    {brandSearch && (
                      <button
                        onClick={() => setBrandSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Marka Kartları Grid (2 Sütun) */}
                  <div className="grid grid-cols-2 gap-2">
                    {filteredBrands.map((brand) => (
                      <Link
                        key={brand.id}
                        href={`/urunler?marka=${encodeURIComponent(brand.query)}`}
                        onClick={onClose}
                        className="group flex flex-col p-2.5 rounded-xl border border-slate-200 hover:border-brand-red bg-slate-50/50 hover:bg-white shadow-2xs hover:shadow-xs transition-all text-left"
                      >
                        {/* Logo Çerçevesi */}
                        <div className="h-10 w-full flex items-center justify-center p-1 bg-white rounded-lg border border-slate-100 mb-2 group-hover:border-red-100 transition-colors">
                          <Image
                            src={brand.logo}
                            alt={`${brand.name} logosu`}
                            width={110}
                            height={34}
                            className="max-h-7 max-w-full object-contain filter contrast-105 group-hover:scale-105 transition-transform"
                          />
                        </div>
                        {/* Marka İsmi ve Açıklama */}
                        <div className="font-display font-black text-xs uppercase tracking-wider text-slate-900 group-hover:text-brand-red transition-colors truncate">
                          {brand.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                          {brand.desc}
                        </div>
                      </Link>
                    ))}
                  </div>

                  {filteredBrands.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-500">
                      &quot;{brandSearch}&quot; ile eşleşen marka bulunamadı.
                    </div>
                  )}

                  {/* Tüm Markaları Listele Butonu */}
                  <div className="pt-2">
                    <Link
                      href="/urunler"
                      onClick={onClose}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-300 hover:border-brand-red text-slate-700 hover:text-brand-red text-xs font-display font-bold uppercase tracking-wider transition-colors"
                    >
                      <span>Tüm Ürünler ve Marka Filtreleri</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              )}

              {/* SEKME 3: HİZMETLER & MÜŞTERİ YARDIMI */}
              {activeTab === 'services' && (
                <div className="p-3 space-y-3">
                  {/* Hızlı Sipariş Takip Kutusu */}
                  <form onSubmit={handleOrderTrackSubmit} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <Truck size={15} className="text-brand-red shrink-0" />
                      <div className="font-display font-black text-xs uppercase tracking-wider text-slate-900">
                        Hızlı Sipariş Sorgulama
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight">
                      Sipariş numaranız ile anlık kargo durumunu kontrol edin.
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <input
                        type="text"
                        value={orderTrackNo}
                        onChange={(e) => setOrderTrackNo(e.target.value)}
                        placeholder="Örn: SC-82910"
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono uppercase placeholder:normal-case placeholder:font-sans focus:outline-hidden focus:border-brand-red"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-brand-red hover:bg-red-700 text-white rounded-md text-xs font-display font-bold uppercase tracking-wider transition-colors shrink-0 shadow-2xs active:scale-95"
                      >
                        Sorgula
                      </button>
                    </div>
                  </form>

                  {/* Hızlı Müşteri Hizmet Linkleri */}
                  <div className="space-y-1">
                    {[
                      { href: '/teslimat-ve-kargo', label: 'Teslimat & Kargo Politikası', desc: 'Aynı gün kargo detayları', icon: Truck },
                      { href: '/iptal-ve-iade', label: 'İptal ve İade Koşulları', desc: '14 gün koşulsuz güvence', icon: RotateCcw },
                      { href: '/iletisim', label: 'İletişim', desc: 'Müşteri hizmetleri ve mağaza bilgileri', icon: Phone },
                      { href: '/hakkimizda', label: 'Hakkımızda', desc: '1993\'ten beri Akdağ Elektronik', icon: HelpCircle },
                    ].map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-red-100 text-slate-600 group-hover:text-brand-red flex items-center justify-center shrink-0 transition-colors">
                              <Icon size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 group-hover:text-brand-red transition-colors">
                                <span className="truncate">{item.label}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {item.desc}
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-red transition-colors shrink-0" />
                        </Link>
                      )
                    })}
                  </div>

                  {/* Distribütör Güvencesi Rozet Kartı */}
                  <div className="p-3 rounded-xl bg-slate-900 text-white space-y-1.5">
                    <div className="flex items-center gap-2 text-brand-red font-display font-black text-[11px] uppercase tracking-wider">
                      <ShieldCheck size={16} />
                      <span>Distribütör Güvencesi</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-body">
                      Tüm ürünlerimiz resmi Türkiye distribütörlerinden temin edilir; adınıza faturalı ve 2 yıl garantilidir.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 7. ALT SABİT DESTEK & İLETİŞİM (Sticky Footer) */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 space-y-2 pb-safe shrink-0 shadow-lg">
              {/* Canlı Ses Mühendisi Göstergesi */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>Ses Uzmanı Çevrimiçi</span>
                </div>
                <span className="text-[10px] text-slate-400 font-display uppercase tracking-wider">
                  09:00 - 19:00
                </span>
              </div>

              {/* WhatsApp Butonu */}
              <a
                href="https://wa.me/908503053870"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold font-display uppercase tracking-wider shadow-xs transition-all active:scale-[0.99]"
              >
                <span>WhatsApp Canlı Destek</span>
              </a>

              {/* Telefon Çağrı Butonu */}
              <a
                href="tel:+908503053870"
                className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-colors shadow-2xs"
              >
                <Phone size={13} className="text-brand-red" />
                <span>0850 305 38 70</span>
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
