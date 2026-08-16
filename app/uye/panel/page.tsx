'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Package, Heart, MapPin, User, LogOut, ChevronRight, Clock, CheckCircle, Truck, XCircle } from 'lucide-react'
import type { User as AuthUser } from '@supabase/supabase-js'

interface Siparis {
  id: string
  siparis_no: string
  toplam_tutar: number
  durum: string
  odeme_durumu: string
  created_at: string
  urunler: any[]
}

const statusConfig: Record<string, { label: string; color: string; Icon: any }> = {
  beklemede: { label: 'Beklemede', color: 'text-yellow-400', Icon: Clock },
  hazirlaniyor: { label: 'Hazırlanıyor', color: 'text-blue-400', Icon: Package },
  kargoda: { label: 'Kargoda', color: 'text-purple-400', Icon: Truck },
  teslim_edildi: { label: 'Teslim Edildi', color: 'text-green-400', Icon: CheckCircle },
  iptal: { label: 'İptal Edildi', color: 'text-red-400', Icon: XCircle },
}

export default function UyePanelPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [siparisler, setSiparisler] = useState<Siparis[]>([])
  const [activeTab, setActiveTab] = useState<'siparisler' | 'profil' | 'adresler'>('siparisler')
  const supabase = useRef(createClient()).current

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
      if (data.session?.user) loadSiparisler(data.session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
      setUser(session?.user ?? null)
      if (!session?.user) router.push('/uye')
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const loadSiparisler = async (userId: string) => {
    const { data } = await supabase
      .from('siparisler')
      .select('id, siparis_no, toplam_tutar, durum, odeme_durumu, created_at, urunler')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setSiparisler(data || [])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Üye'

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-10">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Hesabım</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-black text-3xl uppercase text-white">Hoş geldin, {fullName.split(' ')[0]}</h1>
              <p className="font-body text-white/40 text-sm mt-1">{user.email}</p>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-2 text-white/30 hover:text-brand-red font-display font-semibold text-xs tracking-widest uppercase transition-colors">
              <LogOut size={14} /> Çıkış Yap
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1 space-y-2">
            {[
              { id: 'siparisler', label: 'Siparışlerim', icon: Package },
              { id: 'adresler', label: 'Adreslerim', icon: MapPin },
              { id: 'profil', label: 'Profilim', icon: User },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id as any)}
                className={`w-full flex items-center gap-3 px-5 py-4 border transition-all ${
                  activeTab === id
                    ? 'border-brand-red/30 bg-brand-red/5 text-white'
                    : 'border-white/5 bg-[#141414] text-white/40 hover:text-white hover:border-white/10'
                }`}>
                <Icon size={16} className={activeTab === id ? 'text-brand-red' : ''} />
                <span className="font-display font-semibold text-sm uppercase tracking-wide">{label}</span>
                <ChevronRight size={14} className="ml-auto" />
              </button>
            ))}
            <div className="pt-4">
              <Link href="/favoriler"
                className="w-full flex items-center gap-3 px-5 py-4 border border-white/5 bg-[#141414] text-white/40 hover:text-white hover:border-white/10 transition-all">
                <Heart size={16} />
                <span className="font-display font-semibold text-sm uppercase tracking-wide">Favorilerim</span>
                <ChevronRight size={14} className="ml-auto" />
              </Link>
            </div>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            {activeTab === 'siparisler' && (
              <div>
                <h2 className="font-display font-bold text-xl uppercase text-white mb-6">Siparışlerim</h2>
                {siparisler.length === 0 ? (
                  <div className="text-center py-16 bg-[#141414] border border-white/5">
                    <Package size={48} className="mx-auto mb-4 text-white/10" />
                    <p className="font-body text-white/30">Henüz siparişiniz bulunmuyor.</p>
                    <Link href="/urunler" className="mt-6 inline-flex items-center gap-2 bg-brand-red text-white px-6 py-3 font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all">
                      Alışverişe Başla
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {siparisler.map(siparis => {
                      const status = statusConfig[siparis.durum] || statusConfig.beklemede
                      const StatusIcon = status.Icon
                      return (
                        <div key={siparis.id} className="bg-[#141414] border border-white/5 p-5 hover:border-white/10 transition-all">
                          {/* Order Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-display font-bold text-white text-base">{siparis.siparis_no}</div>
                              <div className="font-body text-white/40 text-xs mt-1">
                                {new Date(siparis.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`flex items-center gap-1.5 justify-end ${status.color} font-display font-bold text-xs tracking-wider uppercase`}>
                                <StatusIcon size={13} />
                                {status.label}
                              </div>
                              <div className="font-display font-black text-lg text-white mt-1">
                                {siparis.toplam_tutar.toLocaleString('tr-TR')} TL
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {siparis.durum !== 'iptal' && (
                            <div className="mt-6">
                              <div className="relative">
                                {/* Track */}
                                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2"></div>
                                
                                {/* Active Track */}
                                {(() => {
                                  const steps = ['beklemede', 'hazirlaniyor', 'kargoda', 'teslim_edildi'];
                                  const currentIndex = steps.indexOf(siparis.durum);
                                  const progress = currentIndex === -1 ? 0 : (currentIndex / (steps.length - 1)) * 100;
                                  return (
                                    <div 
                                      className="absolute top-1/2 left-0 h-0.5 bg-brand-red -translate-y-1/2 transition-all duration-500" 
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  );
                                })()}
                                
                                {/* Steps */}
                                <div className="relative flex justify-between">
                                  {[
                                    { key: 'beklemede', label: 'Alındı' },
                                    { key: 'hazirlaniyor', label: 'Hazırlanıyor' },
                                    { key: 'kargoda', label: 'Kargoda' },
                                    { key: 'teslim_edildi', label: 'Teslim Edildi' }
                                  ].map((step, idx, arr) => {
                                    const stepIndex = arr.findIndex(s => s.key === step.key);
                                    const currentIndex = arr.findIndex(s => s.key === siparis.durum);
                                    const isCompleted = stepIndex <= currentIndex;
                                    const isCurrent = stepIndex === currentIndex;
                                    
                                    return (
                                      <div key={step.key} className="flex flex-col items-center gap-2 relative z-10 w-1/4">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors bg-[#141414] ${
                                          isCompleted ? 'border-brand-red bg-brand-red' : 'border-white/20'
                                        }`}>
                                          {isCompleted && <CheckCircle size={10} className="text-white" />}
                                        </div>
                                        <span className={`text-[10px] font-display font-bold tracking-widest uppercase text-center ${
                                          isCurrent ? 'text-brand-red' : isCompleted ? 'text-white' : 'text-white/30'
                                        }`}>
                                          {step.label}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {siparis.urunler?.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-white/5 font-body text-xs text-white/30">
                              {siparis.urunler.length} ürün
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profil' && (
              <div>
                <h2 className="font-display font-bold text-xl uppercase text-white mb-6">Profil Bilgilerim</h2>
                <div className="bg-[#141414] border border-white/5 p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-display text-xs tracking-widest uppercase text-white/40 block mb-2">Ad</label>
                      <div className="bg-[#0F0F0F] border border-white/10 px-4 py-3 text-sm font-body text-white/70">
                        {user.user_metadata?.full_name?.split(' ')[0] || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="font-display text-xs tracking-widest uppercase text-white/40 block mb-2">Soyad</label>
                      <div className="bg-[#0F0F0F] border border-white/10 px-4 py-3 text-sm font-body text-white/70">
                        {user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '—'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="font-display text-xs tracking-widest uppercase text-white/40 block mb-2">E-posta</label>
                    <div className="bg-[#0F0F0F] border border-white/10 px-4 py-3 text-sm font-body text-white/70">{user.email}</div>
                  </div>
                  <div>
                    <label className="font-display text-xs tracking-widest uppercase text-white/40 block mb-2">Telefon</label>
                    <div className="bg-[#0F0F0F] border border-white/10 px-4 py-3 text-sm font-body text-white/70">
                      {user.user_metadata?.phone || 'Henüz eklenmemiş'}
                    </div>
                  </div>
                  <div>
                    <label className="font-display text-xs tracking-widest uppercase text-white/40 block mb-2">Kayıt Tarihi</label>
                    <div className="bg-[#0F0F0F] border border-white/10 px-4 py-3 text-sm font-body text-white/70">
                      {new Date(user.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                  <Link href="/uye/sifre-sifirla" className="inline-flex items-center gap-2 text-brand-red font-display font-semibold text-xs tracking-widest uppercase hover:opacity-80 transition-opacity">
                    Şifremi Değiştir <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'adresler' && (
              <div>
                <h2 className="font-display font-bold text-xl uppercase text-white mb-6">Adreslerim</h2>
                <div className="bg-[#141414] border border-white/5 p-8 text-center">
                  <MapPin size={40} className="mx-auto mb-4 text-white/10" />
                  <p className="font-body text-white/40 text-sm">Adres defteri yakında eklenecek.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
