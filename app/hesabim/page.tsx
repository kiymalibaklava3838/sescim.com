'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { BANK_ACCOUNTS } from '@/lib/bank-accounts'
import { getCarrierTrackingUrl } from '@/lib/shipping'
import Link from 'next/link'
import SafeProductImage from '@/components/SafeProductImage'
import { Package, Truck, Clock, CheckCircle, XCircle, LogOut, Upload, Check, Loader2, FileText, User as UserIcon, Phone, MapPin, Save, RefreshCw, Info, ExternalLink, Map as MapIcon, Plus, Trash2, Pencil, Star, Ticket, Copy, MessageSquare, Sparkles, ArrowRight, Tag, Gift, AlertCircle, ShoppingBag, RotateCcw, CheckCircle2, X } from 'lucide-react'
import OrderTimeline from '@/components/OrderTimeline'
import { parseReviewContent } from '@/components/ProductReviews'
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
  kullanildi?: boolean
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
  const [autoOpenCargoIds, setAutoOpenCargoIds] = useState<string[]>([])
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null)
  
  // Kupon Cüzdanı States
  const [tanimlanacakKod, setTanimlanacakKod] = useState('')
  const [tanimlamaLoading, setTanimlamaLoading] = useState(false)
  const [tanimlamaMesaj, setTanimlamaMesaj] = useState<{ tip: 'basari' | 'hata'; metin: string } | null>(null)
  const [kuponFiltre, setKuponFiltre] = useState<'tumu' | 'tanimli' | 'genel'>('tumu')
  const [tanimliKuponKodlari, setTanimliKuponKodlari] = useState<string[]>([])
  const [kullanilanKuponKodlari, setKullanilanKuponKodlari] = useState<string[]>([])
  
  // İade & Değişim Talebi States
  const [iadeTalepleri, setIadeTalepleri] = useState<any[]>([])
  const [iadeModalOpen, setIadeModalOpen] = useState(false)
  const [iadeOrder, setIadeOrder] = useState<Siparis | null>(null)
  const [iadeTip, setIadeTip] = useState<'iade' | 'degisim' | 'iptal'>('iade')
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
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [adresBasligi, setAdresBasligi] = useState('')
  const [adresAdSoyad, setAdresAdSoyad] = useState('')
  const [adresTelefon, setAdresTelefon] = useState('')
  const [adresSehir, setAdresSehir] = useState('')
  const [adresIlce, setAdresIlce] = useState('')
  const [acikAdres, setAcikAdres] = useState('')

  const supabase = useRef(createClient()).current
  const accessTokenRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true

    // Güvenlik zaman aşımı: Ne olursa olsun spinner en geç 3.5 saniye sonra kapatılır
    const fallbackTimer = setTimeout(() => {
      if (active) setLoading(false)
    }, 3500)

    loadUserAndData()

    // Oturum değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user && active) {
        loadUserAndData(session)
      }
    })

    return () => {
      active = false
      clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadUserAndData = async (existingSession?: any) => {
    try {
      let session = existingSession
      if (!session) {
        const { data } = await supabase.auth.getSession()
        session = data.session
      }

      if (!session?.user) {
        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user) {
          session = { user: userData.user, access_token: '' }
        }
      }

      if (!session?.user) {
        setLoading(false)
        router.push('/uye')
        return
      }

      setUser(session.user)
      if (session.access_token) {
        accessTokenRef.current = session.access_token
      }

    // Paralel veri yükleme: Siparişler, Adresler, Profil, Yorumlar ve Kuponlar eş zamanlı çekilir
    const ordersPromise = (async () => {
      try {
        if (session?.access_token) {
          const res = await fetch('/api/hesabim/siparisler', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
          if (res.ok) {
            const json = await res.json()
            if (Array.isArray(json.siparisler)) {
              setSiparisler(json.siparisler)
              return
            }
          }
        }
      } catch (e) {
        console.warn('API siparisler yuklenemedi, fallback yapiliyor:', e)
      }

      const { data: orders } = await supabase
        .from('siparisler')
        .select('*, siparis_kalemleri(*)')
        .or(`user_id.eq.${session.user.id},email.ilike.${session.user.email}`)
        .neq('durum', 'odeme_bekliyor')
        .order('created_at', { ascending: false })
        .limit(50)

      if (orders && orders.length > 0) {
        const ordersWithItems = orders.map((o: any) => {
          const dekontMatch = (o as any).notlar?.match(/Dekont yüklendi - ([^\s\]]+)/)
          const dekontUrl = (o as any).dekont_url || (dekontMatch ? dekontMatch[1] : undefined)
          const kalemler = (o.siparis_kalemleri || []).map((k: any) => ({
            urun_id: k.urun_id || k.id,
            ad: k.urun_adi || 'Ürün',
            fiyat: Number(k.birim_fiyat) || 0,
            adet: Number(k.adet) || 1,
            fotograf: k.fotograf || '',
          }))
          return {
            ...o,
            dekont_url: dekontUrl,
            urunler: kalemler,
          }
        })
        setSiparisler(ordersWithItems as any)
      } else {
        setSiparisler([])
      }
    })()

    const addressPromise = (async () => {
      const { data: addresses } = await supabase
        .from('kullanici_adresleri')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        
      setAdresler(addresses || [])
    })()

    const profilePromise = (async () => {
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
      } else {
        // user_metadata fallback (Yeni kayıt ve Google OAuth kullanıcıları için)
        const metaName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || ''
        const parts = metaName.trim().split(/\s+/)
        const metaSoyad = parts.length > 1 ? parts.pop() || '' : ''
        const metaAd = parts.join(' ') || metaName
        const metaPhone = session.user.user_metadata?.phone || ''

        if (metaAd) setAd(metaAd)
        if (metaSoyad) setSoyad(metaSoyad)
        if (metaPhone) setTelefon(metaPhone)

        // Otomatik uye_profiller kaydı oluştur (self-healing)
        if (metaAd || metaPhone) {
          try {
            const { data: newP } = await supabase
              .from('uye_profiller')
              .insert({ user_id: session.user.id, ad: metaAd, soyad: metaSoyad, telefon: metaPhone })
              .select('id, user_id, ad, soyad, telefon')
              .maybeSingle()
            if (newP) setProfil(newP)
          } catch {}
        }
      }
    })()

    const reviewsPromise = (async () => {
      try {
        const { data: reviews } = await supabase
          .from('urun_yorumlari')
          .select('id, urun_id, puan, yorum, onaylandi, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })

        if (reviews && reviews.length > 0) {
          const urunIds = Array.from(new Set(reviews.map((r: any) => r.urun_id).filter(Boolean)))
          const urunlerMap = new Map<string, any>()
          if (urunIds.length > 0) {
            try {
              const { createAkdagBrowserClient } = await import('@/lib/supabase-akdag')
              const akdagClient = createAkdagBrowserClient()
              const { data: aUrunler } = await akdagClient
                .from('urunler')
                .select('id, ad, slug, fotograflar')
                .in('id', urunIds)
              ;(aUrunler || []).forEach((u: any) => urunlerMap.set(u.id, u))
            } catch {}
          }

          const formattedReviews = reviews.map((r: any) => {
            const u = urunlerMap.get(r.urun_id)
            const { cleanYorum } = parseReviewContent(r.yorum || '')
            return {
              id: r.id,
              urun_id: r.urun_id,
              puan: r.puan,
              yorum: cleanYorum,
              durum: r.onaylandi ? 'onaylandi' : 'bekliyor',
              created_at: r.created_at,
              urun: {
                ad: u?.ad || 'Ürün',
                slug: u?.slug || r.urun_id,
                fotograflar: u?.fotograflar || []
              }
            }
          })
          setDegerlendirmeler(formattedReviews as any)
        } else {
          setDegerlendirmeler([])
        }
      } catch {
        setDegerlendirmeler([])
      }
    })()

    const couponsPromise = (async () => {
      let savedCodes: string[] = []
      const usedCodesSet = new Set<string>()

      try {
        const [userCouponsRes, usedCouponsRes, usedOrdersRes] = await Promise.all([
          supabase
            .from('kullanici_kuponlari')
            .select('kupon_kodu')
            .eq('user_id', session.user.id),
          supabase
            .from('kupon_kullanimlari')
            .select('kupon_kodu, durum, created_at')
            .eq('user_id', session.user.id)
            .neq('durum', 'iptal'),
          supabase
            .from('siparisler')
            .select('kupon_kodu, durum, odeme_durumu')
            .eq('user_id', session.user.id)
            .not('kupon_kodu', 'is', null)
            .neq('durum', 'iptal')
            .neq('odeme_durumu', 'odeme_hatasi'),
        ])

        if (userCouponsRes.data && userCouponsRes.data.length > 0) {
          savedCodes = userCouponsRes.data.map((uc: any) => String(uc.kupon_kodu || '').trim().toUpperCase()).filter(Boolean)
        }

        const PENDING_TIMEOUT_MS = 30 * 60 * 1000
        const now = Date.now()
        ;(usedCouponsRes.data || []).forEach((u: any) => {
          const code = String(u.kupon_kodu || '').trim().toUpperCase()
          if (!code) return
          if (u.durum === 'onaylandi') {
            usedCodesSet.add(code)
          } else if (u.durum === 'beklemede') {
            const createdAt = u.created_at ? new Date(u.created_at).getTime() : 0
            if (now - createdAt <= PENDING_TIMEOUT_MS) {
              usedCodesSet.add(code)
            }
          } else {
            usedCodesSet.add(code)
          }
        })

        ;(usedOrdersRes.data || []).forEach((o: any) => {
          const code = String(o.kupon_kodu || '').trim().toUpperCase()
          if (code) usedCodesSet.add(code)
        })
      } catch {}

      try {
        const localSaved = JSON.parse(localStorage.getItem(`sescim_user_coupons_${session.user.id}`) || '[]')
        if (Array.isArray(localSaved)) {
          savedCodes = Array.from(new Set([...savedCodes, ...localSaved.map((c: any) => String(c || '').trim().toUpperCase()).filter(Boolean)]))
        }
      } catch {}

      setTanimliKuponKodlari(savedCodes)
      setKullanilanKuponKodlari(Array.from(usedCodesSet))

      const { data: coupons } = await supabase
        .from('kuponlar')
        .select('*')
        .eq('aktif', true)
        .order('created_at', { ascending: false })
        
      if (coupons) {
        const formatted = coupons
          .filter((c: any) => {
            const codeUpper = String(c.kod || '').trim().toUpperCase()
            if (c.ozel_mi === true) {
              return savedCodes.includes(codeUpper) || usedCodesSet.has(codeUpper)
            }
            return true
          })
          .map((c: any) => {
            const codeUpper = String(c.kod || '').trim().toUpperCase()
            return {
              ...c,
              kaynak: savedCodes.includes(codeUpper) ? ('tanimli' as const) : ('genel' as const),
              kullanildi: usedCodesSet.has(codeUpper),
            }
          })
          .sort((a: any, b: any) => Number(!!a.kullanildi) - Number(!!b.kullanildi))
        setKuponlar(formatted)
      } else {
        setKuponlar([])
      }
    })()

    const returnsPromise = (async () => {
      try {
        if (session?.access_token) {
          const res = await fetch('/api/iade', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data)) {
              setIadeTalepleri(data)
            }
          }
        }
      } catch {}
    })()

      await Promise.allSettled([ordersPromise, addressPromise, profilePromise, reviewsPromise, couponsPromise, returnsPromise])
    } catch (err) {
      console.error('Hesabim veri yukleme hatasi:', err)
    } finally {
      setLoading(false)
    }
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

    if (kullanilanKuponKodlari.includes(cleanCode)) {
      setTanimlamaMesaj({ tip: 'hata', metin: `"${cleanCode}" kupon kodu hesabınız tarafından daha önce kullanılmıştır. Her kupon hesap başına yalnızca 1 kez kullanılabilir.` })
      setTanimlamaLoading(false)
      return
    }

    if (tanimliKuponKodlari.includes(cleanCode)) {
      setTanimlamaMesaj({ tip: 'hata', metin: `"${cleanCode}" kupon kodu zaten hesabınızda tanımlı.` })
      setTanimlamaLoading(false)
      return
    }

    try {
      // Sunucu tarafında tek-kullanım, süre, kota ve aktiflik doğrulaması (/api/kupon-dogrula)
      let token = accessTokenRef.current || ''
      if (!token) {
        const { data: sessData } = await supabase.auth.getSession()
        token = sessData?.session?.access_token || ''
      }

      const verifyRes = await fetch('/api/kupon-dogrula', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ kod: cleanCode }),
      })
      const verifyJson = await verifyRes.json()

      if (!verifyRes.ok || !verifyJson.valid || !verifyJson.kupon) {
        if (verifyJson.alreadyUsed) {
          setKullanilanKuponKodlari((prev) => Array.from(new Set([...prev, cleanCode])))
        }
        setTanimlamaMesaj({
          tip: 'hata',
          metin: verifyJson.error || `"${cleanCode}" geçerli bir kupon kodu bulunamadı. Lütfen kodu kontrol edin.`,
        })
        setTanimlamaLoading(false)
        return
      }

      const kuponData = verifyJson.kupon
      const normalizedKod = String(kuponData.kod || cleanCode).trim().toUpperCase()

      // Başarılı: Hesaba ve localStorage'a ekle
      const updatedSaved = Array.from(new Set([...tanimliKuponKodlari, normalizedKod]))
      setTanimliKuponKodlari(updatedSaved)

      try {
        localStorage.setItem(`sescim_user_coupons_${user.id}`, JSON.stringify(updatedSaved))
      } catch {}

      try {
        await supabase.from('kullanici_kuponlari').insert({
          user_id: user.id,
          kupon_id: kuponData.id,
          kupon_kodu: normalizedKod,
        })
      } catch {}

      setKuponlar((prev) => {
        const exists = prev.some((k) => k.id === kuponData.id)
        const formatted: Kupon = {
          id: kuponData.id,
          kod: normalizedKod,
          indirim_tipi: kuponData.indirim_tipi,
          indirim_miktari: Number(kuponData.indirim_miktari),
          min_tutar: kuponData.min_tutar ?? null,
          gecerlilik_tarihi: kuponData.gecerlilik_tarihi ?? null,
          aktif: true,
          aciklama: kuponData.aciklama ?? null,
          ozel_mi: kuponData.ozel_mi ?? false,
          kategori: kuponData.kategori ?? null,
          kaynak: 'tanimli',
          kullanildi: false,
        }
        return exists ? prev.map((k) => (k.id === kuponData.id ? formatted : k)) : [formatted, ...prev]
      })

      setTanimlanacakKod('')
      const indirimStr = kuponData.indirim_tipi === 'yuzde' ? `%${kuponData.indirim_miktari}` : `${kuponData.indirim_miktari} TL`
      setTanimlamaMesaj({
        tip: 'basari',
        metin: `🎉 Harika! "${normalizedKod}" (${indirimStr} İndirim) hesabınıza başarıyla tanımlandı. Alışverişlerinizde 1 kez kullanabilirsiniz.`,
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

  const resetAddressForm = () => {
    setShowAddAddress(false)
    setEditingAddressId(null)
    setAdresBasligi('')
    setAdresAdSoyad('')
    setAdresTelefon('')
    setAdresSehir('')
    setAdresIlce('')
    setAcikAdres('')
  }

  const openNewAddressForm = () => {
    if (showAddAddress && !editingAddressId) {
      resetAddressForm()
      return
    }
    setEditingAddressId(null)
    setAdresBasligi('')
    setAdresAdSoyad(`${ad} ${soyad}`.trim())
    setAdresTelefon(telefon || '')
    setAdresSehir('')
    setAdresIlce('')
    setAcikAdres('')
    setShowAddAddress(true)
  }

  const openEditAddressForm = (adres: Adres) => {
    setEditingAddressId(adres.id)
    setAdresBasligi(adres.adres_basligi || '')
    setAdresAdSoyad(adres.ad_soyad || '')
    setAdresTelefon(adres.telefon || '')
    setAdresSehir(adres.sehir || '')
    setAdresIlce(adres.ilce || '')
    setAcikAdres(adres.acik_adres || '')
    setShowAddAddress(true)
  }

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSavingAddress(true)
    try {
      const payload = {
        adres_basligi: adresBasligi.trim(),
        ad_soyad: adresAdSoyad.trim(),
        telefon: adresTelefon.trim(),
        sehir: adresSehir.trim(),
        ilce: adresIlce.trim(),
        acik_adres: acikAdres.trim(),
      }

      if (editingAddressId) {
        const { data, error } = await supabase
          .from('kullanici_adresleri')
          .update(payload)
          .eq('id', editingAddressId)
          .eq('user_id', user.id)
          .select()
          .single()

        if (error) throw error
        if (data) {
          setAdresler((prev) => prev.map((a) => (a.id === editingAddressId ? data : a)))
        }
      } else {
        const { data, error } = await supabase
          .from('kullanici_adresleri')
          .insert({
            user_id: user.id,
            ...payload,
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          setAdresler((prev) => [data, ...prev])
        }
      }

      resetAddressForm()
    } catch (err: any) {
      alert(`Adres kaydedilemedi: ${err.message}`)
    } finally {
      setSavingAddress(false)
    }
  }

  const handleDeleteAddress = async (id: string) => {
    if (!user) return
    if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('kullanici_adresleri')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
      setAdresler((prev) => prev.filter((a) => a.id !== id))
      if (editingAddressId === id) {
        resetAddressForm()
      }
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
    const isPreShipment = ['beklemede', 'onaylandi', 'hazirlaniyor'].includes(s.durum)
    setIadeOrder(s)
    setIadeTip(isPreShipment ? 'iptal' : 'iade')
    setIadeSebep(isPreShipment ? 'Siparişten vazgeçtim' : 'Ürün Arızalı / Kusurlu Çıktı')
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
      let token = accessTokenRef.current || ''
      if (!token) {
        const { data: sessData } = await supabase.auth.getSession()
        token = sessData?.session?.access_token || ''
      }

      const res = await fetch('/api/iade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          siparis_id: iadeOrder.id,
          siparis_no: iadeOrder.siparis_no,
          ad_soyad: profil ? `${profil.ad} ${profil.soyad}`.trim() : (user?.user_metadata?.full_name || user?.email || 'Müşteri'),
          email: user?.email,
          telefon: profil?.telefon || '',
          talep_tipi: iadeTip,
          sebep: iadeSebep,
          aciklama: iadeAciklama,
          iban: iadeIban,
          urunler: iadeOrder.urunler || []
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setIadeResult({
          iade_kodu: data.iade_kodu,
          message: data.message,
          talep_tipi: iadeTip,
        })
        if (data.talep) {
          setIadeTalepleri((prev) => [data.talep, ...prev])
        }
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

      const res = await fetch('/api/dekont-bildirim', {
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
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson?.error || 'Dekont bildirimi gönderilemedi')
      }

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
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    if (!expandedOrders.includes(s.id)) {
                                      setExpandedOrders((prev) => [...prev, s.id])
                                    }
                                    if (!autoOpenCargoIds.includes(s.id)) {
                                      setAutoOpenCargoIds((prev) => [...prev, s.id])
                                    }
                                  }}
                                  className="text-xs font-display font-bold text-brand-red hover:bg-brand-red hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-brand-red/5 rounded-lg border border-brand-red/20 w-full justify-center cursor-pointer"
                                >
                                  <Truck size={14} /> Canlı Kargo Takibi
                                </button>
                              )}
                            </div>

                          </div>

                          {/* Ürün Detayları */}
                          {expandedOrders.includes(s.id) && (
                            <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                              
                              {/* Canlı İade / Değişim Talep Durumu Kartı (Varsa) */}
                              {(() => {
                                const orderReturn = iadeTalepleri.find(
                                  (r) => r.siparis_id === s.id || r.siparis_no === s.siparis_no
                                )
                                if (!orderReturn) return null
                                const tipLabel =
                                  orderReturn.talep_tipi === 'degisim'
                                    ? 'Değişim'
                                    : orderReturn.talep_tipi === 'iptal'
                                    ? 'Sipariş İptal'
                                    : 'İade'
                                const durumLabels: Record<string, { text: string; cls: string }> = {
                                  inceleniyor: { text: 'İnceleniyor', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
                                  onaylandi: { text: 'Onaylandı', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
                                  tamamlandi: { text: 'Tamamlandı', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                                  reddedildi: { text: 'Reddedildi', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
                                }
                                const stInfo = durumLabels[orderReturn.durum] || durumLabels.inceleniyor

                                return (
                                  <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <RotateCcw size={16} className="text-brand-red" />
                                        <span className="font-display font-bold text-xs uppercase tracking-wider text-slate-800">
                                          {tipLabel} Talebiniz ({orderReturn.iade_kodu})
                                        </span>
                                      </div>
                                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${stInfo.cls}`}>
                                        {stInfo.text}
                                      </span>
                                    </div>

                                    {orderReturn.kargo_iade_kodu && orderReturn.durum === 'onaylandi' && (
                                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                          <div className="text-[11px] font-bold text-blue-900 uppercase">
                                            {orderReturn.kargo_firmasi || 'Basit Kargo'} İade Gönderim Kodunuz:
                                          </div>
                                          <div className="font-mono font-black text-base text-blue-700 mt-0.5">
                                            {orderReturn.kargo_iade_kodu}
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(orderReturn.kargo_iade_kodu)
                                            alert('İade kargo kodu kopyalandı!')
                                          }}
                                          className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                          <Copy size={12} /> Kopyala
                                        </button>
                                      </div>
                                    )}

                                    {!orderReturn.kargo_iade_kodu && orderReturn.durum === 'inceleniyor' && (
                                      <p className="text-xs text-slate-500">
                                        Talebiniz ekibimiz tarafından incelenmektedir. Onaylandığında anlaşmalı kargo gönderim kodunuz burada görüntülenecek ve e-posta ile iletilecektir.
                                      </p>
                                    )}

                                    {orderReturn.admin_notu && (
                                      <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5">
                                        <strong className="text-slate-900">Ekibimizin Notu:</strong> {orderReturn.admin_notu}
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}

                              {/* Canlı Sipariş Zaman Çizelgesi (Timeline) */}
                              <div className="mb-6">
                                <OrderTimeline 
                                  durum={s.durum} 
                                  kargoTakipNo={s.kargo_takip_no} 
                                  kargoFirmasi={s.kargo_firmasi} 
                                  createdAt={s.created_at}
                                  defaultOpenMovements={autoOpenCargoIds.includes(s.id)}
                                  onStatusSync={(newStatus) => {
                                    setSiparisler((prev) =>
                                      prev.map((item) =>
                                        item.id === s.id ? { ...item, durum: newStatus } : item
                                      )
                                    )
                                  }}
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
                                {Array.isArray(s.urunler) && s.urunler.length > 0 ? (
                                  s.urunler.map((u, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                      <div className="w-14 h-14 bg-slate-50 rounded-lg border border-slate-100 flex-shrink-0 relative overflow-hidden">
                                        <SafeProductImage src={u.fotograf} alt={u.ad} fill className="object-contain p-1" placeholderIconSize={20} />
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
                                  ))
                                ) : (
                                  <div className="text-xs text-slate-400 italic py-2">Ürün detay bilgisi bulunamadı.</div>
                                )}
                              </div>

                              <div className="mt-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-t border-slate-100 pt-6">
                                <div className="flex gap-4 w-full md:w-auto">
                                  {s.dekont_url ? (
                                    <div className="flex items-center gap-2 text-emerald-600 text-xs font-display font-bold px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                                      <CheckCircle size={16} /> Dekont Yüklendi
                                      <a href={s.dekont_url} target="_blank" rel="noreferrer" className="ml-2 text-emerald-600 hover:text-emerald-500 transition-colors bg-white p-1 rounded-md shadow-sm border border-emerald-100" title="Dekontu Aç">
                                        <FileText size={14} />
                                      </a>
                                    </div>
                                  ) : s.odeme_tipi === 'havale' && s.durum !== 'iptal' && s.durum !== 'teslim_edildi' ? (
                                    <label className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-display font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer">
                                      {uploadingId === s.id ? (
                                        <>
                                          <Loader2 size={14} className="animate-spin text-blue-600" />
                                          <span>Yükleniyor...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Upload size={14} className="text-blue-600" />
                                          <span>Dekont Yükle</span>
                                        </>
                                      )}
                                      <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        className="hidden"
                                        disabled={uploadingId === s.id}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) handleReceiptUpload(s.id, file)
                                        }}
                                      />
                                    </label>
                                  ) : null}
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

                                  {/* İptal / İade / Değişim Talebi Durumu veya Başlatma Butonu */}
                                  {['beklemede', 'onaylandi', 'hazirlaniyor', 'kargolandi', 'teslim_edildi', 'tamamlandi'].includes(s.durum) && (() => {
                                    const activeReturn = iadeTalepleri.find(
                                      (r) =>
                                        (r.siparis_id === s.id || r.siparis_no === s.siparis_no) &&
                                        r.durum !== 'reddedildi'
                                    )
                                    if (activeReturn) {
                                      const statusText: Record<string, string> = {
                                        inceleniyor: 'İnceleniyor',
                                        onaylandi: 'Onaylandı',
                                        tamamlandi: 'Tamamlandı',
                                      }
                                      const tLabel =
                                        activeReturn.talep_tipi === 'degisim'
                                          ? 'Değişim'
                                          : activeReturn.talep_tipi === 'iptal'
                                          ? 'İptal'
                                          : 'İade'
                                      return (
                                        <span className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 font-display font-bold text-xs uppercase tracking-wider">
                                          <RotateCcw size={13} />
                                          {tLabel}: {statusText[activeReturn.durum] || activeReturn.durum}
                                        </span>
                                      )
                                    }
                                    const isPreShip = ['beklemede', 'onaylandi', 'hazirlaniyor'].includes(s.durum)
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => openIadeModal(s)}
                                        className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border font-display font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer ${
                                          isPreShip
                                            ? 'border-rose-300 bg-rose-50/80 text-rose-800 hover:bg-rose-100'
                                            : 'border-amber-300 bg-amber-50/80 text-amber-800 hover:bg-amber-100'
                                        }`}
                                      >
                                        <RotateCcw size={14} className={isPreShip ? 'text-rose-600' : 'text-amber-600'} />
                                        {isPreShip ? 'Sipariş İptal / İade' : 'İade / Değişim Talebi'}
                                      </button>
                                    )
                                  })()}

                                  {s.kargo_takip_no && (() => {
                                    const carrierUrl = getCarrierTrackingUrl(s.kargo_firmasi, s.kargo_takip_no)
                                    return carrierUrl ? (
                                      <a
                                        href={carrierUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 text-slate-700 text-xs font-display font-bold uppercase tracking-wider bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-brand-red/30 hover:text-brand-red transition-all shadow-sm"
                                      >
                                        <Truck size={14} className="text-brand-red" />
                                        {s.kargo_firmasi ? `${s.kargo_firmasi} Takip` : 'Resmi Kargo Takip'}
                                        <ExternalLink size={12} className="text-slate-400" />
                                      </a>
                                    ) : null
                                  })()}
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
                    type="button"
                    onClick={openNewAddressForm}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white rounded-lg font-display font-bold text-sm transition-colors cursor-pointer"
                  >
                    {showAddAddress && !editingAddressId ? <XCircle size={16} /> : <Plus size={16} />}
                    {showAddAddress && !editingAddressId ? 'Kapat' : 'Yeni Adres Ekle'}
                  </button>
                </div>

                {showAddAddress && (
                  <div className="bg-white border border-brand-red/20 rounded-2xl p-6 md:p-8 shadow-sm mb-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-display font-bold text-lg text-slate-800">
                        {editingAddressId ? 'Adresi Düzenle' : 'Yeni Adres Bilgileri'}
                      </h3>
                      <button
                        type="button"
                        onClick={resetAddressForm}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
                        aria-label="Formu Kapat"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <form onSubmit={handleSaveAddress} className="space-y-4">
                      
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

                      <div className="flex justify-end gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={resetAddressForm}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-display font-bold text-sm transition-colors cursor-pointer"
                        >
                          Vazgeç
                        </button>
                        <button type="submit" disabled={savingAddress} className="flex items-center gap-2 bg-brand-red text-white px-6 py-2.5 rounded-xl font-display font-bold text-sm hover:bg-brand-red/90 transition-all disabled:opacity-50 cursor-pointer">
                          {savingAddress ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          {editingAddressId ? 'Güncelle' : 'Kaydet'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {adresler.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MapIcon size={24} className="text-slate-300" />
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
                      <div key={adres.id} className={`bg-white border rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all relative group ${editingAddressId === adres.id ? 'border-brand-red ring-1 ring-brand-red/20' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2 text-brand-red font-display font-bold text-sm">
                            <MapPin size={16} />
                            {adres.adres_basligi}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditAddressForm(adres)}
                              className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors p-1.5 cursor-pointer"
                              title="Adresi Düzenle"
                            >
                              <Pencil size={15} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteAddress(adres.id)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors p-1.5 cursor-pointer"
                              title="Adresi Sil"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
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
                            <SafeProductImage src={urunFirtPhoto} alt={deg.urun?.ad || ''} fill className="object-contain p-2 group-hover:scale-110 transition-transform duration-500" placeholderIconSize={24} />
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
                        ? 'bg-brand-red text-white shadow-sm'
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
                        ? 'bg-brand-red text-white shadow-sm'
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
                          Instagram sayfamızdan (<a href="https://www.instagram.com/sescimofficial" target="_blank" rel="noopener noreferrer" className="text-brand-red font-bold underline">@sescimofficial</a>) veya diğer kampanyalardan edindiğiniz indirim kodunu yukarıdaki kutucuktan tanımlayarak anında kullanabilirsiniz.
                        </p>
                      </div>
                    )
                  }

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                            className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all flex flex-col justify-between relative group ${
                              kupon.kullanildi
                                ? 'border-slate-200 opacity-75 grayscale-[25%]'
                                : 'border-slate-200 hover:border-brand-red/40 hover:shadow-md'
                            }`}
                          >
                            <div className="flex h-full">
                              {/* Sol Bilet Başlığı */}
                              <div className={`w-28 sm:w-32 flex-shrink-0 text-white p-3 sm:p-4 flex flex-col justify-center items-center text-center relative border-r border-dashed border-white/40 select-none ${
                                kupon.kullanildi
                                  ? 'bg-gradient-to-b from-slate-500 to-slate-600'
                                  : 'bg-gradient-to-b from-brand-red to-red-700'
                              }`}>
                                {/* Kupon Bilet Çentikleri (Ticket Notches) */}
                                <div className="absolute -top-3 -right-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-200 pointer-events-none" />
                                <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-200 pointer-events-none" />

                                <Ticket size={22} className="opacity-80 mb-1 sm:mb-2" />
                                <div className="font-display font-black text-xl sm:text-2xl leading-tight">
                                  {kupon.indirim_tipi === 'yuzde' ? `%${kupon.indirim_miktari}` : `₺${kupon.indirim_miktari}`}
                                </div>
                                <span className="text-[9px] font-display font-bold uppercase tracking-widest mt-1 opacity-90">
                                  {kupon.kullanildi ? 'KULLANILDI' : 'İNDİRİM'}
                                </span>
                              </div>

                              {/* Sağ Bilet Detayları */}
                              <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                    {kupon.kullanildi && (
                                      <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                        <Check size={10} /> Kullanıldı (1/1)
                                      </span>
                                    )}
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
                                      <span className="bg-pink-100 text-pink-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                        📸 Instagram
                                      </span>
                                    )}
                                    {kupon.kategori ? (
                                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 truncate max-w-[180px]" title={kupon.kategori}>
                                        🏷️ {kupon.kategori}
                                      </span>
                                    ) : (
                                      <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        🌐 Tüm Ürünler
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="font-display font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">
                                    {kupon.aciklama || `${indirimText} Fırsatı`}
                                  </h4>

                                  <div className="text-xs text-slate-500 font-body mt-2 space-y-1">
                                    {kupon.kategori && (
                                      <div className="text-amber-800 font-medium text-[11px]">
                                        Kategori: <strong className="text-amber-900">{kupon.kategori}</strong>
                                      </div>
                                    )}
                                    {kupon.min_tutar ? (
                                      <div className="text-[11px]">
                                        Min. Sepet: <strong className="text-slate-700">{kupon.min_tutar.toLocaleString('tr-TR')} ₺</strong>
                                      </div>
                                    ) : (
                                      <div className="text-[11px] text-slate-500">Alt limitsiz geçerli</div>
                                    )}
                                    {kupon.gecerlilik_tarihi && (
                                      <div className="text-[11px]">
                                        Son Gün: <strong className="text-slate-700">{new Date(kupon.gecerlilik_tarihi).toLocaleDateString('tr-TR')}</strong>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Kod ve Eylem Butonları */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl px-3 py-2 flex items-center justify-between">
                                    <span className="font-display font-black tracking-widest text-brand-red text-xs sm:text-sm truncate select-all">
                                      {kupon.kod}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(kupon.kod)
                                        setCopiedCoupon(kupon.id)
                                        setTimeout(() => setCopiedCoupon(null), 2000)
                                      }}
                                      className="text-slate-500 hover:text-brand-red text-xs flex items-center gap-1 font-display font-semibold transition-colors flex-shrink-0 ml-2"
                                      title="Kodu Kopyala"
                                    >
                                      {copiedCoupon === kupon.id ? (
                                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                          <Check size={12} /> Kopyalandı
                                        </span>
                                      ) : (
                                        <span className="text-[11px] text-slate-600 flex items-center gap-1">
                                          <Copy size={12} /> Kopyala
                                        </span>
                                      )}
                                    </button>
                                  </div>

                                  {kupon.kullanildi ? (
                                    <div className="w-full py-2 px-3 bg-slate-100 text-slate-500 border border-slate-200 text-xs font-display font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 text-center select-none">
                                      <CheckCircle2 size={13} />
                                      <span>Kullanım Hakkı Doldu (1/1)</span>
                                    </div>
                                  ) : (
                                    <Link
                                      href={`/sepet?kupon=${encodeURIComponent(kupon.kod)}`}
                                      className="w-full py-2 px-3 bg-slate-900 hover:bg-brand-red text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm text-center"
                                    >
                                      <span>Sepette Kullan</span>
                                      <ArrowRight size={13} />
                                    </Link>
                                  )}
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
                <div className="mt-6 bg-gradient-to-br from-pink-50 via-rose-50/60 to-purple-50 border border-pink-200/80 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
                      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-slate-900 text-sm md:text-base">
                        Instagram Fırsatlarını &amp; Kampanyalarını Kaçırmayın!
                      </h4>
                      <p className="text-xs text-slate-600 font-body mt-0.5 max-w-xl">
                        Instagram sayfamızda (
                        <a
                          href="https://www.instagram.com/sescimofficial"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-600 hover:text-pink-700 font-bold underline transition-colors"
                        >
                          @sescimofficial
                        </a>
                        ) paylaşılan anlık flaş kupon kodlarını hesabınıza ekleyerek sepette anında indirim kazanabilirsiniz.
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://www.instagram.com/sescimofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:opacity-95 text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-pink-500/25 flex items-center gap-2 flex-shrink-0"
                  >
                    <span>@sescimofficial Takip Et</span>
                    <ExternalLink size={14} />
                  </a>
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
                    {iadeTip === 'iptal' ? 'Sipariş İptal & Para İadesi' : 'İade & Değişim Talebi'}
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
                    {iadeResult.talep_tipi === 'degisim'
                      ? 'Değişim'
                      : iadeResult.talep_tipi === 'iptal'
                      ? 'Sipariş iptal ve para iadesi'
                      : 'İade'}{' '}
                    başvurunuz ekibimize başarıyla iletildi.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2">
                  <div className="font-display font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <RotateCcw size={14} className="text-brand-red" /> Talep Takip Kodunuz
                  </div>
                  <div className="flex items-center justify-between bg-white border border-slate-300 rounded-lg px-3 py-2">
                    <span className="font-mono font-black text-base text-brand-red">
                      {iadeResult.iade_kodu}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(iadeResult.iade_kodu || '')
                        alert('Takip kodu kopyalandı!')
                      }}
                      className="text-xs font-display font-bold text-slate-600 hover:text-brand-red flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={12} /> Kopyala
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 font-body leading-relaxed">
                    {iadeResult.talep_tipi === 'iptal'
                      ? 'Siparişiniz henüz kargolanmadığı için herhangi bir kargo gönderimi yapmanıza gerek yoktur. Ekibimiz iptal talebinizi onayladığında ödemeniz PayTR üzerinden kartınıza (veya Havale/EFT ise IBAN hesabınıza) iade edilecektir.'
                      : 'Ekibimiz talebinizi inceleyip onayladıktan sonra anlaşmalı kargo gönderim kodunuz (Basit Kargo) hem Hesabım → Siparişlerim ekranında hem de e-posta adresinizde paylaşılacaktır.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIadeModalOpen(false)}
                  className="w-full btn-primary text-xs py-3 rounded-xl font-display font-bold uppercase tracking-wider cursor-pointer"
                >
                  Tamam, Kapat
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleIadeSubmit} className="p-6 space-y-5">
                {iadeTip === 'iptal' ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 leading-relaxed">
                    <strong className="block text-rose-950 mb-0.5">Kargolanmamış Sipariş İptali</strong>
                    Siparişiniz henüz kargoya verilmemiştir. İptal talebiniz onaylandığında kredi kartı ödemeleri <strong>PayTR</strong> üzerinden doğrudan kartınıza, Havale/EFT ödemeleri belirttiğiniz IBAN&apos;a iade edilir.
                  </div>
                ) : (
                  /* Talep Tipi Seçimi */
                  <div>
                    <label className="font-display font-bold text-xs uppercase text-slate-600 block mb-2">
                      Talep Türü *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setIadeTip('iade')}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
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
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          iadeTip === 'degisim'
                            ? 'border-brand-red bg-brand-red/5 text-brand-red font-display font-bold text-xs shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white text-xs font-medium'
                        }`}
                      >
                        Ürün Değişimi
                      </button>
                    </div>
                  </div>
                )}

                {/* İptal / İade Nedeni */}
                <div>
                  <label className="font-display font-bold text-xs uppercase text-slate-600 block mb-2">
                    Nedeni Belirtin *
                  </label>
                  <select
                    className="input-base text-sm py-2.5 bg-white"
                    value={iadeSebep}
                    onChange={(e) => setIadeSebep(e.target.value)}
                  >
                    {iadeTip === 'iptal' ? (
                      <>
                        <option value="Siparişten vazgeçtim">Siparişten vazgeçtim</option>
                        <option value="Yanlış ürün veya adet seçtim">Yanlış ürün veya adet seçtim</option>
                        <option value="Adres veya fatura bilgisi değiştireceğim">Adres veya fatura bilgisi değiştireceğim</option>
                        <option value="Teslimat süresi nedeniyle iptal">Teslimat süresi nedeniyle iptal</option>
                        <option value="Diğer">Diğer</option>
                      </>
                    ) : (
                      <>
                        <option value="Ürün Arızalı / Kusurlu Çıktı">Ürün Arızalı / Kusurlu Çıktı</option>
                        <option value="Yanlış veya Eksik Ürün Gönderildi">Yanlış veya Eksik Ürün Gönderildi</option>
                        <option value="Beklentimi Karşılamadı / Cayma Hakkı">Beklentimi Karşılamadı / Cayma Hakkı</option>
                        <option value="Farklı Model ile Değişim">Farklı Model ile Değişim</option>
                        <option value="Kargo Sırasında Hasar Görmüş">Kargo Sırasında Hasar Görmüş</option>
                        <option value="Diğer">Diğer</option>
                      </>
                    )}
                  </select>
                </div>

                {/* IBAN */}
                {(iadeTip === 'iade' || iadeTip === 'iptal') && (
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
