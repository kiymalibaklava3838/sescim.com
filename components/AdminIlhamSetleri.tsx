'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  Upload,
  Loader2,
  Search,
  Package,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import Image from 'next/image'
import SafeProductImage from './SafeProductImage'
import {
  DEFAULT_INSPIRATION_SETS,
  InspirationSet,
  parseInspirationSetMeta,
  packInspirationSetMeta,
} from '@/lib/ilham-setleri'
import { createAkdagBrowserClient } from '@/lib/supabase-akdag'

export default function AdminIlhamSetleri({ supabase }: { supabase: any }) {
  const [sets, setSets] = useState<InspirationSet[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Ürün arama ve seçili ürün detayları
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [productSearchResults, setProductSearchResults] = useState<any[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [selectedProductsDetails, setSelectedProductsDetails] = useState<any[]>([])

  const [formData, setFormData] = useState({
    baslik: '',
    alt_yazi: '',
    aciklama: '',
    rozet: 'HAZIR SET',
    resim_url: '',
    link: '',
    sira: 1,
    aktif: true,
    urun_idler: [] as string[],
  })

  useEffect(() => {
    loadSets()
  }, [])

  async function triggerRevalidate() {
    try {
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/urunler', tag: 'inspiration_sets' }),
      })
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/' }),
      })
    } catch (e) {
      console.warn('Revalidation warning:', e)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `ilham-setleri/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('urun-fotograflari').upload(filePath, file)
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('urun-fotograflari').getPublicUrl(filePath)
      if (data?.publicUrl) {
        setFormData((prev) => ({ ...prev, resim_url: data.publicUrl }))
      }
    } catch (err: any) {
      alert('Görsel yüklenemedi: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  async function loadSets() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bannerlar')
        .select('id, baslik, alt_yazi, resim_url, link, sira, aktif, created_at')
        .order('sira', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error

      const parsed: InspirationSet[] = (data || []).map((row: any) => {
        const meta = parseInspirationSetMeta(row.alt_yazi)
        return {
          ...row,
          alt_yazi: meta.subtitle,
          aciklama: meta.description,
          rozet: meta.badge,
          urun_idler: meta.product_ids,
        }
      })

      setSets(parsed)
    } catch (err) {
      console.error('İlham setleri yüklenemedi:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadProductDetailsByIds(ids: string[]) {
    if (!ids || ids.length === 0) {
      setSelectedProductsDetails([])
      return
    }
    try {
      const akdagDb = createAkdagBrowserClient()
      const [akdagRes, sescimRes] = await Promise.all([
        akdagDb
          .from('urunler')
          .select('id, ad, marka, kategori, fiyat, para_birimi, fotograflar')
          .in('id', ids),
        supabase
          .from('urunler')
          .select('id, ad, marka, kategori:kategori_id, fiyat, para_birimi, fotograflar')
          .in('id', ids),
      ])

      const map = new Map<string, any>()
      ;(akdagRes.data || []).forEach((p: any) => map.set(p.id, p))
      ;(sescimRes.data || []).forEach((p: any) => {
        if (!map.has(p.id)) map.set(p.id, p)
      })

      const ordered = ids.map((id) => map.get(id)).filter(Boolean)
      setSelectedProductsDetails(ordered)
    } catch (e) {
      console.error('Seçili ürün detayları alınamadı:', e)
    }
  }

  async function handleSearchProducts(term: string) {
    setProductSearchTerm(term)
    if (!term.trim() || term.trim().length < 2) {
      setProductSearchResults([])
      return
    }

    setSearchingProducts(true)
    try {
      const akdagDb = createAkdagBrowserClient()
      const clean = term.trim()
      const [akdagRes, sescimRes] = await Promise.all([
        akdagDb
          .from('urunler')
          .select('id, ad, marka, kategori, fiyat, para_birimi, fotograflar, stok_durumu')
          .or(`ad.ilike.%${clean}%,marka.ilike.%${clean}%,kategori.ilike.%${clean}%`)
          .limit(15),
        supabase
          .from('urunler')
          .select('id, ad, marka, kategori:kategori_id, fiyat, para_birimi, fotograflar, stok_durumu')
          .or(`ad.ilike.%${clean}%,marka.ilike.%${clean}%`)
          .limit(10),
      ])

      const map = new Map<string, any>()
      ;(akdagRes.data || []).forEach((p: any) => map.set(p.id, p))
      ;(sescimRes.data || []).forEach((p: any) => {
        if (!map.has(p.id)) map.set(p.id, p)
      })

      setProductSearchResults(Array.from(map.values()))
    } catch (err) {
      console.error('Ürün arama hatası:', err)
    } finally {
      setSearchingProducts(false)
    }
  }

  function addProductToSet(prod: any) {
    if (formData.urun_idler.includes(prod.id)) return
    const nextIds = [...formData.urun_idler, prod.id]
    setFormData((prev) => ({ ...prev, urun_idler: nextIds }))
    setSelectedProductsDetails((prev) => [...prev, prod])
  }

  function removeProductFromSet(id: string) {
    const nextIds = formData.urun_idler.filter((x) => x !== id)
    setFormData((prev) => ({ ...prev, urun_idler: nextIds }))
    setSelectedProductsDetails((prev) => prev.filter((p) => p.id !== id))
  }

  function moveProductInSet(index: number, direction: 'up' | 'down') {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= selectedProductsDetails.length) return

    const nextDetails = [...selectedProductsDetails]
    const temp = nextDetails[index]
    nextDetails[index] = nextDetails[targetIdx]
    nextDetails[targetIdx] = temp

    setSelectedProductsDetails(nextDetails)
    setFormData((prev) => ({
      ...prev,
      urun_idler: nextDetails.map((p) => p.id),
    }))
  }

  async function seedDefaults() {
    if (!confirm('Varsayılan 6 ilham setini veritabanına aktarmak istiyor musunuz?')) return
    setSaving(true)
    try {
      const itemsToInsert = DEFAULT_INSPIRATION_SETS.map((item) => ({
        baslik: item.baslik,
        alt_yazi: packInspirationSetMeta({
          subtitle: item.alt_yazi || '',
          description: item.aciklama || '',
          badge: item.rozet || 'HAZIR SET',
          product_ids: item.urun_idler || [],
        }),
        resim_url: item.resim_url,
        link: item.link,
        aktif: item.aktif,
        sira: item.sira,
      }))
      const { error } = await supabase.from('bannerlar').insert(itemsToInsert)
      if (error) throw error
      await triggerRevalidate()
      alert('Varsayılan setler başarıyla eklendi!')
      loadSets()
    } catch (err: any) {
      alert('Hata: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.baslik.trim() || !formData.resim_url.trim()) {
      alert('Lütfen başlık ve görsel URL alanlarını doldurun.')
      return
    }

    setSaving(true)
    try {
      const packedAltYazi = packInspirationSetMeta({
        subtitle: formData.alt_yazi,
        description: formData.aciklama,
        badge: formData.rozet || 'HAZIR SET',
        product_ids: formData.urun_idler,
      })

      const payload = {
        baslik: formData.baslik.trim(),
        alt_yazi: packedAltYazi,
        resim_url: formData.resim_url.trim(),
        link: formData.link.trim() || '/urunler',
        sira: Number(formData.sira) || 1,
        aktif: formData.aktif,
      }

      if (editingId) {
        const { error } = await supabase.from('bannerlar').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('bannerlar').insert([payload])
        if (error) throw error
      }

      await triggerRevalidate()
      resetForm()
      loadSets()
    } catch (err: any) {
      alert('Kaydedilemedi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item: InspirationSet) {
    setEditingId(item.id)
    const ids = item.urun_idler || []
    setFormData({
      baslik: item.baslik,
      alt_yazi: item.alt_yazi || '',
      aciklama: item.aciklama || '',
      rozet: item.rozet || 'HAZIR SET',
      resim_url: item.resim_url,
      link: item.link || '',
      sira: item.sira || 1,
      aktif: item.aktif,
      urun_idler: ids,
    })
    setShowForm(true)
    loadProductDetailsByIds(ids)
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu ilham setini silmek istediğinize emin misiniz?')) return
    try {
      const { error } = await supabase.from('bannerlar').delete().eq('id', id)
      if (error) throw error
      await triggerRevalidate()
      setSets(sets.filter((s) => s.id !== id))
    } catch (err: any) {
      alert('Silinemedi: ' + err.message)
    }
  }

  async function toggleActive(item: InspirationSet) {
    try {
      const { error } = await supabase
        .from('bannerlar')
        .update({ aktif: !item.aktif })
        .eq('id', item.id)

      if (error) throw error
      await triggerRevalidate()
      setSets(sets.map((s) => (s.id === item.id ? { ...s, aktif: !s.aktif } : s)))
    } catch (err: any) {
      alert('Güncellenemedi: ' + err.message)
    }
  }

  function resetForm() {
    setFormData({
      baslik: '',
      alt_yazi: '',
      aciklama: '',
      rozet: 'HAZIR SET',
      resim_url: '',
      link: '',
      sira: sets.length + 1,
      aktif: true,
      urun_idler: [],
    })
    setSelectedProductsDetails([])
    setProductSearchTerm('')
    setProductSearchResults([])
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-display font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Sparkles className="text-brand-red" size={22} />
            İlham Veren Setler & Hazır Kombin Yönetimi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Keşfet sayfasında (/urunler) müşterilerin içindeki gerçek ürünleri inceleyip özelleştirerek tek tıkla sepete ekleyebildiği profesyonel hazır paketler.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sets.length === 0 && (
            <button
              onClick={seedDefaults}
              disabled={saving}
              className="btn-outline text-xs flex items-center gap-1.5"
            >
              <Layers size={14} /> Varsayılan 6 Seti Yükle
            </button>
          )}
          <button
            onClick={() => {
              resetForm()
              setShowForm(!showForm)
            }}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Formu Kapat' : 'Yeni Set Ekle'}
          </button>
        </div>
      </div>

      {/* EKLE / DÜZENLE FORMU */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl border-2 border-brand-red/20 shadow-md space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-display font-bold uppercase tracking-wider text-slate-800">
              {editingId ? 'İlham Setini Düzenle' : 'Yeni İlham Seti Oluştur'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Set Başlığı (Emoji ile başlayabilirsiniz) *
              </label>
              <input
                type="text"
                placeholder="Örn: 🎙️ Podcast'e Başla"
                value={formData.baslik}
                onChange={(e) => setFormData({ ...formData, baslik: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Üst Rozet Metni
              </label>
              <input
                type="text"
                placeholder="Örn: PODCAST PAKETİ, STÜDYO ÇÖZÜMÜ, HAZIR SET"
                value={formData.rozet}
                onChange={(e) => setFormData({ ...formData, rozet: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bileşen Etiketleri (+ ile ayırın)
              </label>
              <input
                type="text"
                placeholder="Örn: Mikrofon + Masa Kolu + Kulaklık + Ses Kartı"
                value={formData.alt_yazi}
                onChange={(e) => setFormData({ ...formData, alt_yazi: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Kapak Görseli URL veya Yükleme *
                </label>
                <label className="cursor-pointer text-[11px] font-bold text-brand-red hover:underline flex items-center gap-1">
                  {uploadingImage ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Yükleniyor...
                    </>
                  ) : (
                    <>
                      <Upload size={12} /> Cihazdan Yükle
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              </div>
              <input
                type="url"
                placeholder="https://images.unsplash.com/... veya Cihazdan Yükle"
                value={formData.resim_url}
                onChange={(e) => setFormData({ ...formData, resim_url: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Uzman Kombin Açıklaması (Set İnceleme Penceresinde Görünür)
              </label>
              <textarea
                rows={2}
                placeholder="Örn: Yayıncı kalitesinde temiz vokal kaydı ve sıfır gecikmeli kulaklık takibi için ses mühendislerimizce eşleştirilmiş tam uyumlu paket."
                value={formData.aciklama}
                onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                İlgili Kategori Linki (&quot;Kategoriyi Gör&quot; butonu için)
              </label>
              <input
                type="text"
                placeholder="/urunler/studyo-ekipmanlari"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gösterim Sırası
                </label>
                <input
                  type="number"
                  value={formData.sira}
                  onChange={(e) =>
                    setFormData({ ...formData, sira: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
                  min="1"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.aktif}
                    onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-red focus:ring-brand-red"
                  />
                  <span>Hemen Yayına Al</span>
                </label>
              </div>
            </div>
          </div>

          {/* SET ÜRÜNLERİ SEÇİCİ */}
          <div className="border-t border-slate-200 pt-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Package size={15} className="text-brand-red" />
                  Set İçindeki Ürünler ({selectedProductsDetails.length} Ürün Seçildi)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sete dahil etmek istediğiniz ürünleri aşağıdan arayıp ekleyin. Ürün seçmezseniz sistem kategoriye uygun stoktaki ürünlerden otomatik kombin oluşturur.
                </p>
              </div>
            </div>

            {/* Seçili Ürünler Listesi */}
            {selectedProductsDetails.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {selectedProductsDetails.map((prod, idx) => (
                  <div
                    key={prod.id}
                    className="flex items-center gap-2.5 bg-white p-2 rounded-lg border border-slate-200 shadow-2xs"
                  >
                    <div className="w-10 h-10 rounded bg-slate-50 border border-slate-100 p-1 shrink-0 relative overflow-hidden">
                      <SafeProductImage
                        src={prod.fotograflar?.[0]}
                        alt={prod.ad}
                        fill
                        sizes="40px"
                        className="object-contain"
                        placeholderIconSize={14}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{prod.ad}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {prod.marka || prod.kategori} • {prod.fiyat} {prod.para_birimi || 'TRY'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveProductInSet(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Yukarı Taşı"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveProductInSet(idx, 'down')}
                        disabled={idx === selectedProductsDetails.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Aşağı Taşı"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProductFromSet(prod.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="Setten Çıkar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ürün Arama Kutusu */}
            <div className="space-y-2">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => handleSearchProducts(e.target.value)}
                  placeholder="Sete ürün eklemek için ürün adı, marka veya kategori arayın (örn: Behringer, Mikrofon, Kulaklık)..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-brand-red"
                />
                {searchingProducts && (
                  <Loader2
                    size={15}
                    className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-brand-red"
                  />
                )}
              </div>

              {productSearchResults.length > 0 && (
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-sm">
                  {productSearchResults.map((prod) => {
                    const alreadyAdded = formData.urun_idler.includes(prod.id)
                    return (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between gap-3 p-2.5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded bg-slate-100 p-1 shrink-0 relative overflow-hidden">
                            <SafeProductImage
                              src={prod.fotograflar?.[0]}
                              alt={prod.ad}
                              fill
                              sizes="36px"
                              className="object-contain"
                              placeholderIconSize={14}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-800 truncate">
                              {prod.ad}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {prod.marka} • {prod.kategori} • {prod.fiyat}{' '}
                              {prod.para_birimi || 'TRY'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => addProductToSet(prod)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                            alreadyAdded
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-brand-red text-white hover:bg-red-700'
                          }`}
                        >
                          {alreadyAdded ? 'Eklendi' : '+ Sete Ekle'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Save size={14} />{' '}
              {saving
                ? 'Kaydediliyor...'
                : editingId
                ? 'Değişiklikleri Kaydet'
                : 'Seti Oluştur'}
            </button>
          </div>
        </form>
      )}

      {/* LİSTE */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Yükleniyor...</div>
      ) : sets.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-4">
          <Sparkles size={40} className="mx-auto text-slate-300" />
          <div>
            <h3 className="text-base font-bold text-slate-700">Henüz İlham Seti Bulunmuyor</h3>
            <p className="text-xs text-slate-500 mt-1">
              Yukarıdaki butondan hemen yeni bir set ekleyebilir veya varsayılan 6 seti tek tıkla içeri aktarabilirsiniz.
            </p>
          </div>
          <button
            onClick={seedDefaults}
            className="btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <Layers size={14} /> Varsayılan Setleri Yükle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sets.map((item) => {
            const productCount = item.urun_idler?.length || 0
            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border overflow-hidden transition-all shadow-xs flex flex-col justify-between ${
                  item.aktif
                    ? 'border-slate-200 hover:border-slate-300'
                    : 'border-slate-200 opacity-60 bg-slate-50'
                }`}
              >
                <div className="relative h-44 w-full bg-slate-100">
                  {item.resim_url && (
                    <Image
                      src={item.resim_url}
                      alt={item.baslik}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized={true}
                      className="object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent" />

                  {/* Sıra & Durum Rozetleri */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                        #{item.sira}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          item.aktif ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                        }`}
                      >
                        {item.aktif ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <span className="bg-brand-red text-white text-[9px] font-display font-bold uppercase px-2 py-0.5 rounded">
                      {item.rozet || 'HAZIR SET'}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-display font-bold text-base uppercase leading-tight drop-shadow-sm">
                      {item.baslik}
                    </h3>
                    {item.alt_yazi && (
                      <p className="text-[11px] text-slate-200 line-clamp-1 mt-0.5 opacity-90">
                        {item.alt_yazi}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                    <Package size={13} className="text-brand-red" />
                    <span>
                      {productCount > 0
                        ? `${productCount} Özel Seçili Ürün`
                        : 'Otomatik Akıllı Kombin'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title={item.aktif ? 'Pasife Al' : 'Aktifleştir'}
                    >
                      {item.aktif ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Düzenle & Ürün Seç"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      title="Sil"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
