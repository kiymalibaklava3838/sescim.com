'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { BANK_ACCOUNTS } from '@/lib/bank-accounts'
import KargoTakip from '@/components/KargoTakip'
import Link from 'next/link'
import Image from 'next/image'
import { Package, Truck, Clock, CheckCircle, XCircle, LogOut, Upload, Check, Loader2, FileText, User as UserIcon, Phone, MapPin, Save, RefreshCw, Info, ExternalLink, Map, Plus, Trash2, Star, Ticket, Copy, MessageSquare, Sparkles, ArrowRight, Tag, Gift, AlertCircle, ShoppingBag, RotateCcw, CheckCircle2, X } from 'lucide-react'
import OrderTimeline from '@/components/OrderTimeline'
import { IL_ISIMLERI, getIlcelerByIl } from '@/lib/turkey-locations'
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
  aciklama?: string | null
  ozel_mi?: boolean
  kaynak?: 'tanimli' | 'genel'
  kategori?: string | null
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
  kargo_firmasi?: string
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

const getKargoLink = (firma?: string, no?: string) => {
  if (!no) return '#'
  const f = firma?.toLowerCase() || ''
  if (f.includes('hepsijet')) return `https://www.hepsijet.com/gonderi-takibi/${no}`
  if (f.includes('yurtiçi') || f.includes('yurtici')) return `https://yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${no}`
  if (f.includes('aras')) return `https://www.araskargo.com.tr/kargo-takip?KargoTakipNo=${no}`
  if (f.includes('mng')) return `https://kargotakip.mngkargo.com.tr/?takipNo=${no}`
  if (f.includes('sürat') || f.includes('surat')) return `https://suratkargo.com.tr/KargoTakip/?kargotakipno=${no}`
  if (f.includes('ptt')) return `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${no}`
  return '#'
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
  
  // Kupon Cüzdanı States
  const [tanimlanacakKod, setTanimlanacakKod] = useState('')
  const [tanimlamaLoading, setTanimlamaLoading] = useState(false)
  const [tanimlamaMesaj, setTanimlamaMesaj] = useState<{ tip: 'basari' | 'hata'; metin: string } | null>(null)
  const [kuponFiltre, setKuponFiltre] = useState<'tumu' | 'tanimli' | 'genel'>('tumu')
  const [tanimliKuponKodlari, setTanimliKuponKodlari] = useState<string[]>([])
  
  // İade & Değişim Talebi States
  const [iadeModalOpen, setIadeModalOpen] = useState(false)
  const [iadeOrder, setIadeOrder] = useState<Siparis | null>(null)
  const [iadeTip, setIadeTip] = useState<'iade' | 'degisim'>('iade')
  const [iadeSebep, setIadeSebep] = useState('Ürün Arızalı / Kusurlu Çıktı')
  const [iadeAciklama, setIadeAciklama] = useState('')
  const [iadeIban, setIadeIban] = useState('')
  const [iadeLoading, setIadeLoading] = useState(false)
  const [iadeResult, setIadeResult] = useState<any>(null)
  
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
  const [selectedAddress, setSelectedAddress] = useState<Adres | null>(null)
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
      router.push('/uye')
      return
    }

    setUser(session.user)
    accessTokenRef.current = session.access_token

    const { data: orders } = await supabase
      .from('siparisler')
      .select('id, siparis_no, created_at, toplam_tutar, durum, kargo_takip_no, odeme_durumu, odeme_tipi, teslimat_adresi, fatura_adresi, notlar')
      .or(`user_id.eq.${session.user.id},email.eq.${session.user.email}`)
      .neq('durum', 'odeme_bekliyor')
      .order('created_at', { ascending: false })
      .limit(30)

    if (orders && orders.length > 0) {
      const orderIds = orders.map((o: any) => o.id)
      const { data: allKalemler } = await supabase
        .from('siparis_kalemleri')
        .select('*')
        .in('siparis_id', orderIds)
      
      const ordersWithItems = orders.map((o: any) => {
        const orderKalemler = (allKalemler || []).filter((k: any) => k.siparis_id === o.id)
        const dekontMatch = (o as any).notlar?.match(/Dekont yüklendi - ([^\s\]]+)/)
        const dekontUrl = (o as any).dekont_url || (dekontMatch ? dekontMatch[1] : undefined)

        return {
          ...o,
          dekont_url: dekontUrl,
          urunler: orderKalemler.map((k: any) => ({
            urun_id: k.urun_id || k.id,
            ad: k.urun_adi,
            fiyat: Number(k.birim_fiyat),
            adet: Number(k.adet),
            fotograf: '',
          }))
        }
      })
      setSiparisler(ordersWithItems as any)
    } else {
      setSiparisler([])
    }

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

    // Kuponları ve Kullanıcıya Tanımlı Kuponları Çek
    let savedCodes: string[] = []
    try {
      const { data: userCoupons } = await supabase
        .from('kullanici_kuponlari')
        .select('kupon_kodu')
        .eq('user_id', session.user.id)
      if (userCoupons && userCoupons.length > 0) {
        savedCodes = userCoupons.map((uc: any) => uc.kupon_kodu)
      }
    } catch {
      // Tablo henüz yoksa localStorage devrede
    }

    try {
      const localSaved = JSON.parse(localStorage.getItem(`sescim_user_coupons_${session.user.id}`) || '[]')
      if (Array.isArray(localSaved)) {
        savedCodes = Array.from(new Set([...savedCodes, ...localSaved]))
      }
    } catch {}

    setTanimliKuponKodlari(savedCodes)

    // Tüm aktif kuponları çek
    const { data: coupons } = await supabase
      .from('kuponlar')
      .select('*')
      .eq('aktif', true)
      .order('created_at', { ascending: false })
      
    if (coupons) {
      const formatted = coupons
        .filter((c: any) => {
          // Eğer özel/gizli kuponsa, sadece kullanıcının tanımladıkları arasındaysa göster
          if (c.ozel_mi === true) {
            return savedCodes.includes(c.kod)
          }
          return true
        })
        .map((c: any) => ({
          ...c,
          kaynak: savedCodes.includes(c.kod) ? ('tanimli' as const) : ('genel' as const),
        }))
      setKuponlar(formatted)
    } else {
      setKuponlar([])
    }

    setLoading(false)
  }

  const handleKuponTanimla = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = tanimlanacakKod.trim().toUpperCase()
    if (!cleanCode) return

    setTanimlamaLoading(true)
    setTanimlamaMesaj(null)

    if (!user) {
      setTanimlamaMesaj({ tip: 'hata', metin: 'Kupon tanımlamak için giriş yapmalısınız.' })
      setTanimlamaLoading(false)
      return
    }

    if (tanimliKuponKodlari.includes(cleanCode)) {
      setTanimlamaMesaj({ tip: 'hata', metin: `"${cleanCode}" kupon kodu zaten hesabınızda tanımlı.` })
      setTanimlamaLoading(false)
      return
    }

    try {
      const { data: kuponData, error: kErr } = await supabase
        .from('kuponlar')
        .select('*')
        .ilike('kod', cleanCode)
        .maybeSingle()

      if (kErr || !kuponData) {
        setTanimlamaMesaj({ tip: 'hata', metin: `"${cleanCode}" geçerli bir kupon kodu bulunamadı. Lütfen kodu kontrol edin.` })
        setTanimlamaLoading(false)
        return
      }

      if (!kuponData.aktif) {
        setTanimlamaMesaj({ tip: 'hata', metin: `"${cleanCode}" kuponu şu anda aktif değildir.` })
        setTanimlamaLoading(false)
        return
      }

      if (kuponData.gecerlilik_tarihi && new Date(kuponData.gecerlilik_tarihi).getTime() < Date.now()) {
        setTanimlamaMesaj({ tip: 'hata', metin: `"${cleanCode}" kuponunun son kullanma süresi dolmuştur.` })
        setTanimlamaLoading(false)
        return
      }

      if (kuponData.max_kullanim && kuponData.kullanim_sayisi >= kuponData.max_kullanim) {
        setTanimlamaMesaj({ tip: 'hata', metin: `"${cleanCode}" kuponunun toplam kullanım kotası dolmuştur.` })
        setTanimlamaLoading(false)
        return
      }

      // Başarılı: Hesaba ve localStorage'a ekle
      const updatedSaved = Array.from(new Set([...tanimliKuponKodlari, kuponData.kod]))
      setTanimliKuponKodlari(updatedSaved)

      try {
        localStorage.setItem(`sescim_user_coupons_${user.id}`, JSON.stringify(updatedSaved))
      } catch {}

      try {
        await supabase.from('kullanici_kuponlari').insert({
          user_id: user.id,
          kupon_id: kuponData.id,
          kupon_kodu: kuponData.kod,
        })
      } catch {}

      setKuponlar(prev => {
        const exists = prev.some(k => k.id === kuponData.id)
        const formatted = { ...kuponData, kaynak: 'tanimli' as const }
        return exists ? prev.map(k => (k.id === kuponData.id ? formatted : k)) : [formatted, ...prev]
      })

      setTanimlanacakKod('')
      const indirimStr = kuponData.indirim_tipi === 'yuzde' ? `%${kuponData.indirim_miktari}` : `${kuponData.indirim_miktari} TL`
      setTanimlamaMesaj({
        tip: 'basari',
        metin: `🎉 Harika! "${kuponData.kod}" (${indirimStr} İndirim) hesabınıza başarıyla tanımlandı. Alışverişlerinizde hemen kullanabilirsiniz.`
      })
    } catch (err: any) {
      setTanimlamaMesaj({ tip: 'hata', metin: 'Kupon kontrol edilirken bir hata oluştu: ' + (err.message || 'Lütfen tekrar deneyin.') })
    } finally {
      setTanimlamaLoading(false)
    }
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

  const openIadeModal = (s: Siparis) => {
    setIadeOrder(s)
    setIadeTip('iade')
    setIadeSebep('Ürün Arızalı / Kusurlu Çıktı')
    setIadeAciklama('')
    setIadeIban('')
    setIadeResult(null)
    setIadeModalOpen(true)
  }

  const handleIadeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!iadeOrder) return
    setIadeLoading(true)
    try {
      const res = await fetch('/api/iade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siparis_no: iadeOrder.siparis_no,
          user_id: user?.id,
          ad_soyad: profil ? `${profil.ad} ${profil.soyad}`.trim() : (user?.user_metadata?.full_name || user?.email || 'Müşteri'),
          email: user?.email,
          telefon: profil?.telefon || '',
          tip: iadeTip,
          sebep: iadeSebep,
          aciklama: iadeAciklama,
          iban: iadeIban,
          urunler: iadeOrder.urunler || []
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setIadeResult(data.iade)
      } else {
        alert(data.error || 'İade talebi oluşturulurken bir sorun oluştu.')
      }
    } catch (err: any) {
      alert('Bağlantı hatası: ' + err.message)
    } finally {
      setIadeLoading(false)
    }
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
          notlar: `[Sistem: Dekont yüklendi - ${publicUrl}] ${new Date().toLocaleString('tr-TR')}` 
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
                                className="text-xs font-display font-bold text-slate-600 hover:text-brand-red transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 w-full justify-center"
                              >
                                <Package size={14} /> {expandedOrders.includes(s.id) ? 'Detayları Gizle' : 'Ürünleri Gör'}
                              </button>
                              
                              {(s.durum === 'kargolandi' || s.durum === 'teslim_edildi') && s.kargo_takip_no && (
                                <div className="mt-1">
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault()
                                      const el = document.getElementById(`kargo-takip-${s.id}`)
                                      if (el) {
                                        el.classList.toggle('hidden')
                                      }
                                    }}
                                    className="text-xs font-display font-bold text-brand-red hover:bg-brand-red hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-brand-red/5 rounded-lg border border-brand-red/20 w-full justify-center"
                                  >
                                    <Truck size={14} /> Kargo Hareketleri
                                  </button>
                                  <div id={`kargo-takip-${s.id}`} className="hidden">
                                    <KargoTakip firma={s.kargo_firmasi || 'Bilinmiyor'} takipNo={s.kargo_takip_no} />
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>

                          {/* Ürün Detayları */}
                          {expandedOrders.includes(s.id) && (
                            <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                              
                              {/* Canlı Sipariş Zaman Çizelgesi (Timeline) */}
                              <div className="mb-6">
                                <OrderTimeline 
                                  durum={s.durum} 
                                  kargoTakipNo={s.kargo_takip_no} 
                                  kargoFirmasi={s.kargo_firmasi} 
                                  createdAt={s.created_at} 
                                />
                              </div>

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

                                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                                  {/* Sipariş Fişi / PDF */}
                                  <Link
                                    href={`/siparis/${s.siparis_no || s.id}/fatura`}
                                    target="_blank"
                                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-brand-red hover:border-brand-red/30 font-display font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
                                  >
                                    <FileText size={14} className="text-slate-500" />
                                    Sipariş Fişi / PDF
                                  </Link>

                                  {/* İade / Değişim Talebi */}
                                  {(s.durum === 'teslim_edildi' || s.durum === 'tamamlandi' || s.durum === 'kargolandi') && (
                                    <button
                                      onClick={() => openIadeModal(s)}
                                      className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-800 hover:bg-amber-100 font-display font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
                                    >
                                      <RotateCcw size={14} className="text-amber-600" />
                                      İade / Değişim Talebi
                                    </button>
                                  )}

                                  {s.kargo_takip_no && (
                                    <a
                                      href={`https://www.google.com/search?q=${encodeURIComponent(s.kargo_takip_no + ' kargo takip sorgula')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center gap-2 text-slate-700 text-xs font-display font-bold uppercase tracking-wider bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                                    >
                                      <Truck size={14} className="text-slate-400" />
                                      Kargo Takip
                                      <ExternalLink size={12} className="text-slate-400" />
                                    </a>
                                  )}
                                </div>
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
                          <label className="block font-medium text-xs text-slate-500 mb-1.5">İl *</label>
                          <select
                            required
                            value={adresSehir}
                            onChange={(e) => {
                              setAdresSehir(e.target.value)
                              setAdresIlce('')
                            }}
                            className="input-base text-sm py-2.5 bg-white"
                          >
                            <option value="">İl Seçiniz</option>
                            {IL_ISIMLERI.map((il) => (
                              <option key={il} value={il}>{il}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-medium text-xs text-slate-500 mb-1.5">İlçe *</label>
                          <select
                            required
                            disabled={!adresSehir}
                            value={adresIlce}
                            onChange={(e) => setAdresIlce(e.target.value)}
                            className="input-base text-sm py-2.5 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <option value="">{adresSehir ? 'İlçe Seçiniz' : 'Önce İl Seçin'}</option>
                            {getIlcelerByIl(adresSehir).map((ilce) => (
                              <option key={ilce} value={ilce}>{ilce}</option>
                            ))}
                          </select>
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
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                {/* Başlık ve Cüzdan Özeti */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="bg-brand-red/10 text-brand-red text-[10px] font-display font-black tracking-widest uppercase px-3 py-1 rounded-full">
                        İndirim Cüzdanım
                      </span>
                    </div>
                    <h2 className="font-display font-black text-2xl md:text-3xl text-slate-900 tracking-tight">
                      Kuponlarım &amp; Kampanyalar
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 font-body mt-1">
                      Hesabınıza tanımlanan özel indirimleri görüntüleyebilir, Instagram veya duyuru kuponlarınızı ekleyebilirsiniz.
                    </p>
                  </div>
                </div>

                {/* Kupon Kodu Tanımla (Özel Kod Ekleme Kartı) */}
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl p-5 md:p-7 shadow-xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-brand-red/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-start md:items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center text-white shadow-md flex-shrink-0">
                          <Ticket size={20} />
                        </div>
                        <div>
                          <h3 className="font-display font-black text-base md:text-lg tracking-wide uppercase">
                            Özel Kupon Kodu Tanımla
                          </h3>
                          <p className="text-xs text-slate-300 font-body mt-0.5">
                            Instagram (@sescimofficial), YouTube veya kampanya duyurularımızda paylaşılan indirim kodunuzu buraya girin.
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleKuponTanimla} className="mt-4 flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={tanimlanacakKod}
                          onChange={(e) => setTanimlanacakKod(e.target.value.toUpperCase())}
                          placeholder="Örn: INSTA10, VIP15, SESCIMYAZ"
                          className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 px-4 py-3.5 rounded-xl text-sm font-display font-black tracking-widest uppercase focus:outline-none focus:bg-white/15 focus:border-brand-red transition-all"
                        />
                        {tanimlanacakKod && (
                          <button
                            type="button"
                            onClick={() => setTanimlanacakKod('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-2 py-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={tanimlamaLoading || !tanimlanacakKod.trim()}
                        className="px-6 py-3.5 bg-brand-red hover:bg-red-700 text-white font-display font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-brand-red/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {tanimlamaLoading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Kontrol Ediliyor...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            Hesabıma Ekle
                          </>
                        )}
                      </button>
                    </form>

                    {tanimlamaMesaj && (
                      <div
                        className={`mt-4 p-3.5 rounded-xl text-xs font-body flex items-start gap-2.5 animate-in fade-in duration-200 ${
                          tanimlamaMesaj.tip === 'basari'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {tanimlamaMesaj.tip === 'basari' ? (
                          <CheckCircle size={18} className="flex-shrink-0 mt-0.5 text-emerald-400" />
                        ) : (
                          <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-400" />
                        )}
                        <span className="leading-relaxed">{tanimlamaMesaj.metin}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kupon Filtreleme Sekmeleri */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setKuponFiltre('tumu')}
                    className={`px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all ${
                      kuponFiltre === 'tumu'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tüm Kuponlar ({kuponlar.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setKuponFiltre('tanimli')}
                    className={`px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all ${
                      kuponFiltre === 'tanimli'
                        ? 'bg-brand-red text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Hesabıma Özel ({kuponlar.filter((k) => k.kaynak === 'tanimli').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setKuponFiltre('genel')}
                    className={`px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all ${
                      kuponFiltre === 'genel'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Genel Kampanyalar ({kuponlar.filter((k) => k.kaynak !== 'tanimli').length})
                  </button>
                </div>

                {/* Kupon Kartları Listesi */}
                {(() => {
                  const filtered = kuponlar.filter((k) => {
                    const isExpired = k.gecerlilik_tarihi && new Date(k.gecerlilik_tarihi).getTime() < Date.now()
                    if (isExpired) return false
                    if (kuponFiltre === 'tanimli') return k.kaynak === 'tanimli'
                    if (kuponFiltre === 'genel') return k.kaynak !== 'tanimli'
                    return true
                  })

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                          <Ticket size={28} className="text-slate-300" />
                        </div>
                        <h4 className="font-display font-bold text-base text-slate-700 mb-1">
                          {kuponFiltre === 'tanimli'
                            ? 'Hesabınıza Tanımlı Özel Kupon Bulunmuyor'
                            : 'Şu Anda Aktif Kupon Bulunmuyor'}
                        </h4>
                        <p className="font-body text-xs text-slate-500 max-w-md mx-auto">
                          Instagram veya diğer kampanyalardan edindiğiniz özel indirim kodunu yukarıdaki alandan tanımlayarak hesabınıza hemen ekleyebilirsiniz.
                        </p>
                      </div>
                    )
                  }

                  return (
                    <div className="grid md:grid-cols-2 gap-4">
                      {filtered.map((kupon) => {
                        const indirimText =
                          kupon.indirim_tipi === 'yuzde'
                            ? `%${kupon.indirim_miktari} İndirim`
                            : `${kupon.indirim_miktari.toLocaleString('tr-TR')} TL İndirim`

                        const isInstagram =
                          kupon.ozel_mi ||
                          kupon.kod.startsWith('INSTA') ||
                          (kupon.aciklama && kupon.aciklama.toLowerCase().includes('instagram'))

                        return (
                          <div
                            key={kupon.id}
                            className="bg-white border-2 border-slate-200 hover:border-brand-red/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                          >
                            <div className="flex h-full">
                              {/* Sol Bilet Başlığı */}
                              <div className="w-1/3 min-w-[110px] bg-gradient-to-b from-brand-red to-red-700 text-white p-4 flex flex-col justify-center items-center text-center relative border-r-2 border-dashed border-white/60">
                                <Ticket size={24} className="opacity-80 mb-2" />
                                <div className="font-display font-black text-2xl md:text-3xl leading-none">
                                  {kupon.indirim_tipi === 'yuzde' ? `%${kupon.indirim_miktari}` : `₺${kupon.indirim_miktari}`}
                                </div>
                                <span className="text-[10px] font-display font-bold uppercase tracking-widest mt-1 opacity-90">
                                  İNDİRİM
                                </span>
                              </div>

                              {/* Sağ Bilet Detayları */}
                              <div className="flex-1 p-4 md:p-5 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                    {kupon.kaynak === 'tanimli' ? (
                                      <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        🔒 Hesabıma Özel
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        🎁 Genel Kampanya
                                      </span>
                                    )}
                                    {isInstagram && (
                                      <span className="bg-pink-100 text-pink-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        📸 Instagram
                                      </span>
                                    )}
                                    {kupon.kategori ? (
                                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                        🏷️ {kupon.kategori}
                                      </span>
                                    ) : (
                                      <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        🌐 Tüm Ürünler
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="font-display font-bold text-slate-900 text-sm md:text-base leading-snug">
                                    {kupon.aciklama || `${indirimText} Fırsatı`}
                                  </h4>

                                  <div className="text-xs text-slate-500 font-body mt-2 space-y-1">
                                    {kupon.kategori ? (
                                      <div className="text-amber-800 font-medium">
                                        Kategori: <strong className="text-amber-900">{kupon.kategori}</strong>
                                        <span className="text-[11px] text-amber-700 block sm:inline sm:ml-1">
                                          (Yalnızca bu kategorideki ürünlerde geçerlidir)
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="text-slate-500">Tüm ürünlerde geçerlidir</div>
                                    )}
                                    {kupon.min_tutar ? (
                                      <div>
                                        Min. Sepet Tutarı: <strong className="text-slate-700">{kupon.min_tutar.toLocaleString('tr-TR')} ₺</strong>
                                      </div>
                                    ) : (
                                      <div>Alt limitsiz geçerli</div>
                                    )}
                                    {kupon.gecerlilik_tarihi && (
                                      <div>
                                        Son Kullanım: <strong className="text-slate-700">{new Date(kupon.gecerlilik_tarihi).toLocaleDateString('tr-TR')}</strong>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Kod ve Eylem Butonları */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                  <div className="flex-1 bg-slate-50 border border-slate-200 border-dashed rounded-lg px-3 py-2 flex items-center justify-between">
                                    <span className="font-display font-black tracking-widest text-brand-red text-sm">
                                      {kupon.kod}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(kupon.kod)
                                        setCopiedCoupon(kupon.id)
                                        setTimeout(() => setCopiedCoupon(null), 2000)
                                      }}
                                      className="text-slate-400 hover:text-slate-700 text-xs flex items-center gap-1 font-display font-semibold transition-colors"
                                      title="Kodu Kopyala"
                                    >
                                      {copiedCoupon === kupon.id ? (
                                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                          <Check size={12} /> Kopyalandı
                                        </span>
                                      ) : (
                                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                          <Copy size={12} /> Kopyala
                                        </span>
                                      )}
                                    </button>
                                  </div>

                                  <Link
                                    href={`/sepet?kupon=${encodeURIComponent(kupon.kod)}`}
                                    className="px-3.5 py-2 bg-slate-900 hover:bg-brand-red text-white text-xs font-display font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm"
                                  >
                                    <span>Sepette Kullan</span>
                                    <ArrowRight size={13} />
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* Instagram & Sosyal Medya Kampanya Banner */}
                <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 border border-pink-200/70 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
                      <Gift size={24} />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-slate-900 text-sm md:text-base">
                        Instagram &amp; Sosyal Medya Fırsatlarını Kaçırmayın!
                      </h4>
                      <p className="text-xs text-slate-600 font-body mt-0.5 max-w-xl">
                        Instagram sayfamızda (@sescimofficial) paylaşılan anlık flaş kupon kodlarını yukarıdaki alandan tanımlayarak sepette hemen indirim kazanabilirsiniz.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/kampanyalar"
                    className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 flex-shrink-0"
                  >
                    <span>Tüm Kampanyalar</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Kolay İade & Değişim Modalı */}
      {iadeModalOpen && iadeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-100">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <RotateCcw size={16} />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-slate-800 uppercase">
                    İade &amp; Değişim Talebi
                  </h3>
                  <p className="text-xs text-slate-500 font-body">Sipariş No: {iadeOrder.siparis_no}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIadeModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {iadeResult ? (
              /* Başarı Ekranı */
              <div className="p-6 text-center space-y-4 animate-in fade-in duration-300">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h4 className="font-display font-black text-xl text-slate-800">Talebiniz Alındı!</h4>
                  <p className="text-xs text-slate-500 font-body mt-1">
                    İade/değişim kaydınız başarıyla oluşturuldu.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-2">
                  <div className="font-display font-bold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Truck size={14} /> Ücretsiz Yurtiçi Kargo Gönderim Kodu
                  </div>
                  <div className="flex items-center justify-between bg-white border border-amber-300 rounded-lg px-3 py-2">
                    <span className="font-mono font-black text-base text-brand-red">
                      {iadeResult.kargo_kodu || '452918231'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(iadeResult.kargo_kodu || '452918231')
                        alert('Kargo kodu kopyalandı!')
                      }}
                      className="text-xs font-display font-bold text-slate-600 hover:text-brand-red flex items-center gap-1"
                    >
                      <Copy size={12} /> Kopyala
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800 font-body leading-relaxed">
                    En yakın Yurtiçi Kargo şubesine giderek yukarıdaki anlaşma kodunu vermeniz yeterlidir. Kargo ücreti tarafımızca karşılanmaktadır.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
                  <div className="text-[11px] text-slate-500 font-medium">Takip Numarası:</div>
                  <div className="font-mono font-bold text-xs text-slate-800">{iadeResult.takip_kodu}</div>
                </div>

                <button
                  type="button"
                  onClick={() => setIadeModalOpen(false)}
                  className="w-full btn-primary text-xs py-3 rounded-xl font-display font-bold uppercase tracking-wider"
                >
                  Kapat
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleIadeSubmit} className="p-6 space-y-5">
                {/* Talep Tipi Seçimi */}
                <div>
                  <label className="font-display font-bold text-xs uppercase text-slate-600 block mb-2">
                    Talep Türü *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIadeTip('iade')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        iadeTip === 'iade'
                          ? 'border-brand-red bg-brand-red/5 text-brand-red font-display font-bold text-xs shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white text-xs font-medium'
                      }`}
                    >
                      Para İadesi (Geri Ödeme)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIadeTip('degisim')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        iadeTip === 'degisim'
                          ? 'border-brand-red bg-brand-red/5 text-brand-red font-display font-bold text-xs shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white text-xs font-medium'
                      }`}
                    >
                      Ürün Değişimi
                    </button>
                  </div>
                </div>

                {/* İade Nedeni */}
                <div>
                  <label className="font-display font-bold text-xs uppercase text-slate-600 block mb-2">
                    Nedeni Belirtin *
                  </label>
                  <select
                    className="input-base text-sm py-2.5"
                    value={iadeSebep}
                    onChange={(e) => setIadeSebep(e.target.value)}
                  >
                    <option value="Ürün Arızalı / Kusurlu Çıktı">Ürün Arızalı / Kusurlu Çıktı</option>
                    <option value="Yanlış veya Eksik Ürün Gönderildi">Yanlış veya Eksik Ürün Gönderildi</option>
                    <option value="Beklentimi Karşılamadı / Cayma Hakkı">Beklentimi Karşılamadı / Cayma Hakkı</option>
                    <option value="Farklı Model ile Değişim">Farklı Model ile Değişim</option>
                    <option value="Kargo Sırasında Hasar Görmüş">Kargo Sırasında Hasar Görmüş</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>

                {/* IBAN */}
                {iadeTip === 'iade' && (
                  <div>
                    <label className="font-display font-bold text-xs uppercase text-slate-600 block mb-1">
                      IBAN Bilginiz (Havale / İade İçin)
                    </label>
                    <input
                      type="text"
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                      className="input-base text-sm py-2.5 font-mono"
                      value={iadeIban}
                      onChange={(e) => setIadeIban(e.target.value.toUpperCase())}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Kredi kartı ödemelerinde tutar aynı karta; Havale/EFT ödemelerinde yukarıdaki IBAN adresine iade edilir.
                    </p>
                  </div>
                )}

                {/* Açıklama */}
                <div>
                  <label className="font-display font-bold text-xs uppercase text-slate-600 block mb-2">
                    Ek Açıklama &amp; Notunuz
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Talebinizle ilgili eklemek istediğiniz detaylar..."
                    className="input-base text-sm py-2"
                    value={iadeAciklama}
                    onChange={(e) => setIadeAciklama(e.target.value)}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIadeModalOpen(false)}
                    className="flex-1 py-3 border border-slate-200 text-slate-600 font-display font-bold text-xs uppercase rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={iadeLoading}
                    className="flex-1 btn-primary py-3 text-xs font-display font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
                  >
                    {iadeLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {iadeLoading ? 'Gönderiliyor...' : 'Talebi Gönder'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
