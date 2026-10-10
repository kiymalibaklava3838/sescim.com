'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { createAkdagBrowserClient } from '@/lib/supabase-akdag'
import {
  Upload,
  Plus,
  X,
  Check,
  AlertCircle,
  Tag,
  ChevronRight,
  MessageSquareText,
  Sparkles,
  Image as ImageIcon,
  Layers,
  Package,
  CheckCircle2,
  Search,
  Maximize2,
  Minimize2,
  Percent,
  Info,
  Boxes
} from 'lucide-react'
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
  onAdded?: () => void
  initialData?: {
    ad?: string
    kod?: string
    fiyat?: string
    paraBirimi?: string
    stokAdedi?: string
    taslakId?: string
    aciklama?: string
  }
}

export default function AdminAddProduct({ onAdded, initialData }: Props) {
  // Tam ekran modal modu toggle
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 1. Temel Bilgiler
  const [ad, setAd] = useState(initialData?.ad || '')
  const [marka, setMarka] = useState('')
  const [modelKodu, setModelKodu] = useState(initialData?.kod || '')
  const [kullanimAlani, setKullanimAlani] = useState('')
  const [aciklama, setAciklama] = useState(initialData?.aciklama || '')

  // 2. Kategori Hiyerarşisi (3 Seviye)
  const [anaCat, setAnaCat] = useState<CategoryNode | null>(NEW_KATEGORI_HIYERARSI[0] || null)
  const [altCat, setAltCat] = useState<CategoryNode | null>(null)
  const [detayCat, setDetayCat] = useState<CategoryNode | null>(null)

  // 3. Fiyatlandırma (Sescim B2C Perakende)
  const [paraBirimi, setParaBirimi] = useState(initialData?.paraBirimi || 'TRY')
  const [fiyat, setFiyat] = useState(initialData?.fiyat || '')
  const [indirimliFiyat, setIndirimliFiyat] = useState('')
  const [fiyatSorunuz, setFiyatSorunuz] = useState(false)

  // 4. Stok & Envanter
  const [stok, setStok] = useState<'stokta' | 'tukendi' | 'siparise_gore'>('stokta')
  const [stokAdedi, setStokAdedi] = useState(initialData?.stokAdedi || '10')
  const [kritikStok, setKritikStok] = useState('5')

  // 5. Vitrin & Öne Çıkarma
  const [isFeatured, setIsFeatured] = useState(false)

  // 6. Görseller & Dosya Yönetimi
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [suggestedImages, setSuggestedImages] = useState<string[]>([])
  const [isScraping, setIsScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // 7. Otomatik Tamamlama
  const [existingMarkalar, setExistingMarkalar] = useState<string[]>([])
  const [existingAlanlar, setExistingAlanlar] = useState<string[]>([])
  const [showMarkaSuggestions, setShowMarkaSuggestions] = useState(false)
  const [showAlanSuggestions, setShowAlanSuggestions] = useState(false)

  // 8. Durumlar
  const [taslakId] = useState(initialData?.taslakId || null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Hiyerarşi alt dalları
  const altKategoriler = anaCat?.children || []
  const detaylar = altCat?.children || []

  // İndirim oranı hesaplama
  const normalFiyatNum = parseFloat(fiyat) || 0
  const indirimliFiyatNum = parseFloat(indirimliFiyat) || 0
  const hasDiscount = normalFiyatNum > 0 && indirimliFiyatNum > 0 && indirimliFiyatNum < normalFiyatNum
  const discountPercent = hasDiscount
    ? Math.round(((normalFiyatNum - indirimliFiyatNum) / normalFiyatNum) * 100)
    : 0

  // Marka önerileri çekici
  const fetchMarkaSuggestions = async (val: string) => {
    if (val.length < 2) return
    try {
      const akdag = createAkdagBrowserClient()
      const sescim = createClient()
      const [akdagRes, sescimRes] = await Promise.all([
        akdag.from('urunler').select('marka').ilike('marka', `%${val}%`).limit(10),
        sescim.from('urunler').select('marka').ilike('marka', `%${val}%`).limit(10),
      ])
      const combined = [
        ...(akdagRes.data || []).map((x: any) => x.marka),
        ...(sescimRes.data || []).map((x: any) => x.marka),
      ].filter(Boolean)
      setExistingMarkalar(Array.from(new Set(combined)))
    } catch (e) {
      console.error(e)
    }
  }

  // Kullanım alanı önerileri çekici
  const fetchAlanSuggestions = async (val: string) => {
    if (val.length < 2) return
    try {
      const akdag = createAkdagBrowserClient()
      const sescim = createClient()
      const [akdagRes, sescimRes] = await Promise.all([
        akdag.from('urunler').select('kullanim_alani').ilike('kullanim_alani', `%${val}%`).limit(10),
        sescim.from('urunler').select('kullanim_alani').ilike('kullanim_alani', `%${val}%`).limit(10),
      ])
      const combined = [
        ...(akdagRes.data || []).map((x: any) => x.kullanim_alani),
        ...(sescimRes.data || []).map((x: any) => x.kullanim_alani),
      ].filter(Boolean)
      setExistingAlanlar(Array.from(new Set(combined)))
    } catch (e) {
      console.error(e)
    }
  }

  // Web üzerinden akıllı görsel önerileri bulucu
  const fetchSuggestedImages = async () => {
    const query = `${marka} ${modelKodu} ${ad}`.trim()
    if (!query || query.length < 3) {
      setScrapeError('Görsel aramak için lütfen önce marka veya ürün adını girin.')
      return
    }
    setIsScraping(true)
    setScrapeError('')
    setSuggestedImages([])
    try {
      const res = await fetch('/api/scrape-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (data.images && data.images.length > 0) {
        setSuggestedImages(data.images)
      } else {
        setScrapeError('Bu ürün için internette görsel bulunamadı. Lütfen manuel dosya yükleyin.')
      }
    } catch (e) {
      console.error(e)
      setScrapeError('Görsel aranırken bir bağlantı hatası oluştu.')
    } finally {
      setIsScraping(false)
    }
  }

  // Önerilen görseli proxy üzerinden indirip galeriye ekleme (CORS hatasını önler)
  const addSuggestedImage = async (url: string) => {
    try {
      // Önce proxy endpoint'imiz üzerinden indir
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error('Proxy download failed')

      const blob = await res.blob()
      const file = new File([blob], `urun-${Date.now()}.jpg`, {
        type: blob.type || 'image/jpeg',
      })
      const preview = URL.createObjectURL(file)
      setEntries(p => [...p, { file, preview, originalSize: file.size, compressing: false }])
      setSuggestedImages(p => p.filter(i => i !== url))
    } catch (e) {
      console.error('Failed to add suggested image via proxy:', e)
      alert('Görsel indirilemedi. Görsel kaynağı korumalı olabilir, lütfen resmi bilgisayarınıza indirip yükleyiniz.')
    }
  }

  // Dosya yükleme ve client-side sıkıştırma
  const processFiles = async (fileList: File[]) => {
    const remainingSlots = 10 - entries.length
    if (remainingSlots <= 0) {
      setError('En fazla 10 görsel yükleyebilirsiniz.')
      return
    }

    const toProcess = fileList.slice(0, remainingSlots)
    for (const file of toProcess) {
      if (file.size > 25 * 1024 * 1024) {
        setError(`"${file.name}" dosyası 25MB'dan büyük, lütfen daha küçük bir dosya seçin.`)
        continue
      }
      const preview = URL.createObjectURL(file)
      setEntries(p => [...p, { file, preview, originalSize: file.size, compressing: true }])

      try {
        const compressed = await compressImage(file)
        setEntries(p =>
          p.map(e =>
            e.preview === preview
              ? { ...e, file: compressed, compressedSize: compressed.size, compressing: false }
              : e
          )
        )
      } catch (err) {
        setEntries(p =>
          p.map(e => (e.preview === preview ? { ...e, compressing: false } : e))
        )
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files))
    }
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files))
    }
  }

  const removeFile = (preview: string) => {
    setEntries(p => {
      const e = p.find(x => x.preview === preview)
      if (e) URL.revokeObjectURL(e.preview)
      return p.filter(x => x.preview !== preview)
    })
  }

  // SEO Uyumlu Slug Oluşturucu
  const generateSlug = (text: string) => {
    const trMap: { [key: string]: string } = {
      ç: 'c',
      ğ: 'g',
      ı: 'i',
      ö: 'o',
      ş: 's',
      ü: 'u',
      Ç: 'c',
      Ğ: 'g',
      İ: 'i',
      Ö: 'o',
      Ş: 's',
      Ü: 'u',
    }
    return text
      .replace(/[çğıöşüÇĞİÖŞÜ]/g, match => trMap[match] || match)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  // Ürünü Kaydet & Sescim Kataloğuna Ekle
  const handleSubmit = async () => {
    if (!ad.trim()) {
      setError('Lütfen ürün adını giriniz.')
      return
    }
    if (!aciklama.trim()) {
      setError('Lütfen ürün açıklamasını giriniz.')
      return
    }
    if (!fiyat || isNaN(parseFloat(fiyat)) || parseFloat(fiyat) <= 0) {
      setError('Lütfen geçerli bir satış fiyatı giriniz.')
      return
    }
    if (indirimliFiyat && (isNaN(parseFloat(indirimliFiyat)) || parseFloat(indirimliFiyat) <= 0)) {
      setError('İndirimli fiyat geçerli bir sayı olmalıdır.')
      return
    }
    if (indirimliFiyat && parseFloat(indirimliFiyat) >= parseFloat(fiyat)) {
      setError('İndirimli fiyat, normal satış fiyatından düşük olmalıdır.')
      return
    }
    if (!anaCat) {
      setError('Lütfen en az bir ana kategori seçiniz.')
      return
    }
    if (entries.length === 0) {
      if (!confirm('Ürün için herhangi bir görsel yüklemediniz. Ürünü görsel olmadan kaydetmek istediğinize emin misiniz?')) {
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const fotograflar: string[] = []

      // 1. Görselleri Supabase Storage'a Yükle
      for (const entry of entries) {
        const path = `urunler/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
        const { error: uploadErr } = await supabase.storage
          .from('urun-fotograflari')
          .upload(path, entry.file, { contentType: 'image/jpeg' })

        if (!uploadErr) {
          const { data } = supabase.storage.from('urun-fotograflari').getPublicUrl(path)
          if (data?.publicUrl) {
            fotograflar.push(data.publicUrl)
          }
        } else {
          console.error('Storage upload error:', uploadErr)
        }
      }

      const stokAdetNum = Math.max(0, parseInt(stokAdedi || '0'))
      const kritikStokNum = Math.max(0, parseInt(kritikStok || '0'))
      const stokDurumu = stok !== 'stokta' ? stok : stokAdetNum <= 0 ? 'tukendi' : 'stokta'

      const baseSlug = generateSlug(ad.trim()) || `urun-${Date.now()}`
      const finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`
      const finalFiyat = parseFloat(fiyat)
      const finalIndirimliFiyat = indirimliFiyat ? parseFloat(indirimliFiyat) : null

      // Sescim B2C Ürün Payload'ı
      const payload: any = {
        ad: ad.trim(),
        slug: finalSlug,
        aciklama: aciklama.trim(),
        kategori_id: anaCat.name,
        alt_kategori_id: altCat?.name || null,
        fiyat: finalFiyat,
        bayi_fiyati: null, // Sescim B2C'de bayi fiyatı kullanılmaz
        sescim_fiyat: finalFiyat,
        sescim_indirimli_fiyat: finalIndirimliFiyat,
        sescim_aktif: true,
        aktif: true,
        is_featured: isFeatured,
        stok_durumu: stokDurumu,
        stok_adedi: stokAdetNum,
        kritik_stok: kritikStokNum,
        para_birimi: paraBirimi,
        marka: marka.trim() || null,
        model_kodu: modelKodu.trim() || null,
        kullanim_alani: kullanimAlani.trim() || null,
        ozellikler: [],
      }

      // Aynı model koduna sahip mevcut bir ürün var mı kontrol et
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
      let targetUrunId = existingUrun?.id

      if (existingUrun) {
        if (fotograflar.length === 0 && existingUrun.fotograflar) {
          payload.fotograflar = existingUrun.fotograflar
        } else {
          payload.fotograflar = fotograflar
        }
        payload.updated_at = new Date().toISOString()

        const { error } = await supabase.from('urunler').update(payload).eq('id', existingUrun.id)
        dbErr = error
      } else {
        payload.fotograflar = fotograflar
        const { data: insertedData, error } = await supabase
          .from('urunler')
          .insert(payload)
          .select('id')
          .single()
        dbErr = error
        if (insertedData) targetUrunId = insertedData.id
      }

      if (dbErr) {
        console.error('Sescim ürün ekleme hatası:', dbErr)
        setError('Ürün eklenirken bir hata oluştu: ' + (dbErr.message || 'Veritabanı hatası'))
        setLoading(false)
        return
      }

      // 2. Sescim Fiyat ve Özel Kural Tablosunu Eşitle (sescim_fiyatlar)
      if (targetUrunId) {
        try {
          await supabase.from('sescim_fiyatlar').upsert(
            {
              urun_id: targetUrunId,
              sescim_fiyat: finalFiyat,
              sescim_indirimli_fiyat: finalIndirimliFiyat,
              sescim_aktif: true,
              fiyat_sorunuz: fiyatSorunuz,
              sescim_stok: stokAdetNum,
              sescim_stok_durumu: stokDurumu,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'urun_id' }
          )
        } catch (e) {
          console.error('Failed to save sescim pricing in AdminAddProduct:', e)
        }
      }

      // 3. Taslak Varsa Temizle
      if (taslakId) {
        await supabase.from('wolvox_taslak').delete().eq('id', taslakId).catch(() => {})
      }

      // 4. Anında Önbellek Temizleme (Revalidate)
      const headers = { 'Content-Type': 'application/json' }
      fetch('/api/revalidate', { method: 'POST', headers, body: JSON.stringify({ path: '/' }) }).catch(() => {})
      fetch('/api/revalidate', { method: 'POST', headers, body: JSON.stringify({ path: '/urunler' }) }).catch(() => {})
      if (existingUrun?.id) {
        const pSlug = existingUrun.slug || existingUrun.id
        fetch('/api/revalidate', { method: 'POST', headers, body: JSON.stringify({ path: `/urun/${pSlug}` }) }).catch(() => {})
      }

      setLoading(false)
      setSuccess(true)

      // Formu temizle
      setAd('')
      setAciklama('')
      setAnaCat(NEW_KATEGORI_HIYERARSI[0] || null)
      setAltCat(null)
      setDetayCat(null)
      setFiyat('')
      setIndirimliFiyat('')
      setFiyatSorunuz(false)
      setIsFeatured(false)
      setStok('stokta')
      setParaBirimi('TRY')
      setMarka('')
      setModelKodu('')
      setKullanimAlani('')
      setStokAdedi('10')
      setKritikStok('5')
      setEntries([])
      setSuggestedImages([])

      if (isModalOpen) {
        setIsModalOpen(false)
      }

      setTimeout(() => setSuccess(false), 4000)
      onAdded?.()
    } catch (err: any) {
      console.error(err)
      setError('Beklenmeyen bir hata oluştu: ' + (err?.message || 'Bilinmeyen hata'))
      setLoading(false)
    }
  }

  // Formun gövde içeriği (hem standart sidebar'da hem de genişletilmiş modal'da kullanılır)
  const FormContent = (
    <div className="space-y-6">
      {/* ── BÖLÜM 1: TEMEL BİLGİLER ──────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-brand-red/10 text-brand-red flex items-center justify-center">
            <Package size={16} />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wide text-slate-900">
              Temel Ürün Bilgileri
            </h3>
            <p className="text-[11px] text-slate-500 font-body">Ürünün adı, markası ve model detayları</p>
          </div>
        </div>

        {/* Ürün Adı */}
        <div>
          <label className="font-display font-semibold text-xs tracking-wider uppercase text-slate-700 block mb-1.5">
            Ürün Adı <span className="text-brand-red">*</span>
          </label>
          <input
            type="text"
            value={ad}
            onChange={e => setAd(e.target.value)}
            className="input-dark w-full rounded-lg"
            placeholder="Örn: JBL EON715 15 inç Aktif Hoparlör"
          />
        </div>

        {/* Marka & Model Kodu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Marka (Autocomplete) */}
          <div className="relative">
            <label className="font-display font-semibold text-xs tracking-wider uppercase text-slate-700 block mb-1.5">
              Marka
            </label>
            <input
              type="text"
              value={marka}
              onChange={e => {
                setMarka(e.target.value)
                fetchMarkaSuggestions(e.target.value)
              }}
              onFocus={() => setShowMarkaSuggestions(true)}
              onBlur={() => setTimeout(() => setShowMarkaSuggestions(false), 200)}
              className="input-dark w-full rounded-lg"
              placeholder="Örn: JBL, Yamaha, Shure"
            />
            {showMarkaSuggestions &&
              existingMarkalar.filter(m => m.toLowerCase().includes(marka.toLowerCase())).length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg max-h-48 overflow-y-auto shadow-xl">
                  {existingMarkalar
                    .filter(m => m.toLowerCase().includes(marka.toLowerCase()))
                    .map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setMarka(m)
                          setShowMarkaSuggestions(false)
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-brand-red/10 hover:text-brand-red font-medium transition-colors border-b border-slate-50 last:border-0"
                      >
                        {m}
                      </button>
                    ))}
                </div>
              )}
          </div>

          {/* Model Kodu */}
          <div>
            <label className="font-display font-semibold text-xs tracking-wider uppercase text-slate-700 block mb-1.5">
              Model / Stok Kodu
            </label>
            <input
              type="text"
              value={modelKodu}
              onChange={e => setModelKodu(e.target.value)}
              className="input-dark w-full rounded-lg"
              placeholder="Örn: EON715"
            />
          </div>
        </div>

        {/* Kullanım Alanı (Autocomplete) */}
        <div className="relative">
          <label className="font-display font-semibold text-xs tracking-wider uppercase text-slate-700 block mb-1.5">
            Kullanım Alanı / Segment
          </label>
          <input
            type="text"
            value={kullanimAlani}
            onChange={e => {
              setKullanimAlani(e.target.value)
              fetchAlanSuggestions(e.target.value)
            }}
            onFocus={() => setShowAlanSuggestions(true)}
            onBlur={() => setTimeout(() => setShowAlanSuggestions(false), 200)}
            className="input-dark w-full rounded-lg"
            placeholder="Örn: Konser & Sahne, Stüdyo & Kayıt, Konferans Salonu, Kafe & Bar"
          />
          {showAlanSuggestions &&
            existingAlanlar.filter(a => a.toLowerCase().includes(kullanimAlani.toLowerCase())).length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg max-h-44 overflow-y-auto shadow-xl">
                {existingAlanlar
                  .filter(a => a.toLowerCase().includes(kullanimAlani.toLowerCase()))
                  .map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        setKullanimAlani(a)
                        setShowAlanSuggestions(false)
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-brand-red/10 hover:text-brand-red font-medium transition-colors border-b border-slate-50 last:border-0"
                    >
                      {a}
                    </button>
                  ))}
              </div>
            )}
        </div>
      </div>

      {/* ── BÖLÜM 2: KATEGORİ HİYERARŞİSİ ─────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers size={16} />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wide text-slate-900">
              Kategori Seçimi
            </h3>
            <p className="text-[11px] text-slate-500 font-body">3 seviyeli ses ve ışık hiyerarşisi</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Seviye: Ana Kategori */}
          <div>
            <label className="font-display font-semibold text-[11px] tracking-wider uppercase text-slate-600 block mb-1.5">
              1. Ana Kategori <span className="text-brand-red">*</span>
            </label>
            <select
              value={anaCat?.slug || ''}
              onChange={e => {
                const found = NEW_KATEGORI_HIYERARSI.find(k => k.slug === e.target.value)
                setAnaCat(found || null)
                setAltCat(null)
                setDetayCat(null)
              }}
              className="input-dark w-full rounded-lg cursor-pointer text-xs"
            >
              <option value="">Seçiniz...</option>
              {NEW_KATEGORI_HIYERARSI.map(k => (
                <option key={k.slug} value={k.slug}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Seviye: Alt Kategori */}
          <div>
            <label className="font-display font-semibold text-[11px] tracking-wider uppercase text-slate-600 block mb-1.5">
              2. Alt Kategori
            </label>
            <select
              value={altCat?.slug || ''}
              onChange={e => {
                const found = altKategoriler.find(a => a.slug === e.target.value)
                setAltCat(found || null)
                setDetayCat(null)
              }}
              className="input-dark w-full rounded-lg cursor-pointer text-xs disabled:bg-slate-50 disabled:text-slate-400"
              disabled={!anaCat || altKategoriler.length === 0}
            >
              <option value="">{altKategoriler.length === 0 ? 'Alt kategori yok' : 'Seçiniz...'}</option>
              {altKategoriler.map(a => (
                <option key={a.slug} value={a.slug}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Seviye: Ürün Tipi */}
          <div>
            <label className="font-display font-semibold text-[11px] tracking-wider uppercase text-slate-600 block mb-1.5">
              3. Ürün Tipi
            </label>
            <select
              value={detayCat?.slug || ''}
              onChange={e => {
                const found = detaylar.find(d => d.slug === e.target.value)
                setDetayCat(found || null)
              }}
              className="input-dark w-full rounded-lg cursor-pointer text-xs disabled:bg-slate-50 disabled:text-slate-400"
              disabled={!altCat || detaylar.length === 0}
            >
              <option value="">{detaylar.length === 0 ? 'Detay yok' : 'Seçiniz...'}</option>
              {detaylar.map(d => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kategori Yolu Breadcrumb Özeti */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-lg px-3 py-2 flex items-center gap-1.5 text-xs text-slate-600 font-medium overflow-x-auto">
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mr-1">Seçim:</span>
          <span className={anaCat ? 'text-brand-red font-semibold' : 'text-slate-400'}>{anaCat?.name || 'Seçilmedi'}</span>
          <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
          <span className={altCat ? 'text-slate-900 font-semibold' : 'text-slate-400'}>{altCat?.name || '—'}</span>
          <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
          <span className={detayCat ? 'text-slate-900 font-semibold' : 'text-slate-400'}>{detayCat?.name || '—'}</span>
        </div>
      </div>

      {/* ── BÖLÜM 3: FİYATLANDIRMA (SESCİM PERAKENDE) ─────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Tag size={16} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm uppercase tracking-wide text-slate-900">
                Fiyatlandırma & Satış Politikası
              </h3>
              <p className="text-[11px] text-slate-500 font-body">Net perakende satış ve kampanya fiyatı</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200/50">
            B2C Perakende
          </span>
        </div>

        {/* Para Birimi & Satış Fiyatı */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Para Birimi */}
          <div>
            <label className="font-display font-semibold text-xs tracking-wider uppercase text-slate-700 block mb-1.5">
              Para Birimi
            </label>
            <select
              value={paraBirimi}
              onChange={e => setParaBirimi(e.target.value)}
              className="input-dark w-full rounded-lg cursor-pointer text-sm font-semibold"
            >
              {PARA_BIRIMLERI.map(p => (
                <option key={p.value} value={p.value}>
                  {p.symbol} {p.value}
                </option>
              ))}
            </select>
          </div>

          {/* Satış Fiyatı */}
          <div className="sm:col-span-2">
            <label className="font-display font-semibold text-xs tracking-wider uppercase text-slate-700 block mb-1.5">
              Satış Fiyatı ({paraBirimi}) <span className="text-brand-red">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={fiyat}
                onChange={e => setFiyat(e.target.value)}
                className="input-dark w-full rounded-lg font-mono text-base font-bold pr-12 focus:border-brand-red"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {paraBirimi}
              </span>
            </div>
          </div>
        </div>

        {/* İndirimli Fiyat (Opsiyonel) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-display font-semibold text-xs tracking-wider uppercase text-slate-700">
              İndirimli / Kampanyalı Fiyat ({paraBirimi})
            </label>
            <span className="text-[11px] text-slate-400 font-body">İndirim yoksa boş bırakın</span>
          </div>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.01"
              value={indirimliFiyat}
              onChange={e => setIndirimliFiyat(e.target.value)}
              className="input-dark w-full rounded-lg font-mono text-sm pr-12"
              placeholder="Örn: Normal fiyattan daha düşük giriniz"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              {paraBirimi}
            </span>
          </div>

          {/* Canlı İndirim Rozeti Önizlemesi */}
          {hasDiscount && (
            <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-emerald-600 text-white font-bold text-xs px-2 py-0.5 rounded-full">
                  <Percent size={11} /> %{discountPercent} İndirim
                </span>
                <span className="text-xs text-emerald-900 font-medium">
                  {normalFiyatNum.toLocaleString('tr-TR')} {paraBirimi} ➔{' '}
                  <strong className="font-bold">{indirimliFiyatNum.toLocaleString('tr-TR')} {paraBirimi}</strong>
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold hidden sm:inline">
                Tasarruf: {(normalFiyatNum - indirimliFiyatNum).toLocaleString('tr-TR')} {paraBirimi}
              </span>
            </div>
          )}
        </div>

        {/* Distribütör Satış Kuralı: "Fiyat Teklifi Alın" */}
        <div className="pt-2 border-t border-slate-100">
          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
              fiyatSorunuz
                ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <input
              type="checkbox"
              checked={fiyatSorunuz}
              onChange={e => setFiyatSorunuz(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-display font-bold text-xs uppercase tracking-wide">
                <MessageSquareText size={14} className={fiyatSorunuz ? 'text-amber-600' : 'text-slate-400'} />
                <span>Distribütör Satış Kuralı: &quot;Fiyat Teklifi İsteyin&quot; (Fiyat Gizli)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-body">
                İşaretlendiğinde ürünün liste fiyatı ziyaretçilere gizlenir. Sepete ekleme yerine doğrudan
                WhatsApp ve teklif isteme butonu aktif olur.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* ── BÖLÜM 4: STOK & ENVANTER ──────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Boxes size={16} />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wide text-slate-900">
              Stok & Tedarik Durumu
            </h3>
            <p className="text-[11px] text-slate-500 font-body">Mevcut stok miktarı ve sipariş durumu</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Stok Durumu */}
          <div>
            <label className="font-display font-semibold text-xs tracking-wider uppercase text-slate-700 block mb-1.5">
              Stok Durumu
            </label>
            <select
              value={stok}
              onChange={e => setStok(e.target.value as any)}
              className="input-dark w-full rounded-lg cursor-pointer text-xs"
            >
              <option value="stokta">Stokta Var (Hemen Teslim)</option>
              <option value="siparise_gore">Siparişe Göre Temin</option>
              <option value="tukendi">Tükendi / Stokta Yok</option>
            </select>
          </div>

          {/* Stok Adedi */}
          <div>
            <label className="font-display font-semibold text-xs tracking-wider uppercase text-slate-700 block mb-1.5">
              Mevcut Stok Adedi
            </label>
            <input
              type="number"
              min="0"
              value={stokAdedi}
              onChange={e => setStokAdedi(e.target.value)}
              className="input-dark w-full rounded-lg font-mono text-xs"
              placeholder="0"
            />
          </div>

          {/* Kritik Stok Seviyesi */}
          <div>
            <label className="font-display font-semibold text-xs tracking-wider uppercase text-slate-700 block mb-1.5">
              Kritik Uyarı Seviyesi
            </label>
            <input
              type="number"
              min="0"
              value={kritikStok}
              onChange={e => setKritikStok(e.target.value)}
              className="input-dark w-full rounded-lg font-mono text-xs"
              placeholder="5"
            />
          </div>
        </div>
      </div>

      {/* ── BÖLÜM 5: FOTOĞRAFLAR & MEDYA ─────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
              <ImageIcon size={16} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm uppercase tracking-wide text-slate-900">
                Ürün Fotoğrafları
              </h3>
              <p className="text-[11px] text-slate-500 font-body">Maksimum 10 görsel (Otomatik optimize edilir)</p>
            </div>
          </div>

          {/* Web'den Görsel Bulucu Butonu */}
          <button
            type="button"
            onClick={fetchSuggestedImages}
            disabled={isScraping || (!marka && !modelKodu && !ad)}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-brand-red hover:text-white text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-700"
          >
            {isScraping ? (
              <>
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Aranıyor...
              </>
            ) : (
              <>
                <Search size={13} />
                Web&apos;den Görsel Bul
              </>
            )}
          </button>
        </div>

        {scrapeError && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2 font-body">
            <Info size={14} className="flex-shrink-0 text-amber-600" />
            <span>{scrapeError}</span>
          </div>
        )}

        {/* Web'den Bulunan Önerilen Görseller */}
        {suggestedImages.length > 0 && (
          <div className="p-3.5 bg-brand-red/5 border border-brand-red/20 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-xs uppercase tracking-wider text-brand-red flex items-center gap-1.5">
                <Sparkles size={14} /> İnternetten Bulunan Görseller (Eklemek için Tıklayın)
              </span>
              <button
                type="button"
                onClick={() => setSuggestedImages([])}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Kapat
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
              {suggestedImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => addSuggestedImage(img)}
                  className="group relative aspect-square bg-white rounded-lg border border-slate-200 hover:border-brand-red overflow-hidden shadow-sm transition-all hover:scale-105"
                  title="Galeriye eklemek için tıklayın"
                >
                  <img src={img} alt="Öneri" className="w-full h-full object-contain p-1" />
                  <div className="absolute inset-0 bg-brand-red/70 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold text-xs transition-opacity">
                    <Plus size={18} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Yüklenen Görseller Listesi */}
        {entries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {entries.map((entry, idx) => (
              <div
                key={entry.preview}
                className="group relative aspect-square bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm flex items-center justify-center"
              >
                <img src={entry.preview} alt="" className="w-full h-full object-contain p-1.5" />

                {/* Kapak Fotoğrafı Rozeti */}
                {idx === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 bg-slate-900/80 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow">
                    Kapak
                  </span>
                )}

                {/* Sıkıştırma Bilgisi */}
                <div className="absolute bottom-1.5 right-1.5 text-[9px] font-mono bg-white/90 px-1 py-0.5 rounded shadow text-slate-600">
                  {entry.compressing ? (
                    'Sıkıştırılıyor...'
                  ) : entry.compressedSize ? (
                    `${formatFileSize(entry.compressedSize)}`
                  ) : (
                    formatFileSize(entry.originalSize)
                  )}
                </div>

                {/* Silme Butonu */}
                <button
                  type="button"
                  onClick={() => removeFile(entry.preview)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-slate-900/80 text-white rounded-full flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-brand-red transition-colors shadow"
                  title="Görseli kaldır"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drag & Drop Yükleme Alanı */}
        {entries.length < 10 && (
          <div
            onDragOver={e => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
              isDragging
                ? 'border-brand-red bg-brand-red/5'
                : 'border-slate-200 hover:border-brand-red/50 hover:bg-slate-50/60 bg-white'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <Upload size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Görselleri buraya sürükleyin veya <span className="text-brand-red underline">dosya seçin</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-body">
                PNG, JPG, WEBP (Kalan: {10 - entries.length} adet)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        )}
      </div>

      {/* ── BÖLÜM 6: AÇIKLAMA & VİTRİN ────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wide text-slate-900">
              Açıklama & Vitrin Tercihi
            </h3>
            <p className="text-[11px] text-slate-500 font-body">Ürünün detayları ve anasayfa vitrini</p>
          </div>
        </div>

        {/* Açıklama */}
        <div>
          <label className="font-display font-semibold text-xs tracking-wider uppercase text-slate-700 block mb-1.5">
            Ürün Açıklaması <span className="text-brand-red">*</span>
          </label>
          <textarea
            value={aciklama}
            onChange={e => setAciklama(e.target.value)}
            rows={4}
            className="input-dark w-full rounded-lg resize-y text-xs leading-relaxed"
            placeholder="Ürünün teknik özellikleri, ses gücü, giriş/çıkış konnektörleri ve kutu içeriği..."
          />
        </div>

        {/* Öne Çıkarılan Ürün (Vitrin) */}
        <div className="pt-2">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={e => setIsFeatured(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-red focus:ring-brand-red cursor-pointer"
            />
            <div>
              <span className="font-display font-bold text-xs uppercase tracking-wide text-slate-900 block">
                Öne Çıkan Ürünler Vitrininde Göster
              </span>
              <span className="text-[11px] text-slate-500 font-body block mt-0.5">
                Bu ürün sescim.com anasayfasında &quot;Öne Çıkanlar&quot; listesinde sergilenir.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* ── HATA / BAŞARI BİLDİRİMLERİ ───────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 p-3.5 rounded-xl text-red-800 text-xs font-body shadow-sm">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-800 text-xs font-body shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">
            Ürün başarıyla sescim.com kataloğuna eklendi ve canlıya alındı!
          </span>
        </div>
      )}

      {/* ── KAYDET BUTONU ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !ad || !aciklama || !fiyat || entries.some(e => e.compressing)}
        className={`btn-primary w-full py-3.5 rounded-xl justify-center text-sm shadow-md transition-all ${
          success ? '!bg-emerald-600 hover:!bg-emerald-700' : ''
        }`}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : success ? (
          <Check size={18} />
        ) : (
          <Plus size={18} />
        )}
        <span>{loading ? 'Ürün Ekleniyor ve Yükleniyor...' : success ? 'Başarıyla Eklendi!' : 'Ürünü Sescim Kataloğuna Ekle'}</span>
      </button>
    </div>
  )

  return (
    <div>
      {/* Kart Üst Başlık & Genişletme Düğmesi */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse" />
          <span className="font-display font-bold text-xs uppercase tracking-wider text-slate-600">
            Sescim Perakende Kataloğu
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-brand-red text-xs font-semibold px-2 py-1 rounded hover:bg-slate-100 transition-colors"
          title="Büyük Ekranda Düzenle"
        >
          <Maximize2 size={13} />
          <span>Geniş Ekran</span>
        </button>
      </div>

      {/* Standart Sayfa İçi Form */}
      {FormContent}

      {/* Geniş Ekran Modal Modu (Büyük ekranda rahat çalışmak isteyenler için) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-50 border border-slate-300 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-red text-white flex items-center justify-center shadow-sm">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="font-display font-black text-lg uppercase tracking-wide text-slate-900">
                    Yeni Ürün Ekle — Sescim.com
                  </h2>
                  <p className="text-xs text-slate-500 font-body">Geniş ekran yönetim modu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {FormContent}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
