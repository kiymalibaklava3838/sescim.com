'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Package, Truck, Clock, CheckCircle, XCircle, LogOut, Upload, Check, Loader2, FileText, User as UserIcon, Phone, MapPin, Save, RefreshCw, Info, ExternalLink, Map, Plus, Trash2, Star, Ticket, Copy, MessageSquare } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface Degerlendirme {
  id: string
  urun_id: string
  puan: number
  yorum: string
  durum: 'bekliyor' | 'onaylandi'
  created_at: string
  urun: {
    ad: string
    slug: string
    fotograflar: string[]
  }
}

interface Kupon {
  id: string
  kod: string
  indirim_tipi: 'yuzde' | 'sabit'
  indirim_miktari: number
  min_tutar: number | null
  gecerlilik_tarihi: string | null
  aktif: boolean
}

interface UyeProfil {
  id: string
  user_id: string
  ad: string
  soyad: string
  telefon: string
}

interface Adres {
  id: string
  adres_basligi: string
  ad_soyad: string
  telefon: string
  sehir: string
  ilce: string
  acik_adres: string
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
  fatura_tipi?: string
  firma_unvani?: string
  vergi_no?: string
  vergi_dairesi?: string
  urunler: any[]
}

const DURUM_MAP: Record<string, { label: string, color: string, bg: string, border: string, icon: React.ElementType }> = {
  beklemede:     { label: 'Sipariş Alındı', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
  onaylandi:     { label: 'Onaylandı',      color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: CheckCircle },
  hazirlaniyor:  { label: 'Hazırlanıyor',   color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: Package },
  kargolandi:    { label: 'Kargolandı',     color: 'text-brand-red', bg: 'bg-brand-red/10', border: 'border-brand-red/20', icon: Truck },
  teslim_edildi: { label: 'Teslim Edildi',  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  iptal:         { label: 'İptal Edildi',   color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: XCircle },
  tamamlandi:    { label: 'Tamamlandı',     color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
}

export default function HesabimPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [siparisler, setSiparisler] = useState<Siparis[]>([])
  const [adresler, setAdresler] = useState<Adres[]>([])
  const [profil, setProfil] = useState<UyeProfil | null>(null)
  const [degerlendirmeler, setDegerlendirmeler] = useState<Degerlendirme[]>([])
  const [kuponlar, setKuponlar] = useState<Kupon[]>([])
  const [activeTab, setActiveTab] = useState<'siparisler' | 'profil' | 'adresler' | 'degerlendirmeler' | 'kuponlar'>('siparisler')
  const [expandedOrders, setExpandedOrders] = useState<string[]>([])
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null)
  
  // Profile States
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [ad, setAd] = useState('')
  const [soyad, setSoyad] = useState('')
  const [telefon, setTelefon] = useState('')

  // Password States
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Address States
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [adresBasligi, setAdresBasligi] = useState('')
  const [adresAdSoyad, setAdresAdSoyad] = useState('')
  const [adresTelefon, setAdresTelefon] = useState('')
  const [adresSehir, setAdresSehir] = useState('')
  const [adresIlce, setAdresIlce] = useState('')
  const [acikAdres, setAcikAdres] = useState('')

  const supabase = useRef(createClient()).current
  const accessTokenRef = useRef<string | null>(null)

  useEffect(() => {
    loadUserAndData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadUserAndData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      router.push('/giris')
      return
    }

    setUser(session.user)
    accessTokenRef.current = session.access_token

    const { data: orders } = await supabase
      .from('siparisler')
      .select('id, siparis_no, created_at, toplam_tutar, durum, urunler, kargo_takip_no, odeme_durumu, odeme_tipi, teslimat_tipi, dekont_url, teslimat_adresi, fatura_tipi, firma_unvani, vergi_no, vergi_dairesi')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    setSiparisler(orders || [])

    const { data: addresses } = await supabase
      .from('kullanici_adresleri')
      .select('*')
      .eq('user_id', session.user.id)
      .order('id', { ascending: false })
      
    setAdresler(addresses || [])

    const { data: profilData } = await supabase
      .from('uye_profiller')
      .select('id, user_id, ad, soyad, telefon')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (profilData) {
      setProfil(profilData)
      setAd(profilData.ad || '')
      setSoyad(profilData.soyad || '')
      setTelefon(profilData.telefon || '')
    }

    // Yorumları Çek
    const { data: reviews } = await supabase
      .from('urun_yorumlari')
      .select('id, urun_id, puan, yorum, durum, created_at, urun:urunler(ad, slug, fotograflar)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      
    setDegerlendirmeler(reviews || [])

    // Kuponları Çek (Sadece aktif olanları listele)
    const { data: coupons } = await supabase
      .from('kuponlar')
      .select('id, kod, indirim_tipi, indirim_miktari, min_tutar, gecerlilik_tarihi, aktif')
      .eq('aktif', true)
      .order('created_at', { ascending: false })
      
    setKuponlar(coupons || [])

    setLoading(false)
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSavingProfile(true)
    setSaveSuccess(false)

    try {
      if (profil) {
        const { error } = await supabase
          .from('uye_profiller')
          .update({ ad, soyad, telefon })
          .eq('user_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('uye_profiller')
          .insert({ user_id: user.id, ad, soyad, telefon })
        if (error) throw error
      }
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      
      setProfil({ ...profil, id: profil?.id || '', user_id: user.id, ad, soyad, telefon })
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

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSavingAddress(true)
    try {
      const { error } = await supabase.from('kullanici_adresleri').insert({
        user_id: user.id,
        adres_basligi: adresBasligi,
        ad_soyad: adresAdSoyad,
        telefon: adresTelefon,
        sehir: adresSehir,
        ilce: adresIlce,
        acik_adres: acikAdres
      })

      if (error) throw error
      
      setShowAddAddress(false)
      setAdresBasligi('')
      setAdresAdSoyad('')
      setAdresTelefon('')
      setAdresSehir('')
      setAdresIlce('')
      setAcikAdres('')
      
      loadUserAndData()
    } catch (err: any) {
      alert(`Adres eklenemedi: ${err.message}`)
    } finally {
      setSavingAddress(false)
    }
  }

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return
    
    try {
      const { error } = await supabase.from('kullanici_adresleri').delete().eq('id', id)
      if (error) throw error
      setAdresler(prev => prev.filter(a => a.id !== id))
    } catch (err: any) {
      alert(`Adres silinemedi: ${err.message}`)
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
      const { error: uploadError } = await supabase.storage
        .from('siparis-dekontlari')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('siparis-dekontlari')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('siparisler')
        .update({ 
          dekont_url: publicUrl,
          notlar: `[Sistem: Dekont yüklendi] ${new Date().toLocaleString('tr-TR')}` 
        })
        .eq('id', siparisId)

      if (updateError) throw updateError

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

      await loadUserAndData()
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
      <div className="min-h-screen pt-24 pb-24 bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-brand-red rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-12 pb-24 bg-slate-50 text-slate-800">
      <div className="max-w-5xl mx-auto px-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-slate-200 gap-4">
          <div>
            <h1 className="font-display font-black text-3xl uppercase text-slate-900 tracking-tight">Hesabım</h1>
            <p className="font-body text-slate-500 text-sm mt-1">{user?.email}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-brand-red font-display font-semibold text-xs tracking-widest uppercase transition-colors"
          >
            <LogOut size={16} /> Çıkış Yap
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
              <button
                onClick={() => setActiveTab('siparisler')}
                className={`flex items-center gap-3 px-5 py-4 font-display font-bold text-sm transition-colors text-left ${activeTab === 'siparisler' ? 'bg-brand-red/5 text-brand-red border-l-4 border-l-brand-red' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-red border-l-4 border-l-transparent'}`}
              >
                <Package size={18} /> Siparişlerim
              </button>
              <div className="h-px bg-slate-100" />
              <button
                onClick={() => setActiveTab('profil')}
                className={`flex items-center gap-3 px-5 py-4 font-display font-bold text-sm transition-colors text-left ${activeTab === 'profil' ? 'bg-brand-red/5 text-brand-red border-l-4 border-l-brand-red' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-red border-l-4 border-l-transparent'}`}
              >
                <UserIcon size={18} /> Profil Bilgilerim
              </button>
              <div className="h-px bg-slate-100" />
              <button
                onClick={() => setActiveTab('adresler')}
                className={`flex items-center gap-3 px-5 py-4 font-display font-bold text-sm transition-colors text-left ${activeTab === 'adresler' ? 'bg-brand-red/5 text-brand-red border-l-4 border-l-brand-red' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-red border-l-4 border-l-transparent'}`}
              >
                <MapPin size={18} /> Adreslerim
              </button>
              <div className="h-px bg-slate-100" />
              <button
                onClick={() => setActiveTab('degerlendirmeler')}
                className={`flex items-center gap-3 px-5 py-4 font-display font-bold text-sm transition-colors text-left ${activeTab === 'degerlendirmeler' ? 'bg-brand-red/5 text-brand-red border-l-4 border-l-brand-red' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-red border-l-4 border-l-transparent'}`}
              >
                <Star size={18} /> Değerlendirmelerim
              </button>
              <div className="h-px bg-slate-100" />
              <button
                onClick={() => setActiveTab('kuponlar')}
                className={`flex items-center gap-3 px-5 py-4 font-display font-bold text-sm transition-colors text-left ${activeTab === 'kuponlar' ? 'bg-brand-red/5 text-brand-red border-l-4 border-l-brand-red' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-red border-l-4 border-l-transparent'}`}
              >
                <Ticket size={18} /> Kuponlarım
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            
            {/* Siparişlerim Tab */}
            {activeTab === 'siparisler' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h2 className="font-display font-bold text-xl text-slate-800 mb-6 flex items-center gap-3">
                  Sipariş Geçmişi
                  <span className="text-sm font-medium bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full">{siparisler.length}</span>
                </h2>

                {siparisler.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package size={24} className="text-slate-300" />
                    </div>
                    <p className="font-display font-semibold text-base text-slate-500 mb-6">
                      Henüz siparişiniz bulunmuyor
                    </p>
                    <Link href="/urunler" className="btn-primary text-sm inline-flex rounded-xl shadow-sm">
                      Alışverişe Başla
                    </Link>
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
                        <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-300 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <span className="font-display font-black text-lg text-slate-900 uppercase">{s.siparis_no}</span>
                                <span className="font-body text-slate-400 text-sm">
                                  {new Date(s.created_at).toLocaleDateString('tr-TR')}
                                </span>
                              </div>
                              <div className="font-body text-slate-500 text-sm flex items-center gap-2">
                                {urunAdedi} Ürün • <span className="font-display font-bold text-slate-800">{Number(s.toplam_tutar).toLocaleString('tr-TR')} ₺</span>
                                <span className="px-2 py-0.5 bg-slate-50 text-xs text-slate-500 rounded-md border border-slate-200">
                                  {s.odeme_tipi === 'kart' ? 'Kredi Kartı' : 'Havale/EFT'}
                                </span>
                              </div>
                              {s.teslimat_tipi === 'kargo' && s.teslimat_adresi && (
                                <div className="flex items-start gap-2 mt-2 text-slate-500 text-xs font-body leading-relaxed max-w-sm">
                                  <Truck size={14} className="mt-0.5 flex-shrink-0" />
                                  <span>Teslimat: {s.teslimat_adresi}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-start md:items-end gap-3 min-w-[200px]">
                              <div className={`flex items-center gap-2 font-display font-bold text-xs uppercase px-3 py-1.5 rounded-lg border w-full md:w-auto justify-center ${durum.bg} ${durum.border} ${durum.color}`}>
                                <DurumIcon size={14} />
                                {durum.label}
                              </div>
                              
                              <button 
                                onClick={() => toggleOrderDetails(s.id)}
                                className="text-xs font-display font-bold text-slate-600 hover:text-brand-red transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200"
                              >
                                <Package size={14} /> {expandedOrders.includes(s.id) ? 'Detayları Gizle' : 'Ürünleri Gör'}
                              </button>
                            </div>

                          </div>

                          {/* Ürün Detayları */}
                          {expandedOrders.includes(s.id) && (
                            <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                              
                              <div className="grid md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                   <div className="flex items-center gap-2 mb-3 text-slate-600">
                                      <Info size={16} />
                                      <span className="font-display font-bold text-xs uppercase tracking-wider">Sipariş Özeti</span>
                                   </div>
                                   <div className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                         <span className="text-slate-500">Toplam Tutar:</span>
                                         <span className="text-slate-800 font-bold">{Number(s.toplam_tutar).toLocaleString('tr-TR')} ₺</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                         <span className="text-slate-500">Ödeme:</span>
                                         <span className="text-slate-800 font-medium">{s.odeme_tipi === 'kart' ? 'Kredi Kartı' : 'Havale/EFT'}</span>
                                      </div>
                                   </div>
                                </div>

                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                   <div className="flex items-center gap-2 mb-3 text-slate-600">
                                      <MapPin size={16} />
                                      <span className="font-display font-bold text-xs uppercase tracking-wider">Teslimat Bilgisi</span>
                                   </div>
                                   <div className="text-sm text-slate-600 leading-relaxed font-body">
                                      {s.teslimat_tipi === 'kargo' ? (
                                        <>
                                          <div className="text-slate-800 font-medium mb-1">Adrese Kargo</div>
                                          <div className="line-clamp-2" title={s.teslimat_adresi}>{s.teslimat_adresi}</div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="text-slate-800 font-medium mb-1">Mağazadan Teslimat</div>
                                          <div className="text-xs text-slate-500">Merkez Mağaza</div>
                                        </>
                                      )}
                                   </div>
                                </div>

                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                   <div className="flex items-center gap-2 mb-3 text-slate-600">
                                      <FileText size={16} />
                                      <span className="font-display font-bold text-xs uppercase tracking-wider">Fatura Bilgisi</span>
                                   </div>
                                   <div className="text-sm text-slate-600 space-y-1 font-body">
                                      {s.fatura_tipi === 'kurumsal' ? (
                                        <>
                                          <div className="text-slate-800 font-medium truncate" title={s.firma_unvani}>{s.firma_unvani}</div>
                                          <div className="text-xs">{s.vergi_dairesi} / {s.vergi_no}</div>
                                        </>
                                      ) : (
                                        <div className="text-slate-800 font-medium">Bireysel Fatura</div>
                                      )}
                                   </div>
                                </div>
                              </div>

                              <div className="font-display font-bold text-xs uppercase text-slate-500 mb-4 ml-1">Satın Alınan Ürünler</div>
                              <div className="space-y-3">
                                {Array.isArray(s.urunler) && s.urunler.map((u, idx) => (
                                  <div key={idx} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="w-14 h-14 bg-slate-50 rounded-lg border border-slate-100 flex-shrink-0 relative overflow-hidden">
                                      {u.fotograf && (
                                        <Image src={u.fotograf} alt={u.ad} fill className="object-contain p-1" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-display font-bold text-sm text-slate-800 truncate">{u.ad}</div>
                                      <div className="font-body text-slate-500 text-xs mt-0.5">
                                        {u.adet} Adet × {Number(u.fiyat).toLocaleString('tr-TR')} ₺
                                      </div>
                                    </div>
                                    <div className="text-right pl-4">
                                      <div className="font-display font-bold text-sm text-slate-800">
                                        {(u.adet * u.fiyat).toLocaleString('tr-TR')} ₺
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-t border-slate-100 pt-6">
                                <div className="flex gap-4 w-full md:w-auto">
                                  {needsReceipt && (
                                    <div className="w-full md:w-auto">
                                      <label className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-brand-red/30 bg-brand-red/5 text-brand-red font-display font-bold text-xs cursor-pointer hover:bg-brand-red hover:text-white transition-all ${uploadingId === s.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {uploadingId === s.id ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                        {uploadingId === s.id ? 'YÜKLENİYOR...' : 'DEKONT YÜKLE'}
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
                                    <div className="flex items-center gap-2 text-emerald-600 text-xs font-display font-bold px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                                      <CheckCircle size={16} /> Dekont Yüklendi
                                      <a href={s.dekont_url} target="_blank" rel="noreferrer" className="ml-2 text-emerald-600 hover:text-emerald-500 transition-colors bg-white p-1 rounded-md shadow-sm border border-emerald-100">
                                        <FileText size={14} />
                                      </a>
                                    </div>
                                  )}
                                </div>

                                {s.kargo_takip_no && (
                                  <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent(s.kargo_takip_no + ' kargo takip sorgula')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex w-full md:w-auto items-center justify-center gap-2 text-slate-700 text-sm font-medium bg-white px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                                  >
                                    <Truck size={16} className="text-slate-400" />
                                    Kargo Takip
                                    <ExternalLink size={14} className="text-slate-400 ml-1" />
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
              </div>
            )}

            {/* Profil Tab */}
            {activeTab === 'profil' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                
                <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
                  <h2 className="font-display font-bold text-xl text-slate-800 mb-6 flex items-center gap-3">
                    Profil Bilgileriniz
                  </h2>

                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="flex items-center gap-2 font-display font-bold text-xs text-slate-500 mb-2">
                          <UserIcon size={14} className="text-slate-400" /> Adınız
                        </label>
                        <input 
                          type="text" 
                          value={ad}
                          onChange={(e) => setAd(e.target.value)}
                          className="input-base"
                          placeholder="Adınız"
                          required
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 font-display font-bold text-xs text-slate-500 mb-2">
                          <UserIcon size={14} className="text-slate-400" /> Soyadınız
                        </label>
                        <input 
                          type="text" 
                          value={soyad}
                          onChange={(e) => setSoyad(e.target.value)}
                          className="input-base"
                          placeholder="Soyadınız"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 font-display font-bold text-xs text-slate-500 mb-2">
                          <Phone size={14} className="text-slate-400" /> Telefon Numarası
                        </label>
                        <input 
                          type="tel" 
                          value={telefon}
                          onChange={(e) => setTelefon(e.target.value)}
                          className="input-base"
                          placeholder="05xx xxx xx xx"
                          required
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button 
                        type="submit" 
                        disabled={savingProfile}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-display font-bold text-sm transition-all shadow-sm ${saveSuccess ? 'bg-emerald-600 text-white' : 'bg-brand-red text-white hover:bg-brand-red/90 disabled:opacity-50'}`}
                      >
                        {savingProfile ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <Check size={16} /> : <Save size={16} />}
                        {savingProfile ? 'KAYDEDİLİYOR...' : saveSuccess ? 'KAYDEDİLDİ' : 'BİLGİLERİ GÜNCELLE'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
                  <h3 className="font-display font-bold text-lg text-slate-800 mb-6 flex items-center gap-3">
                    Şifre Değiştir
                  </h3>
                  
                  <form onSubmit={handlePasswordUpdate} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="font-display font-bold text-xs text-slate-500 mb-2 block">Yeni Şifre</label>
                        <input 
                          type="password" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="input-base"
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <label className="font-display font-bold text-xs text-slate-500 mb-2 block">Şifre Tekrar</label>
                        <input 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="input-base"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button 
                        type="submit" 
                        disabled={savingPassword || !newPassword}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-display font-bold text-sm transition-all shadow-sm ${passwordSuccess ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50'}`}
                      >
                        {savingPassword ? <Loader2 size={16} className="animate-spin" /> : passwordSuccess ? <Check size={16} /> : <RefreshCw size={16} />}
                        {savingPassword ? 'GÜNCELLENİYOR...' : passwordSuccess ? 'ŞİFRE GÜNCELLENDİ' : 'ŞİFREYİ GÜNCELLE'}
                      </button>
                    </div>
                  </form>
                </div>
                
              </div>
            )}

            {/* Adresler Tab */}
            {activeTab === 'adresler' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display font-bold text-xl text-slate-800 flex items-center gap-3">
                    Kayıtlı Adreslerim
                  </h2>
                  <button 
                    onClick={() => setShowAddAddress(!showAddAddress)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white rounded-lg font-display font-bold text-sm transition-colors"
                  >
                    {showAddAddress ? <XCircle size={16} /> : <Plus size={16} />}
                    {showAddAddress ? 'Kapat' : 'Yeni Adres Ekle'}
                  </button>
                </div>

                {showAddAddress && (
                  <div className="bg-white border border-brand-red/20 rounded-2xl p-6 md:p-8 shadow-sm mb-6 animate-in fade-in zoom-in-95 duration-200">
                    <h3 className="font-display font-bold text-lg text-slate-800 mb-6">Yeni Adres Bilgileri</h3>
                    <form onSubmit={handleAddAddress} className="space-y-4">
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-medium text-xs text-slate-500 mb-1.5">Adres Başlığı (Ev, İş vb.)</label>
                          <input type="text" required value={adresBasligi} onChange={e => setAdresBasligi(e.target.value)} className="input-base" />
                        </div>
                        <div>
                          <label className="block font-medium text-xs text-slate-500 mb-1.5">Ad Soyad</label>
                          <input type="text" required value={adresAdSoyad} onChange={e => setAdresAdSoyad(e.target.value)} className="input-base" />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block font-medium text-xs text-slate-500 mb-1.5">Telefon</label>
                          <input type="tel" required value={adresTelefon} onChange={e => setAdresTelefon(e.target.value)} className="input-base" />
                        </div>
                        <div>
                          <label className="block font-medium text-xs text-slate-500 mb-1.5">İl</label>
                          <input type="text" required value={adresSehir} onChange={e => setAdresSehir(e.target.value)} className="input-base" />
                        </div>
                        <div>
                          <label className="block font-medium text-xs text-slate-500 mb-1.5">İlçe</label>
                          <input type="text" required value={adresIlce} onChange={e => setAdresIlce(e.target.value)} className="input-base" />
                        </div>
                      </div>

                      <div>
                        <label className="block font-medium text-xs text-slate-500 mb-1.5">Açık Adres</label>
                        <textarea required rows={3} value={acikAdres} onChange={e => setAcikAdres(e.target.value)} className="input-base resize-none"></textarea>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button type="submit" disabled={savingAddress} className="flex items-center gap-2 bg-brand-red text-white px-6 py-2.5 rounded-xl font-display font-bold text-sm hover:bg-brand-red/90 transition-all disabled:opacity-50">
                          {savingAddress ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Kaydet
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {adresler.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Map size={24} className="text-slate-300" />
                    </div>
                    <p className="font-display font-semibold text-base text-slate-600 mb-2">
                      Kayıtlı adresiniz bulunmuyor
                    </p>
                    <p className="text-sm text-slate-400">
                      Siparişlerinizde hızlı teslimat için adres ekleyebilirsiniz.
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {adresler.map(adres => (
                      <div key={adres.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all relative group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2 text-brand-red font-display font-bold text-sm">
                            <MapPin size={16} />
                            {adres.adres_basligi}
                          </div>
                          <button 
                            onClick={() => handleDeleteAddress(adres.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                            title="Adresi Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="space-y-1 mb-4">
                          <div className="font-semibold text-slate-800 text-sm">{adres.ad_soyad}</div>
                          <div className="text-slate-500 text-sm">{adres.telefon}</div>
                        </div>

                        <div className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {adres.acik_adres}
                          <div className="mt-1 font-medium text-slate-800">
                            {adres.ilce} / {adres.sehir}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Değerlendirmelerim Tab */}
            {activeTab === 'degerlendirmeler' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h2 className="font-display font-bold text-xl text-slate-800 mb-6 flex items-center gap-3">
                  Ürün Değerlendirmelerim
                  <span className="text-sm font-medium bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full">{degerlendirmeler.length}</span>
                </h2>

                {degerlendirmeler.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare size={24} className="text-slate-300" />
                    </div>
                    <p className="font-display font-semibold text-base text-slate-500 mb-2">
                      Henüz hiç ürün değerlendirmediniz
                    </p>
                    <p className="font-body text-sm text-slate-400">
                      Satın aldığınız ürünleri değerlendirerek diğer kullanıcılara yardımcı olabilirsiniz.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {degerlendirmeler.map(deg => {
                      const urunFirtPhoto = Array.isArray(deg.urun?.fotograflar) ? deg.urun.fotograflar[0] : null
                      return (
                        <div key={deg.id} className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row gap-5">
                          <Link href={`/urun/${deg.urun?.slug}`} className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center flex-shrink-0 relative overflow-hidden group">
                            {urunFirtPhoto ? (
                              <Image src={urunFirtPhoto} alt={deg.urun?.ad || ''} fill className="object-contain p-2 group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <Package size={24} className="text-slate-300" />
                            )}
                          </Link>
                          
                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-2">
                              <div>
                                <Link href={`/urun/${deg.urun?.slug}`} className="font-display font-bold text-slate-800 hover:text-brand-red transition-colors line-clamp-1 mb-1.5">
                                  {deg.urun?.ad}
                                </Link>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star 
                                      key={s} 
                                      size={14} 
                                      className={s <= deg.puan ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'} 
                                    />
                                  ))}
                                  <span className="text-xs text-slate-400 ml-2 font-body">
                                    {new Date(deg.created_at).toLocaleDateString('tr-TR')}
                                  </span>
                                </div>
                              </div>
                              <div className={`px-2.5 py-1 rounded-md text-[10px] font-display font-bold uppercase tracking-widest border ${
                                deg.durum === 'onaylandi' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                  : 'bg-amber-50 text-amber-600 border-amber-200'
                              }`}>
                                {deg.durum === 'onaylandi' ? 'Yayında' : 'Onay Bekliyor'}
                              </div>
                            </div>
                            
                            <p className="text-sm text-slate-600 mt-3 font-body bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                              "{deg.yorum}"
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Kuponlarım Tab */}
            {activeTab === 'kuponlar' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h2 className="font-display font-bold text-xl text-slate-800 mb-6 flex items-center gap-3">
                  Aktif Kuponlar
                </h2>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                  <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700 font-body">
                    Aşağıdaki kupon kodlarını sepet aşamasında kullanarak indirimlerden faydalanabilirsiniz. Kuponu kopyalamak için üzerine tıklamanız yeterlidir.
                  </p>
                </div>

                {kuponlar.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Ticket size={24} className="text-slate-300" />
                    </div>
                    <p className="font-display font-semibold text-base text-slate-500 mb-2">
                      Şu anda aktif bir kampanya/kupon bulunmuyor
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {kuponlar.map(kupon => {
                      const isExpired = kupon.gecerlilik_tarihi && new Date(kupon.gecerlilik_tarihi).getTime() < Date.now()
                      if (isExpired) return null
                      
                      const indirimText = kupon.indirim_tipi === 'yuzde' 
                        ? `%${kupon.indirim_miktari} İndirim`
                        : `${kupon.indirim_miktari.toLocaleString('tr-TR')} TL İndirim`

                      return (
                        <div key={kupon.id} className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:border-brand-red/30 transition-colors relative flex">
                          {/* Sol Kısım - İndirim Tutarı */}
                          <div className="bg-brand-red text-white flex flex-col justify-center items-center p-4 w-1/3 min-w-[100px] border-r-2 border-dashed border-white">
                            <Ticket size={24} className="mb-2 opacity-80" />
                            <div className="font-display font-black text-xl md:text-2xl text-center leading-none">
                              {kupon.indirim_tipi === 'yuzde' ? `%${kupon.indirim_miktari}` : `₺${kupon.indirim_miktari}`}
                            </div>
                          </div>
                          
                          {/* Sağ Kısım - Detaylar */}
                          <div className="p-4 flex-1 flex flex-col justify-center relative">
                            <div className="font-display font-bold text-slate-800 text-sm mb-1">{indirimText}</div>
                            {kupon.min_tutar && (
                              <div className="text-xs text-slate-500 mb-3 font-body">
                                Min. Sepet: {kupon.min_tutar.toLocaleString('tr-TR')} ₺
                              </div>
                            )}
                            
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(kupon.kod)
                                setCopiedCoupon(kupon.id)
                                setTimeout(() => setCopiedCoupon(null), 2000)
                              }}
                              className="group flex items-center justify-between bg-slate-100 hover:bg-slate-200 transition-colors p-2.5 rounded-lg border border-slate-200 border-dashed"
                            >
                              <span className="font-display font-black tracking-widest text-brand-red text-sm">{kupon.kod}</span>
                              {copiedCoupon === kupon.id ? (
                                <span className="text-[10px] font-bold uppercase text-emerald-600 flex items-center gap-1"><Check size={12}/> Kopyalandı</span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-slate-600 flex items-center gap-1"><Copy size={12}/> Kopyala</span>
                              )}
                            </button>
                            
                            {kupon.gecerlilik_tarihi && (
                              <div className="text-[10px] text-slate-400 mt-2 font-body text-right">
                                Son Gün: {new Date(kupon.gecerlilik_tarihi).toLocaleDateString('tr-TR')}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
