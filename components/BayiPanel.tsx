'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { LogOut, Package, Phone, Clock, CheckCircle, XCircle, Search, X, RotateCcw, FileText, Settings, LayoutDashboard, Box, ChevronDown, ChevronUp } from 'lucide-react'
import { ProductCard } from './ProductGrid'
import type { User } from '@supabase/supabase-js'
import { addManyToCart } from '@/lib/cart'
import { TUM_KATEGORILER } from '@/lib/categories'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import BayiTeklifAyarlari from './BayiTeklifAyarlari'
import BayiTeklifOlusturucu from './BayiTeklifOlusturucu'

const KATEGORILER = TUM_KATEGORILER

interface Bayi {
  id: string
  firma_adi: string
  yetkili_adi: string
  onaylandi: boolean
  sehir: string
}

interface Urun {
  id: string
  ad: string
  aciklama: string
  kategori: string
  fotograflar: string[]
  fiyat: number
  bayi_fiyati: number | null
  stok_durumu: string
  fiyat_guncelleme: string | null
  stok_adedi?: number | null
  kritik_stok?: number | null
  marka?: string | null
  kullanim_alani?: string | null
}

interface Siparis {
  id: string
  siparis_no: string
  created_at: string
  toplam_tutar: number
  durum: string
  urunler: Array<{
    urun_id?: string
    ad: string
    adet: number
    fiyat: number
    fotograf?: string
  }>
}

