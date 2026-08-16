'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { LogOut, Package, Users, ShoppingBag, LayoutDashboard, Layers, Mail, Download, Tag, MessageSquare, LifeBuoy, Zap, Merge } from 'lucide-react'
import dynamic from 'next/dynamic'

const AdminDashboard = dynamic(() => import('./AdminDashboard'), {
  loading: () => <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
})
const AdminSiparisler = dynamic(() => import('./AdminSiparisler'), {
  loading: () => <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
})
const AdminAddProduct = dynamic(() => import('./AdminAddProduct'), {
  loading: () => <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
})
const AdminProductList = dynamic(() => import('./AdminProductList'), {
  loading: () => <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
})
const AdminCampaignManager = dynamic(() => import('./AdminCampaignManager'), {
  loading: () => <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
})
const AdminBanners = dynamic(() => import('./AdminBanners'), {
  loading: () => <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
})
const AdminAkdagImport = dynamic(() => import('./AdminAkdagImport'), {
  loading: () => <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
})
const AdminUyeYonetim = dynamic(() => import('./AdminUyeYonetim'), {
  loading: () => <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
})
const AdminKuponYonetim = dynamic(() => import('./AdminKuponYonetim'), {
  loading: () => <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
})
const AdminYorumYonetimi = dynamic(() => import('./AdminYorumYonetimi'), {
  loading: () => <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
})
const AdminDestekYonetimi = dynamic(() => import('./AdminDestekYonetimi'), {
  loading: () => <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
})
const AdminFirsatYonetimi = dynamic(() => import('./AdminFirsatYonetimi'), {
  loading: () => <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
})
const AdminMarkaYonetimi = dynamic(() => import('./AdminMarkaYonetimi'), {
  loading: () => <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
})

import AdminLoginForm from './AdminLoginForm'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'

interface AdminClientProps {
  onSuccess?: () => void
}

type Tab = 'dashboard' | 'siparisler' | 'urunler' | 'markalar' | 'import' | 'uyeler' | 'kupon' | 'kampanya' | 'banner' | 'yorumlar' | 'destek' | 'firsatlar'

export default function AdminClient({ onSuccess }: AdminClientProps) {
  const [user, setUser] = useState<User | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [bekleyenSiparis, setBekleyenSiparis] = useState(0)
  const supabase = useRef(createClient()).current

  useEffect(() => {
    supabase.auth.getSession().then((response: any) => {
      const session = response.data.session
      setUser(session?.user ?? null)
      setLoading(false)
      if (session) { loadBekleyenSiparis() }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
      if (session) {
        loadBekleyenSiparis()
        if (onSuccess) onSuccess()
      }
      else setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [onSuccess])

  const loadBekleyenSiparis = async () => {
    const { count } = await supabase.from('siparisler').select('*', { count: 'exact', head: true }).eq('durum', 'beklemede')
    setBekleyenSiparis(count || 0)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="w-full max-w-md px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="font-display leading-none text-left">
                <div className="text-white font-black text-3xl tracking-wide uppercase">sescim</div>
                <div className="text-brand-red text-sm tracking-[0.3em] uppercase">.com</div>
              </div>
            </div>
            <h1 className="font-display font-black text-2xl uppercase text-white tracking-widest">Admin Girişi</h1>
            <p className="font-body text-white/30 text-sm mt-2">Yönetim paneline erişmek için giriş yapın.</p>
          </div>
          <div className="bg-[#141414] border border-white/8 p-8">
            <AdminLoginForm onSuccess={() => {
              supabase.auth.getSession().then((response: any) => {
                const session = response.data.session;
                if (session) {
                  setUser(session.user);
                  loadBekleyenSiparis()
                  if (onSuccess) onSuccess()
                }
              })
            }} />
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'siparisler' as Tab, label: 'Siparişler', icon: ShoppingBag, badge: bekleyenSiparis },
    { id: 'urunler' as Tab, label: 'Ürünler', icon: Package },
    { id: 'markalar' as Tab, label: 'Markalar', icon: Merge },
    { id: 'import' as Tab, label: 'Akdağ\'dan İçe Aktar', icon: Download },
    { id: 'uyeler' as Tab, label: 'Üye Yönetimi', icon: Users },
    { id: 'kupon' as Tab, label: 'Kupon Yönetimi', icon: Tag },
    { id: 'kampanya' as Tab, label: 'Toplu Mail', icon: Mail },
    { id: 'banner' as Tab, label: 'Vitrin & Banner', icon: Layers },
    { id: 'yorumlar' as Tab, label: 'Yorum Yönetimi', icon: MessageSquare },
    { id: 'destek' as Tab, label: 'Destek Talepleri', icon: LifeBuoy },
    { id: 'firsatlar' as Tab, label: 'Flaş İndirimler', icon: Zap },
  ]

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-[#0A0A0A] border-b border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-px bg-brand-red" />
              <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Yönetim Paneli</span>
            </div>
            <h1 className="font-display font-black text-4xl uppercase text-white">ADMİN PANELİ</h1>
            <p className="font-body text-white/30 text-sm mt-1">sescim.com — {user.email}</p>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-white/30 hover:text-brand-red font-display font-semibold text-xs tracking-widest uppercase transition-colors">
            <LogOut size={14} />Çıkış
          </button>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="bg-[#0A0A0A] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 font-display font-semibold text-xs tracking-widest uppercase border-b-2 transition-all duration-200 whitespace-nowrap relative flex-shrink-0 ${
                  activeTab === tab.id ? 'border-brand-red text-white' : 'border-transparent text-white/30 hover:text-white/60'
                }`}>
                <Icon size={14} />
                {tab.label}
                {'badge' in tab && tab.badge ? (
                  <span className="w-4 h-4 bg-brand-red text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* İçerik */}
      <div className="max-w-7xl mx-auto px-6 pt-10">
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'siparisler' && <AdminSiparisler />}

        {activeTab === 'urunler' && (
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-1">
              <h2 className="font-display font-bold text-xl uppercase tracking-wide text-white mb-6 red-line">Yeni Ürün Ekle</h2>
              <AdminAddProduct onAdded={() => setRefreshTrigger(prev => prev + 1)} />
            </div>
            <div className="lg:col-span-2">
              <h2 className="font-display font-bold text-xl uppercase tracking-wide text-white mb-6 red-line">Mevcut Ürünler</h2>
              <AdminProductList refreshTrigger={refreshTrigger} />
            </div>
          </div>
        )}

        {activeTab === 'import' && <AdminAkdagImport onImported={() => setRefreshTrigger(prev => prev + 1)} />}
        {activeTab === 'uyeler' && <AdminUyeYonetim />}
        {activeTab === 'kupon' && <AdminKuponYonetim />}
        {activeTab === 'kampanya' && <AdminCampaignManager />}
        {activeTab === 'banner' && <AdminBanners supabase={supabase} />}
        {activeTab === 'yorumlar' && <AdminYorumYonetimi />}
        {activeTab === 'destek' && <AdminDestekYonetimi />}
        {activeTab === 'firsatlar' && <AdminFirsatYonetimi />}
        {activeTab === 'markalar' && <AdminMarkaYonetimi />}
      </div>
    </div>
  )
}