'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Zap, Tag, Plus, Trash2, Loader2, Check, Clock, AlertCircle, Search, ShieldCheck, Box } from 'lucide-react'

interface Urun {
  id: string
  ad: string
  fiyat: number
}

interface Firsat {
  id: string
  urun_id: string
  indirimli_fiyat: number
  baslangic_tarihi: string
  bitis_tarihi: string
  aktif: boolean
  urun: Urun
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
  const supabase = useRef(createClient()).current

  // Form states - Fırsat
  const [urunId, setUrunId] = useState('')
  const [indirimliFiyat, setIndirimliFiyat] = useState('')
  const [baslangic, setBaslangic] = useState('')
  const [bitis, setBitis] = useState('')

  // Form states - Outlet
  const [outletDurum, setOutletDurum] = useState('Teşhir Ürünü - 1 Yıl Distribütör Garantili')
  const [outletStok, setOutletStok] = useState('1')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [firsatlarRes, outletRes, urunlerRes] = await Promise.all([
      supabase.from('flas_indirimler').select('*, urun:urunler(id, ad, fiyat)').order('created_at', { ascending: false }),
      supabase.from('outlet_urunler').select('*').order('created_at', { ascending: false }),
      supabase.from('urunler').select('id, ad, fiyat').order('ad')
    ])

    const allUrunler: Urun[] = urunlerRes.data || []
    setUrunler(allUrunler)
    setFirsatlar(firsatlarRes.data || [])

