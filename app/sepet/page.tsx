'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  getCart,
  updateQty,
  removeFromCart,
  clearCart,
  type CartItem,
} from '@/lib/cart'
import { dovizToTL, DEFAULT_KUR, type KurData } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'
import { 
  ArrowLeft, Trash2, Minus, Plus, CreditCard, Loader2, MapPin, Truck, Store, 
  Info, Briefcase, User as UserIcon, Check, ExternalLink, Ticket, X 
} from 'lucide-react'
import type { Session, User } from '@supabase/supabase-js'
import RecentlyViewed from '@/components/RecentlyViewed'
import CartCrossSell from '@/components/CartCrossSell'
import FreeShippingBar from '@/components/FreeShippingBar'
import { calculateCouponDiscount, matchesCategory } from '@/lib/coupon-helper'
import { IL_ISIMLERI, getIlcelerByIl } from '@/lib/turkey-locations'
import { calculateShippingFee, SHIPPING_CONFIG } from '@/lib/shipping'
import { isQuoteOnlyProduct } from '@/lib/distributor-rules'
import InstallmentModal from '@/components/InstallmentModal'

export default function SepetPage() {
  const [items, setItems] = useState<CartItem[]>([])
  const [user, setUser] = useState<User | null>(null)
  
  // Profil ve Adresler
  const [adresler, setAdresler] = useState<any[]>([])
  const [seciliAdresId, setSeciliAdresId] = useState<string | null>(null)

  // Form
  const [adSoyad, setAdSoyad] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [notlar, setNotlar] = useState('')
  const teslimat = 'kargo'
  const [teslimatAdresi, setTeslimatAdresi] = useState('')
  const [sehir, setSehir] = useState('')
  const [ilce, setIlce] = useState('')
  const [acikAdresDetay, setAcikAdresDetay] = useState('')
  const [faturaTipi, setFaturaTipi] = useState<'bireysel' | 'kurumsal'>('bireysel')
  const [firmaUnvani, setFirmaUnvani] = useState('')
  const [vergiDairesi, setVergiDairesi] = useState('')
  const [vergiNo, setVergiNo] = useState('')
  
  // Sözleşme Onayı
  const [sozlesmeOnay, setSozlesmeOnay] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [doneNo, setDoneNo] = useState('')
  const [payToken, setPayToken] = useState<string | null>(null)
  const [kur, setKur] = useState<KurData>(DEFAULT_KUR)
  const [payTrWarning, setPayTrWarning] = useState(false)
  const [showTaksitModal, setShowTaksitModal] = useState(false)
  
  // Kupon
  const [kuponlar, setKuponlar] = useState<any[]>([])
  const [tanimliKuponlar, setTanimliKuponlar] = useState<any[]>([])
  const [uygulananKupon, setUygulananKupon] = useState<any>(null)
  const [manuelKuponKodu, setManuelKuponKodu] = useState('')
  const [kuponError, setKuponError] = useState('')
  const [applyingKupon, setApplyingKupon] = useState(false)

  const supabase = useRef(createClient()).current

  const refreshCart = useCallback(() => {
    setItems(getCart())
  }, [])

  useEffect(() => {
    refreshCart()
    const onUpd = () => refreshCart()
    window.addEventListener('cart-updated', onUpd)
    return () => window.removeEventListener('cart-updated', onUpd)
  }, [refreshCart])

  useEffect(() => {
    getKurClient()
      .then((data: KurData) => {
        setKur(data)
      })
      .catch(() => {})
    try {
      const saved = localStorage.getItem('akdag_sepet_form')
      if (saved) {
        const d = JSON.parse(saved)
        if (d.adSoyad) setAdSoyad(d.adSoyad)
        if (d.email) setEmail(d.email)
        if (d.telefon) setTelefon(d.telefon)
        if (d.teslimatAdresi) setTeslimatAdresi(d.teslimatAdresi)
        if (d.sehir) setSehir(d.sehir)
        if (d.ilce) setIlce(d.ilce)
        if (d.acikAdresDetay) setAcikAdresDetay(d.acikAdresDetay)
        if (d.notlar) setNotlar(d.notlar)
        if (d.faturaTipi) setFaturaTipi(d.faturaTipi)
        if (d.firmaUnvani) setFirmaUnvani(d.firmaUnvani)
        if (d.vergiDairesi) setVergiDairesi(d.vergiDairesi)
        if (d.vergiNo) setVergiNo(d.vergiNo)
      }
    } catch {}
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async (response: any) => {
      const session = response.data.session
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser) {
        // Form'da e-posta yoksa otomatik doldur
        setEmail(prev => prev || currentUser.email || '')
        
        // Profil Bilgilerini Çek
        const { data: prof } = await supabase.from('uye_profiller').select('*').eq('user_id', currentUser.id).maybeSingle()
        if (prof) {
          setAdSoyad(prev => prev || `${prof.ad} ${prof.soyad}`.trim())
          setTelefon(prev => prev || prof.telefon || '')
        }

        // Adresleri Çek
        const { data: adrs } = await supabase.from('kullanici_adresleri').select('*').eq('user_id', currentUser.id)
        if (adrs && adrs.length > 0) {
          setAdresler(adrs)
        }

        // Kullanıcının tanımlı kuponlarını çek
        let savedCodes: string[] = []
        try {
          const { data: userCoupons } = await supabase
            .from('kullanici_kuponlari')
            .select('kupon_kodu')
            .eq('user_id', currentUser.id)
          if (userCoupons && userCoupons.length > 0) {
            savedCodes = userCoupons.map((uc: any) => uc.kupon_kodu)
          }
        } catch {}

        try {
          const localSaved = JSON.parse(localStorage.getItem(`sescim_user_coupons_${currentUser.id}`) || '[]')
          if (Array.isArray(localSaved)) {
            savedCodes = Array.from(new Set([...savedCodes, ...localSaved]))
          }
        } catch {}

        if (savedCodes.length > 0) {
          const { data: claimed } = await supabase
            .from('kuponlar')
            .select('*')
            .in('kod', savedCodes)
            .eq('aktif', true)
          if (claimed && claimed.length > 0) {
            setTanimliKuponlar(claimed)
            setKuponlar(prev => {
              const ids = new Set(prev.map(p => p.id))
              const missing = claimed.filter((c: any) => !ids.has(c.id))
              return [...prev, ...missing]
            })
          }
        }
      }
    })

    // Genel kuponları çek
    supabase.from('kuponlar').select('*').eq('aktif', true).then(({ data }: any) => {
      if (data) {
        setKuponlar(prev => {
          const ids = new Set(prev.map(p => p.id))
          const missing = data.filter((c: any) => !ids.has(c.id))
          return [...prev, ...missing]
        })
      }
    })
  }, [supabase])

  // URL'den (?kupon=KOD) otomatik doldurma
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const urlKupon = urlParams.get('kupon')
      if (urlKupon) {
        setManuelKuponKodu(urlKupon.toUpperCase())
      }
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('akdag_sepet_form', JSON.stringify({
        adSoyad, email, telefon, teslimatAdresi, sehir, ilce, acikAdresDetay, notlar,
        faturaTipi, firmaUnvani, vergiDairesi, vergiNo
      }))
    } catch {}
  }, [adSoyad, email, telefon, teslimatAdresi, sehir, ilce, acikAdresDetay, notlar, faturaTipi, firmaUnvani, vergiDairesi, vergiNo])

  const livePrice = (i: CartItem): number => {
    const pb = i.para_birimi || 'TRY'
    const doviz = i.indirimli_fiyat_doviz ? i.indirimli_fiyat_doviz : (i.fiyat_doviz || null)
    if (doviz && pb !== 'TRY') return dovizToTL(doviz, pb, kur)
    return Math.ceil(i.indirimli_fiyat ? i.indirimli_fiyat : i.fiyat)
  }

  const liveTotal = (): number => Math.ceil(items.reduce((sum, i) => sum + livePrice(i) * i.adet, 0))
  const araToplam = liveTotal()

  const itemsWithLivePrice = items.map(i => ({
    id: i.id,
    ad: i.ad,
    kategori: i.kategori,
    adet: i.adet,
    fiyat: livePrice(i),
  }))

  const couponCalc = calculateCouponDiscount(uygulananKupon, itemsWithLivePrice, araToplam)
  const indirimMiktari = couponCalc.discount
  const netUrunlerToplam = Math.max(0, araToplam - indirimMiktari)
  const kargoUcreti = calculateShippingFee(netUrunlerToplam)
  const total = netUrunlerToplam + kargoUcreti

  useEffect(() => {
    if (uygulananKupon) {
      const itemsForCheck = items.map(i => ({
        id: i.id,
        ad: i.ad,
        kategori: i.kategori,
        adet: i.adet,
        fiyat: livePrice(i),
      }))
      const check = calculateCouponDiscount(uygulananKupon, itemsForCheck, araToplam)
      if (check.error) {
        setUygulananKupon(null)
        setManuelKuponKodu('')
        setKuponError(`Sepetiniz güncellendiği için "${uygulananKupon.kod}" kuponu iptal edildi: ${check.error}`)
      }
    }
  }, [araToplam, items.length, uygulananKupon])

  const handleApplyCoupon = (kupon: any) => {
    setKuponError('')
    const itemsForCheck = items.map(i => ({
      id: i.id,
      ad: i.ad,
      kategori: i.kategori,
      adet: i.adet,
      fiyat: livePrice(i),
    }))

    const calc = calculateCouponDiscount(kupon, itemsForCheck, araToplam)
    if (calc.error) {
      setKuponError(calc.error)
      return
    }

    const isExpired = kupon.gecerlilik_tarihi && new Date(kupon.gecerlilik_tarihi).getTime() < Date.now()
    if (isExpired) {
      setKuponError('Bu kuponun süresi dolmuş.')
      return
    }
    if (kupon.max_kullanim && kupon.kullanim_sayisi >= kupon.max_kullanim) {
      setKuponError('Bu kuponun kullanım limiti dolmuş.')
      return
    }
    setUygulananKupon(kupon)
  }

  const handleApplyManualCoupon = async (codeToApply?: string) => {
    const raw = (codeToApply !== undefined ? codeToApply : manuelKuponKodu).trim().toUpperCase()
    if (!raw) {
      setKuponError('Lütfen bir kupon kodu giriniz.')
      return
    }
    setApplyingKupon(true)
    setKuponError('')

    let targetCoupon = kuponlar.find(x => x.kod.toUpperCase() === raw)

    if (!targetCoupon) {
      try {
        const { data: dbKupon } = await supabase
          .from('kuponlar')
          .select('*')
          .ilike('kod', raw)
          .eq('aktif', true)
          .maybeSingle()

        if (dbKupon) {
          targetCoupon = dbKupon
          setKuponlar(prev => [...prev.filter(p => p.id !== dbKupon.id), dbKupon])
        }
      } catch (e) {
        console.error('Kupon sorgulanamadı:', e)
      }
    }

    if (targetCoupon) {
      setManuelKuponKodu(targetCoupon.kod)
      handleApplyCoupon(targetCoupon)
    } else {
      setKuponError('Geçersiz veya süresi dolmuş kupon kodu.')
    }
    setApplyingKupon(false)
  }

  // URL'den kupon parametresi ile gelindiyse ve sepet doluysa otomatik uygula
  useEffect(() => {
    if (typeof window !== 'undefined' && items.length > 0 && !uygulananKupon) {
      const urlParams = new URLSearchParams(window.location.search)
      const urlKupon = urlParams.get('kupon')
      if (urlKupon) {
        handleApplyManualCoupon(urlKupon)
      }
    }
  }, [items.length, kuponlar.length])

  const submitOrder = async () => {
    setError('')
    if (!items.length) { setError('Sepetiniz boş.'); return }
    const quoteOnlyItem = items.find(i => isQuoteOnlyProduct({ marka: i.marka, fiyat_sorunuz: i.fiyat_sorunuz }))
    if (quoteOnlyItem) {
      setError(`Sepetinizdeki "${quoteOnlyItem.ad}" ürünü distribütör kuralları gereği doğrudan online satın alınamaz. Lütfen ürünü sepetten çıkarıp teklif isteyiniz.`)
      return
    }
    if (!adSoyad.trim() || !email.trim()) { setError('Ad soyad ve e-posta zorunludur.'); return }
    if (!telefon.trim()) { setError('Telefon numarası zorunludur.'); return }
    if (!teslimatAdresi.trim()) {
      setError('Lütfen kargo teslimat adresi giriniz.')
      return
    }
    if (faturaTipi === 'kurumsal' && (!firmaUnvani.trim() || !vergiNo.trim())) {
      setError('Kurumsal fatura için firma ünvanı ve vergi no zorunludur.'); return
    }
    if (!sozlesmeOnay) {
      setError('Lütfen Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Formunu onaylayınız.'); return
    }

    const urunler = items.map((i) => ({
      urun_id: i.id || null,
      ad: (i.ad || 'Ürün').slice(0, 500),
      adet: Math.max(1, Number(i.adet) || 1),
      fiyat: livePrice(i),
      fotograf: i.fotograf || null,
    }))

    setBusy(true)
    try {
      const res = await fetch('/api/siparis-olustur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id ?? null,
          urunler,
          toplam_tutar: total,
          kargo_ucreti: kargoUcreti,
          ad_soyad: adSoyad.trim(),
          email: email.trim(),
          telefon: telefon.trim() || null,
          notlar: notlar.trim() || null,
          odeme_tipi: 'kart',
          teslimat_tipi: 'kargo',
          fatura_tipi: faturaTipi,
          firma_unvani: faturaTipi === 'kurumsal' ? firmaUnvani : null,
          vergi_dairesi: faturaTipi === 'kurumsal' ? vergiDairesi : null,
          vergi_no: faturaTipi === 'kurumsal' ? vergiNo : null,
          teslimat_adresi: teslimatAdresi,
          kupon_kodu: uygulananKupon ? uygulananKupon.kod : null,
          indirim_tutari: indirimMiktari,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Sipariş oluşturulamadı.'); setBusy(false); return }

      // Sepeti hemen silme! Kart ödemesi tamamlandığında /odeme/basarili sayfasında silinecektir.
      // Sunucu PayTR token'ını siparis-olustur yanıtında doğrudan döndürdüyse beklemeden iframe'i aç
      if (data.paytr_token) {
        setPayToken(data.paytr_token)
        setBusy(false)
        return
      }

      // Fallback: Token doğrudan gelmediyse /api/paytr endpoint'ini çağır
      const payRes = await fetch('/api/paytr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siparis_no: data.siparis_no,
          tutar: total,
          ad_soyad: adSoyad.trim(),
          email: email.trim(),
          telefon: telefon.trim() || '',
          urunler: urunler,
        }),
      })
      const payData = await payRes.json()
      if (!payRes.ok) { setError(payData.error || 'Ödeme başlatılamadı.'); setBusy(false); return }
      setPayToken(payData.token)
      setBusy(false)
    } catch { setError('Bağlantı hatası. Lütfen tekrar deneyiniz.'); setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-4 sm:pt-8 pb-32 sm:pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 py-6 sm:py-12 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Link href="/urunler" className="inline-flex items-center gap-2 font-body text-slate-500 hover:text-brand-red text-sm mb-4 sm:mb-6 transition-colors">
            <ArrowLeft size={14} /> Ürünlere dön
          </Link>
          <div className="flex items-center gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Alışveriş</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl uppercase text-slate-900 tracking-tight">Sepet</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-12">
        {doneNo && (
          <div className="mb-8 sm:mb-10 bg-white border border-green-500/20 overflow-hidden relative shadow-lg rounded-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
            <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="font-display font-black text-green-600 text-xs uppercase tracking-widest">Sipariş Kaydedildi</span>
                </div>
                <div className="font-display font-black text-2xl text-slate-800">
                  No: <span className="text-brand-red tracking-widest">{doneNo}</span>
                </div>
                <p className="text-slate-500 text-sm mt-1 font-body">Siparişiniz başarıyla sisteme aktarıldı.</p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <Link href="/hesabim" className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 rounded-lg text-xs font-display font-bold uppercase tracking-widest transition-all shadow-sm">
                  <ExternalLink size={14} /> Hesabım
                </Link>
                <Link href="/urunler" className="btn-primary text-xs py-2 px-5 rounded-lg shadow-sm">Alışverişe Devam</Link>
              </div>
            </div>
          </div>
        )}

        {!items.length && !doneNo ? (
          <div className="text-center py-16 sm:py-24 border border-slate-200 bg-white rounded-2xl shadow-sm px-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Store size={32} className="text-slate-300" />
            </div>
            <p className="font-display font-semibold text-lg text-slate-600 mb-6">Sepetiniz boş.</p>
            <Link href="/urunler" className="btn-primary text-sm rounded-lg shadow-sm">Ürünleri İncele</Link>
          </div>
        ) : null}

        {items.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 items-start">
            
            {/* ÜRÜN LİSTESİ VE ÖNERİLENLER (AŞAĞI İNDİKÇE EŞ ZAMANLI TAKİP EDER) */}
            <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1 custom-scrollbar">
              <h2 className="font-display font-black text-lg sm:text-xl text-slate-800 mb-2 uppercase tracking-wide">Ürünleriniz</h2>
              {items.map((i) => (
                <div key={i.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white border border-slate-200 p-3.5 sm:p-4 rounded-xl shadow-xs hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-lg flex-shrink-0 overflow-hidden border border-slate-100">
                      {i.fotograf ? <Image src={i.fotograf} alt={i.ad} fill className="object-contain p-1.5" sizes="80px" /> : <div className="w-full h-full flex items-center justify-center"><Store className="text-slate-300" size={20}/></div>}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <Link href={`/urun/${i.id}`} className="font-display font-bold text-slate-800 text-xs sm:text-sm hover:text-brand-red transition-colors uppercase tracking-wide line-clamp-2 sm:truncate block">
                        {i.ad}
                      </Link>
                      <div className="font-body text-slate-400 text-[11px] sm:text-xs mt-0.5 truncate">{i.kategori}</div>
                      {isQuoteOnlyProduct({ marka: i.marka, fiyat_sorunuz: i.fiyat_sorunuz }) ? (
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1">
                          Özel Teklif Ürünü (Doğrudan Satılamaz)
                        </div>
                      ) : (
                        <div className="font-display font-bold text-brand-red text-sm sm:text-base mt-1">
                          {Math.ceil(livePrice(i) * i.adet).toLocaleString('tr-TR')} ₺
                          <span className="text-slate-400 font-body font-medium text-[11px] ml-1.5 hidden xs:inline">({Math.ceil(livePrice(i)).toLocaleString('tr-TR')} ₺ × {i.adet})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-shrink-0">
                    <div className="sm:hidden font-display font-bold text-brand-red text-sm">
                      {Math.ceil(livePrice(i) * i.adet).toLocaleString('tr-TR')} ₺
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-3 bg-slate-50 p-1 rounded-lg border border-slate-200">
                      <button type="button" className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:text-brand-red transition-colors shadow-xs" onClick={() => { updateQty(i.id, i.adet - 1); refreshCart() }} aria-label="Azalt"><Minus size={12} /></button>
                      <span className="w-5 text-center font-display font-bold text-xs sm:text-sm text-slate-800">{i.adet}</span>
                      <button type="button" className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:text-brand-red transition-colors shadow-xs" onClick={() => { updateQty(i.id, i.adet + 1); refreshCart() }} aria-label="Artır"><Plus size={12} /></button>
                      <div className="w-px h-5 bg-slate-200 mx-0.5" />
                      <button type="button" className="text-slate-400 hover:text-red-500 p-1.5 transition-colors" title="Ürünü Sil" onClick={() => { removeFromCart(i.id); refreshCart() }} aria-label="Sil"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Tamamlayıcı Aksesuar Önerisi (Cross-Sell) */}
              <CartCrossSell items={items} isDrawer={false} onAdded={refreshCart} />
            </div>

            {/* SİPARİŞ FORMU */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6 lg:p-8">
                
                {/* Kargo Bedava Barı */}
                <div className="mb-6">
                  <FreeShippingBar total={total} />
                </div>

                {/* KUPON ALANI */}
                <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 font-display font-bold text-xs tracking-widest uppercase text-slate-600 mb-3">
                    <Ticket size={16} /> İndirim Kuponu
                  </div>
                  
                  {/* Manuel Giriş */}
                  <div className="flex gap-2 mb-4">
                    <input 
                      className="input-base text-sm flex-1 bg-white font-display font-semibold tracking-wider uppercase" 
                      placeholder="Kupon Kodunuz" 
                      value={manuelKuponKodu}
                      onChange={e => setManuelKuponKodu(e.target.value.toUpperCase())}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (!uygulananKupon) handleApplyManualCoupon()
                        }
                      }}
                      disabled={!!uygulananKupon}
                    />
                    {uygulananKupon ? (
                      <button 
                        type="button" 
                        onClick={() => { setUygulananKupon(null); setManuelKuponKodu(''); setKuponError('') }} 
                        className="px-4 py-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-lg font-display font-bold text-xs uppercase transition-colors flex items-center gap-1"
                      >
                        <X size={14} /> İptal
                      </button>
                    ) : (
                      <button 
                        type="button"
                        disabled={applyingKupon || !manuelKuponKodu.trim()}
                        onClick={() => handleApplyManualCoupon()}
                        className="btn-primary text-xs px-5 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {applyingKupon ? <Loader2 size={14} className="animate-spin" /> : 'Uygula'}
                      </button>
                    )}
                  </div>

                  {kuponError && (
                    <div className="text-red-500 text-xs font-body mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                      {kuponError}
                    </div>
                  )}

                  {/* Uygulanan Kupon Bilgi Rozeti */}
                  {uygulananKupon && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-display font-black text-xs text-emerald-800 tracking-wider flex items-center gap-1.5 flex-wrap">
                            <span>{uygulananKupon.kod} KUPONU UYGULANDI</span>
                            {uygulananKupon.kategori && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                🏷️ {uygulananKupon.kategori}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-emerald-700 font-body">
                            {uygulananKupon.aciklama || (uygulananKupon.indirim_tipi === 'yuzde' ? `%${uygulananKupon.indirim_miktari} indirim uygulandı` : `${uygulananKupon.indirim_miktari} ₺ indirim uygulandı`)}
                          </div>
                          {uygulananKupon.kategori && (
                            <div className="text-[10px] text-emerald-600 font-medium">
                              (İndirim sepetinizdeki &ldquo;{uygulananKupon.kategori}&rdquo; ürünlerine uygulandı)
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="font-display font-black text-emerald-700 text-sm whitespace-nowrap ml-2">
                        -{indirimMiktari.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  )}

                  {/* Hesabıma Tanımlı Özel Kuponlar */}
                  {!uygulananKupon && tanimliKuponlar.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <div className="text-[10px] font-display font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-600" />
                        Hesabınıza Tanımlı Özel Kuponlar
                      </div>
                      {tanimliKuponlar.filter(k => (!k.gecerlilik_tarihi || new Date(k.gecerlilik_tarihi).getTime() > Date.now()) && (!k.max_kullanim || k.kullanim_sayisi < k.max_kullanim)).map(k => {
                        const check = calculateCouponDiscount(k, itemsWithLivePrice, araToplam)
                        const canUse = !check.error
                        return (
                          <div key={'tanimli-' + k.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${canUse ? 'bg-purple-50/70 border-purple-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-display font-black text-xs text-purple-900 tracking-wider">{k.kod}</span>
                                <span className="bg-purple-200 text-purple-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  Hesabıma Özel
                                </span>
                                {k.kategori ? (
                                  <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    🏷️ {k.kategori}
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-600 text-[9px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    🌐 Tüm Ürünler
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-purple-800 font-body mt-0.5 font-medium">
                                {k.aciklama || (k.indirim_tipi === 'yuzde' ? `%${k.indirim_miktari} İndirim` : `${k.indirim_miktari} ₺ İndirim`)}
                              </div>
                              {k.min_tutar && (
                                <div className="text-[9px] text-slate-500 font-body mt-0.5">
                                  Min. Sepet: {k.min_tutar.toLocaleString('tr-TR')} ₺
                                </div>
                              )}
                              {!canUse && check.error && (
                                <div className="text-[9px] text-red-500 font-body mt-0.5">
                                  {check.error}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              disabled={!canUse}
                              onClick={() => { setManuelKuponKodu(k.kod); handleApplyCoupon(k) }}
                              className={`px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-widest rounded-lg transition-all ${
                                canUse ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              Uygula
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Genel Aktif Kupon Önerileri */}
                  {!uygulananKupon && kuponlar.filter(k => !k.ozel_mi && !tanimliKuponlar.some(tk => tk.id === k.id) && (!k.gecerlilik_tarihi || new Date(k.gecerlilik_tarihi).getTime() > Date.now()) && (!k.max_kullanim || k.kullanim_sayisi < k.max_kullanim)).map(k => {
                    const check = calculateCouponDiscount(k, itemsWithLivePrice, araToplam)
                    const canUse = !check.error
                    return (
                      <div key={k.id} className={`flex items-center justify-between border p-3 rounded-lg mb-2 transition-all ${
                        canUse ? 'bg-white border-slate-200 shadow-sm group hover:border-brand-red/30' : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-display font-black text-xs text-brand-red tracking-wider">{k.kod}</span>
                            {k.kategori ? (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                🏷️ {k.kategori}
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 text-[9px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider">
                                🌐 Tüm Ürünler
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-600 font-body mt-0.5">
                            {k.aciklama || (k.indirim_tipi === 'yuzde' ? `%${k.indirim_miktari}` : `${k.indirim_miktari} ₺`)} İndirim
                          </div>
                          {k.min_tutar && (
                            <div className="text-[9px] text-slate-500 font-body">
                              Min. Tutar: {k.min_tutar.toLocaleString('tr-TR')} ₺
                            </div>
                          )}
                          {!canUse && check.error && (
                            <div className="text-[9px] text-red-500 font-body mt-0.5">
                              {check.error}
                            </div>
                          )}
                        </div>
                        <button 
                          type="button" 
                          disabled={!canUse}
                          onClick={() => { setManuelKuponKodu(k.kod); handleApplyCoupon(k) }}
                          className={`px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-widest rounded-md transition-all ${
                            canUse 
                              ? 'text-slate-600 bg-slate-100 hover:bg-brand-red hover:text-white' 
                              : 'text-slate-400 bg-slate-200 cursor-not-allowed'
                          }`}
                        >
                          Uygula
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-2 mb-6 border-b border-slate-100 pb-5">
                  <div className="flex justify-between items-center text-slate-500 text-sm font-body">
                    <span>Ara Toplam</span>
                    <span>{Math.ceil(araToplam).toLocaleString('tr-TR')} ₺</span>
                  </div>
                  {uygulananKupon && (
                    <div className="flex justify-between items-center text-brand-red font-bold text-sm font-body">
                      <span>İndirim ({uygulananKupon.kod})</span>
                      <span>- {Math.ceil(indirimMiktari).toLocaleString('tr-TR')} ₺</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-body">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Truck size={14} className="text-slate-400" />
                      <span>Kargo Bedeli</span>
                    </span>
                    {kargoUcreti === 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-display font-black text-xs uppercase px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                        ÜCRETSİZ
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-slate-800">
                        {kargoUcreti.toLocaleString('tr-TR')} ₺
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-end pt-3">
                    <div>
                      <div className="font-display text-xs tracking-widest uppercase text-slate-500 mb-1">Ödenecek Tutar</div>
                      <div className="text-xs font-medium text-slate-400">KDV ve Kargo Dahildir</div>
                    </div>
                    <span className="font-display font-black text-3xl text-brand-red">{Math.ceil(total).toLocaleString('tr-TR')} ₺</span>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="font-display font-bold text-xs tracking-widest uppercase text-slate-600 block mb-2">Ad Soyad *</label>
                    <input className="input-base" placeholder="Adınız Soyadınız" value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="font-display font-bold text-xs tracking-widest uppercase text-slate-600 block mb-2">E-posta *</label>
                      <input type="email" className="input-base" placeholder="ornek@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="font-display font-bold text-xs tracking-widest uppercase text-slate-600 block mb-2">Telefon *</label>
                      <input type="tel" className="input-base" placeholder="05xx xxx xx xx" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 sm:space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="font-display font-bold text-xs tracking-widest uppercase text-slate-600">Fatura Tipi</div>
                      <div className="flex bg-slate-200/50 p-1 rounded-lg border border-slate-200">
                        <button onClick={() => setFaturaTipi('bireysel')} className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-display font-bold uppercase rounded-md transition-all ${faturaTipi === 'bireysel' ? 'bg-white text-brand-red shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                          <UserIcon size={12} /> Bireysel
                        </button>
                        <button onClick={() => setFaturaTipi('kurumsal')} className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-display font-bold uppercase rounded-md transition-all ${faturaTipi === 'kurumsal' ? 'bg-white text-brand-red shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                          <Briefcase size={12} /> Kurumsal
                        </button>
                      </div>
                    </div>
                    {faturaTipi === 'kurumsal' && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <input className="input-base text-sm py-2.5" value={firmaUnvani} onChange={e => setFirmaUnvani(e.target.value)} placeholder="Firma Ünvanı *" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input className="input-base text-sm py-2.5" value={vergiDairesi} onChange={e => setVergiDairesi(e.target.value)} placeholder="Vergi Dairesi" />
                          <input className="input-base text-sm py-2.5" value={vergiNo} onChange={e => setVergiNo(e.target.value)} placeholder="Vergi No *" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="font-display font-bold text-xs tracking-widest uppercase text-slate-600 block mb-2">Sipariş Notu</label>
                    <textarea className="input-base resize-none text-sm min-h-[60px]" placeholder="Eklemek istedikleriniz..." value={notlar} onChange={(e) => setNotlar(e.target.value)} />
                  </div>

                  <div className="border border-slate-200 bg-white rounded-xl overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck size={16} className="text-brand-red" />
                        <span className="font-display font-bold text-xs tracking-widest uppercase text-slate-700">Kargo Teslimat Adresi</span>
                      </div>
                      <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-400">Tüm Türkiye'ye Gönderim</span>
                    </div>

                    <div className="p-4 sm:p-5 space-y-4">
                      {adresler.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-display font-bold uppercase text-slate-500 tracking-widest block">Kayıtlı Adreslerim</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {adresler.map(a => (
                              <button 
                                key={a.id} 
                                type="button"
                                onClick={() => {
                                  setSeciliAdresId(a.id)
                                  setSehir(a.sehir || '')
                                  setIlce(a.ilce || '')
                                  setAcikAdresDetay(a.acik_adres || '')
                                  setTeslimatAdresi(`${a.acik_adres || ''}\n${a.ilce || ''} / ${a.sehir || ''}`.trim())
                                }}
                                className={`text-left p-3 border rounded-lg transition-all ${seciliAdresId === a.id ? 'border-brand-red bg-brand-red/5' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                              >
                                <div className="font-display font-bold text-xs text-slate-800">{a.adres_basligi}</div>
                                <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{a.acik_adres} - {a.ilce}/{a.sehir}</div>
                              </button>
                            ))}
                            <button 
                              type="button"
                              onClick={() => {
                                setSeciliAdresId(null)
                                setSehir('')
                                setIlce('')
                                setAcikAdresDetay('')
                                setTeslimatAdresi('')
                              }}
                              className={`text-left p-3 border rounded-lg transition-all flex items-center justify-center gap-2 ${seciliAdresId === null ? 'border-brand-red bg-brand-red/5 text-brand-red' : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'}`}
                            >
                              <Plus size={14} />
                              <span className="font-display font-bold text-xs">Farklı Adres</span>
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-display font-bold uppercase text-slate-500 tracking-widest block mb-1.5">
                              İl (Şehir) *
                            </label>
                            <select
                              className="input-base text-sm py-2 bg-white"
                              value={sehir}
                              onChange={(e) => {
                                const s = e.target.value
                                setSehir(s)
                                setIlce('')
                                const comb = [acikAdresDetay.trim(), s].filter(Boolean).join('\n')
                                setTeslimatAdresi(comb)
                                if (adresler.length > 0) setSeciliAdresId(null)
                              }}
                            >
                              <option value="">İl Seçiniz</option>
                              {IL_ISIMLERI.map((ilAdi) => (
                                <option key={ilAdi} value={ilAdi}>
                                  {ilAdi}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-display font-bold uppercase text-slate-500 tracking-widest block mb-1.5">
                              İlçe *
                            </label>
                            <select
                              className="input-base text-sm py-2 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                              value={ilce}
                              disabled={!sehir}
                              onChange={(e) => {
                                const i = e.target.value
                                setIlce(i)
                                const comb = [acikAdresDetay.trim(), i && sehir ? `${i} / ${sehir}` : (sehir || i)].filter(Boolean).join('\n')
                                setTeslimatAdresi(comb)
                                if (adresler.length > 0) setSeciliAdresId(null)
                              }}
                            >
                              <option value="">{sehir ? 'İlçe Seçiniz' : 'Önce İl Seçiniz'}</option>
                              {getIlcelerByIl(sehir).map((ilceAdi) => (
                                <option key={ilceAdi} value={ilceAdi}>
                                  {ilceAdi}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-display font-bold uppercase text-slate-500 tracking-widest block mb-1.5">
                            Açık Adres (Cadde, Sokak, Bina No, Daire) *
                          </label>
                          <textarea 
                            className="input-base text-sm min-h-[70px] resize-none" 
                            placeholder="Örn: Cumhuriyet Mah. İnönü Cad. Barış Apt. No:12 Daire:4" 
                            value={acikAdresDetay || (seciliAdresId ? teslimatAdresi : '')} 
                            onChange={e => {
                              const d = e.target.value
                              setAcikAdresDetay(d)
                              const comb = [d.trim(), ilce && sehir ? `${ilce} / ${sehir}` : (sehir || ilce)].filter(Boolean).join('\n')
                              setTeslimatAdresi(comb)
                              if (adresler.length > 0) setSeciliAdresId(null)
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* SÖZLEŞME ONAYI */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-6">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input 
                          type="checkbox" 
                          checked={sozlesmeOnay}
                          onChange={(e) => setSozlesmeOnay(e.target.checked)}
                          className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded cursor-pointer checked:bg-brand-red checked:border-brand-red transition-colors"
                        />
                        <Check size={14} className="text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                      </div>
                      <span className="text-xs text-slate-600 font-medium leading-relaxed group-hover:text-slate-800 transition-colors">
                        <Link href="/on-bilgilendirme-formu" target="_blank" className="text-brand-red hover:underline font-bold">Ön Bilgilendirme Formu</Link>'nu ve <Link href="/mesafeli-satis-sozlesmesi" target="_blank" className="text-brand-red hover:underline font-bold">Mesafeli Satış Sözleşmesi</Link>'ni okudum, onaylıyorum. Ayrıca <Link href="/teslimat-ve-kargo" target="_blank" className="text-brand-red hover:underline font-bold">Teslimat &amp; Kargo</Link> ile <Link href="/iptal-ve-iade" target="_blank" className="text-brand-red hover:underline font-bold">İptal &amp; İade Koşulları</Link>'nı kabul ediyorum. *
                      </span>
                    </label>
                  </div>
                </div>

                {/* Ödeme Yöntemi Bilgisi (100% PayTR Kart & Taksit) */}
                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-brand-red" />
                      <span className="font-display font-bold text-xs uppercase tracking-wider text-slate-800">
                        Kredi / Banka Kartı ile Ödeme
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTaksitModal(true)}
                      className="text-[11px] font-display font-bold text-brand-red hover:underline tracking-tight"
                    >
                      Taksit Seçenekleri
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-body mb-3">
                    Tüm kredi kartlarına <strong>12 aya varan taksit</strong> veya tek çekim seçeneğiyle 3D Secure güvencesinde ödeme yapabilirsiniz.
                  </p>
                  
                  {/* Desteklenen Kart Aileleri */}
                  <div className="flex flex-wrap gap-1.5 items-center pt-2 border-t border-slate-200/60">
                    {['World', 'Bonus', 'Maximum', 'Axess', 'CardFinans', 'Paraf', 'Troy', 'Visa', 'Mastercard'].map((kart) => (
                      <span key={kart} className="text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 shadow-2xs">
                        {kart}
                      </span>
                    ))}
                  </div>
                </div>

                {error && <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm font-medium flex items-start gap-2"><Info size={18} className="flex-shrink-0 mt-0.5" /> {error}</div>}

                {payTrWarning && (
                  <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm font-medium flex items-start gap-2">
                    <Info size={18} className="flex-shrink-0 mt-0.5" /> 
                    <div>Ödeme penceresi kapatıldı. Siparişiniz <strong>beklemede</strong> olarak kaydedildi. Ödemeyi tamamlamak için lütfen butona tekrar tıklayınız.</div>
                  </div>
                )}

                <div className="mt-8">
                  <button 
                    type="button" 
                    disabled={busy} 
                    onClick={() => submitOrder()} 
                    className="btn-primary w-full justify-center text-base py-4 rounded-xl shadow-lg shadow-brand-red/25 disabled:opacity-50 font-display font-bold uppercase tracking-wider gap-2 transition-all hover:shadow-xl"
                  >
                    {busy ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Ödeme Başlatılıyor...
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        Güvenli Ödeme Yap (PayTR)
                      </>
                    )}
                  </button>
                </div>

                {/* Taksit Modal */}
                <InstallmentModal
                  isOpen={showTaksitModal}
                  onClose={() => setShowTaksitModal(false)}
                  fiyat={total}
                  urunAdi="Sepet Toplamı"
                />

                {/* Güven Rozetleri */}
                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-3 gap-1.5 sm:gap-2">
                  <div className="flex flex-col items-center justify-center text-center p-1.5 sm:p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <Check size={18} className="text-emerald-500 mb-1" />
                    <span className="text-[9px] sm:text-[10px] font-display font-bold uppercase text-slate-500 leading-tight">256-BİT SSL<br/>GÜVENLİ ÖDEME</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center p-1.5 sm:p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <Check size={18} className="text-emerald-500 mb-1" />
                    <span className="text-[9px] sm:text-[10px] font-display font-bold uppercase text-slate-500 leading-tight">DİSTRİBÜTÖR<br/>GARANTİLİ</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center p-1.5 sm:p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <Check size={18} className="text-emerald-500 mb-1" />
                    <span className="text-[9px] sm:text-[10px] font-display font-bold uppercase text-slate-500 leading-tight">HIZLI<br/>KARGO</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-12 mt-12">
          <RecentlyViewed />
        </div>
      </div>

        {/* Ödeme Hazırlanıyor Yükleme Ekranı */}
        {busy && !payToken && (
          <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 border-3 border-slate-200 border-t-brand-red rounded-full animate-spin mb-4" />
              <h3 className="font-display font-black text-sm tracking-wider uppercase text-slate-900 mb-1">
                PayTR Güvenli Ödeme Hazırlanıyor
              </h3>
              <p className="text-xs text-slate-500 font-body">
                3D Secure korumalı ödeme penceresi açılıyor, lütfen bekleyiniz...
              </p>
            </div>
          </div>
        )}

        {payToken && (
          <div className="fixed inset-0 z-[100000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="shrink-0 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50">
                <div>
                  <span className="font-display font-bold text-xs tracking-widest uppercase text-slate-800">Güvenli Ödeme</span>
                  <div className="text-[10px] text-amber-600 font-medium mt-0.5 flex items-center gap-1"><Info size={12}/> Ödemeyi tamamlamadan kapatmayınız.</div>
                </div>
                <button
                  type="button"
                  className="text-slate-500 hover:text-brand-red hover:bg-brand-red/10 text-xs font-display font-bold uppercase tracking-wider border border-slate-200 hover:border-brand-red/30 rounded-lg px-3 py-1.5 transition-all"
                  onClick={() => { setPayToken(null); setPayTrWarning(true) }}
                >
                  İptal Et
                </button>
              </div>
              <div className="flex-1 min-h-0 w-full overflow-hidden relative bg-slate-50">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 z-0">
                  <div className="w-8 h-8 border-2 border-slate-300 border-t-brand-red rounded-full animate-spin" />
                  <span className="text-xs font-body">PayTR Güvenli Ödeme Sayfası Yükleniyor...</span>
                </div>
                <iframe title="PayTR" src={`https://www.paytr.com/odeme/guvenli/${payToken}`} className="w-full h-full bg-white border-0 relative z-10" />
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
