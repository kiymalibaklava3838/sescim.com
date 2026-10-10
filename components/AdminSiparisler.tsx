'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Package, Clock, CheckCircle, XCircle, Truck, Store,
  RefreshCw, Search, X, ChevronDown, ChevronUp, Phone, Mail, MapPin, FileText, ExternalLink, Briefcase, User as UserIcon, CreditCard, Printer,
  Tag, Trash2, Layers, AlertCircle
} from 'lucide-react'
import { BASIT_KARGO_HANDLERS } from '@/lib/shipping'


interface SiparisUrun {
  urun_id: string
  ad: string
  fiyat: number
  adet: number
  fotograf: string
}

interface Siparis {
  id: string
  siparis_no: string
  ad_soyad: string
  email: string
  telefon: string
  urunler: SiparisUrun[]
  toplam_tutar: number
  durum: string
  odeme_tipi: string
  odeme_durumu: string
  notlar: string
  teslimat_tipi?: string
  kargo_takip_no?: string
  kargo_firmasi?: string
  dekont_url?: string
  fatura_tipi?: 'bireysel' | 'kurumsal'
  firma_unvani?: string
  vergi_dairesi?: string
  vergi_no?: string
  teslimat_adresi?: string
  fatura_adresi?: string
  dolar_kuru?: number
  euro_kuru?: number
  created_at: string
  updated_at?: string
}

