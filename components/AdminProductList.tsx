'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Trash2, Package, Pencil, X, Check, Search, Upload, Download, Star, Eye, EyeOff } from 'lucide-react'
import { PARA_BIRIMLERI } from '@/lib/kur'
import { createClient } from '@/lib/supabase'
import { KATEGORILER, KATEGORI_HIYERARSI } from '@/lib/categories'
import { compressImage } from './ImageCompressor'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'

interface FileEntry {
  file: File
  preview: string
  compressing: boolean
}

interface Product {
  id: string
  ad: string
  kategori: string
  fotograflar: string[]
  aciklama?: string
  fiyat?: number
  bayi_fiyati?: number
  stok_durumu?: string
  fiyat_guncelleme?: string
  para_birimi?: string
  bayi_para_birimi?: string
  stok_adedi?: number | null
  kritik_stok?: number | null
  marka?: string | null
  kullanim_alani?: string | null
  is_featured?: boolean
  sescim_fiyat?: number | null
  sescim_aktif?: boolean
}

interface Props {
  onDeleted?: () => void
  refreshTrigger?: number // Liste yenileme sinyali
}

const ITEMS_PER_PAGE = 20

export default function AdminProductList({ onDeleted, refreshTrigger }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editAd, setEditAd] = useState('')
  const [editAciklama, setEditAciklama] = useState('')
  const [editKategori, setEditKategori] = useState('')
  const [editAltKategori, setEditAltKategori] = useState('')
  const [editUrunTipi, setEditUrunTipi] = useState('')
  const [editFiyat, setEditFiyat] = useState('')
  const [editBayiF, setEditBayiF] = useState('')
  const [editStok, setEditStok] = useState('stokta')
  const [editParaBirimi, setEditParaBirimi] = useState('USD')
  const [editBayiParaBirimi, setEditBayiParaBirimi] = useState('USD')
  const [editStokAdedi, setEditStokAdedi] = useState('0')
  const [editKritikStok, setEditKritikStok] = useState('5')
  const [editMarka, setEditMarka] = useState('')
  const [editKullanim, setEditKullanim] = useState('')
  const [editModelKodu, setEditModelKodu] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [existingMarkalar, setExistingMarkalar] = useState<string[]>([])
  const [existingAlanlar, setExistingAlanlar] = useState<string[]>([])
  const [showMarkaSuggestions, setShowMarkaSuggestions] = useState(false)
  const [showAlanSuggestions, setShowAlanSuggestions] = useState(false)
  const [editFotograflar, setEditFotograflar] = useState<string[]>([])
  const [newPhotos, setNewPhotos] = useState<FileEntry[]>([])
  const [uploadError, setUploadError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const loadProducts = async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase.from('urunler').select(LIGHT_PRODUCT_FIELDS, { count: 'exact' })
    if (searchQuery) {
      query = query.or(`ad.ilike.%${searchQuery}%,kategori.ilike.%${searchQuery}%,marka.ilike.%${searchQuery}%`)
    }
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1)
    if (!error && data) {
      try {
        const { getSescimPricingMap } = await import('@/lib/sescim-pricing')
        const urunIds = data.map((p: any) => p.id)
        const pricingMap = await getSescimPricingMap(urunIds)
        
        const mergedData = data.map((p: any) => {
          const pricing = pricingMap.get(p.id)
          return {
            ...p,
            sescim_fiyat: pricing?.sescim_fiyat ?? null,
            sescim_aktif: pricing?.sescim_aktif ?? true
          }
        })
        setProducts(mergedData)
      } catch (e) {
        console.error('Failed to fetch Sescim prices for admin', e)
        setProducts(data)
      }
      setTotalCount(count || 0)
    }
    setLoading(false)
  }

  const toggleFeatured = async (product: Product) => {
    const supabase = createClient()
    const newValue = !product.is_featured
    const { error } = await supabase.from('urunler').update({ is_featured: newValue }).eq('id', product.id)
    if (!error) {
      setProducts(products.map(p => p.id === product.id ? { ...p, is_featured: newValue } : p))
      await fetch('/api/revalidate', { method: 'POST', body: JSON.stringify({ path: '/' }) }).catch(() => {})
    }
  }

  const handleSescimFiyatChange = async (productId: string, newFiyat: string) => {
    const val = newFiyat === '' ? null : parseFloat(newFiyat)
    setProducts(products.map(p => p.id === productId ? { ...p, sescim_fiyat: val } : p))
  }

  const saveSescimFiyat = async (product: Product) => {
    try {
      const { upsertSescimPricing } = await import('@/lib/sescim-pricing')
      await upsertSescimPricing(product.id, {
        sescim_fiyat: product.sescim_fiyat,
        sescim_aktif: product.sescim_aktif
      })
    } catch (e) {
      console.error(e)
    }
  }

  const toggleSescimAktif = async (product: Product) => {
    const newValue = !(product.sescim_aktif ?? true)
    try {
      const { upsertSescimPricing } = await import('@/lib/sescim-pricing')
      await upsertSescimPricing(product.id, {
        sescim_fiyat: product.sescim_fiyat,
        sescim_aktif: newValue
      })
      setProducts(products.map(p => p.id === product.id ? { ...p, sescim_aktif: newValue } : p))
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [currentPage, searchQuery, refreshTrigger]) // refreshTrigger değişince de yükle

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(search)
      setCurrentPage(0)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const openEdit = async (p: Product) => {
    setEditLoading(true)
    setEditProduct(p)
    const supabase = createClient()
    const { data: fullProduct } = await supabase.from('urunler')
      .select('id, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, bayi_fiyati, para_birimi, bayi_para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, model_kodu')
      .eq('id', p.id)
      .single()
    const prod = fullProduct || p
    setEditAd(prod.ad)
    setEditAciklama(prod.aciklama || '')
    setEditKategori(prod.kategori)
    setEditAltKategori((prod as any).alt_kategori || '')
    setEditUrunTipi((prod as any).urun_tipi || '')
    setEditFiyat(prod.fiyat?.toString() || '')
    setEditBayiF(prod.bayi_fiyati?.toString() || '')
    setEditStok(prod.stok_durumu || 'stokta')
    setEditParaBirimi(prod.para_birimi || 'USD')
    setEditBayiParaBirimi(prod.bayi_para_birimi || 'USD')
    setEditStokAdedi((prod.stok_adedi ?? 0).toString())
    setEditKritikStok((prod.kritik_stok ?? 5).toString())
    setEditMarka(prod.marka || '')
    setEditKullanim(prod.kullanim_alani || '')
    setEditModelKodu((prod as any).model_kodu || '')
    setEditFotograflar(prod.fotograflar || [])
    setNewPhotos([])
    setUploadError('')
    setSaveSuccess(false)
    setEditLoading(false)
  }

  const handleSave = async () => {
    if (!editProduct || !editAd || !editAciklama) return
    setSaving(true)
    const supabase = createClient()
    const fiyatDegisti = editFiyat !== editProduct.fiyat?.toString() || editBayiF !== editProduct.bayi_fiyati?.toString()
    const stokAdedi = Math.max(0, parseInt(editStokAdedi || '0'))
    const kritikStok = Math.max(0, parseInt(editKritikStok || '0'))
    // Siparişe Göre veya Tükendi admin tarafından bilinçli seçilmişse koru
    // Sadece 'stokta' seçilip adedi 0 ise otomatik 'tukendi' yap
    const stokDurumu = editStok !== 'stokta' ? editStok : (stokAdedi <= 0 ? 'tukendi' : 'stokta')
    const yeniUrls: string[] = []
    for (const entry of newPhotos) {
      const path = `urunler/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
      const { error: uploadErr } = await supabase.storage.from('urun-fotograflari').upload(path, entry.file)
      if (!uploadErr) {
        const { data } = supabase.storage.from('urun-fotograflari').getPublicUrl(path)
        yeniUrls.push(data.publicUrl)
      }
    }
    const sonFotograflar = [...editFotograflar, ...yeniUrls]
    await supabase.from('urunler').update({
      ad: editAd.trim(),
      aciklama: editAciklama.trim(),
      kategori: editKategori,
      alt_kategori: editAltKategori || null,
      urun_tipi: editUrunTipi || null,
      fotograflar: sonFotograflar,
      fiyat: editFiyat ? parseFloat(editFiyat) : null,
      bayi_fiyati: editBayiF ? parseFloat(editBayiF) : null,
      stok_durumu: stokDurumu,
      stok_adedi: stokAdedi,
      kritik_stok: kritikStok,
      para_birimi: editParaBirimi,
      bayi_para_birimi: editBayiParaBirimi,
      marka: editMarka.trim() || null,
      kullanim_alani: editKullanim.trim() || null,
      model_kodu: editModelKodu.trim() || null,
      updated_at: new Date().toISOString(),
      ...(fiyatDegisti ? { fiyat_guncelleme: new Date().toISOString() } : {}),
    }).eq('id', editProduct.id)
    fetch('/api/revalidate', { method: 'POST', body: JSON.stringify({ path: '/' }) }).catch(() => { })
    setSaving(false)
    setSaveSuccess(true)
    setTimeout(() => { setEditProduct(null); loadProducts() }, 800)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('urunler').delete().eq('id', id)
    setDeleting(null)
    fetch('/api/revalidate', { method: 'POST', body: JSON.stringify({ path: '/' }) }).catch(() => { })
    loadProducts()
  }

  const handleNewFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const totalCount = editFotograflar.length + newPhotos.length
    for (const file of selected.slice(0, 10 - totalCount)) {
      const preview = URL.createObjectURL(file)
      setNewPhotos(p => [...p, { file, preview, compressing: true }])
      const compressed = await compressImage(file)
      setNewPhotos(p => p.map(e => e.preview === preview ? { ...e, file: compressed, compressing: false } : e))
    }
    e.target.value = ''
  }

  const removeExistingPhoto = (url: string) => {
    setEditFotograflar(p => p.filter(x => x !== url))
  }

  const removeNewPhoto = (preview: string) => {
    setNewPhotos(p => {
      const e = p.find(x => x.preview === preview)
      if (e) URL.revokeObjectURL(e.preview)
      return p.filter(x => x.preview !== preview)
    })
  }

  const [importing, setImporting] = useState(false)

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const data = await file.arrayBuffer()
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet)
      const upsertData = jsonData.map(row => ({
        ...(row['ID'] || row['ID (SİSTEM)'] ? { id: row['ID'] || row['ID (SİSTEM)'] } : {}),
        ad: row['ÜRÜN ADI'] || row['Ürün Adı'],
        kategori: row['KATEGORİ'] || row['Kategori'],
        marka: (row['MARKA'] || row['Marka']) !== '-' ? (row['MARKA'] || row['Marka']) : null,
        model_kodu: row['STOK KODU'] || row['Stok Kodu'] || row['MODEL KODU'] || null,
        fiyat: parseFloat(row['FİYAT'] || row['Fiyat']) || 0,
        para_birimi: row['PARA BİRİMİ'] || row['Para Birimi'] || 'TRY',
        bayi_fiyati: parseFloat(row['BAYİ FİYATI'] || row['Bayi Fiyatı']) || null,
        bayi_para_birimi: row['BAYİ PARA BİRİMİ'] || row['Bayi Para Birimi'] || 'TRY',
        stok_adedi: parseInt(row['STOK ADEDİ'] || row['Stok Adedi']) || 0,
        stok_durumu: (row['STOK DURUMU'] || row['Stok Durumu']) === 'Stokta' ? 'stokta' : (row['STOK DURUMU'] || row['Stok Durumu']) === 'Tükendi' ? 'tukendi' : 'siparise_gore',
        fiyat_guncelleme: new Date().toISOString()
      })).filter(item => item.ad && item.kategori)
      if (upsertData.length > 0) {
        const supabase = createClient()
        const { error } = await supabase.from('urunler').upsert(upsertData, { onConflict: 'id' })
        if (error) throw error
        alert(`${upsertData.length} ürün başarıyla güncellendi/eklendi!`)
        loadProducts()
      }
    } catch (err: any) {
      alert('Excel yüklenirken hata oluştu: ' + err.message)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const exportToExcel = async () => {
    const supabase = createClient()
    const { data: allProducts } = await supabase.from('urunler').select('id, model_kodu, ad, kategori, marka, fiyat, para_birimi, bayi_fiyati, bayi_para_birimi, stok_adedi, stok_durumu, fiyat_guncelleme').order('ad')
    if (!allProducts) return

    const XLSX = await import('xlsx')

    const dataToExport = allProducts.map((p: Product) => ({
      'STOK KODU': (p as any).model_kodu || '-',
      'ÜRÜN ADI': p.ad,
      'KATEGORİ': p.kategori,
      'MARKA': p.marka || '-',
      'FİYAT': p.fiyat || 0,
      'PARA BİRİMİ': p.para_birimi || 'TRY',
      'BAYİ FİYATI': p.bayi_fiyati || 0,
      'BAYİ PARA BİRİMİ': p.bayi_para_birimi || 'TRY',
      'STOK ADEDİ': p.stok_adedi || 0,
      'STOK DURUMU': p.stok_durumu === 'stokta' ? 'Stokta' : p.stok_durumu === 'tukendi' ? 'Tükendi' : 'Siparişe Göre',
      'SON GÜNCELLEME': p.fiyat_guncelleme ? new Date(p.fiyat_guncelleme).toLocaleDateString('tr-TR') : '-',
      'ID (SİSTEM)': p.id,
    }))
    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    worksheet['!cols'] = [
      { wch: 18 }, { wch: 60 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 38 },
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Akdağ Elektronik Ürün Listesi')
    const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')
    XLSX.writeFile(workbook, `Akdag_Elektronik_Fiyat_Listesi_${dateStr}.xlsx`)
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-red" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`${totalCount} ürün içinde ara...`}
            className="input-dark pl-10 pr-10"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className={`cursor-pointer bg-blue-600/10 border border-blue-600/20 text-blue-500 px-4 py-2 rounded-sm text-[10px] font-bold uppercase hover:bg-blue-600/20 transition-all flex items-center gap-2 whitespace-nowrap ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={12} /> {importing ? 'YÜKLENİYOR...' : 'EXCEL YÜKLE'}
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
          </label>
          <button onClick={exportToExcel} className="bg-green-600/10 border border-green-600/20 text-green-500 px-4 py-2 rounded-sm text-[10px] font-bold uppercase hover:bg-green-600/20 transition-all flex items-center gap-2 whitespace-nowrap">
            <Download size={12} /> Excel'e Aktar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="border border-white/5 bg-[#141414] p-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" />
          <p className="font-display font-bold text-[10px] tracking-[0.2em] uppercase text-white/20">Ürünler Yükleniyor...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="border border-white/5 bg-[#141414] p-10 text-center">
          <Search size={40} className="text-white/5 mx-auto mb-4" />
          <p className="font-display font-bold text-sm uppercase text-white/20 tracking-widest">
            {search ? `"${search}" için sonuç bulunamadı` : "Henüz ürün eklenmemiş"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar space-y-1">
            {products.map((product) => (
              <div key={product.id} className="bg-[#141414] border border-white/5 p-3 flex items-center gap-4 hover:border-white/10 transition-colors group">
                <div className="w-12 h-12 bg-black border border-white/5 flex-shrink-0 relative overflow-hidden">
                  {product.fotograflar?.[0] ? (
                    <Image src={product.fotograflar[0]} alt={product.ad} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/5"><Package size={20} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-sm uppercase text-white truncate tracking-wide">{product.ad}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="font-body text-white/40 text-[10px] uppercase tracking-wider">{product.kategori}</span>
                    {product.fiyat && (
                      <span className="font-display font-bold text-[10px] text-white/40 line-through">
                        {PARA_BIRIMLERI.find(p => p.value === product.para_birimi)?.symbol || ''} {product.fiyat.toLocaleString('tr-TR')} {product.para_birimi || 'TL'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <label className="text-[9px] text-brand-red/60 uppercase tracking-widest font-bold mb-0.5">Sescim Fiyatı</label>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="Fiyat Yok"
                      value={product.sescim_fiyat === null || product.sescim_fiyat === undefined ? '' : product.sescim_fiyat}
                      onChange={(e) => handleSescimFiyatChange(product.id, e.target.value)}
                      onBlur={() => saveSescimFiyat(product)}
                      className="input-dark w-24 text-xs py-1 px-2 border-brand-red/30 focus:border-brand-red"
                    />
                  </div>
                  <button onClick={() => toggleSescimAktif(product)} className={`w-9 h-9 border flex items-center justify-center transition-all mt-3 ${product.sescim_aktif === false ? 'border-red-500/50 text-red-500 bg-red-500/10' : 'border-green-500/50 text-green-500 bg-green-500/10'}`} title={product.sescim_aktif === false ? "Sescim'de Gizli" : "Sescim'de Göster"}>
                    {product.sescim_aktif === false ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button onClick={() => toggleFeatured(product)} className={`w-9 h-9 border flex items-center justify-center transition-all ${product.is_featured ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' : 'border-white/10 text-white/20 hover:border-yellow-500/40 hover:text-yellow-500'}`} title={product.is_featured ? "Öne Çıkanlardan Kaldır" : "Öne Çıkar"}>
                    <Star size={13} fill={product.is_featured ? "currentColor" : "none"} />
                  </button>
                  <button onClick={() => openEdit(product)} className="w-9 h-9 border border-white/10 flex items-center justify-center text-white/20 hover:border-brand-red/40 hover:text-brand-red transition-all"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(product.id)} disabled={deleting === product.id} className="w-9 h-9 border border-white/10 flex items-center justify-center text-white/20 hover:border-red-500/40 hover:text-red-500 transition-all disabled:opacity-40">
                    {deleting === product.id ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="text-[10px] font-display font-bold text-white/20 uppercase tracking-widest">
                Sayfa {currentPage + 1} / {totalPages} — Toplam {totalCount} Ürün
              </div>
              <div className="flex gap-2">
                <button disabled={currentPage === 0 || loading} onClick={() => setCurrentPage(prev => prev - 1)} className="px-4 py-2 bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase hover:bg-white/10 hover:text-white transition-all disabled:opacity-20">Önceki</button>
                <button disabled={currentPage >= totalPages - 1 || loading} onClick={() => setCurrentPage(prev => prev + 1)} className="px-4 py-2 bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase hover:bg-white/10 hover:text-white transition-all disabled:opacity-20">Sonraki</button>
              </div>
            </div>
          )}
        </div>
      )}

      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 w-full max-w-lg flex flex-col" style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)', maxHeight: 'calc(100vh - 80px)' }}>
            <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
              <div>
                <div className="font-display font-black text-lg uppercase text-white">Ürün Düzenle</div>
                <div className="font-body text-white/30 text-xs mt-0.5 truncate max-w-xs">{editProduct.ad}</div>
              </div>
              <button onClick={() => setEditProduct(null)} className="text-white/20 hover:text-white transition-colors p-1"><X size={20} /></button>
            </div>
            <div className="p-6 pb-32 space-y-4 overflow-y-auto flex-1">
              {editLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-10 h-10 border-4 border-white/10 border-t-brand-red rounded-full animate-spin" />
                  <p className="font-display font-bold text-xs uppercase text-white/30 tracking-widest">Detaylar Yükleniyor...</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Ürün Adı *</label>
                    <input type="text" value={editAd} onChange={e => setEditAd(e.target.value)} className="input-dark" />
                  </div>
                  <div className="border border-white/5 bg-[#1A1A1A] p-3 space-y-2">
                    <span className="font-display font-semibold text-xs tracking-widest uppercase text-white/40">Kategori Hiyerarşisi</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-brand-red/60 block mb-1">Ana</label>
                        <select value={editKategori} onChange={e => { setEditKategori(e.target.value); setEditAltKategori(''); setEditUrunTipi('') }} className="input-dark appearance-none cursor-pointer text-sm">
                          {KATEGORILER.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-brand-red/60 block mb-1">Alt</label>
                        <select value={editAltKategori} onChange={e => { setEditAltKategori(e.target.value); setEditUrunTipi('') }} className="input-dark appearance-none cursor-pointer text-sm">
                          <option value="">—</option>
                          {(KATEGORI_HIYERARSI.find(k => k.label === editKategori)?.altKategoriler || []).map(a => <option key={a.label} value={a.label}>{a.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-brand-red/60 block mb-1">Tip</label>
                        <select value={editUrunTipi} onChange={e => setEditUrunTipi(e.target.value)} className="input-dark appearance-none cursor-pointer text-sm">
                          <option value="">—</option>
                          {(KATEGORI_HIYERARSI.find(k => k.label === editKategori)?.altKategoriler.find(a => a.label === editAltKategori)?.detaylar || []).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Açıklama *</label>
                    <textarea value={editAciklama} onChange={e => setEditAciklama(e.target.value)} rows={4} className="input-dark resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-white/20 block mb-1">Fiyat</label>
                      <input type="number" step="0.01" value={editFiyat} onChange={e => setEditFiyat(e.target.value)} className="input-dark" />
                      <select value={editParaBirimi} onChange={e => setEditParaBirimi(e.target.value)} className="absolute right-2 top-7 bg-transparent text-white/40 border-none outline-none text-xs">
                        {PARA_BIRIMLERI.map(p => <option key={p.value} value={p.value}>{p.value}</option>)}
                      </select>
                    </div>
                    <div className="relative">
                      <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-green-500/40 block mb-1">Bayi Fiyatı</label>
                      <input type="number" step="0.01" value={editBayiF} onChange={e => setEditBayiF(e.target.value)} className="input-dark border-green-500/10 focus:border-green-500/40" />
                      <select value={editBayiParaBirimi} onChange={e => setEditBayiParaBirimi(e.target.value)} className="absolute right-2 top-7 bg-transparent text-white/40 border-none outline-none text-xs">
                        {PARA_BIRIMLERI.map(p => <option key={p.value} value={p.value}>{p.value}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Stok Durumu — admin bilinçli seçim yapabilsin */}
                  <div>
                    <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Stok Durumu</label>
                    <select value={editStok} onChange={e => setEditStok(e.target.value)} className="input-dark appearance-none cursor-pointer">
                      <option value="stokta">Stokta</option>
                      <option value="tukendi">Tükendi</option>
                      <option value="siparise_gore">Siparişe Göre</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-white/20 block mb-1">Stok Adedi</label>
                      <input type="number" value={editStokAdedi} onChange={e => setEditStokAdedi(e.target.value)} className="input-dark" />
                    </div>
                    <div className="relative">
                      <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-white/20 block mb-1">Kritik Stok</label>
                      <input type="number" value={editKritikStok} onChange={e => setEditKritikStok(e.target.value)} className="input-dark" />
                    </div>
                  </div>
                  {/* Model Kodu (Stok Kodu) */}
                  <div>
                    <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Model Kodu / Stok Kodu</label>
                    <input type="text" value={editModelKodu} onChange={e => setEditModelKodu(e.target.value)} className="input-dark" placeholder="Örn: M7CL-48" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-white/20 block mb-1">Marka</label>
                      <input type="text" value={editMarka} onChange={e => { setEditMarka(e.target.value); fetchMarkaSuggestions(e.target.value) }} onFocus={() => setShowMarkaSuggestions(true)} onBlur={() => setTimeout(() => setShowMarkaSuggestions(false), 200)} className="input-dark" />
                      {showMarkaSuggestions && existingMarkalar.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-[#1A1A1A] border border-white/10 max-h-32 overflow-y-auto">
                          {existingMarkalar.filter(m => m.toLowerCase().includes(editMarka.toLowerCase())).map(m => (
                            <button key={m} onClick={() => setEditMarka(m)} className="w-full text-left px-3 py-2 text-xs text-white/60 hover:bg-white/5">{m}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-white/20 block mb-1">Kullanım Alanı</label>
                      <input type="text" value={editKullanim} onChange={e => { setEditKullanim(e.target.value); fetchAlanSuggestions(e.target.value) }} onFocus={() => setShowAlanSuggestions(true)} onBlur={() => setTimeout(() => setShowAlanSuggestions(false), 200)} className="input-dark" />
                      {showAlanSuggestions && existingAlanlar.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-[#1A1A1A] border border-white/10 max-h-32 overflow-y-auto">
                          {existingAlanlar.filter(a => a.toLowerCase().includes(editKullanim.toLowerCase())).map(a => (
                            <button key={a} onClick={() => setEditKullanim(a)} className="w-full text-left px-3 py-2 text-xs text-white/60 hover:bg-white/5">{a}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block">Fotoğraflar (En fazla 10)</label>
                    <div className="grid grid-cols-5 gap-2">
                      {editFotograflar.map((url, i) => (
                        <div key={i} className="aspect-square relative group bg-black border border-white/5">
                          <Image src={url} alt="" fill className="object-cover" />
                          <button onClick={() => removeExistingPhoto(url)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                        </div>
                      ))}
                      {newPhotos.map((p, i) => (
                        <div key={i} className="aspect-square relative group bg-black border border-white/10">
                          <Image src={p.preview} alt="" fill className={`object-cover ${p.compressing ? 'opacity-30' : ''}`} />
                          {p.compressing ? (
                            <div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-4 border-2 border-white/10 border-t-white rounded-full animate-spin" /></div>
                          ) : (
                            <button onClick={() => removeNewPhoto(p.preview)} className="absolute -top-1 -right-1 w-5 h-5 bg-brand-red text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                          )}
                        </div>
                      ))}
                      {editFotograflar.length + newPhotos.length < 10 && (
                        <label className="aspect-square flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 hover:border-brand-red/40 cursor-pointer transition-colors">
                          <Upload size={16} className="text-white/20" />
                          <span className="font-display font-bold text-[8px] uppercase text-white/20">EKLE</span>
                          <input type="file" multiple accept="image/*" className="hidden" onChange={handleNewFiles} />
                        </label>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6 pt-3 border-t border-white/5 flex-shrink-0 bg-[#141414]">
              <button onClick={handleSave} disabled={saving || !editAd || !editAciklama || newPhotos.some(n => n.compressing)} className={`btn-primary flex-1 justify-center text-sm disabled:opacity-40 ${saveSuccess ? '!bg-green-600' : ''}`}>
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : saveSuccess ? <Check size={15} /> : null}
                {saving ? 'Kaydediliyor...' : saveSuccess ? 'Kaydedildi!' : 'Kaydet'}
              </button>
              <button onClick={() => setEditProduct(null)} className="btn-outline text-sm px-5">İptal</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