    // Outlet ürünlerini eşleştir
    const outletsWithUrun = (outletRes.data || []).map((o: any) => ({
      ...o,
      urun: allUrunler.find(u => u.id === o.urun_id) || { id: o.urun_id, ad: 'Ürün Adı Bulunamadı', fiyat: o.outlet_fiyat }
    }))
    setOutletList(outletsWithUrun)
    setLoading(false)
  }

  const handleSaveFirsat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urunId || !indirimliFiyat || !baslangic || !bitis) {
      setError('Tüm alanları doldurunuz.')
      return
    }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('flas_indirimler').insert({
      urun_id: urunId,
      indirimli_fiyat: parseFloat(indirimliFiyat),
      baslangic_tarihi: baslangic,
      bitis_tarihi: bitis,
      aktif: true
    })
    
    if (err) {
      setError(err.message)
    } else {
      setShowForm(false)
      setUrunId(''); setIndirimliFiyat(''); setBaslangic(''); setBitis('')
      loadData()
    }
    setSaving(false)
  }

  const handleSaveOutlet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urunId || !indirimliFiyat) {
      setError('Lütfen ürün ve outlet fiyatını giriniz.')
      return
    }
    setSaving(true)
    setError('')

    const { error: err } = await supabase.from('outlet_urunler').insert({
      urun_id: urunId,
      outlet_fiyat: parseFloat(indirimliFiyat),
      durum_aciklamasi: outletDurum,
      stok_adedi: parseInt(outletStok) || 1,
      aktif: true
    })

    // sescim_fiyatlar tablosuna da yansıt
    try {
      await supabase.from('sescim_fiyatlar').upsert({
        urun_id: urunId,
        sescim_indirimli_fiyat: parseFloat(indirimliFiyat),
        is_outlet: true,
        outlet_durum: outletDurum,
        sescim_aktif: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'urun_id' })
    } catch {}

    if (err) {
      setError(err.message)
    } else {
      setShowForm(false)
      setUrunId(''); setIndirimliFiyat('')
      loadData()
    }
    setSaving(false)
  }

  const toggleAktifFirsat = async (id: string, currentStatus: boolean) => {
    await supabase.from('flas_indirimler').update({ aktif: !currentStatus }).eq('id', id)
    loadData()
  }

  const deleteFirsat = async (id: string) => {
    if (!confirm('Bu fırsatı silmek istediğinize emin misiniz?')) return
    await supabase.from('flas_indirimler').delete().eq('id', id)
    loadData()
  }

  const toggleAktifOutlet = async (id: string, currentStatus: boolean, urun_id: string) => {
    await supabase.from('outlet_urunler').update({ aktif: !currentStatus }).eq('id', id)
    try {
      await supabase.from('sescim_fiyatlar').update({ is_outlet: !currentStatus }).eq('urun_id', urun_id)
    } catch {}
    loadData()
  }

  const deleteOutlet = async (id: string, urun_id: string) => {
    if (!confirm('Bu outlet ürününü silmek istediğinize emin misiniz?')) return
    await supabase.from('outlet_urunler').delete().eq('id', id)
    try {
      await supabase.from('sescim_fiyatlar').update({ is_outlet: false }).eq('urun_id', urun_id)
    } catch {}
    loadData()
  }

  const filteredUrunler = urunler.filter(u => 
    !searchTerm.trim() || u.ad.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 100)

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
          onClick={() => { setShowForm(!showForm); setError('') }} 
          className="flex items-center gap-2 bg-brand-red text-white px-5 py-2.5 rounded-lg font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all shadow-sm"
        >
          <Plus size={14} /> {activeSubTab === 'firsatlar' ? 'Yeni Fırsat Ekle' : 'Yeni Outlet Ekle'}
        </button>
      </div>

      {/* Form Alanı */}
      {showForm && (
        <form onSubmit={activeSubTab === 'firsatlar' ? handleSaveFirsat : handleSaveOutlet} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <h3 className="font-display font-bold text-sm uppercase tracking-widest text-slate-900">
            {activeSubTab === 'firsatlar' ? 'Yeni Flaş İndirim Oluştur' : 'Yeni Outlet / Teşhir Ürünü Ekle'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ürün Arama ve Seçimi */}
            <div className="sm:col-span-2 space-y-2">
              <label className="font-display text-xs tracking-widest uppercase text-slate-500 block">Ürün Arayın ve Seçin</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ürün adı yazarak filtreleyin..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="input-base pl-9 text-sm py-2 mb-2"
                />
              </div>
              <select 
                value={urunId} 
                onChange={e => {
                  setUrunId(e.target.value)
                  const selected = urunler.find(u => u.id === e.target.value)
                  if (selected && selected.fiyat) {
                    // Varsayılan %15 indirim öner
                    setIndirimliFiyat((selected.fiyat * 0.85).toFixed(2))
                  }
                }}
                className="input-base text-sm"
              >
                <option value="">-- Ürün Seçiniz ({filteredUrunler.length} sonuç) --</option>
                {filteredUrunler.map(u => (
                  <option key={u.id} value={u.id}>{u.ad} (Orijinal: ₺{u.fiyat})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-display text-xs tracking-widest uppercase text-slate-500 block mb-2">
                {activeSubTab === 'firsatlar' ? 'Flaş İndirimli Fiyat (TL)' : 'Outlet Satış Fiyatı (TL)'}
              </label>
              <input 
                type="number" 
                step="0.01" 
                value={indirimliFiyat} 
                onChange={e => setIndirimliFiyat(e.target.value)} 
                placeholder="0.00"
                className="input-base text-sm" 
              />
            </div>

            {activeSubTab === 'firsatlar' ? (
              <>
                <div>
                  <label className="font-display text-xs tracking-widest uppercase text-slate-500 block mb-2">Başlangıç Tarihi</label>
                  <input type="datetime-local" value={baslangic} onChange={e => setBaslangic(e.target.value)} className="input-base text-sm" />
                </div>
                <div>
                  <label className="font-display text-xs tracking-widest uppercase text-slate-500 block mb-2">Bitiş Tarihi (Geri Sayım)</label>
                  <input type="datetime-local" value={bitis} onChange={e => setBitis(e.target.value)} className="input-base text-sm" />
                </div>
              </>
            ) : (
              <>
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
                  
                  <div className="flex items-end gap-3 mb-4">
                    <div className="text-2xl font-black font-display text-brand-red">₺{firsat.indirimli_fiyat}</div>
                    <div className="text-sm text-slate-400 line-through mb-1">₺{firsat.urun?.fiyat}</div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-2"><Clock size={12} /> Bitiş: {new Date(firsat.bitis_tarihi).toLocaleString('tr-TR')}</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button onClick={() => toggleAktifFirsat(firsat.id, firsat.aktif)} className="btn-outline flex-1 py-1.5 text-[11px] rounded-lg">
                    {firsat.aktif ? 'Yayından Kaldır' : 'Yayına Al'}
                  </button>
                  <button onClick={() => deleteFirsat(firsat.id)} className="px-3 border border-slate-200 text-slate-400 hover:text-brand-red rounded-lg">
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
          {outletList.map(item => (
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
                
                <div className="flex items-end gap-3 mb-2">
                  <div className="text-2xl font-black font-display text-emerald-600">₺{item.outlet_fiyat}</div>
                  {item.urun?.fiyat && item.urun.fiyat > item.outlet_fiyat && (
                    <div className="text-sm text-slate-400 line-through mb-1">₺{item.urun.fiyat}</div>
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
          ))}
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
