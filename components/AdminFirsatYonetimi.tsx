'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { createAkdagBrowserClient } from '@/lib/supabase-akdag'
import { Zap, Tag, Plus, Trash2, Loader2, Check, Clock, AlertCircle, Search, ShieldCheck, Box, Sparkles, Palette, Eye, Copy, ExternalLink, Link2, Pencil, X } from 'lucide-react'
import { dovizToTL, DEFAULT_KUR, type KurData } from '@/lib/kur'
import CampaignBadge, { CampaignIcon } from '@/components/CampaignBadge'
import {
  BADGE_COLOR_THEMES,
  CUSTOM_CAMPAIGN_PRESETS,
  DEFAULT_SESCIM_HAFTASI_META,
  normalizeFlashMeta,
  slugifyCampaign,
  type BadgeColorKey,
  type BadgeIconKey,
  type CampaignType,
  type FlashCampaignMeta,
} from '@/lib/flash-campaign'

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
  fiyat_para_birimi?: string
  baslangic_tarihi: string
  bitis_tarihi: string
  aktif: boolean
  kampanya?: FlashCampaignMeta
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
  // priceInputMode: Kullanıcının fiyat giriş para birimi
  //   'TRY' → Her zaman TL olarak saklanır, kur dönüşümü yapılmaz
  //   'currency' → Ürünün kendi para birimi (USD/EUR/TRY) kullanılır
  const [priceInputMode, setPriceInputMode] = useState<'currency' | 'TRY'>('TRY')
  const supabase = useRef(createClient()).current

  // Form states - Fırsat
  const [urunId, setUrunId] = useState('')
  const [indirimliFiyat, setIndirimliFiyat] = useState('')
  const [baslangic, setBaslangic] = useState('')
  const [bitis, setBitis] = useState('')
  const [listFilter, setListFilter] = useState<'tumu' | 'sescim_haftasi' | 'ozel'>('tumu')

  // Form states - Kampanya Tipi & Özelleştirilebilir Rozet
  const [kampanyaTipi, setKampanyaTipi] = useState<CampaignType>('sescim_haftasi')
  const [kampanyaAdi, setKampanyaAdi] = useState('Kara Cuma')
  const [rozetMetni, setRozetMetni] = useState('KARA CUMA')
  const [rozetRengi, setRozetRengi] = useState<BadgeColorKey>('black')
  const [rozetIkonu, setRozetIkonu] = useState<BadgeIconKey>('flame')
  const [yuzdeGoster, setYuzdeGoster] = useState(true)
  const [urunSayfasindaSayac, setUrunSayfasindaSayac] = useState(true)
  const [vurguMetni, setVurguMetni] = useState("Kara Cuma'ya özel sınırlı stoklu büyük indirim!")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [editingFirsat, setEditingFirsat] = useState<Firsat | null>(null)
  const [editMeta, setEditMeta] = useState<FlashCampaignMeta>({ ...DEFAULT_SESCIM_HAFTASI_META })
  const [editSaving, setEditSaving] = useState(false)

  const openEditFirsat = (firsat: Firsat) => {
    setEditingFirsat(firsat)
    setEditMeta(normalizeFlashMeta(firsat.kampanya))
  }

  const handleSaveEditKampanya = async () => {
    if (!editingFirsat) return
    setEditSaving(true)
    try {
      const headers = await getAuthHeaders()
      const payload =
        editMeta.kampanya_tipi === 'sescim_haftasi'
          ? { ...DEFAULT_SESCIM_HAFTASI_META }
          : normalizeFlashMeta(editMeta)

      const res = await fetch('/api/admin/firsatlar', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          type: 'firsat',
          id: editingFirsat.id,
          urun_id: editingFirsat.urun_id,
          slug: editingFirsat.urun?.slug,
          kampanya: payload,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        alert('Kampanya güncellenemedi: ' + (json.error || 'Bilinmeyen hata'))
      } else {
        setEditingFirsat(null)
        await loadData()
      }
    } catch (e) {
      console.error('Edit kampanya error:', e)
    } finally {
      setEditSaving(false)
    }
  }

  const copyCampaignLink = (path: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(path).catch(() => {})
    }
    setCopiedKey(key)
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000)
  }

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

      // API rotası üzerinden çekmeyi dene (RLS bypass + önbelleksiz taze veri)
      const adminDataRes = await fetch(`/api/admin/firsatlar?_t=${Date.now()}`, {
        headers,
        cache: 'no-store',
      })
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
        kampanya: normalizeFlashMeta(f.kampanya),
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

    const startTime = new Date(baslangic).getTime()
    const endTime = new Date(bitis).getTime()
    if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
      setError('Bitiş tarihi başlangıç tarihinden sonra olmalıdır.')
      return
    }
    if (endTime <= Date.now()) {
      setError('Bitiş tarihi ileri bir tarih olmalıdır.')
      return
    }

    // Kullanıcının girdiği para birimini belirle (dönüşüm yapma — ne girdiyse DB'ye öyle kaydet)
    // TRY modunda: fiyat_para_birimi = 'TRY', indirimli_fiyat = girilen TL tutarı
    // currency modunda: fiyat_para_birimi = ürünün para birimi (USD/EUR/TRY), indirimli_fiyat = girilen tutar
    const finalFiyatPB = priceInputMode === 'TRY' ? 'TRY' : pb

    const kampanyaPayload: FlashCampaignMeta =
      kampanyaTipi === 'sescim_haftasi'
        ? { ...DEFAULT_SESCIM_HAFTASI_META }
        : normalizeFlashMeta({
            kampanya_tipi: 'ozel',
            kampanya_adi: kampanyaAdi.trim() || 'Özel Kampanya',
            rozet_metni: rozetMetni.trim() || kampanyaAdi.trim() || 'ÖZEL FIRSAT',
            rozet_rengi: rozetRengi,
            rozet_ikonu: rozetIkonu,
            yuzde_goster: yuzdeGoster,
            urun_sayfasinda_sayac: urunSayfasindaSayac,
            vurgu_metni: vurguMetni.trim(),
          })

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
          indirimli_fiyat: valNum,
          fiyat_para_birimi: finalFiyatPB,
          baslangic_tarihi: new Date(baslangic).toISOString(),
          bitis_tarihi: new Date(bitis).toISOString(),
          kampanya: kampanyaPayload,
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

    // Outlet fiyatını DB'ye girilen para birimiyle kaydet — kur dönüşümü yapma
    // TRY modunda: fiyat_para_birimi = 'TRY', outlet_fiyat = girilen TL tutarı
    // currency modunda: fiyat_para_birimi = ürünün para birimi (USD/EUR/TRY)
    const finalOutletPB = priceInputMode === 'TRY' ? 'TRY' : pb

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
          indirimli_fiyat: valNum,
          fiyat_para_birimi: finalOutletPB,
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
            {/* Kampanya Tipi Seçimi (Yalnızca Flaş İndirimlerde) */}
            {activeSubTab === 'firsatlar' && (
              <div className="sm:col-span-2 space-y-3">
                <label className="font-display text-xs tracking-widest uppercase text-slate-700 font-bold block">
                  1. İndirim Kampanya Tipini Seçin
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setKampanyaTipi('sescim_haftasi')}
                    className={`text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                      kampanyaTipi === 'sescim_haftasi'
                        ? 'border-brand-red bg-red-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${kampanyaTipi === 'sescim_haftasi' ? 'bg-brand-red text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Zap size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-black text-xs uppercase tracking-wider text-slate-900">
                        Sescim Haftası
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Ürün doğrudan <strong>Sescim Haftası</strong> sayfasında ve ana sayfa vitrininde listelenir.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKampanyaTipi('ozel')}
                    className={`text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                      kampanyaTipi === 'ozel'
                        ? 'border-slate-900 bg-slate-900/5 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${kampanyaTipi === 'ozel' ? 'bg-slate-900 text-amber-300' : 'bg-slate-100 text-slate-500'}`}>
                      <Sparkles size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-black text-xs uppercase tracking-wider text-slate-900">
                        Özelleştirilebilir Kampanya
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        <strong>Sescim Haftası&apos;na eklenmez.</strong> Kara Cuma, Yılbaşı vb. özel rozetle katalogda indirimli görünür.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Özelleştirilebilir Kampanya Ayarları */}
                {kampanyaTipi === 'ozel' && (
                  <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    {/* Hazır Şablonlar */}
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-display font-bold uppercase tracking-wider text-slate-600 mb-2">
                        <Palette size={13} className="text-brand-red" />
                        <span>Hazır Kampanya Şablonları (Tek Tıkla Doldur)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CUSTOM_CAMPAIGN_PRESETS.map((preset) => (
                          <button
                            key={preset.key}
                            type="button"
                            onClick={() => {
                              setKampanyaAdi(preset.meta.kampanya_adi)
                              setRozetMetni(preset.meta.rozet_metni)
                              setRozetRengi(preset.meta.rozet_rengi)
                              setRozetIkonu(preset.meta.rozet_ikonu)
                              setYuzdeGoster(preset.meta.yuzde_goster)
                              setUrunSayfasindaSayac(preset.meta.urun_sayfasinda_sayac)
                              setVurguMetni(preset.meta.vurgu_metni || '')
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-brand-red hover:text-brand-red text-[11px] font-display font-bold text-slate-700 transition-colors shadow-2xs"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-display text-[11px] font-bold tracking-wider uppercase text-slate-600 block mb-1.5">
                          Kampanya Adı
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          value={kampanyaAdi}
                          onChange={(e) => setKampanyaAdi(e.target.value)}
                          placeholder="Örn: Kara Cuma 2026"
                          className="input-base text-sm py-2 bg-white"
                        />
                      </div>

                      <div>
                        <label className="font-display text-[11px] font-bold tracking-wider uppercase text-slate-600 block mb-1.5">
                          Ürün Kartı Rozet Metni
                        </label>
                        <input
                          type="text"
                          maxLength={28}
                          value={rozetMetni}
                          onChange={(e) => setRozetMetni(e.target.value)}
                          placeholder="Örn: KARA CUMA"
                          className="input-base text-sm py-2 bg-white uppercase"
                        />
                      </div>

                      {/* Rozet Rengi */}
                      <div>
                        <label className="font-display text-[11px] font-bold tracking-wider uppercase text-slate-600 block mb-1.5">
                          Rozet Renk Teması
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(BADGE_COLOR_THEMES) as BadgeColorKey[]).map((colorKey) => {
                            const theme = BADGE_COLOR_THEMES[colorKey]
                            const selected = rozetRengi === colorKey
                            return (
                              <button
                                key={colorKey}
                                type="button"
                                onClick={() => setRozetRengi(colorKey)}
                                title={theme.label}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                                  selected
                                    ? 'border-slate-900 bg-white ring-2 ring-slate-900/15 text-slate-900'
                                    : 'border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300'
                                }`}
                              >
                                <span className={`w-3.5 h-3.5 rounded-full ${theme.swatchClass}`} />
                                <span className="hidden sm:inline">{theme.label.split(' ')[0]}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Rozet İkonu */}
                      <div>
                        <label className="font-display text-[11px] font-bold tracking-wider uppercase text-slate-600 block mb-1.5">
                          Rozet İkonu
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {([
                            { key: 'flame', label: 'Alev' },
                            { key: 'zap', label: 'Şimşek' },
                            { key: 'tag', label: 'Etiket' },
                            { key: 'sparkles', label: 'Yıldız' },
                            { key: 'percent', label: 'Yüzde' },
                            { key: 'gift', label: 'Hediye' },
                            { key: 'none', label: 'İkonsuz' },
                          ] as { key: BadgeIconKey; label: string }[]).map((ic) => (
                            <button
                              key={ic.key}
                              type="button"
                              onClick={() => setRozetIkonu(ic.key)}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                                rozetIkonu === ic.key
                                  ? 'border-brand-red bg-red-50 text-brand-red'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              {ic.key !== 'none' && <CampaignIcon icon={ic.key} size={12} />}
                              <span>{ic.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="font-display text-[11px] font-bold tracking-wider uppercase text-slate-600 block mb-1.5">
                          Ürün Detayı Kampanya Notu (İsteğe Bağlı)
                        </label>
                        <input
                          type="text"
                          maxLength={140}
                          value={vurguMetni}
                          onChange={(e) => setVurguMetni(e.target.value)}
                          placeholder="Örn: Kara Cuma'ya özel sınırlı stoklu büyük indirim!"
                          className="input-base text-sm py-2 bg-white"
                        />
                      </div>
                    </div>

                    {/* Checkbox Seçenekleri + Canlı Rozet Önizlemesi */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200">
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={yuzdeGoster}
                            onChange={(e) => setYuzdeGoster(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 accent-brand-red"
                          />
                          <span>Rozette % indirim oranını göster</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={urunSayfasindaSayac}
                            onChange={(e) => setUrunSayfasindaSayac(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 accent-brand-red"
                          />
                          <span>Ürün detayında geri sayım göster</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shrink-0">
                        <Eye size={13} className="text-slate-400" />
                        <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-400">
                          Kart Önizleme:
                        </span>
                        <CampaignBadge
                          kampanya={{
                            kampanya_tipi: 'ozel',
                            kampanya_adi: kampanyaAdi || 'Özel Kampanya',
                            kampanya_slug: slugifyCampaign(kampanyaAdi || 'ozel-kampanya'),
                            rozet_metni: rozetMetni || 'KARA CUMA',
                            rozet_rengi: rozetRengi,
                            rozet_ikonu: rozetIkonu,
                            yuzde_goster: yuzdeGoster,
                            urun_sayfasinda_sayac: urunSayfasindaSayac,
                          }}
                          discountPercent={20}
                          size="xs"
                        />
                      </div>
                    </div>

                    {/* Otomatik Banner / Kampanya Sayfası Linki */}
                    <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-wider text-slate-500">
                          <Link2 size={12} className="text-brand-red" />
                          <span>Otomatik Kampanya & Banner Linki</span>
                        </div>
                        <div className="font-mono text-xs font-bold text-slate-900 truncate mt-0.5">
                          /kampanya/{slugifyCampaign(kampanyaAdi || 'ozel-kampanya')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Aynı kampanya adıyla eklenen tüm ürünler bu linkte otomatik toplanır; Banner Yönetimi&apos;ne doğrudan yapıştırabilirsiniz.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          copyCampaignLink(
                            `/kampanya/${slugifyCampaign(kampanyaAdi || 'ozel-kampanya')}`,
                            'form-preview-link'
                          )
                        }
                        className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-display font-bold uppercase tracking-wider transition-colors"
                      >
                        {copiedKey === 'form-preview-link' ? (
                          <>
                            <Check size={13} className="text-emerald-400" /> Kopyalandı
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Linki Kopyala
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                        // TRY → currency moduna geçerken: TL tutarı ürünün para birimine çevir
                        if (priceInputMode === 'TRY' && indirimliFiyat && pb !== 'TRY') {
                          const tlNum = parseFloat(indirimliFiyat)
                          if (!isNaN(tlNum)) {
                            const rate = pb === 'USD' ? (kur?.USD || DEFAULT_KUR.USD) : (kur?.EUR || DEFAULT_KUR.EUR)
                            setIndirimliFiyat((tlNum / rate).toFixed(2))
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
                        // currency → TRY moduna geçerken: ürün para birimini TL'ye çevir
                        if (priceInputMode === 'currency' && indirimliFiyat) {
                          const valNum = parseFloat(indirimliFiyat)
                          if (!isNaN(valNum)) {
                            setIndirimliFiyat(Math.round(dovizToTL(valNum, pb, kur)).toString())
                          }
                        }
                        setPriceInputMode('TRY')
                      }}
                      className={`px-2 py-0.5 text-[10px] font-display font-bold uppercase rounded transition-all ${
                        priceInputMode === 'TRY'
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
        <div className="space-y-4">
          {/* Kampanya Tipi Filtre Hapları */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'tumu', label: `Tümü (${firsatlar.length})` },
              {
                key: 'sescim_haftasi',
                label: `Sescim Haftası (${firsatlar.filter((f) => (f.kampanya?.kampanya_tipi || 'sescim_haftasi') === 'sescim_haftasi').length})`,
              },
              {
                key: 'ozel',
                label: `Özel Kampanyalar (${firsatlar.filter((f) => f.kampanya?.kampanya_tipi === 'ozel').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setListFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition-all ${
                  listFilter === tab.key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {firsatlar
            .filter((f) => {
              const tip = f.kampanya?.kampanya_tipi || 'sescim_haftasi'
              if (listFilter === 'tumu') return true
              return tip === listFilter
            })
            .map(firsat => {
            const isGecmis = new Date(firsat.bitis_tarihi).getTime() < Date.now()
            const isBaslamadi = new Date(firsat.baslangic_tarihi).getTime() > Date.now()
            const kampanyaMeta = normalizeFlashMeta(firsat.kampanya)
            
            const u = firsat.urun
            const pCurr = u?.para_birimi || 'TRY'
            const rawOri = u?.sescim_fiyat ?? u?.fiyat ?? 0
            const oriTL = dovizToTL(rawOri, pCurr, kur)
            const indirimPB = (firsat as any).fiyat_para_birimi || pCurr
            const indirimTL = dovizToTL(firsat.indirimli_fiyat, indirimPB, kur)
            const indirimOrani = oriTL > indirimTL ? Math.round(((oriTL - indirimTL) / oriTL) * 100) : null

            return (
              <div key={firsat.id} className={`bg-white border rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm ${
                firsat.aktif && !isGecmis ? 'border-brand-red/30' : 'border-slate-200 opacity-70'
              }`}>
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CampaignBadge kampanya={kampanyaMeta} discountPercent={indirimOrani} size="xs" />
                      <span className="text-[10px] font-semibold text-slate-500">
                        {kampanyaMeta.kampanya_tipi === 'sescim_haftasi'
                          ? 'Sescim Haftası Vitrini'
                          : `Özel • ${kampanyaMeta.kampanya_adi}`}
                      </span>
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
                        Orijinal: {rawOri} {pCurr} → İndirimli: <strong>{firsat.indirimli_fiyat} {indirimPB}</strong>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2"><Clock size={12} /> Bitiş: {new Date(firsat.bitis_tarihi).toLocaleString('tr-TR')}</div>
                    {(() => {
                      const campaignPath =
                        kampanyaMeta.kampanya_tipi === 'sescim_haftasi'
                          ? '/firsatlar'
                          : `/kampanya/${kampanyaMeta.kampanya_slug}`
                      return (
                        <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 mt-2">
                          <span className="font-mono text-[11px] text-slate-700 truncate" title={campaignPath}>
                            {campaignPath}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => copyCampaignLink(campaignPath, firsat.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200 hover:border-brand-red hover:text-brand-red text-[10px] font-display font-bold uppercase text-slate-600 transition-colors"
                              title="Banner için linki kopyala"
                            >
                              {copiedKey === firsat.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                              <span>{copiedKey === firsat.id ? 'Kopyalandı' : 'Kopyala'}</span>
                            </button>
                            <a
                              href={campaignPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded bg-white border border-slate-200 hover:border-brand-red hover:text-brand-red text-slate-500 transition-colors"
                              title="Kampanya sayfasını aç"
                            >
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openEditFirsat(firsat)}
                    className="btn-outline px-3 py-1.5 text-[11px] rounded-lg inline-flex items-center gap-1"
                    title="Kampanya tipini veya rozetini düzenle"
                  >
                    <Pencil size={12} /> Düzenle
                  </button>
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
          {firsatlar.filter((f) => {
            const tip = f.kampanya?.kampanya_tipi || 'sescim_haftasi'
            return listFilter === 'tumu' ? true : tip === listFilter
          }).length === 0 && (
            <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <Zap size={32} className="mx-auto mb-2 opacity-40 text-brand-red" />
              {listFilter === 'ozel'
                ? 'Henüz özelleştirilebilir kampanya eklenmemiş. "Yeni Fırsat Ekle" ile Kara Cuma, Yılbaşı vb. kampanyalar oluşturabilirsiniz.'
                : listFilter === 'sescim_haftasi'
                  ? 'Henüz Sescim Haftası fırsatı eklenmemiş.'
                  : 'Henüz flaş indirim eklenmemiş. "Yeni Fırsat Ekle" butonu ile ekleyebilirsiniz.'}
            </div>
          )}
          </div>
        </div>
      ) : (
        /* OUTLET LİSTESİ */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outletList.map(item => {
            const u = item.urun
            const pCurr = u?.para_birimi || 'TRY'
            const rawOri = u?.sescim_fiyat ?? u?.fiyat ?? 0
            const oriTL = dovizToTL(rawOri, pCurr, kur)
            // fiyat_para_birimi: outlet fiyatının hangi para birimiyle kaydedildiği
            const outletPB = (item as any).fiyat_para_birimi || pCurr
            const outletTL = dovizToTL(item.outlet_fiyat, outletPB, kur)

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
                        Orijinal: {rawOri} {pCurr} → Outlet: <strong>{item.outlet_fiyat} {outletPB}</strong>
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

      {/* Kampanya / Rozet Düzenleme Modalı */}
      {editingFirsat && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="font-display font-black text-sm uppercase tracking-wider text-slate-900">
                  Kampanya & Rozet Düzenle
                </h3>
                <p className="text-xs text-slate-500 truncate mt-0.5">{editingFirsat.urun?.ad}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingFirsat(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setEditMeta({ ...DEFAULT_SESCIM_HAFTASI_META })}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  editMeta.kampanya_tipi === 'sescim_haftasi'
                    ? 'border-brand-red bg-red-50/60'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-display font-black text-xs uppercase text-slate-900 flex items-center gap-1.5">
                  <Zap size={14} className="text-brand-red" /> Sescim Haftası
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  setEditMeta(
                    editMeta.kampanya_tipi === 'ozel'
                      ? editMeta
                      : normalizeFlashMeta({ kampanya_tipi: 'ozel', ...CUSTOM_CAMPAIGN_PRESETS[0].meta })
                  )
                }
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  editMeta.kampanya_tipi === 'ozel'
                    ? 'border-slate-900 bg-slate-900/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-display font-black text-xs uppercase text-slate-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" /> Özel Kampanya
                </div>
              </button>
            </div>

            {editMeta.kampanya_tipi === 'ozel' && (
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex flex-wrap gap-1.5">
                  {CUSTOM_CAMPAIGN_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() =>
                        setEditMeta(normalizeFlashMeta({ kampanya_tipi: 'ozel', ...preset.meta }))
                      }
                      className="px-2 py-1 rounded bg-white border border-slate-200 hover:border-brand-red text-[10px] font-display font-bold text-slate-700"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-display text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Kampanya Adı
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={editMeta.kampanya_adi}
                      onChange={(e) =>
                        setEditMeta((prev) => ({
                          ...prev,
                          kampanya_adi: e.target.value,
                          kampanya_slug: slugifyCampaign(e.target.value),
                        }))
                      }
                      className="input-base text-xs py-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-display text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Rozet Metni
                    </label>
                    <input
                      type="text"
                      maxLength={28}
                      value={editMeta.rozet_metni}
                      onChange={(e) => setEditMeta((prev) => ({ ...prev, rozet_metni: e.target.value }))}
                      className="input-base text-xs py-2 bg-white uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-display text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Rozet Rengi
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(BADGE_COLOR_THEMES) as BadgeColorKey[]).map((ck) => (
                      <button
                        key={ck}
                        type="button"
                        onClick={() => setEditMeta((prev) => ({ ...prev, rozet_rengi: ck }))}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold ${
                          editMeta.rozet_rengi === ck
                            ? 'border-slate-900 bg-white text-slate-900'
                            : 'border-slate-200 bg-white/70 text-slate-600'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${BADGE_COLOR_THEMES[ck].swatchClass}`} />
                        <span>{BADGE_COLOR_THEMES[ck].label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-display text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Rozet İkonu
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['flame', 'zap', 'tag', 'sparkles', 'percent', 'gift', 'none'] as BadgeIconKey[]).map((ik) => (
                      <button
                        key={ik}
                        type="button"
                        onClick={() => setEditMeta((prev) => ({ ...prev, rozet_ikonu: ik }))}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold ${
                          editMeta.rozet_ikonu === ik
                            ? 'border-brand-red bg-red-50 text-brand-red'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {ik !== 'none' && <CampaignIcon icon={ik} size={11} />}
                        <span>{ik === 'none' ? 'İkonsuz' : ik}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-display text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Ürün Detay Notu
                  </label>
                  <input
                    type="text"
                    maxLength={140}
                    value={editMeta.vurgu_metni || ''}
                    onChange={(e) => setEditMeta((prev) => ({ ...prev, vurgu_metni: e.target.value }))}
                    className="input-base text-xs py-2 bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editMeta.yuzde_goster}
                        onChange={(e) => setEditMeta((prev) => ({ ...prev, yuzde_goster: e.target.checked }))}
                        className="accent-brand-red"
                      />
                      <span>% Oran</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editMeta.urun_sayfasinda_sayac}
                        onChange={(e) => setEditMeta((prev) => ({ ...prev, urun_sayfasinda_sayac: e.target.checked }))}
                        className="accent-brand-red"
                      />
                      <span>Detayda Sayaç</span>
                    </label>
                  </div>
                  <CampaignBadge kampanya={editMeta} discountPercent={20} size="xs" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingFirsat(null)}
                className="btn-outline text-xs py-2 px-4 rounded-lg"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={editSaving}
                onClick={handleSaveEditKampanya}
                className="btn-primary text-xs py-2 px-5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Değişiklikleri Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
