'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { createAkdagBrowserClient } from '@/lib/supabase-akdag'
import { Zap, Tag, Plus, Trash2, Loader2, Check, Clock, AlertCircle, Search, ShieldCheck, Box, ArrowRightLeft } from 'lucide-react'
import { dovizToTL, DEFAULT_KUR, type KurData } from '@/lib/kur'

interface Urun {
  id: string
  slug?: string
  ad: string
  fiyat: number
  para_birimi?: string
  sescim_fiyat?: number | null
  marka?: string | null
  model_kodu?: string | null
  fotograflar?: string[]
}

interface Firsat {
  id: string
  urun_id: string
  indirimli_fiyat: number
  baslangic_tarihi: string
  bitis_tarihi: string
  aktif: boolean
  urun?: Urun
}

interface OutletItem {
  id: string
  urun_id: string
  outlet_fiyat: number
  durum_aciklamasi: string
  stok_adedi: number
  aktif: boolean
  created_at: string
  urun?: Urun
}

export default function AdminFirsatYonetimi() {
  const [activeSubTab, setActiveSubTab] = useState<'firsatlar' | 'outlet'>('firsatlar')
  const [firsatlar, setFirsatlar] = useState<Firsat[]>([])
  const [outletList, setOutletList] = useState<OutletItem[]>([])
  const [urunler, setUrunler] = useState<Urun[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [kur, setKur] = useState<KurData>(DEFAULT_KUR)
  const [priceInputMode, setPriceInputMode] = useState<'currency' | 'tl'>('currency')
  const supabase = useRef(createClient()).current

  // Form states - Fırsat
  const [urunId, setUrunId] = useState('')
  const [indirimliFiyat, setIndirimliFiyat] = useState('')
  const [baslangic, setBaslangic] = useState('')
  const [bitis, setBitis] = useState('')

  // Form states - Outlet
  const [outletDurum, setOutletDurum] = useState('Teşhir Ürünü - 1 Yıl Distribütör Garantili')
  const [outletStok, setOutletStok] = useState('1')

  const toDateTimeLocal = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    return headers
  }

  const openNewForm = () => {
    if (!showForm) {
      if (activeSubTab === 'firsatlar') {
        const now = new Date()
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
        setBaslangic(toDateTimeLocal(now))
        setBitis(toDateTimeLocal(tomorrow))
      }
      setShowForm(true)
      setError('')
    } else {
      setShowForm(false)
    }
  }

  const setDurationHours = (hours: number) => {
    const start = baslangic ? new Date(baslangic) : new Date()
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000)
    setBitis(toDateTimeLocal(end))
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const akdag = createAkdagBrowserClient()
      const headers = await getAuthHeaders()

      // API rotası üzerinden çekmeyi dene (RLS bypass), başarısız olursa browser client ile fallback yap
      const adminDataRes = await fetch('/api/admin/firsatlar', { headers })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)

      const [akdagUrunlerRes, sescimUrunlerRes, pricingRes, kurRes] = await Promise.all([
        akdag.from('urunler').select('id, slug, ad, fiyat, para_birimi, marka, model_kodu, fotograflar').order('ad'),
        supabase.from('urunler').select('id, slug, ad, fiyat, para_birimi, marka, model_kodu, fotograflar').order('ad'),
        supabase.from('sescim_fiyatlar').select('urun_id, sescim_fiyat, sescim_indirimli_fiyat'),
        fetch('/api/kur').then(r => r.json()).catch(() => DEFAULT_KUR)
      ])

      let rawFirsatlar = adminDataRes?.firsatlar
      let rawOutlet = adminDataRes?.outlet

      if (!rawFirsatlar) {
        const fRes = await supabase.from('flas_indirimler').select('*').order('created_at', { ascending: false })
        rawFirsatlar = fRes.data || []
      }
      if (!rawOutlet) {
        const oRes = await supabase.from('outlet_urunler').select('*').order('created_at', { ascending: false })
        rawOutlet = oRes.data || []
      }

      if (kurRes?.USD) {
        setKur(kurRes)
      }

      const pricingMap = new Map<string, any>((pricingRes.data || []).map((p: any) => [p.urun_id, p]))

      const allUrunler: Urun[] = [
        ...(sescimUrunlerRes.data || []).map((u: any) => ({
          ...u,
          sescim_fiyat: pricingMap.get(u.id)?.sescim_fiyat ?? u.fiyat,
          para_birimi: u.para_birimi || 'TRY'
        })),
        ...(akdagUrunlerRes.data || []).map((u: any) => ({
          ...u,
          sescim_fiyat: pricingMap.get(u.id)?.sescim_fiyat ?? null,
          para_birimi: u.para_birimi || 'TRY'
        }))
      ]
      setUrunler(allUrunler)

      // Fırsat ürünlerini eşleştir
      const firsatlarWithUrun = (rawFirsatlar || []).map((f: any) => ({
        ...f,
        urun: allUrunler.find(u => u.id === f.urun_id) || { id: f.urun_id, ad: 'Ürün Adı Bulunamadı', fiyat: f.indirimli_fiyat, para_birimi: 'TRY' }
      }))
      setFirsatlar(firsatlarWithUrun)

      // Outlet ürünlerini eşleştir
      const outletsWithUrun = (rawOutlet || []).map((o: any) => ({
        ...o,
        urun: allUrunler.find(u => u.id === o.urun_id) || { id: o.urun_id, ad: 'Ürün Adı Bulunamadı', fiyat: o.outlet_fiyat, para_birimi: 'TRY' }
      }))
      setOutletList(outletsWithUrun)
    } catch (e) {
      console.error('Failed to load firsat / outlet data:', e)
    } finally {
      setLoading(false)
    }
  }

  const selectedUrun = urunler.find(u => u.id === urunId)
  const pb = selectedUrun?.para_birimi || 'TRY'
  const rawOrijinalFiyat = selectedUrun ? (selectedUrun.sescim_fiyat ?? selectedUrun.fiyat ?? 0) : 0
  const orijinalFiyatTL = dovizToTL(rawOrijinalFiyat, pb, kur)

  const handleSaveFirsat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urunId || !indirimliFiyat || !baslangic || !bitis) {
      setError('Tüm alanları doldurunuz.')
      return
    }

    const valNum = parseFloat(indirimliFiyat)
    if (isNaN(valNum) || valNum <= 0) {
      setError('Geçerli bir indirim fiyatı giriniz.')
      return
    }

    // Kullanıcı TL ile girmişse ürünün kendi para birimine çevirip DB'ye kaydedelim
    let finalIndirimliFiyat = valNum
    if (priceInputMode === 'tl' && pb !== 'TRY') {
      const rate = pb === 'USD' ? (kur?.USD || DEFAULT_KUR.USD) : (kur?.EUR || DEFAULT_KUR.EUR)
      finalIndirimliFiyat = parseFloat((valNum / rate).toFixed(2))
    }

    setSaving(true)
    setError('')

    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/firsatlar', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'create_firsat',
          urun_id: urunId,
          indirimli_fiyat: finalIndirimliFiyat,
          baslangic_tarihi: baslangic,
          bitis_tarihi: bitis,
          product: selectedUrun
        })
      })

      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Fırsat kaydedilirken hata oluştu.')
      }

      setShowForm(false)
      setUrunId(''); setIndirimliFiyat(''); setBaslangic(''); setBitis('')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Kayıt sırasında hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveOutlet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urunId || !indirimliFiyat) {
      setError('Lütfen ürün ve outlet fiyatını giriniz.')
      return
    }

    const valNum = parseFloat(indirimliFiyat)
    if (isNaN(valNum) || valNum <= 0) {
      setError('Geçerli bir outlet fiyatı giriniz.')
      return
    }

    let finalOutletFiyat = valNum
    if (priceInputMode === 'tl' && pb !== 'TRY') {
      const rate = pb === 'USD' ? (kur?.USD || DEFAULT_KUR.USD) : (kur?.EUR || DEFAULT_KUR.EUR)
      finalOutletFiyat = parseFloat((valNum / rate).toFixed(2))
    }

    setSaving(true)
    setError('')

    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/firsatlar', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'create_outlet',
          urun_id: urunId,
          indirimli_fiyat: finalOutletFiyat,
          durum_aciklamasi: outletDurum,
          stok_adedi: parseInt(outletStok) || 1,
          product: selectedUrun
        })
      })

      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Outlet ürünü kaydedilirken hata oluştu.')
      }

      setShowForm(false)
      setUrunId(''); setIndirimliFiyat('')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Kayıt sırasında hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  const toggleAktifFirsat = async (id: string, currentStatus: boolean, urun_id: string) => {
    const newStatus = !currentStatus
    const u = urunler.find(x => x.id === urun_id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/firsatlar', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          type: 'firsat',
          id,
          urun_id,
          new_status: newStatus,
          slug: u?.slug
        })
      })
      if (!res.ok) {
        const json = await res.json()
        alert('Durum güncellenemedi: ' + (json.error || 'Bilinmeyen hata'))
      }
    } catch (e: any) {
      console.error('Toggle firsat error:', e)
    }
    loadData()
  }

  const deleteFirsat = async (id: string, urun_id: string) => {
    if (!confirm('Bu fırsatı silmek istediğinize emin misiniz?')) return
    const u = urunler.find(x => x.id === urun_id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/firsatlar?type=firsat&id=${id}&urun_id=${urun_id}&slug=${encodeURIComponent(u?.slug || '')}`, {
        method: 'DELETE',
        headers
      })
      if (!res.ok) {
        const json = await res.json()
        alert('Fırsat silinemedi: ' + (json.error || 'Bilinmeyen hata'))
      }
    } catch (e: any) {
      console.error('Delete firsat error:', e)
    }
    loadData()
  }

  const toggleAktifOutlet = async (id: string, currentStatus: boolean, urun_id: string) => {
    const newStatus = !currentStatus
    const u = urunler.find(x => x.id === urun_id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/firsatlar', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          type: 'outlet',
          id,
          urun_id,
          new_status: newStatus,
          slug: u?.slug
        })
      })
      if (!res.ok) {
        const json = await res.json()
        alert('Durum güncellenemedi: ' + (json.error || 'Bilinmeyen hata'))
      }
    } catch (e: any) {
      console.error('Toggle outlet error:', e)
    }
    loadData()
  }

  const deleteOutlet = async (id: string, urun_id: string) => {
    if (!confirm('Bu outlet ürününü silmek istediğinize emin misiniz?')) return
    const u = urunler.find(x => x.id === urun_id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/firsatlar?type=outlet&id=${id}&urun_id=${urun_id}&slug=${encodeURIComponent(u?.slug || '')}`, {
        method: 'DELETE',
        headers
      })
      if (!res.ok) {
        const json = await res.json()
        alert('Outlet silinemedi: ' + (json.error || 'Bilinmeyen hata'))
      }
    } catch (e: any) {
      console.error('Delete outlet error:', e)
    }
    loadData()
  }

  const filteredUrunler = urunler.filter(u => {
    if (!searchTerm.trim()) return true
    const qLower = searchTerm.toLowerCase()
    return (
      u.ad?.toLowerCase().includes(qLower) ||
      (u.marka && u.marka.toLowerCase().includes(qLower)) ||
      (u.model_kodu && u.model_kodu.toLowerCase().includes(qLower))
    )
  }).slice(0, 100)

  return (
    <div className="space-y-6">
      {/* Üst Sekmeler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveSubTab('firsatlar'); setShowForm(false) }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-display font-bold text-xs uppercase tracking-wider transition-all ${
              activeSubTab === 'firsatlar'
                ? 'bg-brand-red text-white shadow-md'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Zap size={14} /> Flaş İndirimler ({firsatlar.length})
          </button>
          <button
            onClick={() => { setActiveSubTab('outlet'); setShowForm(false) }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-display font-bold text-xs uppercase tracking-wider transition-all ${
              activeSubTab === 'outlet'
                ? 'bg-brand-red text-white shadow-md'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Tag size={14} /> Outlet & Teşhir ({outletList.length})
          </button>
        </div>

        <button 
          onClick={openNewForm} 
          className="flex items-center gap-2 bg-brand-red text-white px-5 py-2.5 rounded-lg font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all shadow-sm"
        >
          <Plus size={14} /> {activeSubTab === 'firsatlar' ? 'Yeni Fırsat Ekle' : 'Yeni Outlet Ekle'}
        </button>
      </div>

      {/* Form Alanı */}
      {showForm && (
        <form onSubmit={activeSubTab === 'firsatlar' ? handleSaveFirsat : handleSaveOutlet} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-display font-bold text-sm uppercase tracking-widest text-slate-900">
              {activeSubTab === 'firsatlar' ? 'Yeni Flaş İndirim Oluştur' : 'Yeni Outlet / Teşhir Ürünü Ekle'}
            </h3>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
              TCMB Kurları: USD ₺{kur.USD} | EUR ₺{kur.EUR}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ürün Arama ve Seçimi */}
            <div className="sm:col-span-2 space-y-2">
              <label className="font-display text-xs tracking-widest uppercase text-slate-500 block">Ürün Arayın ve Seçin</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ürün adı veya model kodu ile filtreleyin..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="input-base pl-9 text-sm py-2 mb-2"
                />
              </div>
              <select 
                value={urunId} 
                onChange={e => {
                  const val = e.target.value
                  setUrunId(val)
                  const selected = urunler.find(u => u.id === val)
                  if (selected) {
                    const pCurr = selected.para_birimi || 'TRY'
                    const baseP = selected.sescim_fiyat ?? selected.fiyat ?? 0
                    if (priceInputMode === 'currency') {
                      setIndirimliFiyat(baseP ? (baseP * 0.85).toFixed(2) : '')
                    } else {
                      const inTL = dovizToTL(baseP, pCurr, kur)
                      setIndirimliFiyat(inTL ? Math.round(inTL * 0.85).toString() : '')
                    }
                  }
                }}
                className="input-base text-sm"
              >
                <option value="">-- Ürün Seçiniz ({filteredUrunler.length} sonuç) --</option>
                {filteredUrunler.map(u => {
                  const pCurr = u.para_birimi || 'TRY'
                  const curFiyat = u.sescim_fiyat ?? u.fiyat ?? 0
                  const inTL = dovizToTL(curFiyat, pCurr, kur)
                  return (
                    <option key={u.id} value={u.id}>
                      {u.marka ? `[${u.marka}] ` : ''}{u.ad} — {curFiyat.toLocaleString('tr-TR')} {pCurr} {pCurr !== 'TRY' ? `(≈ ${inTL.toLocaleString('tr-TR')} TL)` : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Fiyat Giriş Alanı - Çoklu Para Birimi */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-display text-xs tracking-widest uppercase text-slate-700 font-bold block">
                  {activeSubTab === 'firsatlar' ? 'Flaş İndirimli Fiyat' : 'Outlet Satış Fiyatı'}
                </label>
                {selectedUrun && (
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        if (priceInputMode === 'tl' && indirimliFiyat) {
                          const tlNum = parseFloat(indirimliFiyat)
                          if (!isNaN(tlNum)) {
                            const rate = pb === 'USD' ? (kur?.USD || DEFAULT_KUR.USD) : (kur?.EUR || DEFAULT_KUR.EUR)
                            const inCurr = pb === 'TRY' ? tlNum : (tlNum / rate)
                            setIndirimliFiyat(inCurr.toFixed(2))
                          }
                        }
                        setPriceInputMode('currency')
                      }}
                      className={`px-2 py-0.5 text-[10px] font-display font-bold uppercase rounded transition-all ${
                        priceInputMode === 'currency'
                          ? 'bg-white text-brand-red shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {pb} ile Gir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (priceInputMode === 'currency' && indirimliFiyat) {
                          const valNum = parseFloat(indirimliFiyat)
                          if (!isNaN(valNum)) {
                            setIndirimliFiyat(dovizToTL(valNum, pb, kur).toString())
                          }
                        }
                        setPriceInputMode('tl')
                      }}
                      className={`px-2 py-0.5 text-[10px] font-display font-bold uppercase rounded transition-all ${
                        priceInputMode === 'tl'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      TL (₺) ile Gir
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <input 
                  type="number" 
                  step="0.01" 
                  value={indirimliFiyat} 
                  onChange={e => setIndirimliFiyat(e.target.value)} 
                  placeholder="0.00"
                  className="input-base text-sm pr-16" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-display font-black text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  {priceInputMode === 'currency' ? pb : 'TRY'}
                </span>
              </div>

              {/* Canlı Hesaplama & Geri Bildirim */}
              {selectedUrun && indirimliFiyat && !isNaN(parseFloat(indirimliFiyat)) && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Orijinal Fiyat:</span>
                    <span className="font-semibold">{rawOrijinalFiyat} {pb} (≈ {orijinalFiyatTL.toLocaleString('tr-TR')} TL)</span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span>İndirimli Fiyat:</span>
                    <span className="text-brand-red">
                      {priceInputMode === 'currency' ? (
                        <>
                          {parseFloat(indirimliFiyat).toFixed(2)} {pb} 
                          {pb !== 'TRY' && (
                            <span className="text-emerald-700 ml-1.5 font-black">
                              ≈ {dovizToTL(parseFloat(indirimliFiyat), pb, kur).toLocaleString('tr-TR')} TL
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {parseFloat(indirimliFiyat).toLocaleString('tr-TR')} TL
                          {pb !== 'TRY' && (
                            <span className="text-slate-500 ml-1.5 font-mono text-[11px]">
                              (≈ {(parseFloat(indirimliFiyat) / (pb === 'USD' ? (kur?.USD || DEFAULT_KUR.USD) : (kur?.EUR || DEFAULT_KUR.EUR))).toFixed(2)} {pb})
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                  {(() => {
                    const inTL = priceInputMode === 'currency' 
                      ? dovizToTL(parseFloat(indirimliFiyat), pb, kur) 
                      : parseFloat(indirimliFiyat)
                    const diff = orijinalFiyatTL - inTL
                    const percent = orijinalFiyatTL > 0 ? Math.round((diff / orijinalFiyatTL) * 100) : 0
                    if (diff > 0) {
                      return (
                        <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-emerald-700 font-bold text-[11px]">
                          <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded uppercase">%{percent} İndirim</span>
                          <span>Müşteri Kazancı: ₺{diff.toLocaleString('tr-TR')}</span>
                        </div>
                      )
                    } else if (diff < 0) {
                      return (
                        <div className="pt-1 border-t border-slate-200 text-amber-700 font-semibold text-[11px]">
                          ⚠️ Dikkat: İndirimli fiyat orijinal fiyattan daha yüksek!
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              )}
            </div>

            {activeSubTab === 'firsatlar' ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="font-display text-xs tracking-widest uppercase text-slate-500 block mb-2">Başlangıç Tarihi</label>
                    <input type="datetime-local" value={baslangic} onChange={e => setBaslangic(e.target.value)} className="input-base text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-display text-xs tracking-widest uppercase text-slate-500 block">Bitiş Tarihi (Geri Sayım)</label>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setDurationHours(24)} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">+24 Sa</button>
                        <button type="button" onClick={() => setDurationHours(72)} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">+3 Gün</button>
                        <button type="button" onClick={() => setDurationHours(168)} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">+7 Gün</button>
                        <button type="button" onClick={() => setDurationHours(720)} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">+30 Gün</button>
                      </div>
                    </div>
                    <input type="datetime-local" value={bitis} onChange={e => setBitis(e.target.value)} className="input-base text-sm" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="font-display text-xs tracking-widest uppercase text-slate-500 block mb-2">Outlet Durumu</label>
                    <select value={outletDurum} onChange={e => setOutletDurum(e.target.value)} className="input-base text-sm">
                      <option value="Teşhir Ürünü - 1 Yıl Distribütör Garantili">Teşhir Ürünü - 1 Yıl Garanti</option>
                      <option value="Kutusu Açık Fırsat - Sıfırdan Farksız">Kutusu Açık Fırsat - Sıfırdan Farksız</option>
                      <option value="B-Stock - Test Edilmiş & Faturalı">B-Stock - Test Edilmiş & Faturalı</option>
                      <option value="Seri Sonu İndirimi - Sıfır Kutusunda">Seri Sonu İndirimi - Sıfır Kutusunda</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-display text-xs tracking-widest uppercase text-slate-500 block mb-2">Outlet Stok Adedi</label>
                    <input type="number" min="1" value={outletStok} onChange={e => setOutletStok(e.target.value)} className="input-base text-sm" />
                  </div>
                </div>
              </>
            )}
          </div>

          {error && <div className="flex items-center gap-2 text-red-600 text-sm font-body"><AlertCircle size={14} /> {error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex items-center gap-2 btn-primary text-xs py-2.5 px-6 rounded-lg disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 
              {activeSubTab === 'firsatlar' ? 'Fırsatı Başlat' : 'Outlet Ürününü Ekle'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-xs py-2.5 px-6 rounded-lg">
              İptal
            </button>
          </div>
        </form>
      )}

      {/* Liste Gösterimi */}
      {loading ? (
        <div className="py-16 flex justify-center"><div className="w-8 h-8 border-2 border-slate-200 border-t-brand-red rounded-full animate-spin" /></div>
      ) : activeSubTab === 'firsatlar' ? (
        /* FIRSATLAR LİSTESİ */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {firsatlar.map(firsat => {
            const isGecmis = new Date(firsat.bitis_tarihi).getTime() < Date.now()
            const isBaslamadi = new Date(firsat.baslangic_tarihi).getTime() > Date.now()
            
            const u = firsat.urun
            const pCurr = u?.para_birimi || 'TRY'
            const rawOri = u?.sescim_fiyat ?? u?.fiyat ?? 0
            const oriTL = dovizToTL(rawOri, pCurr, kur)
            const indirimTL = dovizToTL(firsat.indirimli_fiyat, pCurr, kur)
            const indirimOrani = oriTL > indirimTL ? Math.round(((oriTL - indirimTL) / oriTL) * 100) : null

            return (
              <div key={firsat.id} className={`bg-white border rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm ${
                firsat.aktif && !isGecmis ? 'border-brand-red/30' : 'border-slate-200 opacity-70'
              }`}>
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-brand-red">
                      <Zap size={16} className={firsat.aktif && !isGecmis ? 'animate-pulse' : 'text-slate-400'} />
                      <span className="font-display font-bold text-[10px] tracking-widest uppercase">Günün Fırsatı</span>
                    </div>
                    <span className={`font-display font-bold text-[10px] tracking-widest uppercase px-2 py-0.5 rounded ${
                      !firsat.aktif ? 'bg-slate-100 text-slate-500' :
                      isGecmis ? 'bg-red-50 text-red-600' :
                      isBaslamadi ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {!firsat.aktif ? 'Pasif' : isGecmis ? 'Süresi Doldu' : isBaslamadi ? 'Bekliyor' : 'Canlıda'}
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-slate-900 text-sm mb-2 line-clamp-1">{firsat.urun?.ad || 'Bilinmeyen Ürün'}</h4>
                  
                  <div className="space-y-1 mb-4">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <div className="text-2xl font-black font-display text-brand-red">
                        ₺{indirimTL.toLocaleString('tr-TR')}
                      </div>
                      {oriTL > indirimTL && (
                        <div className="text-sm text-slate-400 line-through">
                          ₺{oriTL.toLocaleString('tr-TR')}
                        </div>
                      )}
                      {indirimOrani && (
                        <span className="bg-red-100 text-brand-red font-display font-black text-[10px] px-1.5 py-0.5 rounded">
                          %{indirimOrani} İndirim
                        </span>
                      )}
                    </div>
                    {pCurr !== 'TRY' && (
                      <div className="text-[11px] font-mono text-slate-500">
                        Orijinal: {rawOri} {pCurr} → İndirimli: <strong>{firsat.indirimli_fiyat} {pCurr}</strong>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-2"><Clock size={12} /> Bitiş: {new Date(firsat.bitis_tarihi).toLocaleString('tr-TR')}</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button onClick={() => toggleAktifFirsat(firsat.id, firsat.aktif, firsat.urun_id)} className="btn-outline flex-1 py-1.5 text-[11px] rounded-lg">
                    {firsat.aktif ? 'Yayından Kaldır' : 'Yayına Al'}
                  </button>
                  <button onClick={() => deleteFirsat(firsat.id, firsat.urun_id)} className="px-3 border border-slate-200 text-slate-400 hover:text-brand-red rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
          {firsatlar.length === 0 && (
            <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <Zap size={32} className="mx-auto mb-2 opacity-40 text-brand-red" />
              Henüz flaş indirim eklenmemiş. "Yeni Fırsat Ekle" butonu ile ekleyebilirsiniz.
            </div>
          )}
        </div>
      ) : (
        /* OUTLET LİSTESİ */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outletList.map(item => {
            const u = item.urun
            const pCurr = u?.para_birimi || 'TRY'
            const rawOri = u?.sescim_fiyat ?? u?.fiyat ?? 0
            const oriTL = dovizToTL(rawOri, pCurr, kur)
            const outletTL = dovizToTL(item.outlet_fiyat, pCurr, kur)

            return (
              <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider">
                      <ShieldCheck size={13} /> {item.durum_aciklamasi}
                    </div>
                    <span className={`text-[10px] font-display font-bold uppercase px-2 py-0.5 rounded ${item.aktif ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {item.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mb-2 line-clamp-1">{item.urun?.ad}</h4>
                  
                  <div className="space-y-1 mb-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <div className="text-2xl font-black font-display text-emerald-600">
                        ₺{outletTL.toLocaleString('tr-TR')}
                      </div>
                      {oriTL > outletTL && (
                        <div className="text-sm text-slate-400 line-through">
                          ₺{oriTL.toLocaleString('tr-TR')}
                        </div>
                      )}
                    </div>
                    {pCurr !== 'TRY' && (
                      <div className="text-[11px] font-mono text-slate-500">
                        Orijinal: {rawOri} {pCurr} → Outlet: <strong>{item.outlet_fiyat} {pCurr}</strong>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <Box size={13} /> Stok: {item.stok_adedi} Adet
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button onClick={() => toggleAktifOutlet(item.id, item.aktif, item.urun_id)} className="btn-outline flex-1 py-1.5 text-[11px] rounded-lg">
                    {item.aktif ? 'Pasifleştir' : 'Aktifleştir'}
                  </button>
                  <button onClick={() => deleteOutlet(item.id, item.urun_id)} className="px-3 border border-slate-200 text-slate-400 hover:text-brand-red rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
          {outletList.length === 0 && (
            <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <Tag size={32} className="mx-auto mb-2 opacity-40 text-emerald-600" />
              Henüz outlet ürünü eklenmemiş. "Yeni Outlet Ekle" butonu ile teşhir/kutusuz ürünleri satışa çıkarabilirsiniz.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