export default function BayiPanel({ user }: { user: User }) {
  const [bayi, setBayi] = useState<Bayi | null>(null)
  const [urunler, setUrunler] = useState<Urun[]>([])
  const [loading, setLoading] = useState(true)
  const [siparisler, setSiparisler] = useState<Siparis[]>([])
  const [counts, setCounts] = useState({ total: 0, withPrice: 0, recent: 0 })
  const [repeatMsg, setRepeatMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'proposals' | 'settings'>('dashboard')
  const [expandedOrders, setExpandedOrders] = useState<string[]>([])
  const supabase = useRef(createClient()).current

  const toggleOrder = (id: string) => {
    setExpandedOrders(prev => prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id])
  }

  useEffect(() => {
    const load = async () => {
      // Bayi bilgilerini çekmeyi dene ama bulamazsan da hata verme
      const { data: bayiData } = await supabase
        .from('bayiler')
        .select('id, firma_adi, yetkili_adi, telefon, sehir, onaylandi')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (bayiData) {
        setBayi(bayiData)
      }

      // İstatistikleri çek (Veriyi indirmeden sadece say)
      const [{ count: total }, { count: withPrice }, { count: recent }] = await Promise.all([
        supabase.from('urunler').select('*', { count: 'exact', head: true }),
        supabase.from('urunler').select('*', { count: 'exact', head: true }).not('bayi_fiyati', 'is', null),
        supabase.from('urunler').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ])
      
      setCounts({ 
        total: total || 0, 
        withPrice: withPrice || 0, 
        recent: recent || 0 
      })

      // Siparişlerin tüm detaylarını çek
      const { data: siparisData } = await supabase
        .from('siparisler')
        .select('id, siparis_no, created_at, toplam_tutar, durum, urunler')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setSiparisler((siparisData || []) as Siparis[])
      
      setLoading(false)
    }
    load()
  }, [user.id, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (loading) {
    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" />
        </div>
    )
  }



  const recentCount = urunler.filter(u =>
    u.fiyat_guncelleme && (Date.now() - new Date(u.fiyat_guncelleme).getTime()) < 7 * 24 * 60 * 60 * 1000
  ).length

  const handleRepeatOrder = async (siparis: Siparis) => {
    if (!siparis.urunler || !Array.isArray(siparis.urunler) || siparis.urunler.length === 0) {
      setRepeatMsg('Hata: Sipariş içeriği bulunamadı.')
      return
    }

    addManyToCart(
      siparis.urunler.map((u: any, i: number) => ({
        id: u.urun_id || `${siparis.id}-${i}`,
        ad: u.ad,
        kategori: 'Tekrar Sipariş',
        fotograf: u.fotograf || '',
        fiyat: u.fiyat,
        bayi_fiyati: u.fiyat,
        adet: Math.max(1, u.adet || 1),
      }))
    )
    setRepeatMsg(`${siparis.siparis_no} sepete eklendi.`)
    setTimeout(() => setRepeatMsg(''), 3000)
  }

  return (
    <div className="min-h-screen pb-24 bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#0A0A0A] border-b border-white/5 py-10 no-print">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle size={16} className="text-green-400" />
              <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-green-400">Bayi Erişimi</span>
            </div>
            <h1 className="font-display font-black text-3xl uppercase text-white">
              {bayi?.firma_adi || user.user_metadata?.firma_adi || 'Bayi Paneli'}
            </h1>
            <p className="font-body text-white/30 text-sm mt-1">{user.email}</p>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-white/30 hover:text-brand-red font-display font-semibold text-xs tracking-widest uppercase transition-colors">
            <LogOut size={14} />Çıkış
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#0A0A0A] border-b border-white/5 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {[
              { id: 'dashboard', label: 'Özet', icon: LayoutDashboard },
              { id: 'orders', label: 'Sipariş Geçmişi', icon: Clock },
              { id: 'proposals', label: 'Teklif Hazırla', icon: FileText },
              { id: 'settings', label: 'Teklif Ayarları', icon: Settings },
            ].map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-5 font-display font-bold text-[10px] tracking-[0.2em] uppercase transition-all relative ${
                    active ? 'text-brand-red' : 'text-white/40 hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                  {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            {/* İstatistikler */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { val: counts.total, label: 'Toplam Ürün', color: 'border-l-brand-red' },
                { val: counts.withPrice, label: 'Bayi Fiyatlı', color: 'border-l-green-500' },
                { val: counts.recent, label: 'Yeni Güncellenen', color: 'border-l-yellow-500' },
                { val: siparisler.length, label: 'Sipariş Sayısı', color: 'border-l-blue-500' },
              ].map(s => (
                <div key={s.label} className={`bg-[#141414] border border-white/5 p-4 border-l-2 ${s.color}`}>
                  <div className="font-display font-black text-2xl text-white">{s.val}</div>
                  <div className="font-body text-white/30 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h2 className="font-display font-bold text-xl uppercase tracking-wide text-white mb-4 red-line">Son Siparişler</h2>
                {siparisler.length === 0 ? (
                  <div className="border border-white/5 bg-[#141414] p-6 text-white/35 text-sm">Henüz siparişiniz bulunmuyor.</div>
                ) : (
                  <div className="space-y-2">
                    {siparisler.slice(0, 5).map((s) => (
                      <div key={s.id} className="border border-white/5 bg-[#141414] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <div className="font-display font-bold text-white">{s.siparis_no}</div>
                          <div className="font-body text-xs text-white/35">{new Date(s.created_at).toLocaleDateString('tr-TR')} • {s.toplam_tutar?.toLocaleString('tr-TR')} ₺</div>
                        </div>
                        <Link href="/sepet" className="btn-outline text-[10px] px-4 py-2">Detay</Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <h2 className="font-display font-bold text-xl uppercase tracking-wide text-white mb-4 red-line">Hızlı İşlemler</h2>
                <Link href="/bayi/hizli-siparis" className="block p-6 bg-brand-red/5 border border-brand-red/20 hover:bg-brand-red/10 transition-all group">
                   <div className="font-display font-black text-brand-red group-hover:translate-x-1 transition-transform uppercase tracking-widest text-sm mb-1">HIZLI SİPARİŞ →</div>
                   <p className="text-white/40 text-xs">Excel veya stok kodu ile hızlıca sepeti doldur.</p>
                </Link>
                <button onClick={() => setActiveTab('proposals')} className="w-full text-left p-6 bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                   <div className="font-display font-black text-white group-hover:translate-x-1 transition-transform uppercase tracking-widest text-sm mb-1">TEKLİF OLUŞTUR →</div>
                   <p className="text-white/40 text-xs">Müşterine kendi logunla profesyonel teklif yap.</p>
                </button>
              </div>
            </div>
          </div>
        )}



        {activeTab === 'orders' && (
          <div className="space-y-4">
            {siparisler.map((s) => {
              const isExpanded = expandedOrders.includes(s.id)
              return (
                <div key={s.id} className="border border-white/5 bg-[#141414] flex flex-col">
                  {/* Özet Başlığı */}
                  <div 
                    className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => toggleOrder(s.id)}
                  >
                    <div>
                      <div className="font-display font-bold text-lg text-white mb-1 flex items-center gap-3">
                        {s.siparis_no}
                        {isExpanded ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
                      </div>
                      <div className="font-body text-sm text-white/35">
                        {new Date(s.created_at).toLocaleDateString('tr-TR')} • {s.toplam_tutar?.toLocaleString('tr-TR')} ₺
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-[10px] tracking-widest uppercase px-3 py-1 bg-white/5 text-white/40 border border-white/10">{s.durum}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleRepeatOrder(s) }} className="btn-outline text-xs"><RotateCcw size={12} /> Tekrarla</button>
                    </div>
                  </div>
                  
                  {/* Detaylar (Açılır Kapanır) */}
                  {isExpanded && s.urunler && s.urunler.length > 0 && (
                    <div className="border-t border-white/5 p-6 bg-black/20">
                      <div className="font-display font-bold text-xs uppercase tracking-widest text-white/40 mb-4">Sipariş İçeriği</div>
                      <div className="space-y-3">
                        {s.urunler.map((urun, idx) => (
                          <div key={idx} className="flex items-center gap-4 bg-[#0A0A0A] p-3 border border-white/5">
                            <div className="w-12 h-12 bg-black border border-white/10 flex items-center justify-center shrink-0">
                              {urun.fotograf ? (
                                <img src={urun.fotograf} alt={urun.ad} className="w-full h-full object-contain" />
                              ) : (
                                <Package size={20} className="text-white/10" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-display font-bold text-sm text-white truncate">{urun.ad}</div>
                              <div className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">{urun.adet} Adet x {urun.fiyat.toLocaleString('tr-TR')} ₺</div>
                            </div>
                            <div className="font-display font-bold text-brand-red text-sm shrink-0">
                              {(urun.adet * urun.fiyat).toLocaleString('tr-TR')} ₺
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'proposals' && (
          bayi?.id ? <BayiTeklifOlusturucu bayiId={bayi.id} /> : <div className="p-10 text-center text-white/30">Bayi bilgileri yükleniyor...</div>
        )}
        {activeTab === 'settings' && (
          bayi?.id ? <BayiTeklifAyarlari bayiId={bayi.id} /> : <div className="p-10 text-center text-white/30">Bayi bilgileri yükleniyor...</div>
        )}

      </div>
    </div>
  )
}