const DURUM_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  beklemede:     { label: 'Beklemede',     color: 'text-amber-500',  bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
  onaylandi:     { label: 'Onaylandı',     color: 'text-blue-500',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: CheckCircle },
  hazirlaniyor:  { label: 'Hazırlanıyor',  color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20', icon: Package },
  kargolandi:    { label: 'Kargolandı',    color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20', icon: Truck },
  teslim_edildi: { label: 'Teslim Edildi', color: 'text-green-600',  bg: 'bg-green-500/10 border-green-500/20', icon: CheckCircle },
  iptal:         { label: 'İptal',         color: 'text-red-500',    bg: 'bg-red-500/10 border-red-500/20',     icon: XCircle },
}

const DEFAULT_STATUS_CONFIG = {
  label: 'İşleniyor',
  color: 'text-slate-500',
  bg: 'bg-slate-100 border-slate-200',
  icon: Package,
}

const ODEME_TIPI: Record<string, string> = {
  kredi_karti: 'Kredi Kartı',
  kart: 'Kredi Kartı',
  havale: 'Havale/EFT',
  whatsapp: 'WhatsApp',
}

const PAGE_SIZE = 50

const VARSAYILAN_KARGO_FIRMASI = 'HepsiJet'

const MANUEL_KARGO_FIRMALARI = [
  'HepsiJet',
  'Yurtiçi Kargo',
  'Aras Kargo',
  'MNG Kargo',
  'Sürat Kargo',
  'PTT Kargo',
  'KolayGelsin',
] as const

export default function AdminSiparisler() {

  const [siparisler, setSiparisler] = useState<Siparis[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filterDurum, setFilterDurum] = useState('hepsi')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [updatingKargo, setUpdatingKargo] = useState<string | null>(null)
  const [kargoInputs, setKargoInputs] = useState<Record<string, string>>({})
  const [kargoFirmaInputs, setKargoFirmaInputs] = useState<Record<string, string>>({})
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({})
  const [basitKargoHandler, setBasitKargoHandler] = useState<Record<string, string>>({})
  const [basitKargoDesi, setBasitKargoDesi] = useState<Record<string, number>>({})
  const [sendingBasitKargo, setSendingBasitKargo] = useState<Record<string, boolean>>({})
  const [basitKargoBalance, setBasitKargoBalance] = useState<number | null>(null)
  const supabase = useRef(createClient()).current
  const searchRef = useRef(search)
  const filterDurumRef = useRef(filterDurum)

  useEffect(() => {
    searchRef.current = search
    filterDurumRef.current = filterDurum
  }, [search, filterDurum])

  useEffect(() => {
    loadBasitKargoBalance()

    const channel = supabase
      .channel('admin-siparisler-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'siparisler' },
        (payload: any) => {
          const yeni = payload.new
          // Ödeme bekleyen taslaklar dışındaki gerçek siparişlerde (yeni ödenen, kargolanan, güncellenen) listeyi anında tazele
          if (!yeni || yeni.durum !== 'odeme_bekliyor') {
            loadSiparisler(0, false, searchRef.current, filterDurumRef.current)
          }
        }
      )
      .subscribe()

    // Yedek otomatik yenileme (Realtime bağlantı kesintilerine karşı her 20 saniyede bir sessiz kontrol)
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        loadSiparisler(0, false, searchRef.current, filterDurumRef.current)
      }
    }, 20000)

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSiparisler(0, false, search, filterDurum)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, filterDurum])

  const loadSiparisler = async (p: number, append = false, currentSearch = search, currentFilter = filterDurum) => {
    if (append) setLoadingMore(true)
    else if (p === 0 && siparisler.length === 0) setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams({
        page: p.toString(),
        limit: PAGE_SIZE.toString(),
      })
      if (currentSearch.trim()) params.set('search', currentSearch.trim())
      if (currentFilter && currentFilter !== 'hepsi') params.set('durum', currentFilter)

      const res = await fetch(`/api/admin/siparisler?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      })

      if (res.ok) {
        const json = await res.json()
        const data = json.siparisler || []
        if (append) setSiparisler(prev => [...prev, ...data])
        else setSiparisler(data)
        setHasMore(json.hasMore ?? false)
      } else {
        // Fallback: direct Supabase query
        const from = p * PAGE_SIZE
        const to = from + PAGE_SIZE - 1
        let q = supabase
          .from('siparisler')
          .select('id, siparis_no, ad_soyad, email, telefon, toplam_tutar, durum, odeme_tipi, odeme_durumu, notlar, kargo_takip_no, teslimat_adresi, fatura_adresi, created_at, kupon_kodu, indirim_tutari, kargo_ucreti, dekont_url, urunler')
          .neq('durum', 'odeme_bekliyor')

        if (currentFilter && currentFilter !== 'hepsi') {
          if (currentFilter === 'dekontlu') {
            q = q.or('dekont_url.not.is.null,notlar.ilike.%Dekont yüklendi%')
          } else {
            q = q.eq('durum', currentFilter)
          }
        }
        if (currentSearch.trim()) {
          const clean = currentSearch.trim().replace(/[%_,]/g, '')
          q = q.or(`siparis_no.ilike.%${clean}%,ad_soyad.ilike.%${clean}%,email.ilike.%${clean}%,telefon.ilike.%${clean}%`)
        }

        const { data } = await q
          .order('created_at', { ascending: false })
          .range(from, to)

        if (data) {
          if (append) setSiparisler(prev => [...prev, ...data])
          else setSiparisler(data)
          setHasMore(data.length === PAGE_SIZE)
        }
      }
    } catch (e) {
      console.error('Sipariş yükleme hatası:', e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setPage(p)
    }
  }

  const updateDurum = async (id: string, durum: string) => {
    setUpdatingId(id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/siparis-durum-guncelle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ id, durum })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error || 'Güncellenemedi')
      }
      await loadSiparisler(0)
    } catch (err: any) {
      alert(`Hata: ${err.message || 'Durum güncellenemedi.'}`)
    } finally {
      setUpdatingId(null)
    }
  }

  const updateOdemeDurumu = async (id: string, durum: string) => {
    setUpdatingId(id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/siparis-durum-guncelle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ id, odeme_durumu: durum })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error || 'Ödeme durumu güncellenemedi')
      }
      await loadSiparisler(0)
    } catch (err: any) {
      alert(`Hata: ${err.message || 'Ödeme durumu güncellenemedi.'}`)
    } finally {
      setUpdatingId(null)
    }
  }

  const kaydetKargoNo = async (id: string, no: string, firma: string) => {
    const cleanNo = (no || '').trim()
    if (!cleanNo) {
      alert('Lütfen geçerli bir kargo takip numarası girin.')
      return
    }

    setUpdatingKargo(id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/siparis-durum-guncelle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          id,
          durum: 'kargolandi',
          kargo_takip_no: cleanNo,
          kargo_firmasi: firma || VARSAYILAN_KARGO_FIRMASI
        })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error || 'Kargo bilgisi kaydedilemedi')
      }
      alert('✅ Kargo takip numarası başarıyla kaydedildi.')
      await loadSiparisler(0)
    } catch (err: any) {
      alert(`Hata: ${err.message || 'Kargo bilgisi güncellenemedi.'}`)
    } finally {
      setUpdatingKargo(null)
    }
  }


  const loadBasitKargoBalance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/admin/cargo/basit-kargo?desi=3', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (typeof data.balance === 'number') {
          setBasitKargoBalance(data.balance)
        }
      }
    } catch {
      // sessizce geç
    }
  }

  const gonderBasitKargo = async (siparis: Siparis) => {
    const handler = basitKargoHandler[siparis.id] || 'HEPSIJET'
    const desi = basitKargoDesi[siparis.id] || 3

    if (!confirm(`${siparis.siparis_no} numaralı sipariş ${desi} Desi olarak "${handler}" ile Basit Kargo'ya gönderilsin mi?`)) {
      return
    }

    setSendingBasitKargo(prev => ({ ...prev, [siparis.id]: true }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/cargo/basit-kargo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'create',
          orderId: siparis.id,
          handlerCode: handler,
          desi: desi
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Basit Kargo siparişi oluşturulamadı.')
      }

      alert(`✅ Kargo Barkodu Başarıyla Oluşturuldu!\n\nBarkod: ${data.barcode}\nTaşıyıcı: ${data.handlerName}\nTahmini Maliyet: ${data.totalCost || data.shipmentFee || 'Hesaplandı'} ₺`)
      await loadSiparisler(page)
      loadBasitKargoBalance()
    } catch (err: any) {
      alert(`Hata: ${err.message || 'Kargo oluşturulurken bir hata oluştu.'}`)
    } finally {
      setSendingBasitKargo(prev => ({ ...prev, [siparis.id]: false }))
    }
  }

  const iptalBasitKargo = async (siparisId: string, barcode: string) => {
    if (!confirm(`Bu kargo barkodunu (${barcode}) iptal etmek istediğinize emin misiniz?\nÜcret Basit Kargo bakiyenize iade edilecektir.`)) {
      return
    }

    setSendingBasitKargo(prev => ({ ...prev, [siparisId]: true }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/cargo/basit-kargo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'cancel',
          orderId: siparisId,
          barcode: barcode
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Kargo kodu iptal edilemedi.')
      }

      alert('✅ Kargo barkodu iptal edildi ve bakiye hesabınıza iade edildi.')
      await loadSiparisler(page)
      loadBasitKargoBalance()
    } catch (err: any) {
      alert(`Hata: ${err.message || 'İptal işlemi başarısız.'}`)
    } finally {
      setSendingBasitKargo(prev => ({ ...prev, [siparisId]: false }))
    }
  }

  const toggleExpand = (id: string) => {

    setExpandedId(prev => (prev === id ? null : id))
  }

  const getDekontUrl = (s: Siparis) => {
    if (s.dekont_url) return s.dekont_url
    const match = s.notlar?.match(/Dekont yüklendi - ([^\s\]]+)/)
    return match ? match[1] : undefined
  }

  const filtered = siparisler.filter(s => {
    const durumMatch = filterDurum === 'hepsi' || s.durum === filterDurum
    const searchMatch = !search ||
      s.siparis_no?.toLowerCase().includes(search.toLowerCase()) ||
      s.ad_soyad?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.telefon?.includes(search)
    return durumMatch && searchMatch
  })

  const stats = {
    toplam: siparisler.length,
    beklemede: siparisler.filter(s => s.durum === 'beklemede').length,
    bugun: siparisler.filter(s => {
      const d = new Date(s.created_at)
      const now = new Date()
      return d.toDateString() === now.toDateString()
    }).length,
    gelir: siparisler
      .filter(s => s.durum === 'teslim_edildi')
      .reduce((sum, s) => sum + (s.toplam_tutar || 0), 0),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-brand-red rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* İstatistik kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { val: stats.toplam,  label: 'Toplam Sipariş',  color: 'border-l-brand-red' },
          { val: stats.beklemede, label: 'Bekleyen',      color: 'border-l-yellow-500' },
          { val: stats.bugun,   label: 'Bugün',           color: 'border-l-blue-500' },
          { val: `${stats.gelir.toLocaleString('tr-TR')} ₺`, label: 'Teslim Geliri', color: 'border-l-green-500' },
        ].map(s => (
          <div key={s.label} className={`bg-white border border-slate-200 p-4 border-l-2 ${s.color}`}>
            <div className="font-display font-black text-2xl text-slate-900">{s.val}</div>
            <div className="font-body text-slate-900/30 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtreler */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-red" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sipariş no, müşteri adı, e-posta..."
            className="input-dark pl-10 pr-10"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-900/20 hover:text-slate-900">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: 'hepsi', label: 'Tümü' },
            ...Object.entries(DURUM_CONFIG).map(([id, c]) => ({ id, label: c.label })),
          ].map(f => (
            <button key={f.id} onClick={() => setFilterDurum(f.id)}
              className={`font-display font-semibold text-xs tracking-widest uppercase px-3 py-2 border transition-all duration-200 ${
                filterDurum === f.id ? 'bg-brand-red border-brand-red text-slate-900' : 'border-slate-300 text-slate-900/40 hover:border-white/30'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {basitKargoBalance !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-display font-bold uppercase tracking-wider">
              <span>📦 Bakiye:</span>
              <span className="font-mono text-blue-900 font-extrabold">{basitKargoBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
            </div>
          )}
          <button onClick={() => { loadSiparisler(0); loadBasitKargoBalance(); }} className="flex items-center gap-2 text-slate-900/30 hover:text-slate-900 text-xs font-display uppercase tracking-widest transition-colors px-3">
            <RefreshCw size={12} />Yenile
          </button>
        </div>
      </div>


      <div className="font-body text-slate-900/30 text-sm mb-4">{filtered.length} sipariş</div>

      <div className="space-y-1">
        {filtered.map(siparis => {
          const cfg = DURUM_CONFIG[siparis.durum] || DURUM_CONFIG.beklemede || DEFAULT_STATUS_CONFIG
          const Icon = cfg.icon
          const expanded = expandedId === siparis.id

          return (
            <div key={siparis.id} className="bg-white border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-4 p-4">
                <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 border ${cfg.bg}`}>
                  <Icon size={15} className={cfg.color} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-display font-black text-sm text-slate-900 tracking-wide">{siparis.siparis_no}</span>
                    <span className={`font-display font-semibold text-xs tracking-widest uppercase px-2 py-0.5 border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    <span className="font-body text-slate-900/20 text-xs">{ODEME_TIPI[siparis.odeme_tipi] || siparis.odeme_tipi}</span>
                    {siparis.odeme_durumu === 'odendi' && (
                      <span className="font-display font-semibold text-xs tracking-widest uppercase px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-600">ÖDENDİ (PayTR)</span>
                    )}
                    {siparis.odeme_durumu === 'odeme_hatasi' && (
                      <span className="font-display font-semibold text-xs tracking-widest uppercase px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-600">ÖDEME BAŞARISIZ</span>
                    )}
                    {siparis.odeme_durumu === 'beklemede' && (siparis.odeme_tipi === 'kredi_karti' || siparis.odeme_tipi === 'kart') && (
                      <span className="font-display font-semibold text-xs tracking-widest uppercase px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-600">ÖDEME BEKLİYOR</span>
                    )}
                    {getDekontUrl(siparis) && (
                      <span className="font-display font-black text-[10px] bg-brand-red text-white px-2 py-0.5 animate-pulse rounded">DEKONT YÜKLÜ</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-0.5 flex-wrap">
                    <span className="font-body text-slate-900/50 text-sm">{siparis.ad_soyad}</span>
                    <span className="font-body text-slate-900/20 text-xs">
                      {new Date(siparis.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-display font-black text-lg text-brand-red">{siparis.toplam_tutar?.toLocaleString('tr-TR')} ₺</div>
                  <div className="font-body text-slate-900/30 text-[10px] uppercase font-bold tracking-tighter">
                    $ {siparis.dolar_kuru ? (siparis.toplam_tutar / siparis.dolar_kuru).toFixed(2) : (siparis.toplam_tutar / 34.5).toFixed(2)}
                  </div>
                  <div className="font-body text-slate-900/20 text-[10px]">{Array.isArray(siparis.urunler) ? siparis.urunler.reduce((s, u) => s + u.adet, 0) : 0} ürün</div>
                </div>

                <button onClick={() => toggleExpand(siparis.id)}
                  className="w-8 h-8 border border-slate-300 flex items-center justify-center text-slate-900/30 hover:border-brand-red/40 hover:text-brand-red transition-all flex-shrink-0">
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {expanded && (
                <div className="border-t border-slate-200 p-5 space-y-6 bg-slate-50">
                  <div className="grid md:grid-cols-3 gap-8">
                    {/* 1. Müşteri & Fatura Bilgileri */}
                    <div>
                      <h4 className="font-display font-bold text-xs uppercase tracking-widest text-slate-900/40 mb-4 flex items-center gap-2">
                        <UserIcon size={12} className="text-brand-red" /> Müşteri & Fatura
                      </h4>
                      <div className="space-y-3 text-sm font-body">
                        <div className="bg-slate-100 p-3 space-y-2 border border-slate-200">
                           <div className="text-slate-900/80 font-bold">{siparis.ad_soyad}</div>
                           <div className="text-slate-900/40 text-xs">{siparis.email}</div>
                           <div className="text-slate-900/40 text-xs">{siparis.telefon}</div>
                        </div>
                        
                        <div className="bg-brand-red/5 p-3 border border-brand-red/10">
                           <div className="flex items-center gap-2 mb-2">
                              {siparis.fatura_tipi === 'kurumsal' || (siparis.fatura_adresi && siparis.fatura_adresi.includes('[Kurumsal Fatura]')) ? <Briefcase size={13} className="text-brand-red" /> : <UserIcon size={13} className="text-brand-red" />}
                              <span className="font-display font-bold text-[10px] uppercase tracking-widest text-slate-900/60">
                                {siparis.fatura_tipi === 'kurumsal' || (siparis.fatura_adresi && siparis.fatura_adresi.includes('[Kurumsal Fatura]')) ? 'Kurumsal Fatura' : 'Bireysel Fatura'}
                              </span>
                           </div>
                           {siparis.fatura_tipi === 'kurumsal' || (siparis.fatura_adresi && siparis.fatura_adresi.includes('[Kurumsal Fatura]')) ? (
                             <div className="text-xs text-slate-900/70 space-y-1">
                                <div className="font-bold uppercase text-slate-900">{siparis.firma_unvani || siparis.fatura_adresi}</div>
                                {siparis.vergi_dairesi && <div>{siparis.vergi_dairesi} / {siparis.vergi_no}</div>}
                             </div>
                           ) : (
                             <div className="text-xs text-slate-900/50">Şahıs faturası kesilecektir.</div>
                           )}
                        </div>

                        {siparis.teslimat_adresi && (
                          <div className="bg-blue-500/5 border border-blue-500/20 p-3 mt-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <MapPin size={13} className="text-blue-400" />
                              <span className="font-display font-bold text-[10px] uppercase tracking-widest text-blue-400">Kargo Adresi</span>
                            </div>
                            <div className="text-xs text-slate-900/60 leading-relaxed font-body">
                              {siparis.teslimat_adresi}
                            </div>
                          </div>
                        )}

                        {siparis.notlar && (
                          <div className="text-xs text-slate-900/40 italic bg-slate-100 p-2 border-l-2 border-slate-300">
                            " {siparis.notlar} "
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Ödeme & Dekont */}
                    <div>
                      <h4 className="font-display font-bold text-xs uppercase tracking-widest text-slate-900/40 mb-4 flex items-center gap-2">
                        <CreditCard size={12} className="text-brand-red" /> Ödeme Bilgisi
                      </h4>
                      <div className="space-y-4">
                        <div className="bg-slate-100 p-4 border border-slate-200">
                            <div className="font-body text-xs text-slate-900/40 mb-1">Yöntem: <span className="text-slate-900/80 font-bold">{ODEME_TIPI[siparis.odeme_tipi] || siparis.odeme_tipi}</span></div>
                            <div className="font-body text-xs text-slate-900/40">Durum: <span className={
                              siparis.odeme_durumu === 'odendi' ? 'text-green-600 font-bold' :
                              siparis.odeme_durumu === 'odeme_hatasi' ? 'text-red-600 font-bold' :
                              'text-amber-600 font-bold'
                            }>
                              {siparis.odeme_durumu === 'odendi' ? '✅ ÖDEME ALINDI (PayTR)' :
                               siparis.odeme_durumu === 'odeme_hatasi' ? '❌ ÖDEME BAŞARISIZ / İPTAL' :
                               '⏳ ÖDEME BEKLİYOR'}
                            </span></div>
                        </div>

                        {getDekontUrl(siparis) && (
                          <div className="bg-green-500/10 border border-green-500/20 p-4 space-y-3">
                             <div className="flex items-center gap-2 text-green-700 font-display font-bold text-[10px] uppercase tracking-widest">
                                <FileText size={14} /> DEKONT YÜKLENDİ
                             </div>
                             <a 
                               href={getDekontUrl(siparis)} 
                               target="_blank" 
                               rel="noreferrer" 
                               className="flex items-center justify-center gap-2 w-full py-2 bg-green-600 text-white font-display font-bold text-[10px] uppercase tracking-widest hover:bg-green-700 transition-colors"
                             >
                               DEKONTU GÖRÜNTÜLE <ExternalLink size={12} />
                             </a>
                             {siparis.odeme_durumu !== 'odendi' && (
                               <button 
                                 onClick={() => updateOdemeDurumu(siparis.id, 'odendi')}
                                 className="w-full py-2 border border-green-500/30 text-green-700 font-display font-bold text-[10px] uppercase tracking-widest hover:bg-green-500/10"
                               >
                                 ÖDEMEYİ ONAYLA
                               </button>
                             )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Ürünler */}
                    <div>
                      <h4 className="font-display font-bold text-xs uppercase tracking-widest text-slate-900/40 mb-4 flex items-center gap-2">
                        <Package size={12} className="text-brand-red" /> Ürünler
                      </h4>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                        {loadingItems[siparis.id] ? (
                          <div className="flex items-center gap-2 py-4 text-slate-900/20">
                            <RefreshCw size={14} className="animate-spin" />
                            <span className="text-[10px] font-display uppercase tracking-widest">Yükleniyor...</span>
                          </div>
                        ) : Array.isArray(siparis.urunler) && siparis.urunler.length > 0 ? (
                          siparis.urunler.map((u, i) => (
                            <div key={i} className="flex items-center gap-3 bg-slate-100 p-2">
                              {u.fotograf && <img src={u.fotograf} alt={u.ad} className="w-10 h-10 object-cover bg-black flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <div className="font-display font-bold text-[10px] uppercase text-slate-900 truncate">{u.ad}</div>
                                <div className="font-body text-slate-900/30 text-[10px]">×{u.adet} — {u.fiyat?.toLocaleString('tr-TR')} ₺</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-slate-900/20 italic py-4">Ürün bilgisi bulunamadı.</div>
                        )}
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between items-center">
                         <span className="font-display font-bold text-xs uppercase text-slate-900/40">Toplam Tutar</span>
                         <span className="font-display font-black text-xl text-brand-red">{siparis.toplam_tutar?.toLocaleString('tr-TR')} ₺</span>
                      </div>
                    </div>
                  </div>

                  {/* Alt İşlemler: Durum ve Kargo */}
                  <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-slate-200">
                     <div>
                        <h4 className="font-display font-bold text-xs uppercase tracking-widest text-slate-900/40 mb-3">Sipariş Durumu</h4>
                        <div className="flex flex-wrap gap-2">
                           {Object.entries(DURUM_CONFIG).map(([durum, cfg]) => (
                             <button
                               key={durum}
                               onClick={() => siparis.durum !== durum && updateDurum(siparis.id, durum)}
                               disabled={siparis.durum === durum || updatingId === siparis.id}
                               className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-display font-bold uppercase tracking-widest transition-all ${
                                 siparis.durum === durum ? `${cfg.bg} ${cfg.color}` : 'border-slate-300 text-slate-900/30 hover:border-brand-red/40 hover:text-slate-900'
                               }`}
                             >
                               <cfg.icon size={11} /> {cfg.label}
                             </button>
                           ))}
                        </div>
                     </div>

                     <div>
                        {(() => {
                          const basitKargoMatch = siparis.notlar?.match(/\[Basit Kargo ID:\s*([^\]|]+)/)
                          const basitKargoId = basitKargoMatch ? basitKargoMatch[1].trim() : null

                          return (
                            <>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-display font-bold text-xs uppercase tracking-widest text-slate-900/40 flex items-center gap-1.5">
                                  <Truck size={14} className="text-brand-red" /> Lojistik & Kargo
                                </h4>
                                {basitKargoId && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded font-bold">
                                    BK ID: {basitKargoId}
                                  </span>
                                )}
                              </div>

                              {siparis.teslimat_tipi === 'depo' ? (
                                 <div className="bg-orange-500/10 border border-orange-500/20 p-3 flex items-center gap-3">
                                    <Store size={16} className="text-orange-400" />
                                    <span className="font-display font-bold text-[10px] uppercase tracking-widest text-orange-400">Mağazadan Teslim Edilecek</span>
                                 </div>
                              ) : (
                                <div className="space-y-4">
                                  {/* 1. Basit Kargo Hızlı Sevk Kutusu */}
                                  <div className="bg-white p-3 border border-blue-200 rounded shadow-sm space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                      <span className="font-display font-bold text-xs uppercase text-blue-900 flex items-center gap-1.5">
                                        <span>📦</span> Basit Kargo Otomasyonu
                                      </span>
                                      {siparis.kargo_takip_no ? (
                                        <span className="text-[10px] font-bold uppercase text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                                          Barkod Alındı
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-medium text-slate-400">
                                          Tek Tıkla Sevk
                                        </span>
                                      )}
                                    </div>

                                    {/* Eğer kargo zaten oluşturulduysa: Etiket ve Takip aksiyonları */}
                                    {siparis.kargo_takip_no ? (
                                      <div className="space-y-2.5">
                                        <div className="flex items-center justify-between bg-slate-50 p-2.5 border border-slate-200 rounded">
                                          <div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">
                                              {siparis.kargo_firmasi || 'HepsiJet'}
                                            </div>
                                            <div className="font-mono font-bold text-xs text-slate-900">
                                              {siparis.kargo_takip_no}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            {basitKargoId ? (
                                              <a
                                                href={`/api/admin/cargo/label/${basitKargoId}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-display font-bold uppercase tracking-wider transition-colors shadow-sm"
                                                title="Basit Kargo Resmi SVG Etiketini Yazdır"
                                              >
                                                <Printer size={12} /> RESMİ ETİKET
                                              </a>
                                            ) : null}
                                            <a
                                              href={`https://basitkargo.com/takip/${siparis.kargo_takip_no}`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-display font-bold uppercase tracking-wider transition-colors"
                                              title="Kargoyu Takip Et"
                                            >
                                              <ExternalLink size={12} /> TAKİP ET
                                            </a>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                          <a
                                            href={`/siparis/${siparis.siparis_no || siparis.id}/kargo-etiketi`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 underline inline-flex items-center gap-1"
                                          >
                                            Yerel A4 Sevk Fişi
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => iptalBasitKargo(siparis.id, siparis.kargo_takip_no!)}
                                            disabled={sendingBasitKargo[siparis.id]}
                                            className="text-[10px] font-bold text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                                          >
                                            <Trash2 size={11} /> Kargo Kodunu İptal Et
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2.5">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                              Taşıyıcı Seçimi
                                            </label>
                                            <select
                                              className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white font-medium text-slate-800"
                                              value={basitKargoHandler[siparis.id] || 'HEPSIJET'}
                                              onChange={(e) => setBasitKargoHandler({ ...basitKargoHandler, [siparis.id]: e.target.value })}
                                            >
                                              {BASIT_KARGO_HANDLERS.map(h => (
                                                <option key={h.code} value={h.code}>
                                                  {h.icon} {h.name}
                                                </option>
                                              ))}
                                            </select>
                                          </div>

                                          <div>
                                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                              Desi / Paket
                                            </label>
                                            <div className="flex items-center gap-1">
                                              <input
                                                type="number"
                                                min="1"
                                                max="99"
                                                step="1"
                                                className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-slate-800"
                                                value={basitKargoDesi[siparis.id] !== undefined ? basitKargoDesi[siparis.id] : 3}
                                                onChange={(e) => setBasitKargoDesi({ ...basitKargoDesi, [siparis.id]: Math.max(1, parseInt(e.target.value) || 1) })}
                                              />
                                              <span className="text-[10px] text-slate-400 font-bold uppercase pr-1">Desi</span>
                                            </div>
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => gonderBasitKargo(siparis)}
                                          disabled={sendingBasitKargo[siparis.id]}
                                          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded font-display font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                                        >
                                          {sendingBasitKargo[siparis.id] ? (
                                            <>
                                              <RefreshCw size={13} className="animate-spin" />
                                              <span>Basit Kargo'ya İletiliyor...</span>
                                            </>
                                          ) : (
                                            <>
                                              <span>⚡</span>
                                              <span>Basit Kargo'ya Aktar & Barkod Al</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* 2. Manuel Kargo Girişi (Alternatif / Manuel Düzenleme) */}
                                  <details className="text-xs text-slate-600">
                                    <summary className="cursor-pointer font-display font-semibold text-[10px] uppercase text-slate-400 hover:text-slate-600 mb-2">
                                      + Manuel Takip No Gir / Düzenle
                                    </summary>
                                    {(() => {
                                      const seciliTakipNo = kargoInputs[siparis.id] ?? siparis.kargo_takip_no ?? ''
                                      const seciliFirma = kargoFirmaInputs[siparis.id] || siparis.kargo_firmasi || VARSAYILAN_KARGO_FIRMASI
                                      const canSave = seciliTakipNo.trim().length > 0 && updatingKargo !== siparis.id

                                      return (
                                        <div className="p-2.5 bg-slate-100 border border-slate-200 rounded space-y-2">
                                          <select
                                            className="w-full input-dark text-xs p-1.5"
                                            value={seciliFirma}
                                            onChange={(e) => setKargoFirmaInputs({ ...kargoFirmaInputs, [siparis.id]: e.target.value })}
                                          >
                                            {MANUEL_KARGO_FIRMALARI.map(firma => (
                                              <option key={firma} value={firma}>{firma}</option>
                                            ))}
                                          </select>
                                          <div className="flex gap-2">
                                            <input 
                                              type="text" 
                                              className="input-dark text-xs flex-1" 
                                              placeholder="Manuel Takip No" 
                                              value={seciliTakipNo}
                                              onChange={(e) => setKargoInputs({ ...kargoInputs, [siparis.id]: e.target.value })}
                                            />
                                            <button 
                                              onClick={() => kaydetKargoNo(siparis.id, seciliTakipNo, seciliFirma)}
                                              disabled={!canSave}
                                              className="btn-primary text-[10px] py-1.5 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                                              title={!seciliTakipNo.trim() ? 'Lütfen takip no girin' : 'Kaydet'}
                                            >
                                              {updatingKargo === siparis.id ? '...' : 'KAYDET'}
                                            </button>
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </details>
                                </div>
                              )}
                            </>
                          )
                        })()}
                     </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => loadSiparisler(page + 1, true, search, filterDurum)}
            disabled={loadingMore}
            className="btn-outline text-xs py-3 px-10 min-w-[200px] justify-center"
          >
            {loadingMore ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
            ) : (
              <>DAHA FAZLA YÜKLE</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
