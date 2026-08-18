'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Zap, Plus, Trash2, Loader2, Check, Clock, AlertCircle } from 'lucide-react'

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

export default function AdminFirsatYonetimi() {
  const [firsatlar, setFirsatlar] = useState<Firsat[]>([])
  const [urunler, setUrunler] = useState<Urun[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = useRef(createClient()).current

  // Form states
  const [urunId, setUrunId] = useState('')
  const [indirimliFiyat, setIndirimliFiyat] = useState('')
  const [baslangic, setBaslangic] = useState('')
  const [bitis, setBitis] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [firsatlarRes, urunlerRes] = await Promise.all([
      supabase.from('flas_indirimler').select('*, urun:urunler(id, ad, fiyat)').order('created_at', { ascending: false }),
      supabase.from('urunler').select('id, ad, fiyat').order('ad')
    ])
    setFirsatlar(firsatlarRes.data || [])
    setUrunler(urunlerRes.data || [])
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
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

  const toggleAktif = async (id: string, currentStatus: boolean) => {
    await supabase.from('flas_indirimler').update({ aktif: !currentStatus }).eq('id', id)
    loadData()
  }

  const deleteFirsat = async (id: string) => {
    if (!confirm('Bu fırsatı silmek istediğinize emin misiniz?')) return
    await supabase.from('flas_indirimler').delete().eq('id', id)
    loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Kampanya</span>
          </div>
          <h2 className="font-display font-black text-2xl uppercase text-slate-900">Flaş İndirimler</h2>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-brand-red text-white px-4 py-2 font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all shadow-sm">
          <Plus size={14} /> Yeni Fırsat
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 p-6 space-y-4 shadow-sm">
          <h3 className="font-display font-bold text-sm uppercase tracking-widest text-slate-900">Yeni Flaş İndirim Ekle</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="font-display text-xs tracking-widest uppercase text-slate-900/50 block mb-2">Ürün Seçin</label>
              <select value={urunId} onChange={e => setUrunId(e.target.value)}
                className="input-base">
                <option value="">-- Seçiniz --</option>
                {urunler.map(u => <option key={u.id} value={u.id}>{u.ad} (₺{u.fiyat})</option>)}
              </select>
            </div>
            <div>
              <label className="font-display text-xs tracking-widest uppercase text-slate-900/50 block mb-2">İndirimli Fiyat (TL)</label>
              <input type="number" step="0.01" value={indirimliFiyat} onChange={e => setIndirimliFiyat(e.target.value)} placeholder="0.00"
                className="input-base" />
            </div>
            <div className="hidden lg:block"></div> {/* Boşluk */}
            <div>
              <label className="font-display text-xs tracking-widest uppercase text-slate-900/50 block mb-2">Başlangıç Tarihi</label>
              <input type="datetime-local" value={baslangic} onChange={e => setBaslangic(e.target.value)}
                className="input-base" />
            </div>
            <div>
              <label className="font-display text-xs tracking-widest uppercase text-slate-900/50 block mb-2">Bitiş Tarihi</label>
              <input type="datetime-local" value={bitis} onChange={e => setBitis(e.target.value)}
                className="input-base" />
            </div>
          </div>
          {error && <div className="flex items-center gap-2 text-red-600 text-sm font-body"><AlertCircle size={14} /> {error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-brand-red text-white px-6 py-3 font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Kaydet
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-6 py-3 border border-slate-200 text-slate-900/50 hover:text-slate-900 font-display text-xs uppercase tracking-wider transition-all">
              İptal
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-slate-200 border-t-brand-red rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {firsatlar.map(firsat => {
            const isGecmis = new Date(firsat.bitis_tarihi).getTime() < Date.now()
            const isBaslamadi = new Date(firsat.baslangic_tarihi).getTime() > Date.now()
            
            return (
              <div key={firsat.id} className={`bg-white border p-5 flex flex-col justify-between gap-4 shadow-sm transition-opacity ${
                firsat.aktif && !isGecmis ? 'border-brand-red/30' : 'border-slate-200 opacity-70'
              }`}>
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-brand-red">
                      <Zap size={16} className={firsat.aktif && !isGecmis ? 'animate-pulse' : 'text-slate-900/30'} />
                      <span className="font-display font-bold text-[10px] tracking-widest uppercase">Flaş İndirim</span>
                    </div>
                    <div className="flex gap-2">
                      <span className={`font-display font-bold text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-sm ${
                        !firsat.aktif ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                        isGecmis ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                        isBaslamadi ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' :
                        'bg-green-500/10 text-green-600 border border-green-500/20'
                      }`}>
                        {!firsat.aktif ? 'Pasif' : isGecmis ? 'Süresi Doldu' : isBaslamadi ? 'Bekliyor' : 'Aktif'}
                      </span>
                    </div>
                  </div>
                  
                  <h4 className="font-bold text-slate-900 text-sm mb-2 line-clamp-1">{firsat.urun?.ad || 'Bilinmeyen Ürün'}</h4>
                  
                  <div className="flex items-end gap-3 mb-4">
                    <div className="text-2xl font-black font-display text-slate-900">₺{firsat.indirimli_fiyat}</div>
                    <div className="text-sm text-slate-900/30 line-through mb-1">₺{firsat.urun?.fiyat}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-900/50 font-body">
                      <Clock size={12} />
                      Başlama: {new Date(firsat.baslangic_tarihi).toLocaleString('tr-TR')}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-900/50 font-body">
                      <Clock size={12} className={!isGecmis && firsat.aktif ? 'text-brand-red' : ''} />
                      Bitiş: {new Date(firsat.bitis_tarihi).toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button onClick={() => toggleAktif(firsat.id, firsat.aktif)}
                    className={`flex-1 py-2 font-display text-[10px] tracking-widest uppercase border transition-all rounded-sm ${
                      firsat.aktif
                        ? 'border-slate-200 text-slate-500 hover:border-red-500/30 hover:text-red-600'
                        : 'border-green-500/20 text-green-600 hover:bg-green-500/10'
                    }`}>
                    {firsat.aktif ? 'Pasifleştir' : 'Aktifleştir'}
                  </button>
                  <button onClick={() => deleteFirsat(firsat.id)}
                    className="w-10 flex items-center justify-center border border-slate-200 text-slate-900/30 hover:border-red-500/30 hover:text-red-600 transition-all rounded-sm">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {!loading && firsatlar.length === 0 && (
        <div className="py-12 text-center text-slate-900/30 font-body border border-slate-200 bg-slate-50 shadow-sm">
          <Zap size={32} className="mx-auto mb-3 opacity-30" />
          Henüz flaş indirim bulunmuyor.
        </div>
      )}
    </div>
  )
}
