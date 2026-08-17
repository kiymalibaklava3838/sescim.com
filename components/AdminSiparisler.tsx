'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Package, Clock, CheckCircle, XCircle, Truck, Store,
  RefreshCw, Search, X, ChevronDown, ChevronUp, Phone, Mail, MapPin, FileText, ExternalLink, Briefcase, User as UserIcon, CreditCard
} from 'lucide-react'

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
  dekont_url?: string
  fatura_tipi?: 'bireysel' | 'kurumsal'
  firma_unvani?: string
  vergi_dairesi?: string
  vergi_no?: string
  teslimat_adresi?: string
  dolar_kuru?: number
  euro_kuru?: number
  created_at: string
  updated_at: string
}

const DURUM_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  beklemede:     { label: 'Beklemede',     color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: Clock },
  onaylandi:     { label: 'Onaylandı',     color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: CheckCircle },
  hazirlaniyor:  { label: 'Hazırlanıyor',  color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Package },
  teslim_edildi: { label: 'Teslim Edildi', color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', icon: Truck },
  iptal:         { label: 'İptal',         color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     icon: XCircle },
}

const ODEME_TIPI: Record<string, string> = {
  kredi_karti: 'Kredi Kartı',
  kart: 'Kredi Kartı',
  havale: 'Havale/EFT',
  whatsapp: 'WhatsApp',
}

