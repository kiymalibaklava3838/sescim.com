'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Tag, Plus, Trash2, Check, AlertCircle, Loader2, RefreshCw, Copy } from 'lucide-react'

interface Kupon {
  id: string
  kod: string
  indirim_tipi: 'yuzde' | 'sabit'
  indirim_miktari: number
  min_tutar: number | null
  max_kullanim: number | null
  kullanim_sayisi: number
  gecerlilik_tarihi: string | null
  aktif: boolean
  created_at: string
}

export default function AdminKuponYonetim() {
  const [kuponlar, setKuponlar] = useState<Kupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  // Form
  const [kod, setKod] = useState('')
  const [indirimTipi, setIndirimTipi] = useState<'yuzde' | 'sabit'>('yuzde')
  const [miktar, setMiktar] = useState('')
  const [minTutar, setMinTutar] = useState('')
  const [maxKullanim, setMaxKullanim] = useState('')
  const [gecerlilik, setGecerlilik] = useState('')
  const supabase = useRef(createClient()).current

  useEffect(() => { loadKuponlar() }, [])

  const loadKuponlar = async () => {
    setLoading(true)
    const { data } = await supabase.from('kuponlar').select('id, kod, indirim_tipi, indirim_miktari, min_tutar, max_kullanim, kullanim_sayisi, aktif, gecerlilik_tarihi, created_at').order('created_at', { ascending: false })
    setKuponlar(data || [])
    setLoading(false)
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setKod(code)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kod || !miktar) { setError('Kupon kodu ve indirim miktarı zorunludur.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('kuponlar').insert({
      kod: kod.toUpperCase(),
      indirim_tipi: indirimTipi,
      indirim_miktari: parseFloat(miktar),
      min_tutar: minTutar ? parseFloat(minTutar) : null,
      max_kullanim: maxKullanim ? parseInt(maxKullanim) : null,
      gecerlilik_tarihi: gecerlilik || null,
      aktif: true,
      kullanim_sayisi: 0,
    })
    if (err) {
      setError(err.message.includes('duplicate') ? 'Bu kupon kodu zaten mevcut.' : err.message)
    } else {
      setMessage('Kupon oluşturuldu!')
      setKod(''); setMiktar(''); setMinTutar(''); setMaxKullanim(''); setGecerlilik('')
      setShowForm(false)
      loadKuponlar()
      setTimeout(() => setMessage(''), 3000)
    }
    setSaving(false)
  }

  const toggleAktif = async (kupon: Kupon) => {
    await supabase.from('kuponlar').update({ aktif: !kupon.aktif }).eq('id', kupon.id)
    loadKuponlar()
  }

  const deleteKupon = async (id: string) => {
    if (!confirm('Bu kuponu silmek istediğinize emin misiniz?')) return
    await supabase.from('kuponlar').delete().eq('id', id)
    loadKuponlar()
  }

  const copyCode = (kod: string) => navigator.clipboard.writeText(kod)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Promosyon</span>
          </div>
          <h2 className="font-display font-black text-2xl uppercase text-slate-900">Kupon Yönetimi</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={loadKuponlar} className="flex items-center gap-2 border border-slate-300 text-slate-900/50 hover:border-brand-red/30 hover:text-slate-900 px-4 py-2 font-display text-xs tracking-widest uppercase transition-all">
            <RefreshCw size={14} /> Yenile
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-brand-red text-white px-4 py-2 font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all shadow-sm">
            <Plus size={14} /> Yeni Kupon
          </button>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 text-green-600 bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm font-body rounded-sm">
          <Check size={14} /> {message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 p-6 space-y-4 shadow-sm">
          <h3 className="font-display font-bold text-sm uppercase tracking-widest text-slate-900">Yeni Kupon Oluştur</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-display text-xs tracking-widest uppercase text-slate-900/50 block mb-2">Kupon Kodu</label>
              <div className="flex gap-2">
                <input type="text" value={kod} onChange={e => setKod(e.target.value.toUpperCase())} placeholder="KODU_GIRINIZ"
                  className="flex-1 bg-white border border-slate-200 text-slate-900 px-4 py-3 text-sm font-body focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/20" />
                <button type="button" onClick={generateCode}
                  className="px-3 bg-slate-50 border border-slate-200 text-slate-900/50 hover:text-slate-900 font-display text-xs uppercase tracking-wider transition-all">
                  Oto
                </button>
              </div>
            </div>
            <div>
              <label className="font-display text-xs tracking-widest uppercase text-slate-900/50 block mb-2">İndirim Tipi</label>
              <select value={indirimTipi} onChange={e => setIndirimTipi(e.target.value as 'yuzde' | 'sabit')}
                className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-3 text-sm font-body focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/20">
                <option value="yuzde">Yüzde (%)</option>
                <option value="sabit">Sabit Tutar (TL)</option>
              </select>
            </div>
            <div>
              <label className="font-display text-xs tracking-widest uppercase text-slate-900/50 block mb-2">İndirim Miktarı</label>
              <input type="number" value={miktar} onChange={e => setMiktar(e.target.value)} placeholder={indirimTipi === 'yuzde' ? '10 (%)' : '50 (TL)'}
                className="input-base" />
            </div>
            <div>
              <label className="font-display text-xs tracking-widest uppercase text-slate-900/50 block mb-2">Min. Sipariş Tutarı (TL)</label>
              <input type="number" value={minTutar} onChange={e => setMinTutar(e.target.value)} placeholder="0 (isteğe bağlı)"
                className="input-base" />
            </div>
            <div>
              <label className="font-display text-xs tracking-widest uppercase text-slate-900/50 block mb-2">Maks. Kullanım</label>
              <input type="number" value={maxKullanim} onChange={e => setMaxKullanim(e.target.value)} placeholder="Sınırsız (isteğe bağlı)"
                className="input-base" />
            </div>
            <div>
              <label className="font-display text-xs tracking-widest uppercase text-slate-900/50 block mb-2">Geçerlilik Tarihi</label>
              <input type="date" value={gecerlilik} onChange={e => setGecerlilik(e.target.value)}
                className="input-base" />
            </div>
          </div>
          {error && <div className="flex items-center gap-2 text-red-600 text-sm font-body"><AlertCircle size={14} /> {error}</div>}
          <div className="flex gap-3">
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

      {/* Kupon Listesi */}
      {loading ? (
        <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-slate-200 border-t-brand-red rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {kuponlar.map(kupon => (
            <div key={kupon.id} className={`bg-white border p-4 flex items-center gap-4 shadow-sm transition-opacity ${
              kupon.aktif ? 'border-slate-200' : 'border-slate-200 opacity-50'
            }`}>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-display font-black text-lg text-slate-900 tracking-widest">{kupon.kod}</span>
                  <button onClick={() => copyCode(kupon.kod)} className="text-slate-900/30 hover:text-slate-900 transition-colors">
                    <Copy size={14} />
                  </button>
                  <span className={`font-display font-bold text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-sm ${
                    kupon.aktif ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {kupon.aktif ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs font-body text-slate-500">
                  <span>{kupon.indirim_tipi === 'yuzde' ? `%${kupon.indirim_miktari}` : `${kupon.indirim_miktari} TL`} indirim</span>
                  {kupon.min_tutar && <span>Min. {kupon.min_tutar} TL</span>}
                  <span>{kupon.kullanim_sayisi}{kupon.max_kullanim ? `/${kupon.max_kullanim}` : ''} kullanım</span>
                  {kupon.gecerlilik_tarihi && <span>Son: {new Date(kupon.gecerlilik_tarihi).toLocaleDateString('tr-TR')}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleAktif(kupon)}
                  className={`px-3 py-1.5 font-display text-[10px] tracking-widest uppercase border transition-all rounded-sm ${
                    kupon.aktif
                      ? 'border-slate-200 text-slate-500 hover:border-red-500/30 hover:text-red-600'
                      : 'border-green-500/20 text-green-600 hover:bg-green-500/10'
                  }`}>
                  {kupon.aktif ? 'Pasifleştir' : 'Aktifleştir'}
                </button>
                <button onClick={() => deleteKupon(kupon.id)}
                  className="w-8 h-8 flex items-center justify-center border border-slate-200 text-slate-900/30 hover:border-red-500/30 hover:text-red-600 transition-all rounded-sm">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {kuponlar.length === 0 && (
            <div className="py-12 text-center text-slate-900/30 font-body">
              <Tag size={32} className="mx-auto mb-3 opacity-30" />
              Henüz kupon oluşturulmamış
            </div>
          )}
        </div>
      )}
    </div>
  )
}
