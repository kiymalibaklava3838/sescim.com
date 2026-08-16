'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Package, Truck, Clock, CheckCircle, XCircle, LogOut, Store, Upload, Check, AlertCircle, Loader2, FileText, User as UserIcon, Settings, Building2, Phone, MapPin, Save, RefreshCw, Info, ExternalLink } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface Bayi {
  id: string
  firma_adi: string
  yetkili_adi: string
  telefon: string
  sehir: string
  onaylandi: boolean
  user_id: string
}

interface Siparis {
  id: string
  siparis_no: string
  toplam_tutar: number
  durum: string
  odeme_durumu: string
  odeme_tipi: string
  created_at: string
  kargo_takip_no?: string
  teslimat_tipi?: string
  dekont_url?: string
  teslimat_adresi?: string
  dolar_kuru?: number
  euro_kuru?: number
  fatura_tipi?: string
  firma_unvani?: string
  vergi_no?: string
  vergi_dairesi?: string
  urunler: any[]
}

const DURUM_MAP: Record<string, { label: string, color: string, icon: React.ElementType }> = {
  beklemede:     { label: 'Sipariş Alındı', color: 'text-yellow-400', icon: Clock },
  onaylandi:     { label: 'Onaylandı',      color: 'text-blue-400',   icon: CheckCircle },
  hazirlaniyor:  { label: 'Hazırlanıyor',   color: 'text-purple-400', icon: Package },
  kargolandi:    { label: 'Kargolandı',     color: 'text-brand-red',  icon: Truck },
  teslim_edildi: { label: 'Teslim Edildi',  color: 'text-green-400',  icon: CheckCircle },
  iptal:         { label: 'İptal Edildi',   color: 'text-red-400',    icon: XCircle },
  tamamlandi:    { label: 'Tamamlandı',     color: 'text-green-400',  icon: CheckCircle },
}