const PAGE_SIZE = 50

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
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({})
  const supabase = useRef(createClient()).current

  useEffect(() => { loadSiparisler(0) }, [])

  const loadSiparisler = async (p: number, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)

    const from = p * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data } = await supabase
      .from('siparisler')
      .select('id, siparis_no, ad_soyad, email, telefon, toplam_tutar, durum, odeme_tipi, odeme_durumu, notlar, teslimat_tipi, kargo_takip_no, dekont_url, fatura_tipi, firma_unvani, vergi_dairesi, vergi_no, teslimat_adresi, dolar_kuru, euro_kuru, created_at')
      .order('created_at', { ascending: false })
      .range(from, to)
    
    if (data) {
      if (append) setSiparisler(prev => [...prev, ...data])
      else setSiparisler(data)
      setHasMore(data.length === PAGE_SIZE)
    }
    
    setLoading(false)
    setLoadingMore(false)
    setPage(p)
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
    await supabase.from('siparisler').update({
      odeme_durumu: durum,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    await loadSiparisler(0)
  }

  const kaydetKargoNo = async (id: string, no: string) => {
    setUpdatingKargo(id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/siparis-durum-guncelle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ id, durum: 'kargolandi', kargo_takip_no: no })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error || 'Güncellenemedi')
      }
      await loadSiparisler(0)
    } catch (err: any) {
      alert(`Hata: ${err.message || 'Kargo bilgisi güncellenemedi.'}`)
    } finally {
      setUpdatingKargo(null)
    }
  }

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }

    setExpandedId(id)
    
    // Eğer ürünler zaten yüklüyse tekrar çekme
    const siparis = siparisler.find(s => s.id === id)
    if (siparis?.urunler && Array.isArray(siparis.urunler) && siparis.urunler.length > 0) return

    setLoadingItems(prev => ({ ...prev, [id]: true }))
    try {
      const { data } = await supabase
        .from('siparisler')
        .select('urunler')
        .eq('id', id)
        .single()
      
      if (data?.urunler) {
        setSiparisler(prev => prev.map(s => s.id === id ? { ...s, urunler: data.urunler } : s))
      }
    } catch (err) {
      console.error('Ürünler yüklenemedi:', err)
    } finally {
      setLoadingItems(prev => ({ ...prev, [id]: false }))
    }
  }

  const filtered = siparisler.filter(s => {
    const durumMatch = filterDurum === 'hepsi' || s.durum === filterDurum || (filterDurum === 'dekontlu' && s.dekont_url)
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
            { id: 'dekontlu', label: 'Dekontlu' },
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
        <button onClick={() => loadSiparisler(0)} className="flex items-center gap-2 text-slate-900/30 hover:text-slate-900 text-xs font-display uppercase tracking-widest transition-colors px-3">
          <RefreshCw size={12} />Yenile
        </button>
      </div>

      <div className="font-body text-slate-900/30 text-sm mb-4">{filtered.length} sipariş</div>

      <div className="space-y-1">
        {filtered.map(siparis => {
          const cfg = DURUM_CONFIG[siparis.durum] || DURUM_CONFIG.beklemede
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
                      <span className="font-display font-semibold text-xs tracking-widest uppercase px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400">Ödendi</span>
                    )}
                    {siparis.dekont_url && (
                      <span className="font-display font-black text-[10px] bg-brand-red text-slate-900 px-2 py-0.5 animate-pulse">DEKONT YÜKLÜ</span>
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
                              {siparis.fatura_tipi === 'kurumsal' ? <Briefcase size={13} className="text-brand-red" /> : <UserIcon size={13} className="text-brand-red" />}
                              <span className="font-display font-bold text-[10px] uppercase tracking-widest text-slate-900/60">
                                {siparis.fatura_tipi === 'kurumsal' ? 'Kurumsal Fatura' : 'Bireysel Fatura'}
                              </span>
                           </div>
                           {siparis.fatura_tipi === 'kurumsal' ? (
                             <div className="text-xs text-slate-900/70 space-y-1">
                                <div className="font-bold uppercase text-slate-900">{siparis.firma_unvani}</div>
                                <div>{siparis.vergi_dairesi} / {siparis.vergi_no}</div>
                             </div>
                           ) : (
                             <div className="text-xs text-slate-900/50">Şahıs faturası kesilecektir.</div>
                           )}
                        </div>

                        {siparis.teslimat_tipi === 'kargo' && siparis.teslimat_adresi && (
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
                           <div className="font-body text-xs text-slate-900/40 mb-1">Yöntem: <span className="text-slate-900/80">{ODEME_TIPI[siparis.odeme_tipi] || siparis.odeme_tipi}</span></div>
                           <div className="font-body text-xs text-slate-900/40">Durum: <span className={siparis.odeme_durumu === 'odendi' ? 'text-green-400 font-bold' : 'text-yellow-400'}>
                             {siparis.odeme_durumu === 'odendi' ? 'ÖDEME ALINDI' : 'ÖDEME BEKLENİYOR'}
                           </span></div>
                        </div>

                        {siparis.dekont_url && (
                          <div className="bg-green-500/10 border border-green-500/20 p-4 space-y-3">
                             <div className="flex items-center gap-2 text-green-400 font-display font-bold text-[10px] uppercase tracking-widest">
                                <FileText size={14} /> DEKONT YÜKLENDİ
                             </div>
                             <a 
                               href={siparis.dekont_url} 
                               target="_blank" 
                               rel="noreferrer" 
                               className="flex items-center justify-center gap-2 w-full py-2 bg-green-600 text-slate-900 font-display font-bold text-[10px] uppercase tracking-widest hover:bg-green-700 transition-colors"
                             >
                               DEKONTU GÖRÜNTÜLE <ExternalLink size={12} />
                             </a>
                             {siparis.odeme_durumu !== 'odendi' && (
                               <button 
                                 onClick={() => updateOdemeDurumu(siparis.id, 'odendi')}
                                 className="w-full py-2 border border-green-500/30 text-green-400 font-display font-bold text-[10px] uppercase tracking-widest hover:bg-green-500/10"
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
                        <h4 className="font-display font-bold text-xs uppercase tracking-widest text-slate-900/40 mb-3">Lojistik & Takip</h4>
                        {siparis.teslimat_tipi === 'depo' ? (
                           <div className="bg-orange-500/10 border border-orange-500/20 p-3 flex items-center gap-3">
                              <Store size={16} className="text-orange-400" />
                              <span className="font-display font-bold text-[10px] uppercase tracking-widest text-orange-400">Mağazadan Teslim Edilecek</span>
                           </div>
                        ) : (
                           <div className="flex gap-2">
                              <input 
                                type="text" 
                                className="input-dark text-xs flex-1" 
                                placeholder="Kargo Takip No" 
                                value={kargoInputs[siparis.id] !== undefined ? kargoInputs[siparis.id] : (siparis.kargo_takip_no || '')}
                                onChange={(e) => setKargoInputs({...kargoInputs, [siparis.id]: e.target.value})}
                              />
                              <button 
                                onClick={() => kaydetKargoNo(siparis.id, kargoInputs[siparis.id] !== undefined ? kargoInputs[siparis.id] : (siparis.kargo_takip_no || ''))}
                                disabled={updatingKargo === siparis.id}
                                className="btn-primary text-[10px] py-2"
                              >
                                {updatingKargo === siparis.id ? '...' : 'TAKİP NO KAYDET'}
                              </button>
                           </div>
                        )}
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
            onClick={() => loadSiparisler(page + 1, true)}
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
