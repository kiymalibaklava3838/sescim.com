'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Upload, Plus, X, Check, AlertCircle, Tag, ChevronRight } from 'lucide-react'
import { PARA_BIRIMLERI } from '@/lib/kur'
import { compressImage, formatFileSize } from './ImageCompressor'
import { NEW_KATEGORI_HIYERARSI, type CategoryNode } from '@/lib/categories'

interface FileEntry {
  file: File
  preview: string
  originalSize: number
  compressedSize?: number
  compressing: boolean
}

interface Props { 
  onAdded?: () => void;
  initialData?: {
    ad?: string;
    kod?: string;
    fiyat?: string;
    paraBirimi?: string;
    stokAdedi?: string;
    taslakId?: string;
    aciklama?: string;
  }
}

export default function AdminAddProduct({ onAdded, initialData }: Props) {
  const [ad, setAd] = useState(initialData?.ad || '')
  const [aciklama, setAciklama] = useState(initialData?.aciklama || '')
  
  // 3 seviyeli kategori state (Index yerine direkt isim/slug tutmak daha sağlam olabilir)
  const [anaCat, setAnaCat] = useState<CategoryNode | null>(NEW_KATEGORI_HIYERARSI[0])
  const [altCat, setAltCat] = useState<CategoryNode | null>(null)
  const [detayCat, setDetayCat] = useState<CategoryNode | null>(null)

  const [fiyat, setFiyat] = useState(initialData?.fiyat || '')
  const [bayi_fiyati, setBayiF] = useState('')
  const [sescim_fiyat, setSescimFiyat] = useState('')
  const [sescim_indirimli_fiyat, setSescimIndirimli] = useState('')
  const [is_featured, setIsFeatured] = useState(false)
  const [stok, setStok] = useState('stokta')
  const [paraBirimi, setParaBirimi] = useState(initialData?.paraBirimi || 'USD')
  const [bayiParaBirimi, setBayiParaBirimi] = useState('USD')
  const [marka, setMarka] = useState('')
  const [modelKodu, setModelKodu] = useState(initialData?.kod || '')
  const [kullanimAlani, setKullanimAlani] = useState('')
  const [stokAdedi, setStokAdedi] = useState(initialData?.stokAdedi || '0')
  const [kritikStok, setKritikStok] = useState('5')
  const [taslakId] = useState(initialData?.taslakId || null)
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [existingMarkalar, setExistingMarkalar] = useState<string[]>([])
  const [existingAlanlar, setExistingAlanlar] = useState<string[]>([])
  const [showMarkaSuggestions, setShowMarkaSuggestions] = useState(false)
  const [showAlanSuggestions, setShowAlanSuggestions] = useState(false)
  const [suggestedImages, setSuggestedImages] = useState<string[]>([])
  const [isScraping, setIsScraping] = useState(false)

  const fetchSuggestedImages = async () => {
    const query = `${marka} ${modelKodu} ${ad}`.trim()
    if (!query || query.length < 3) return
    setIsScraping(true)
    setSuggestedImages([])
    try {
      const res = await fetch('/api/scrape-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      const data = await res.json()
      if (data.images) setSuggestedImages(data.images)
    } catch (e) {
      console.error(e)
    }
    setIsScraping(false)
  }

  const addSuggestedImage = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `suggested-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
      const preview = URL.createObjectURL(file);
      setEntries(p => [...p, { file, preview, originalSize: file.size, compressing: false }]);
      setSuggestedImages(p => p.filter(i => i !== url));
    } catch (e) {
      console.error('Failed to add image', e);
      alert('Görsel eklenirken hata oluştu (CORS kısıtlaması olabilir). Lütfen resmi manuel indirip yükleyin.');
    }
  }

  // Önerileri kullanıcı yazdıkça (on-demand) çekiyoruz - Optimizasyon: Büyük veri çekimi kaldırıldı.
  const fetchMarkaSuggestions = async (val: string) => {
    if (val.length < 2) return
    const supabase = createClient()
    const { data } = await supabase.from('urunler').select('marka').ilike('marka', `%${val}%`).limit(10)
    if (data) setExistingMarkalar(Array.from(new Set(data.map((x: any) => x.marka).filter(Boolean))))
  }

  const fetchAlanSuggestions = async (val: string) => {
    if (val.length < 2) return
    const supabase = createClient()
    const { data } = await supabase.from('urunler').select('kullanim_alani').ilike('kullanim_alani', `%${val}%`).limit(10)
    if (data) setExistingAlanlar(Array.from(new Set(data.map((x: any) => x.kullanim_alani).filter(Boolean))))
  }

  // Hiyerarşi seçenekleri
  const altKategoriler = anaCat?.children || []
  const detaylar = altCat?.children || []

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    for (const file of selected.slice(0, 10 - entries.length)) {
      if (file.size > 20 * 1024 * 1024) { setError(`"${file.name}" max 20MB.`); continue }
      const preview = URL.createObjectURL(file)
      setEntries(p => [...p, { file, preview, originalSize: file.size, compressing: true }])
      const compressed = await compressImage(file)
      setEntries(p => p.map(e => e.preview === preview
        ? { ...e, file: compressed, compressedSize: compressed.size, compressing: false }
        : e))
    }
    e.target.value = ''
  }

  const removeFile = (preview: string) => {
    setEntries(p => { const e = p.find(x => x.preview === preview); if (e) URL.revokeObjectURL(e.preview); return p.filter(x => x.preview !== preview) })
  }

  const handleSubmit = async () => {
    if (!ad.trim() || !aciklama.trim()) { setError('Ürün adı ve açıklama zorunludur.'); return }
    if (!fiyat || isNaN(parseFloat(fiyat))) { setError('Geçerli bir fiyat girin.'); return }
    if (!anaCat) { setError('En az bir ana kategori seçmelisiniz.'); return }
    
    setLoading(true); setError('')

    const supabase = createClient()
    const fotograflar: string[] = []
    for (const entry of entries) {
      const path = `urunler/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
      const { error: uploadErr } = await supabase.storage.from('urun-fotograflari').upload(path, entry.file)
      if (!uploadErr) {
        const { data } = supabase.storage.from('urun-fotograflari').getPublicUrl(path)
        fotograflar.push(data.publicUrl)
      }
    }

    const stokAdetNum = Math.max(0, parseInt(stokAdedi || '0'))
    const kritikStokNum = Math.max(0, parseInt(kritikStok || '0'))
    const stokDurumu = stok !== 'stokta' ? stok : (stokAdetNum <= 0 ? 'tukendi' : 'stokta')

    const generateSlug = (text: string) => {
      const trMap: { [key: string]: string } = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
      }
      return text
        .replace(/[çğıöşüÇĞİÖŞÜ]/g, match => trMap[match])
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    const payload: any = {
      ad: ad.trim(),
      slug: generateSlug(ad.trim()),
      aciklama: aciklama.trim(),
      kategori: anaCat.name,
      alt_kategori: altCat?.name || null,
      urun_tipi: detayCat?.name || null,
      fiyat: parseFloat(fiyat),
      bayi_fiyati: bayi_fiyati ? parseFloat(bayi_fiyati) : null,
      sescim_fiyat: sescim_fiyat ? parseFloat(sescim_fiyat) : null,
      sescim_indirimli_fiyat: sescim_indirimli_fiyat ? parseFloat(sescim_indirimli_fiyat) : null,
      is_featured: is_featured,
      stok_durumu: stokDurumu,
      stok_adedi: stokAdetNum,
      kritik_stok: kritikStokNum,
      para_birimi: paraBirimi,
      bayi_para_birimi: bayiParaBirimi,
      marka: marka.trim() || null,
      model_kodu: modelKodu.trim() || null,
      kullanim_alani: kullanimAlani.trim() || null,
    }

    // Aynı model koduna (stok koduna) sahip bir ürün olup olmadığını kontrol et
    let existingUrun: any = null
    if (modelKodu.trim()) {
      const { data } = await supabase
        .from('urunler')
        .select('id, fotograflar')
        .eq('model_kodu', modelKodu.trim())
        .maybeSingle()
      existingUrun = data
    }

    let dbErr = null

    if (existingUrun) {
      // Eğer yeni bir fotoğraf yüklenmediyse ve eski fotoğraflar varsa, eski fotoğrafları koru
      if (fotograflar.length === 0 && existingUrun.fotograflar) {
        payload.fotograflar = existingUrun.fotograflar
      } else {
        payload.fotograflar = fotograflar
      }
      payload.updated_at = new Date().toISOString()
      
      const { error } = await supabase
        .from('urunler')
        .update(payload)
        .eq('id', existingUrun.id)
      dbErr = error
    } else {
      payload.fotograflar = fotograflar
      const { error } = await supabase
        .from('urunler')
        .insert(payload)
      dbErr = error
    }

    if (!dbErr && taslakId) {
      await supabase.from('wolvox_taslak').delete().eq('id', taslakId)
    }

    // Önbelleği temizle (Anında Yayınlama)
    if (!dbErr) {
      fetch('/api/revalidate', { method: 'POST', body: JSON.stringify({ path: '/' }) }).catch(() => {})
      if (existingUrun?.id) {
        fetch('/api/revalidate', { method: 'POST', body: JSON.stringify({ path: `/urun/${existingUrun.id}` }) }).catch(() => {})
      }
    }

    setLoading(false)
    if (dbErr) { setError(`Kaydedilemedi: ${dbErr.message}`); return }
    setSuccess(true)
    setAd(''); setAciklama(''); setAnaCat(NEW_KATEGORI_HIYERARSI[0]); setAltCat(null); setDetayCat(null)
    setFiyat(''); setBayiF(''); setSescimFiyat(''); setSescimIndirimli(''); setIsFeatured(false); setStok('stokta'); setParaBirimi('USD'); setBayiParaBirimi('USD')
    setMarka(''); setKullanimAlani(''); setStokAdedi('0'); setKritikStok('5')
    setEntries([])
    setTimeout(() => setSuccess(false), 3000)
    onAdded?.()
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Ürün Adı *</label>
        <input type="text" value={ad} onChange={e => setAd(e.target.value)} className="input-dark" placeholder="Örn: JBL PRX915" />
      </div>

      {/* ── Hiyerarşik Kategori Seçimi ───────────────── */}
      <div className="border border-white/5 bg-[#1A1A1A] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <ChevronRight size={13} className="text-brand-red" />
          <span className="font-display font-semibold text-xs tracking-widest uppercase text-white/50">Kategori Hiyerarşisi</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Ana Kategori */}
          <div>
            <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-brand-red/60 block mb-1.5">Ana Kategori</label>
            <select
              value={anaCat?.slug || ''}
              onChange={e => { 
                const found = NEW_KATEGORI_HIYERARSI.find(k => k.slug === e.target.value)
                setAnaCat(found || null)
                setAltCat(null)
                setDetayCat(null)
              }}
              className="input-dark appearance-none cursor-pointer text-sm"
            >
              <option value="">Seçiniz...</option>
              {NEW_KATEGORI_HIYERARSI.map(k => (
                <option key={k.slug} value={k.slug}>{k.name}</option>
              ))}
            </select>
          </div>

          {/* Alt Kategori */}
          <div>
            <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-brand-red/60 block mb-1.5">Alt Kategori</label>
            <select
              value={altCat?.slug || ''}
              onChange={e => { 
                const found = altKategoriler.find(a => a.slug === e.target.value)
                setAltCat(found || null)
                setDetayCat(null)
              }}
              className="input-dark appearance-none cursor-pointer text-sm disabled:opacity-30"
              disabled={!anaCat || altKategoriler.length === 0}
            >
              <option value="">Seçiniz...</option>
              {altKategoriler.map(a => (
                <option key={a.slug} value={a.slug}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Seviye / Ürün Tipi */}
          <div>
            <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-brand-red/60 block mb-1.5">3. Seviye Kategori</label>
            <select
              value={detayCat?.slug || ''}
              onChange={e => { 
                const found = detaylar.find(d => d.slug === e.target.value)
                setDetayCat(found || null)
              }}
              className="input-dark appearance-none cursor-pointer text-sm disabled:opacity-30"
              disabled={!altCat || detaylar.length === 0}
            >
              <option value="">Seçiniz...</option>
              {detaylar.map(d => (
                <option key={d.slug} value={d.slug}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Seçim özeti */}
        <div className="flex items-center gap-1.5 text-[10px] font-body text-white/25 pt-1">
          <span className={anaCat ? 'text-brand-red/60' : ''}>{anaCat?.name || '—'}</span>
          <ChevronRight size={8} className="text-white/15" />
          <span className={altCat ? 'text-white/40' : ''}>{altCat?.name || '—'}</span>
          <ChevronRight size={8} className="text-white/15" />
          <span className={detayCat ? 'text-white/50' : ''}>{detayCat?.name || '—'}</span>
        </div>
      </div>

      <div>
        <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Açıklama *</label>
        <textarea value={aciklama} onChange={e => setAciklama(e.target.value)} rows={3} className="input-dark resize-none" placeholder="Ürün özellikleri..." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Marka</label>
          <input 
            type="text" 
            value={marka} 
            onChange={(e) => { setMarka(e.target.value); fetchMarkaSuggestions(e.target.value) }} 
            onFocus={() => setShowMarkaSuggestions(true)}
            onBlur={() => setTimeout(() => setShowMarkaSuggestions(false), 200)}
            className="input-dark" 
            placeholder="Örn: JBL" 
          />
          {showMarkaSuggestions && existingMarkalar.filter(m => m.toLowerCase().includes(marka.toLowerCase())).length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-[#1A1A1A] border border-white/10 max-h-40 overflow-y-auto shadow-2xl">
              {existingMarkalar.filter(m => m.toLowerCase().includes(marka.toLowerCase())).map(m => (
                <button
                  key={m}
                  onClick={() => { setMarka(m); setShowMarkaSuggestions(false) }}
                  className="w-full text-left px-4 py-2 text-xs text-white/70 hover:bg-brand-red/10 hover:text-white transition-colors border-b border-white/5 last:border-0"
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Model Kodu</label>
          <input type="text" value={modelKodu} onChange={e => setModelKodu(e.target.value)} className="input-dark" placeholder="Örn: M7CL" />
        </div>
        <div className="relative">
          <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Kullanım Alanı</label>
          <input 
            type="text" 
            value={kullanimAlani} 
            onChange={(e) => { setKullanimAlani(e.target.value); fetchAlanSuggestions(e.target.value) }} 
            onFocus={() => setShowAlanSuggestions(true)}
            onBlur={() => setTimeout(() => setShowAlanSuggestions(false), 200)}
            className="input-dark" 
            placeholder="Örn: Konser" 
          />
          {showAlanSuggestions && existingAlanlar.filter(a => a.toLowerCase().includes(kullanimAlani.toLowerCase())).length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-[#1A1A1A] border border-white/10 max-h-40 overflow-y-auto shadow-2xl">
              {existingAlanlar.filter(a => a.toLowerCase().includes(kullanimAlani.toLowerCase())).map(a => (
                <button
                  key={a}
                  onClick={() => { setKullanimAlani(a); setShowAlanSuggestions(false) }}
                  className="w-full text-left px-4 py-2 text-xs text-white/70 hover:bg-brand-red/10 hover:text-white transition-colors border-b border-white/5 last:border-0"
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fiyat bölümü */}
      <div className="border border-white/5 bg-[#1A1A1A] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Tag size={13} className="text-brand-red" />
          <span className="font-display font-semibold text-xs tracking-widest uppercase text-white/50">Fiyatlandırma</span>
        </div>

        <div>
          <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-1.5">Normal Fiyat *</label>
          <div className="flex gap-2">
            <select value={paraBirimi} onChange={e => setParaBirimi(e.target.value)} className="input-dark appearance-none cursor-pointer w-32 flex-shrink-0">
              {PARA_BIRIMLERI.map(p => <option key={p.value} value={p.value}>{p.symbol} {p.value}</option>)}
            </select>
            <input type="number" min="0" step="0.01" value={fiyat} onChange={e => setFiyat(e.target.value)} className="input-dark flex-1" placeholder="0.00" />
          </div>
        </div>

        <div>
          <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-1.5">
            Bayi Fiyatı
            <span className="ml-1 text-white/20 normal-case tracking-normal font-body font-normal text-xs">— Sadece bayiler görür</span>
          </label>
          <div className="flex gap-2">
            <select value={bayiParaBirimi} onChange={e => setBayiParaBirimi(e.target.value)} className="input-dark appearance-none cursor-pointer w-32 flex-shrink-0">
              {PARA_BIRIMLERI.map(p => <option key={p.value} value={p.value}>{p.symbol} {p.value}</option>)}
            </select>
            <input type="number" min="0" step="0.01" value={bayi_fiyati} onChange={e => setBayiF(e.target.value)} className="input-dark flex-1" placeholder="Boş bırakılabilir" />
          </div>
        </div>

        <div>
          <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-1.5">Stok Durumu</label>
          <select value={stok} onChange={e => setStok(e.target.value)} className="input-dark appearance-none cursor-pointer">
            <option value="stokta">Stokta</option>
            <option value="tukendi">Tükendi</option>
            <option value="siparise_gore">Siparişe Göre</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-1.5">Stok Adedi</label>
            <input type="number" min="0" value={stokAdedi} onChange={(e) => setStokAdedi(e.target.value)} className="input-dark" />
          </div>
          <div>
            <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-1.5">Kritik Seviye</label>
            <input type="number" min="0" value={kritikStok} onChange={(e) => setKritikStok(e.target.value)} className="input-dark" />
          </div>
        </div>
      </div>

      {/* Fotoğraflar */}
      <div>
        <div className="flex justify-between items-end mb-2">
          <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block">
            Fotoğraflar <span className="text-white/20 normal-case tracking-normal font-body font-normal text-xs">(max 10)</span>
          </label>
          <button 
            onClick={fetchSuggestedImages} 
            disabled={isScraping || (!marka && !modelKodu && !ad)}
            className="text-[10px] uppercase font-bold bg-white/5 border border-white/10 px-3 py-1 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            {isScraping ? 'Aranıyor...' : 'Görsel Önerisi Bul'}
          </button>
        </div>

        {suggestedImages.length > 0 && (
          <div className="mb-4 p-3 border border-brand-red/20 bg-brand-red/5 rounded-sm">
            <h4 className="text-[10px] uppercase text-brand-red font-bold mb-2 tracking-widest">Önerilen Görseller (Tıklayarak Ekle)</h4>
            <div className="grid grid-cols-4 gap-2">
              {suggestedImages.map((img, i) => (
                <button key={i} onClick={() => addSuggestedImage(img)} className="relative aspect-square border border-white/10 hover:border-brand-red overflow-hidden transition-colors">
                  <img src={img} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {entries.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {entries.map(entry => (
              <div key={entry.preview} className="relative aspect-square bg-[#1A1A1A] border border-white/5 overflow-hidden">
                <img src={entry.preview} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeFile(entry.preview)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/70 flex items-center justify-center text-white hover:bg-brand-red transition-colors">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        {entries.length < 10 && (
          <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-white/15 p-5 cursor-pointer hover:border-brand-red/40 transition-colors">
            <Upload size={18} className="text-white/20" />
            <span className="font-body text-white/25 text-xs text-center">Fotoğraf ekle</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />
          </label>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-brand-red/10 border border-brand-red/30 p-3 text-brand-red text-xs font-body">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading || !ad || !aciklama || !fiyat || entries.some(e => e.compressing)}
        className={`btn-primary w-full justify-center text-sm disabled:opacity-40 ${success ? '!bg-green-600' : ''}`}>
        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : success ? <Check size={15} /> : <Plus size={15} />}
        {loading ? 'Ekleniyor...' : success ? 'Eklendi!' : 'Ürün Ekle'}
      </button>
    </div>
  )
}