export default function HesabimPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [siparisler, setSiparisler] = useState<Siparis[]>([])
  const [bayi, setBayi] = useState<Bayi | null>(null)
  const [activeTab, setActiveTab] = useState<'siparisler' | 'profil'>('siparisler')
  const [expandedOrders, setExpandedOrders] = useState<string[]>([])
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  
  // Form States
  const [firmaAdi, setFirmaAdi] = useState('')
  const [yetkiliAdi, setYetkiliAdi] = useState('')
  const [telefon, setTelefon] = useState('')
  const [sehir, setSehir] = useState('')

  // Password States
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const supabase = useRef(createClient()).current
  const accessTokenRef = useRef<string | null>(null)

  useEffect(() => {
    loadUserAndOrders()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadUserAndOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      router.push('/bayi')
      return
    }

    setUser(session.user)
    // Token'ı sakla — korumalı API çağrıları için kullanılacak
    accessTokenRef.current = session.access_token

    // Siparişleri yükle — tüm gerekli alanlar dahil
    const { data: orders } = await supabase
      .from('siparisler')
      .select('id, siparis_no, created_at, toplam_tutar, durum, urunler, kargo_takip_no, odeme_durumu, odeme_tipi, teslimat_tipi, dekont_url, teslimat_adresi, fatura_tipi, firma_unvani, vergi_no, vergi_dairesi')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    setSiparisler(orders || [])

    // Bayi bilgilerini yükle
    const { data: bayiData } = await supabase
      .from('bayiler')
      .select('id, firma_adi, yetkili_adi, telefon, sehir')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (bayiData) {
      setBayi(bayiData)
      setFirmaAdi(bayiData.firma_adi || '')
      setYetkiliAdi(bayiData.yetkili_adi || '')
      setTelefon(bayiData.telefon || '')
      setSehir(bayiData.sehir || '')
    }

    setLoading(false)
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bayi) return

    setSavingProfile(true)
    setSaveSuccess(false)

    try {
      const { error } = await supabase
        .from('bayiler')
        .update({
          firma_adi: firmaAdi,
          yetkili_adi: yetkiliAdi,
          telefon: telefon,
          sehir: sehir,
        })
        .eq('id', bayi.id)

      if (error) throw error
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      
      // Update local state
      setBayi({ ...bayi, firma_adi: firmaAdi, yetkili_adi: yetkiliAdi, telefon, sehir })
    } catch (err: any) {
      alert(`Güncelleme hatası: ${err.message}`)
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      alert('Şifreler eşleşmiyor.')
      return
    }
    if (newPassword.length < 6) {
      alert('Şifre en az 6 karakter olmalıdır.')
      return
    }

    setSavingPassword(true)
    setPasswordSuccess(false)

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: any) {
      alert(`Şifre güncelleme hatası: ${err.message}`)
    } finally {
      setSavingPassword(false)
    }
  }

  const toggleOrderDetails = (id: string) => {
    setExpandedOrders(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleReceiptUpload = async (siparisId: string, file: File) => {
    if (!file) return
    
    setUploadingId(siparisId)
    const fileExt = file.name.split('.').pop()
    const filePath = `dekontlar/${siparisId}_${Date.now()}.${fileExt}`

    try {
      // 1. Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('siparis-dekontlari')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('siparis-dekontlari')
        .getPublicUrl(filePath)

      // 3. Update order record
      const { error: updateError } = await supabase
        .from('siparisler')
        .update({ 
          dekont_url: publicUrl,
          notlar: `[Sistem: Dekont yüklendi] ${new Date().toLocaleString('tr-TR')}` 
        })
        .eq('id', siparisId)

      if (updateError) throw updateError

      // 4. Notify Admin — Authorization header ile güvenli gönderim
      await fetch('/api/dekont-bildirim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessTokenRef.current ? { 'Authorization': `Bearer ${accessTokenRef.current}` } : {}),
        },
        body: JSON.stringify({
          siparis_id: siparisId,
          siparis_no: siparisler.find(s => s.id === siparisId)?.siparis_no,
          dekont_url: publicUrl,
          ad_soyad: user?.user_metadata?.full_name || user?.email
        })
      }).catch(err => console.error('Bildirim hatası:', err))

      // Refresh data
      await loadUserAndOrders()
    } catch (err: any) {
      alert(`Dekont yüklenemedi: ${err.message}`)
    } finally {
      setUploadingId(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-24 bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-12 pb-24 bg-[#0A0A0A]">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
          <div>
            <h1 className="font-display font-black text-3xl uppercase text-white tracking-widest">Hesabım</h1>
            <p className="font-body text-white/40 text-sm mt-1">{user?.email}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/30 hover:text-brand-red font-display font-semibold text-xs tracking-widest uppercase transition-colors"
          >
            <LogOut size={14} /> Çıkış Yap
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 border border-white/5 mb-8 w-full md:w-auto overflow-x-auto snap-x">
          <button
            onClick={() => setActiveTab('siparisler')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 sm:px-6 py-3 sm:py-2.5 font-display font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all snap-start whitespace-nowrap ${activeTab === 'siparisler' ? 'bg-brand-red text-white' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
          >
            <Package size={14} /> Siparişlerim
          </button>
          <button
            onClick={() => setActiveTab('profil')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 sm:px-6 py-3 sm:py-2.5 font-display font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all snap-start whitespace-nowrap ${activeTab === 'profil' ? 'bg-brand-red text-white' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
          >
            <Settings size={14} /> Profil Ayarları
          </button>
        </div>

        {activeTab === 'siparisler' ? (
          <>
            <h2 className="font-display font-bold text-lg uppercase tracking-widest text-white mb-6 flex items-center gap-3">
              <div className="w-6 h-px bg-brand-red" />
              Sipariş Geçmişi ({siparisler.length})
            </h2>

            {siparisler.length === 0 ? (
              <div className="border border-white/5 bg-[#141414] p-12 text-center">
                <Package size={40} className="text-white/10 mx-auto mb-3" />
                <p className="font-display font-semibold text-sm uppercase text-white/20 tracking-widest mb-6">
                  Henüz siparişiniz bulunmuyor
                </p>
                <Link href="/urunler" className="btn-primary text-sm inline-flex">Alışverişe Başla</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {siparisler.map((s) => {
                  const durum = DURUM_MAP[s.durum] || DURUM_MAP.beklemede
                  const DurumIcon = durum.icon
                  const urunAdedi = Array.isArray(s.urunler) ? s.urunler.reduce((sum, u) => sum + u.adet, 0) : 0
                  const isHavale = s.odeme_tipi === 'havale'
                  const needsReceipt = isHavale && !s.dekont_url && s.odeme_durumu !== 'odendi'

                  return (
                    <div key={s.id} className="bg-[#141414] border border-white/5 p-6 hover:border-white/10 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="font-display font-black text-lg text-white uppercase tracking-wider">{s.siparis_no}</span>
                            <span className="font-body text-white/30 text-xs">
                              {new Date(s.created_at).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          <div className="font-body text-white/40 text-sm">
                            {urunAdedi} Ürün • <span className="font-display font-bold text-white">{Number(s.toplam_tutar).toLocaleString('tr-TR')} ₺</span>
                            <span className="ml-2 px-1.5 py-0.5 bg-white/5 text-[10px] uppercase tracking-tighter text-white/30 border border-white/5">
                              {s.odeme_tipi === 'kart' ? 'Kredi Kartı' : 'Havale/EFT'}
                            </span>
                          </div>
                          {s.teslimat_tipi === 'kargo' && s.teslimat_adresi && (
                            <div className="flex items-start gap-2 mt-2 text-white/25 text-[10px] font-body leading-relaxed max-w-sm">
                              <Truck size={10} className="mt-0.5 flex-shrink-0" />
                              <span>Teslimat: {s.teslimat_adresi}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-start md:items-end gap-3 min-w-[200px]">
                          <div className={`flex items-center gap-2 font-display font-bold text-xs uppercase tracking-widest px-3 py-1.5 border border-current/20 ${durum.color} bg-current/5 w-full md:w-auto justify-center`}>
                            <DurumIcon size={14} />
                            {durum.label}
                          </div>
                          
                          <button 
                            onClick={() => toggleOrderDetails(s.id)}
                            className="text-[10px] font-display font-bold uppercase tracking-widest text-white/40 hover:text-brand-red transition-colors flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5"
                          >
                            <Package size={12} /> {expandedOrders.includes(s.id) ? 'Detayları Gizle' : 'Ürünleri Gör'}
                          </button>
                        </div>

                      </div>

                      {/* Ürün Detayları */}
                      {expandedOrders.includes(s.id) && (
                        <div className="mt-8 pt-8 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                          
                          {/* Üst Bilgi Kartları */}
                          <div className="grid md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-white/5 border border-white/5 p-4">
                               <div className="flex items-center gap-2 mb-3 text-brand-red">
                                  <Info size={14} />
                                  <span className="font-display font-bold text-[10px] uppercase tracking-widest">Sipariş Özeti</span>
                               </div>
                               <div className="space-y-2">
                                  <div className="flex justify-between text-xs">
                                     <span className="text-white/30">Toplam Tutar:</span>
                                     <span className="text-white font-bold">{Number(s.toplam_tutar).toLocaleString('tr-TR')} ₺</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                     <span className="text-white/30">Dolar Karşılığı:</span>
                                     <span className="text-white font-bold">
                                       $ {s.dolar_kuru ? (s.toplam_tutar / s.dolar_kuru).toFixed(2) : (s.toplam_tutar / 32.5).toFixed(2)}
                                       {!s.dolar_kuru && <span className="text-[8px] text-white/20 ml-1">(Tahmini)</span>}
                                     </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                     <span className="text-white/30">Ödeme:</span>
                                     <span className="text-white uppercase">{s.odeme_tipi === 'kart' ? 'Kredi Kartı' : 'Havale/EFT'}</span>
                                  </div>
                               </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 p-4">
                               <div className="flex items-center gap-2 mb-3 text-blue-400">
                                  <MapPin size={14} />
                                  <span className="font-display font-bold text-[10px] uppercase tracking-widest">Teslimat & Konum</span>
                               </div>
                               <div className="text-xs text-white/60 leading-relaxed font-body">
                                  {s.teslimat_tipi === 'kargo' ? (
                                    <>
                                      <div className="text-white font-bold mb-1">Adrese Kargo</div>
                                      {s.teslimat_adresi}
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-white font-bold mb-1">Mağazadan Teslimat</div>
                                      <div className="text-[10px]">Cumhuriyet Mah. Sur Cad. No:17/A, Melikgazi / Kayseri</div>
                                    </>
                                  )}
                               </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 p-4">
                               <div className="flex items-center gap-2 mb-3 text-green-400">
                                  <Building2 size={14} />
                                  <span className="font-display font-bold text-[10px] uppercase tracking-widest">Fatura Bilgisi</span>
                               </div>
                               <div className="text-xs text-white/60 space-y-1 font-body">
                                  {s.fatura_tipi === 'kurumsal' ? (
                                    <>
                                      <div className="text-white font-bold uppercase truncate">{s.firma_unvani}</div>
                                      <div>{s.vergi_dairesi} / {s.vergi_no}</div>
                                    </>
                                  ) : (
                                    <div className="italic">Bireysel Fatura</div>
                                  )}
                               </div>
                            </div>
                          </div>

                          <div className="font-display font-bold text-[10px] uppercase tracking-widest text-white/20 mb-4 ml-1">Satın Alınan Ürünler</div>
                          <div className="space-y-3">
                            {Array.isArray(s.urunler) && s.urunler.map((u, idx) => (
                              <div key={idx} className="flex items-center gap-4 bg-black/20 p-3 border border-white/5 group hover:border-white/10 transition-colors">
                                <div className="w-12 h-12 bg-black border border-white/5 flex-shrink-0 relative overflow-hidden">
                                  {u.fotograf && (
                                    <Image src={u.fotograf} alt={u.ad} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-display font-bold text-sm text-white uppercase truncate">{u.ad}</div>
                                  <div className="font-body text-white/30 text-xs">
                                    {u.adet} Adet × {Number(u.fiyat).toLocaleString('tr-TR')} ₺
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-display font-bold text-sm text-brand-red">
                                    {(u.adet * u.fiyat).toLocaleString('tr-TR')} ₺
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex gap-4">
                              {needsReceipt && (
                                <div className="w-full md:w-auto">
                                  <label className={`flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-brand-red/30 bg-brand-red/5 text-brand-red font-display font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:bg-brand-red hover:text-white transition-all ${uploadingId === s.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {uploadingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                    {uploadingId === s.id ? 'YÜKLENİYOR' : 'DEKONT YÜKLE'}
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*,.pdf" 
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) handleReceiptUpload(s.id, file)
                                      }}
                                    />
                                  </label>
                                </div>
                              )}

                              {s.dekont_url && (
                                <div className="flex items-center gap-2 text-green-400 text-[10px] font-display font-bold uppercase tracking-widest px-3 py-2 bg-green-400/5 border border-green-400/10">
                                  <CheckCircle size={12} /> Dekont Yüklendi
                                  <a href={s.dekont_url} target="_blank" rel="noreferrer" className="ml-2 text-white/30 hover:text-white transition-colors">
                                    <FileText size={12} />
                                  </a>
                                </div>
                              )}
                            </div>

                            {s.kargo_takip_no && (
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(s.kargo_takip_no + ' kargo takip sorgula')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-brand-red text-xs font-body bg-brand-red/10 px-4 py-2 border border-brand-red/20 hover:bg-brand-red hover:text-white transition-all"
                              >
                                <Truck size={14} />
                                <span className="font-display font-bold tracking-widest">TAKİP NO: {s.kargo_takip_no}</span>
                                <ExternalLink size={11} className="ml-1" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="font-display font-bold text-lg uppercase tracking-widest text-white mb-6 flex items-center gap-3">
              <div className="w-6 h-px bg-brand-red" />
              Profil Bilgileriniz
            </h2>

            <div className="bg-[#141414] border border-white/5 p-8 max-w-2xl">
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 font-display font-bold text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">
                      <Building2 size={12} className="text-brand-red" /> Firma Adı
                    </label>
                    <input 
                      type="text" 
                      value={firmaAdi}
                      onChange={(e) => setFirmaAdi(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 p-3 text-sm text-white font-body focus:border-brand-red outline-none transition-all"
                      placeholder="Firma ünvanınızı yazın"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 font-display font-bold text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">
                      <UserIcon size={12} className="text-brand-red" /> Yetkili Kişi
                    </label>
                    <input 
                      type="text" 
                      value={yetkiliAdi}
                      onChange={(e) => setYetkiliAdi(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 p-3 text-sm text-white font-body focus:border-brand-red outline-none transition-all"
                      placeholder="Ad soyad"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 font-display font-bold text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">
                      <Phone size={12} className="text-brand-red" /> Telefon
                    </label>
                    <input 
                      type="tel" 
                      value={telefon}
                      onChange={(e) => setTelefon(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 p-3 text-sm text-white font-body focus:border-brand-red outline-none transition-all"
                      placeholder="05xx xxx xx xx"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 font-display font-bold text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">
                      <MapPin size={12} className="text-brand-red" /> Şehir
                    </label>
                    <input 
                      type="text" 
                      value={sehir}
                      onChange={(e) => setSehir(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 p-3 text-sm text-white font-body focus:border-brand-red outline-none transition-all"
                      placeholder="Kayseri, İstanbul vb."
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="text-[10px] text-white/20 font-body">
                    * Bayi durumunuz: <span className={bayi?.onaylandi ? 'text-green-500 font-bold' : 'text-yellow-500 font-bold'}>
                      {bayi?.onaylandi ? 'ONAYLI BAYİ' : 'ONAY BEKLİYOR'}
                    </span>
                  </div>
                  <button 
                    type="submit" 
                    disabled={savingProfile}
                    className={`flex items-center gap-3 px-8 py-3 font-display font-black text-xs uppercase tracking-[0.2em] transition-all ${saveSuccess ? 'bg-green-600 text-white' : 'bg-brand-red text-white hover:bg-white hover:text-black disabled:opacity-50'}`}
                  >
                    {savingProfile ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <Check size={14} /> : <Save size={14} />}
                    {savingProfile ? 'KAYDEDİLİYOR...' : saveSuccess ? 'KAYDEDİLDİ' : 'GÜNCELLE'}
                  </button>
                </div>

              </form>
            </div>

            {/* Şifre Güncelleme */}
            <div className="bg-[#141414] border border-white/5 p-8 max-w-2xl mt-6">
              <h3 className="font-display font-bold text-xs uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                <div className="w-4 h-px bg-brand-red" />
                Şifre Değiştir
              </h3>
              
              <form onSubmit={handlePasswordUpdate} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="font-display font-bold text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2 block">Yeni Şifre</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 p-3 text-sm text-white font-body focus:border-brand-red outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="font-display font-bold text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2 block">Şifre Tekrar</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 p-3 text-sm text-white font-body focus:border-brand-red outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={savingPassword || !newPassword}
                    className={`flex items-center gap-3 px-8 py-3 font-display font-black text-xs uppercase tracking-[0.2em] transition-all ${passwordSuccess ? 'bg-green-600 text-white' : 'bg-white/5 text-white hover:bg-brand-red disabled:opacity-50'}`}
                  >
                    {savingPassword ? <Loader2 size={14} className="animate-spin" /> : passwordSuccess ? <Check size={14} /> : <RefreshCw size={14} />}
                    {savingPassword ? 'GÜNCELLENİYOR...' : passwordSuccess ? 'ŞİFRE GÜNCELLENDİ' : 'ŞİFREYİ GÜNCELLE'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
