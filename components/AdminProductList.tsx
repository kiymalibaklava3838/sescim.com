'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import SafeProductImage from './SafeProductImage'
import {
  Trash2,
  Package,
  Pencil,
  X,
  Check,
  Search,
  Upload,
  Download,
  Star,
  Eye,
  EyeOff,
  MessageSquareText,
  AlertTriangle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Boxes,
  Layers,
  Sparkles,
  Tag
} from 'lucide-react'
import { PARA_BIRIMLERI, DEFAULT_KUR, type KurData } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'
import { createAkdagBrowserClient } from '@/lib/supabase-akdag'
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
  slug?: string
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
  model_kodu?: string | null
  is_featured?: boolean
  sescim_fiyat?: number | null
  sescim_indirimli_fiyat?: number | null
  sescim_aktif?: boolean
  fiyat_sorunuz?: boolean
  sescim_stok?: number | null
  sescim_stok_durumu?: string | null
  kaynak?: 'sescim' | 'akdag'
}

interface Props {
  onDeleted?: () => void
  refreshTrigger?: number
}

const ITEMS_PER_PAGE = 20
type FilterTab = 'all' | 'sescim' | 'akdag' | 'quote' | 'no_photo'

export default function AdminProductList({ onDeleted, refreshTrigger }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [kur, setKur] = useState<KurData>(DEFAULT_KUR)
  const [totalCount, setTotalCount] = useState(0)
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('all')
  const [noPhotoCount, setNoPhotoCount] = useState(0)
  const [sescimCount, setSescimCount] = useState(0)
  const [akdagCount, setAkdagCount] = useState(0)
  const [quoteCount, setQuoteCount] = useState(0)

  // Kaydedildi anlık geri bildirimi
  const [savedPriceId, setSavedPriceId] = useState<string | null>(null)
  const [savedStockId, setSavedStockId] = useState<string | null>(null)

  useEffect(() => {
    getKurClient().then(setKur).catch(() => {})
  }, [])

  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  // Düzenleme Modal State'leri
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editAd, setEditAd] = useState('')
  const [editAciklama, setEditAciklama] = useState('')
  const [editKategori, setEditKategori] = useState('')
  const [editAltKategori, setEditAltKategori] = useState('')
  const [editUrunTipi, setEditUrunTipi] = useState('')
  const [editFiyat, setEditFiyat] = useState('')
  const [editBayiF, setEditBayiF] = useState('')
  const [editSescimFiyat, setEditSescimFiyat] = useState('')
  const [editSescimIndirimli, setEditSescimIndirimli] = useState('')
  const [editSescimStok, setEditSescimStok] = useState('')
  const [editSescimStokDurumu, setEditSescimStokDurumu] = useState('')
  const [editIsFeatured, setEditIsFeatured] = useState(false)
  const [editFiyatSorunuz, setEditFiyatSorunuz] = useState(false)
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
    const akdagClient = createAkdagBrowserClient()
    const sescimClient = createClient()

    try {
      // 1. Sescim'in kendi ürünlerini çek
      let sescimQuery = sescimClient
        .from('urunler')
        .select(
          'id, slug, ad, aciklama, kategori:kategori_id, alt_kategori:alt_kategori_id, fotograflar, fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, model_kodu, is_featured, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, created_at'
        )
      if (searchQuery) {
        sescimQuery = sescimQuery.or(
          `ad.ilike.%${searchQuery}%,kategori_id.ilike.%${searchQuery}%,marka.ilike.%${searchQuery}%`
        )
      }
      const { data: sescimData } = await sescimQuery.order('created_at', { ascending: false })

      // 2. Akdağ ortak kataloğunu çek (salt okunur)
      let akdagQuery = akdagClient.from('urunler').select(LIGHT_PRODUCT_FIELDS)
      if (searchQuery) {
        akdagQuery = akdagQuery.or(
          `ad.ilike.%${searchQuery}%,kategori.ilike.%${searchQuery}%,marka.ilike.%${searchQuery}%`
        )
      }
      const { data: akdagData } = await akdagQuery.order('created_at', { ascending: false })

      // Akdağ ürünlerinin ID kümesi
      const akdagIdSet = new Set((akdagData || []).map((p: any) => p.id))

      // Bağımsız Sescim ürünleri
      const uniqueSescim: Product[] = (sescimData || [])
        .filter((p: any) => !akdagIdSet.has(p.id))
        .map((p: any) => ({
          ...p,
          kaynak: 'sescim',
          sescim_fiyat: p.sescim_fiyat ?? p.fiyat ?? null,
          sescim_aktif: p.sescim_aktif !== false,
        }))

      const mappedAkdag: Product[] = (akdagData || []).map((p: any) => ({
        ...p,
        kaynak: 'akdag',
      }))

      // Birleşik Liste
      const allCombined = [...uniqueSescim, ...mappedAkdag]

      // İstatistik sayaçları
      const missingPhotos = allCombined.filter(p => !p.fotograflar || p.fotograflar.length === 0)
      const sescimItems = allCombined.filter(p => p.kaynak === 'sescim')
      const akdagItems = allCombined.filter(p => p.kaynak === 'akdag')

      setNoPhotoCount(missingPhotos.length)
      setSescimCount(sescimItems.length)
      setAkdagCount(akdagItems.length)

      // Aktif sekme filtresi
      let activeList = allCombined
      if (activeFilterTab === 'sescim') activeList = sescimItems
      else if (activeFilterTab === 'akdag') activeList = akdagItems
      else if (activeFilterTab === 'no_photo') activeList = missingPhotos

      setTotalCount(activeList.length)

      // Sayfalama
      const pageStart = currentPage * ITEMS_PER_PAGE
      const pageEnd = pageStart + ITEMS_PER_PAGE
      const pageItems = activeList.slice(pageStart, pageEnd)

      // Sescim_fiyatlar tablosundan override verilerini çek
      const { getSescimPricingMap } = await import('@/lib/sescim-pricing')
      const urunIds = pageItems.map(p => p.id)
      const pricingMap = await getSescimPricingMap(urunIds)

      const finalMerged = pageItems.map(p => {
        const pricing = pricingMap.get(p.id)
        return {
          ...p,
          sescim_fiyat: pricing?.sescim_fiyat ?? p.sescim_fiyat ?? null,
          sescim_indirimli_fiyat: pricing?.sescim_indirimli_fiyat ?? p.sescim_indirimli_fiyat ?? null,
          sescim_aktif: pricing?.sescim_aktif ?? p.sescim_aktif ?? true,
          fiyat_sorunuz: pricing?.fiyat_sorunuz ?? false,
          sescim_stok: pricing?.sescim_stok ?? null,
          sescim_stok_durumu: pricing?.sescim_stok_durumu ?? null,
        }
      })

      // Eğer quote filtresi seçilmişse tekrar süz
      if (activeFilterTab === 'quote') {
        const quoteOnly = finalMerged.filter(p => p.fiyat_sorunuz)
        setProducts(quoteOnly)
      } else {
        setProducts(finalMerged)
      }
    } catch (e) {
      console.error('Failed to load combined products in admin', e)
    } finally {
      setLoading(false)
    }
  }

  // Vitrin / Öne Çıkarılan Değiştirici
  const toggleFeatured = async (product: Product) => {
    const newValue = !product.is_featured
    if (product.kaynak === 'sescim') {
      try {
        const sescimDb = createClient()
        await sescimDb.from('urunler').update({ is_featured: newValue }).eq('id', product.id)
      } catch (e) {
        console.error(e)
      }
    }
    try {
      const { upsertSescimPricing } = await import('@/lib/sescim-pricing')
      await upsertSescimPricing(product.id, {
        sescim_fiyat: product.sescim_fiyat,
        sescim_aktif: product.sescim_aktif,
        fiyat_sorunuz: product.fiyat_sorunuz,
        is_firsat: newValue,
      })
      setProducts(products.map(p => (p.id === product.id ? { ...p, is_featured: newValue } : p)))
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `/urun/${product.slug || product.id}` }),
      }).catch(() => {})
    } catch (e) {
      console.error(e)
    }
  }

  // Sescim Fiyat Değişikliği (Input on-change)
  const handleSescimFiyatChange = async (productId: string, newFiyat: string) => {
    const val = newFiyat === '' ? null : parseFloat(newFiyat)
    setProducts(products.map(p => (p.id === productId ? { ...p, sescim_fiyat: val } : p)))
  }

  // Sescim Stok Kotası Değişikliği (Input on-change)
  const handleSescimStokChange = (productId: string, newStok: string) => {
    const val = newStok.trim() === '' ? null : Math.max(0, parseInt(newStok))
    setProducts(products.map(p => (p.id === productId ? { ...p, sescim_stok: val } : p)))
  }

  // Sescim Stok Kaydet (Input on-blur)
  const saveSescimStok = async (product: Product) => {
    try {
      const { upsertSescimPricing } = await import('@/lib/sescim-pricing')
      await upsertSescimPricing(product.id, {
        sescim_fiyat: product.sescim_fiyat,
        sescim_indirimli_fiyat: product.sescim_indirimli_fiyat,
        sescim_aktif: product.sescim_aktif,
        fiyat_sorunuz: product.fiyat_sorunuz,
        sescim_stok: product.sescim_stok !== undefined ? product.sescim_stok : null,
        sescim_stok_durumu: product.sescim_stok_durumu || null,
      })
      setSavedStockId(product.id)
      setTimeout(() => setSavedStockId(null), 2000)
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `/urun/${product.slug || product.id}` }),
      }).catch(() => {})
    } catch (e) {
      console.error('Failed to save Sescim stock:', e)
    }
  }

  // Sescim Fiyat Kaydet (Input on-blur)
  const saveSescimFiyat = async (product: Product) => {
    try {
      if (product.kaynak === 'sescim') {
        const sescimDb = createClient()
        await sescimDb
          .from('urunler')
          .update({
            sescim_fiyat: product.sescim_fiyat,
            fiyat: product.sescim_fiyat,
          })
          .eq('id', product.id)
      }

      const { upsertSescimPricing } = await import('@/lib/sescim-pricing')
      await upsertSescimPricing(product.id, {
        sescim_fiyat: product.sescim_fiyat,
        sescim_indirimli_fiyat: product.sescim_indirimli_fiyat,
        sescim_aktif: product.sescim_aktif,
        fiyat_sorunuz: product.fiyat_sorunuz,
        sescim_stok: product.sescim_stok !== undefined ? product.sescim_stok : null,
        sescim_stok_durumu: product.sescim_stok_durumu || null,
      })
      setSavedPriceId(product.id)
      setTimeout(() => setSavedPriceId(null), 2000)
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `/urun/${product.slug || product.id}` }),
      }).catch(() => {})
    } catch (e) {
      console.error(e)
    }
  }

  // Sescim Yayında / Gizli Değiştirici
  const toggleSescimAktif = async (product: Product) => {
    const newValue = !(product.sescim_aktif ?? true)
    try {
      if (product.kaynak === 'sescim') {
        const sescimDb = createClient()
        await sescimDb
          .from('urunler')
          .update({
            sescim_aktif: newValue,
          })
          .eq('id', product.id)
      }

      const { upsertSescimPricing } = await import('@/lib/sescim-pricing')
      await upsertSescimPricing(product.id, {
        sescim_fiyat: product.sescim_fiyat,
        sescim_indirimli_fiyat: product.sescim_indirimli_fiyat,
        sescim_aktif: newValue,
        fiyat_sorunuz: product.fiyat_sorunuz,
        sescim_stok: product.sescim_stok !== undefined ? product.sescim_stok : null,
        sescim_stok_durumu: product.sescim_stok_durumu || null,
      })
      setProducts(products.map(p => (p.id === product.id ? { ...p, sescim_aktif: newValue } : p)))
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `/urun/${product.slug || product.id}` }),
      }).catch(() => {})
    } catch (e) {
      console.error(e)
    }
  }

  // Fiyat Teklifi (Fiyat Gizli) Değiştirici
  const toggleFiyatSorunuz = async (product: Product) => {
    const newValue = !(product.fiyat_sorunuz ?? false)
    try {
      const { upsertSescimPricing } = await import('@/lib/sescim-pricing')
      await upsertSescimPricing(product.id, {
        sescim_fiyat: product.sescim_fiyat,
        sescim_indirimli_fiyat: product.sescim_indirimli_fiyat,
        sescim_aktif: product.sescim_aktif,
        fiyat_sorunuz: newValue,
        sescim_stok: product.sescim_stok !== undefined ? product.sescim_stok : null,
        sescim_stok_durumu: product.sescim_stok_durumu || null,
      })
      setProducts(products.map(p => (p.id === product.id ? { ...p, fiyat_sorunuz: newValue } : p)))
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `/urun/${product.slug || product.id}` }),
      }).catch(() => {})
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [currentPage, searchQuery, refreshTrigger, activeFilterTab])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(search)
      setCurrentPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const fetchMarkaSuggestions = async (val: string) => {
    if (val.length < 2) return
    const supabase = createAkdagBrowserClient()
    const { data } = await supabase.from('urunler').select('marka').ilike('marka', `%${val}%`).limit(10)
    if (data) setExistingMarkalar(Array.from(new Set(data.map((x: any) => x.marka).filter(Boolean))))
  }

  const fetchAlanSuggestions = async (val: string) => {
    if (val.length < 2) return
    const supabase = createAkdagBrowserClient()
    const { data } = await supabase.from('urunler').select('kullanim_alani').ilike('kullanim_alani', `%${val}%`).limit(10)
    if (data) setExistingAlanlar(Array.from(new Set(data.map((x: any) => x.kullanim_alani).filter(Boolean))))
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Düzenleme Modalını Aç
  const openEdit = async (p: Product) => {
    setEditLoading(true)
    setEditProduct(p)
    let fullProduct = null

    if (p.kaynak === 'sescim') {
      try {
        const sescimDb = createClient()
        const { data } = await sescimDb
          .from('urunler')
          .select(
            'id, ad, aciklama, kategori:kategori_id, alt_kategori:alt_kategori_id, fotograflar, fiyat, bayi_fiyati, is_featured, para_birimi, bayi_para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, model_kodu, sescim_fiyat, sescim_indirimli_fiyat'
          )
          .eq('id', p.id)
          .maybeSingle()
        fullProduct = data
      } catch (e) {
        console.error(e)
      }
    } else {
      try {
        const akdagDb = createAkdagBrowserClient()
        const { data } = await akdagDb
          .from('urunler')
          .select(
            'id, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, bayi_fiyati, is_featured, para_birimi, bayi_para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, model_kodu'
          )
          .eq('id', p.id)
          .maybeSingle()
        fullProduct = data
      } catch (e) {
        console.error(e)
      }
    }

    const prod = fullProduct || p
    setEditAd(prod.ad)
    setEditAciklama(prod.aciklama || '')
    setEditKategori(prod.kategori)
    setEditAltKategori((prod as any).alt_kategori || '')
    setEditUrunTipi((prod as any).urun_tipi || '')
    setEditFiyat(prod.fiyat?.toString() || '')
    setEditBayiF(prod.bayi_fiyati?.toString() || '')
    setEditSescimFiyat(((prod as any).sescim_fiyat ?? p.sescim_fiyat)?.toString() || '')
    setEditSescimIndirimli(((prod as any).sescim_indirimli_fiyat ?? p.sescim_indirimli_fiyat)?.toString() || '')
    setEditSescimStok(p.sescim_stok !== null && p.sescim_stok !== undefined ? p.sescim_stok.toString() : '')
    setEditSescimStokDurumu(p.sescim_stok_durumu || '')
    setEditIsFeatured(prod.is_featured || false)
    setEditFiyatSorunuz(!!(prod as any).fiyat_sorunuz || !!p.fiyat_sorunuz)
    setEditStok(prod.stok_durumu || 'stokta')
    setEditParaBirimi(prod.para_birimi || 'TRY')
    setEditBayiParaBirimi(prod.bayi_para_birimi || 'TRY')
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

  // Düzenleme Değişikliklerini Kaydet
  const handleSave = async () => {
    if (!editProduct || !editAd || !editAciklama) return
    setSaving(true)
    const sescimDb = createClient()
    const fiyatDegisti = editFiyat !== editProduct.fiyat?.toString() || editBayiF !== editProduct.bayi_fiyati?.toString()
    const stokAdedi = Math.max(0, parseInt(editStokAdedi || '0'))
    const kritikStok = Math.max(0, parseInt(editKritikStok || '0'))
    const stokDurumu = editStok !== 'stokta' ? editStok : stokAdedi <= 0 ? 'tukendi' : 'stokta'
    const sescimStokAdedi =
      editSescimStok.trim() !== '' && !isNaN(parseInt(editSescimStok)) ? Math.max(0, parseInt(editSescimStok)) : null

    // Fotoğrafları Sescim storage bucket'ına yükle
    const yeniUrls: string[] = []
    for (const entry of newPhotos) {
      const path = `urunler/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
      const { error: uploadErr } = await sescimDb.storage.from('urun-fotograflari').upload(path, entry.file)
      if (!uploadErr) {
        const { data } = sescimDb.storage.from('urun-fotograflari').getPublicUrl(path)
        yeniUrls.push(data.publicUrl)
      }
    }
    const sonFotograflar = [...editFotograflar, ...yeniUrls]

    if (editProduct.kaynak === 'sescim') {
      const finalPrice = editFiyat ? parseFloat(editFiyat) : null
      await sescimDb
        .from('urunler')
        .update({
          ad: editAd.trim(),
          aciklama: editAciklama.trim(),
          kategori_id: editKategori,
          alt_kategori_id: editAltKategori || null,
          fotograflar: sonFotograflar,
          fiyat: finalPrice,
          bayi_fiyati: null,
          sescim_fiyat: editSescimFiyat ? parseFloat(editSescimFiyat) : finalPrice,
          sescim_indirimli_fiyat: editSescimIndirimli ? parseFloat(editSescimIndirimli) : null,
          is_featured: editIsFeatured,
          stok_durumu: stokDurumu,
          stok_adedi: stokAdedi,
          kritik_stok: kritikStok,
          para_birimi: editParaBirimi,
          marka: editMarka.trim() || null,
          kullanim_alani: editKullanim.trim() || null,
          model_kodu: editModelKodu.trim() || null,
          ...(fiyatDegisti ? { fiyat_guncelleme: new Date().toISOString() } : {}),
        })
        .eq('id', editProduct.id)
    }

    try {
      const { upsertSescimPricing } = await import('@/lib/sescim-pricing')
      await upsertSescimPricing(editProduct.id, {
        sescim_fiyat: editSescimFiyat ? parseFloat(editSescimFiyat) : null,
        sescim_indirimli_fiyat: editSescimIndirimli ? parseFloat(editSescimIndirimli) : null,
        sescim_aktif: editProduct.sescim_aktif ?? true,
        fiyat_sorunuz: editFiyatSorunuz,
        sescim_stok: sescimStokAdedi,
        sescim_stok_durumu: editSescimStokDurumu || null,
      })
    } catch (e) {
      console.error('Failed to update sescim_fiyatlar:', e)
    }

    const targetSlug = (editProduct as any).slug || editProduct.id
    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `/urun/${targetSlug}` }),
    }).catch(() => {})
    setSaving(false)
    setSaveSuccess(true)
    setTimeout(() => {
      setEditProduct(null)
      loadProducts()
    }, 800)
  }

  // Ürünü Sil
  const handleDelete = async (id: string) => {
    const target = products.find(p => p.id === id)
    if (!target) return

    if (target.kaynak === 'sescim') {
      if (!confirm(`"${target.ad}" ürününü Sescim veritabanından kalıcı olarak silmek istediğinize emin misiniz?`))
        return
      setDeleting(id)
      try {
        const sescimDb = createClient()
        await sescimDb.from('urunler').delete().eq('id', id)
        await sescimDb.from('sescim_fiyatlar').delete().eq('urun_id', id)
      } catch (e) {
        console.error('Silme hatası:', e)
      }
    } else {
      if (
        !confirm(
          `"${target.ad}" Akdağ ortak kataloğundan gelmektedir. Akdağ kataloğu değiştirilemez, ancak ürünü Sescim mağazasından gizleyebilirsiniz. Gizlemek istiyor musunuz?`
        )
      )
        return
      setDeleting(id)
      try {
        const { upsertSescimPricing } = await import('@/lib/sescim-pricing')
        await upsertSescimPricing(id, {
          sescim_fiyat: target.sescim_fiyat,
          sescim_aktif: false,
          fiyat_sorunuz: target.fiyat_sorunuz,
        })
      } catch (e) {
        console.error('Gizleme hatası:', e)
      }
    }
    setDeleting(null)
    fetch('/api/revalidate', { method: 'POST', body: JSON.stringify({ path: '/' }) }).catch(() => {})
    fetch('/api/revalidate', { method: 'POST', body: JSON.stringify({ path: '/urunler' }) }).catch(() => {})
    loadProducts()
  }

  const handleNewFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const totalCount = editFotograflar.length + newPhotos.length
    for (const file of selected.slice(0, 10 - totalCount)) {
      const preview = URL.createObjectURL(file)
      setNewPhotos(p => [...p, { file, preview, compressing: true }])
      const compressed = await compressImage(file)
      setNewPhotos(p =>
        p.map(e => (e.preview === preview ? { ...e, file: compressed, compressing: false } : e))
      )
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
      const upsertData = jsonData
        .map(row => ({
          ...(row['ID'] || row['ID (SİSTEM)'] ? { id: row['ID'] || row['ID (SİSTEM)'] } : {}),
          ad: row['ÜRÜN ADI'] || row['Ürün Adı'],
          kategori: row['KATEGORİ'] || row['Kategori'],
          marka: (row['MARKA'] || row['Marka']) !== '-' ? row['MARKA'] || row['Marka'] : null,
          model_kodu: row['STOK KODU'] || row['Stok Kodu'] || row['MODEL KODU'] || null,
          fiyat: parseFloat(row['FİYAT'] || row['Fiyat']) || 0,
          para_birimi: row['PARA BİRİMİ'] || row['Para Birimi'] || 'TRY',
          bayi_fiyati: parseFloat(row['BAYİ FİYATI'] || row['Bayi Fiyatı']) || null,
          bayi_para_birimi: row['BAYİ PARA BİRİMİ'] || row['Bayi Para Birimi'] || 'TRY',
          stok_adedi: parseInt(row['STOK ADEDİ'] || row['Stok Adedi']) || 0,
          stok_durumu:
            (row['STOK DURUMU'] || row['Stok Durumu']) === 'Stokta'
              ? 'stokta'
              : (row['STOK DURUMU'] || row['Stok Durumu']) === 'Tükendi'
              ? 'tukendi'
              : 'siparise_gore',
          fiyat_guncelleme: new Date().toISOString(),
        }))
        .filter(item => item.ad && item.kategori)
      if (upsertData.length > 0) {
        const supabase = createAkdagBrowserClient()
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
    const supabase = createAkdagBrowserClient()
    const { data: allProducts } = await supabase
      .from('urunler')
      .select(
        'id, model_kodu, ad, kategori, marka, fiyat, para_birimi, bayi_fiyati, bayi_para_birimi, stok_adedi, stok_durumu, fiyat_guncelleme'
      )
      .order('ad')
    if (!allProducts) return

    const XLSX = await import('xlsx')

    const dataToExport = (allProducts || []).map((p: any) => ({
      'STOK KODU': p.model_kodu || '-',
      'ÜRÜN ADI': p.ad,
      'KATEGORİ': p.kategori,
      'MARKA': p.marka || '-',
      'FİYAT': p.fiyat || 0,
      'PARA BİRİMİ': p.para_birimi || 'TRY',
      'BAYİ FİYATI': p.bayi_fiyati || 0,
      'BAYİ PARA BİRİMİ': p.bayi_para_birimi || 'TRY',
      'STOK ADEDİ': p.stok_adedi || 0,
      'STOK DURUMU':
        p.stok_durumu === 'stokta' ? 'Stokta' : p.stok_durumu === 'tukendi' ? 'Tükendi' : 'Siparişe Göre',
      'SON GÜNCELLEME': p.fiyat_guncelleme ? new Date(p.fiyat_guncelleme).toLocaleDateString('tr-TR') : '-',
      'ID (SİSTEM)': p.id,
    }))
    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 60 },
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 18 },
      { wch: 38 },
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Akdağ Elektronik Ürün Listesi')
    const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')
    XLSX.writeFile(workbook, `Akdag_Elektronik_Fiyat_Listesi_${dateStr}.xlsx`)
  }

  return (
    <>
      {/* ── ÜST KONTROL & ARAMA & FİLTRE PANELİ ──────────────────────── */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Arama Kutusu */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-red" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`${totalCount} ürün içinde isim, marka veya model ile ara...`}
              className="input-dark pl-11 pr-10 py-2.5 rounded-xl text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Excel & İçe/Dışa Aktarma Butonları */}
          <div className="flex items-center gap-2">
            <label
              className={`cursor-pointer bg-white border border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
                importing ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Upload size={13} className="text-blue-600" />
              <span>{importing ? 'Yükleniyor...' : 'Excel Yükle'}</span>
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
            </label>

            <button
              type="button"
              onClick={exportToExcel}
              className="bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs"
            >
              <Download size={13} className="text-emerald-600" />
              <span>Excel&apos;e Aktar</span>
            </button>
          </div>
        </div>

        {/* Hızlı Filtre Tabları */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs custom-scrollbar">
          <button
            type="button"
            onClick={() => {
              setActiveFilterTab('all')
              setCurrentPage(0)
            }}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all whitespace-nowrap border flex items-center gap-1.5 ${
              activeFilterTab === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Boxes size={13} />
            <span>Tüm Ürünler ({sescimCount + akdagCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFilterTab('sescim')
              setCurrentPage(0)
            }}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all whitespace-nowrap border flex items-center gap-1.5 ${
              activeFilterTab === 'sescim'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Sescim Kataloğu ({sescimCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFilterTab('akdag')
              setCurrentPage(0)
            }}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all whitespace-nowrap border flex items-center gap-1.5 ${
              activeFilterTab === 'akdag'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Akdağ Kataloğu ({akdagCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFilterTab('no_photo')
              setCurrentPage(0)
            }}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all whitespace-nowrap border flex items-center gap-1.5 ${
              activeFilterTab === 'no_photo'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <Camera size={13} />
            <span>Fotoğrafı Eksik ({noPhotoCount})</span>
          </button>
        </div>
      </div>

      {/* ── ÜRÜN LİSTESİ ALANI ────────────────────────────────────── */}
      {loading ? (
        <div className="border border-slate-200 bg-white rounded-2xl p-24 flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-brand-red rounded-full animate-spin" />
          <p className="font-display font-bold text-xs tracking-widest uppercase text-slate-400">
            Katalog Yükleniyor...
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="border border-slate-200 bg-white rounded-2xl p-16 text-center shadow-sm">
          <Search size={44} className="text-slate-300 mx-auto mb-3" />
          <p className="font-display font-bold text-base uppercase text-slate-800 tracking-wider">
            {search ? `"${search}" için ürün bulunamadı` : 'Bu filtrede ürün bulunamadı'}
          </p>
          <p className="text-xs text-slate-500 font-body mt-1">
            Arama terimini değiştirebilir veya tüm ürünleri görüntüleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1.5 custom-scrollbar space-y-2.5">
            {products.map(product => {
              const paraSymbol = PARA_BIRIMLERI.find(p => p.value === product.para_birimi)?.symbol || '₺'
              const tlYaklasik =
                product.sescim_fiyat && product.para_birimi && product.para_birimi !== 'TRY'
                  ? Math.round(
                      product.sescim_fiyat *
                        (product.para_birimi === 'USD'
                          ? kur?.USD || DEFAULT_KUR.USD
                          : kur?.EUR || DEFAULT_KUR.EUR)
                    )
                  : null

              return (
                <div
                  key={product.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 hover:border-slate-300 hover:shadow-md transition-all group space-y-3.5"
                >
                  {/* ── 1. KAT: ÜRÜN BİLGİSİ & AKSİYON BUTONLARI (ASLA ÇAKIŞMAZ) ── */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Sol: Görsel + İsim + Rozetler */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 border border-slate-200 rounded-xl flex-shrink-0 relative overflow-hidden shadow-2xs flex items-center justify-center">
                        <SafeProductImage
                          src={product.fotograflar?.[0]}
                          alt={product.ad}
                          fill
                          sizes="64px"
                          unoptimized={true}
                          loading="lazy"
                          placeholderIconSize={22}
                          className="object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Rozetler */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          {product.kaynak === 'sescim' ? (
                            <span className="px-2 py-0.5 text-[10px] font-display font-extrabold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md">
                              Sescim
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-display font-extrabold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                              Akdağ
                            </span>
                          )}

                          {(!product.fotograflar || product.fotograflar.length === 0) && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 rounded flex items-center gap-1">
                              <AlertTriangle size={10} /> Fotoğraf Yok
                            </span>
                          )}

                          {product.fiyat_sorunuz && (
                            <span className="px-2 py-0.5 text-[10px] font-display font-black tracking-wider uppercase bg-amber-100 text-amber-900 border border-amber-300 rounded flex items-center gap-1">
                              <MessageSquareText size={11} /> Fiyat Teklifi Modu
                            </span>
                          )}

                          {product.sescim_aktif === false && (
                            <span className="px-2 py-0.5 text-[10px] font-display font-bold uppercase bg-red-100 text-red-800 border border-red-200 rounded">
                              Sitede Gizli
                            </span>
                          )}

                          {product.is_featured && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 rounded flex items-center gap-1">
                              <Star size={10} fill="currentColor" /> Vitrin
                            </span>
                          )}
                        </div>

                        {/* Ürün Adı (Rahat, 2 satıra kadar sığar, asla üstü örtülmez) */}
                        <h4 className="font-display font-bold text-sm sm:text-base text-slate-900 tracking-wide line-clamp-2 group-hover:text-brand-red transition-colors">
                          {product.ad}
                        </h4>

                        {/* Marka & Model Kodu & Kategori */}
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-slate-500">
                          {product.marka && (
                            <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                              {product.marka}
                            </span>
                          )}
                          {product.model_kodu && (
                            <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                              {product.model_kodu}
                            </span>
                          )}
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 truncate">{product.kategori}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sağ: 5 Aksiyon Butonu (Sabit ve Düzenli) */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Sitede Göster / Gizle */}
                      <button
                        type="button"
                        onClick={() => toggleSescimAktif(product)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all shadow-2xs ${
                          product.sescim_aktif === false
                            ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
                            : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                        title={
                          product.sescim_aktif === false
                            ? "Sescim'de Gizli — Tıklayarak yayına alın"
                            : "Sescim'de Yayında — Tıklayarak siteden gizleyin"
                        }
                      >
                        {product.sescim_aktif === false ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>

                      {/* Fiyat Teklifi İsteyin Modu */}
                      <button
                        type="button"
                        onClick={() => toggleFiyatSorunuz(product)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all shadow-2xs ${
                          product.fiyat_sorunuz
                            ? 'border-amber-400 text-amber-800 bg-amber-100 font-bold shadow-xs'
                            : 'border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-600 bg-white hover:bg-amber-50'
                        }`}
                        title={
                          product.fiyat_sorunuz
                            ? "Fiyat Gizli ('Fiyat Teklifi Alın' Modu Aktif) — Tıklayarak normale döndürün"
                            : "Fiyat Normal Gösteriliyor — Tıklayarak 'Fiyat Teklifi İsteyin' moduna alın"
                        }
                      >
                        <MessageSquareText size={15} />
                      </button>

                      {/* Vitrin / Öne Çıkar */}
                      <button
                        type="button"
                        onClick={() => toggleFeatured(product)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all shadow-2xs ${
                          product.is_featured
                            ? 'border-amber-300 text-amber-500 bg-amber-50'
                            : 'border-slate-200 text-slate-300 hover:border-amber-300 hover:text-amber-500 bg-white'
                        }`}
                        title={product.is_featured ? 'Öne Çıkan Vitrininden Kaldır' : 'Öne Çıkan Vitrinine Ekle'}
                      >
                        <Star size={15} fill={product.is_featured ? 'currentColor' : 'none'} />
                      </button>

                      {/* Düzenle Modalını Aç */}
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-brand-red hover:text-brand-red hover:bg-brand-red/5 flex items-center justify-center transition-all shadow-2xs"
                        title="Ürün Detaylarını Düzenle"
                      >
                        <Pencil size={15} />
                      </button>

                      {/* Sil */}
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        disabled={deleting === product.id}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-red-300 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all shadow-2xs disabled:opacity-40"
                        title="Ürünü Sil / Mağazadan Kaldır"
                      >
                        {deleting === product.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ── 2. KAT: FİYAT VE STOK YÖNETİM PANELİ (FERAH & RAHAT) ── */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Sescim Satış Fiyatı Kutusu */}
                    <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Tag size={13} className="text-brand-red" />
                          Sescim Satış Fiyatı
                        </span>
                        <span className="font-mono text-[10px] font-extrabold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                          {product.para_birimi || 'TRY'}
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Fiyat Belirlenmedi"
                          value={
                            product.sescim_fiyat === null || product.sescim_fiyat === undefined
                              ? ''
                              : product.sescim_fiyat
                          }
                          onChange={e => handleSescimFiyatChange(product.id, e.target.value)}
                          onBlur={() => saveSescimFiyat(product)}
                          className={`input-dark w-full h-10 text-base font-bold font-mono px-3.5 pr-8 border-slate-300 focus:border-brand-red rounded-lg bg-white shadow-2xs transition-all ${
                            product.sescim_fiyat && product.fiyat && product.sescim_fiyat > product.fiyat * 3
                              ? 'border-amber-500 bg-amber-50 text-amber-900'
                              : ''
                          }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
                          {paraSymbol}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between min-h-[20px]">
                        {tlYaklasik ? (
                          <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70">
                            ≈ {tlYaklasik.toLocaleString('tr-TR')} TL
                          </span>
                        ) : product.sescim_fiyat ? (
                          <span className="text-xs font-semibold font-mono text-slate-700">
                            {Number(product.sescim_fiyat).toLocaleString('tr-TR')} TL
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Fiyat girilmedi</span>
                        )}

                        {savedPriceId === product.id && (
                          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                            <Check size={13} /> Kaydedildi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sescim Stok Kotası Kutusu */}
                    <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Boxes size={13} className="text-blue-600" />
                          Sescim Stok Kotası
                        </span>
                        <span
                          className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs"
                          title="Akdağ Ana Depo Stoğu"
                        >
                          Depo: {product.stok_adedi ?? 0} Adet
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          placeholder={
                            product.stok_adedi !== undefined && product.stok_adedi !== null
                              ? String(product.stok_adedi)
                              : 'Otomatik'
                          }
                          value={
                            product.sescim_stok === null || product.sescim_stok === undefined
                              ? ''
                              : product.sescim_stok
                          }
                          onChange={e => handleSescimStokChange(product.id, e.target.value)}
                          onBlur={() => saveSescimStok(product)}
                          className={`input-dark w-full h-10 text-sm font-mono font-semibold px-3.5 border-slate-300 focus:border-blue-600 rounded-lg bg-white shadow-2xs ${
                            product.sescim_stok !== null && product.sescim_stok !== undefined
                              ? 'border-blue-500 bg-blue-50/60 text-blue-900'
                              : ''
                          }`}
                          title={
                            product.sescim_stok !== null && product.sescim_stok !== undefined
                              ? `Sescim için ayrılan kota: ${product.sescim_stok}`
                              : `Varsayılan depo stoğu geçerli (${product.stok_adedi ?? 0})`
                          }
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between min-h-[20px]">
                        {product.sescim_stok !== null && product.sescim_stok !== undefined ? (
                          <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            Özel Kota: {product.sescim_stok} Adet
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">
                            Varsayılan Depo Stoğu ({product.stok_adedi ?? 0})
                          </span>
                        )}

                        {savedStockId === product.id && (
                          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                            <Check size={13} /> Kaydedildi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── SAYFALAMA ─────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <div className="text-xs font-display font-semibold text-slate-500 uppercase tracking-wider">
                Sayfa <span className="text-slate-900 font-bold">{currentPage + 1}</span> / {totalPages} — Toplam{' '}
                <span className="text-slate-900 font-bold">{totalCount}</span> Ürün
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 0 || loading}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold uppercase rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 shadow-2xs"
                >
                  <ChevronLeft size={14} /> Önceki
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1 || loading}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold uppercase rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 shadow-2xs"
                >
                  Sonraki <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ÜRÜN DÜZENLEME MODALI ───────────────────────────────────── */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white border border-slate-300 w-full max-w-2xl rounded-2xl flex flex-col shadow-2xl overflow-hidden"
            style={{ maxHeight: 'calc(100vh - 60px)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 flex-shrink-0 bg-slate-50/60">
              <div>
                <h3 className="font-display font-black text-lg uppercase tracking-wide text-slate-900">
                  Ürünü Düzenle
                </h3>
                <p className="font-body text-slate-500 text-xs mt-0.5 truncate max-w-md">{editProduct.ad}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditProduct(null)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 pb-24 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {editLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-red rounded-full animate-spin" />
                  <p className="font-display font-bold text-xs uppercase text-slate-400 tracking-widest">
                    Ürün Detayları Yükleniyor...
                  </p>
                </div>
              ) : (
                <>
                  {/* Ürün Adı */}
                  <div>
                    <label className="font-display font-semibold text-xs tracking-wider uppercase text-slate-700 block mb-1.5">
                      Ürün Adı *
                    </label>
                    <input
                      type="text"
                      value={editAd}
                      onChange={e => setEditAd(e.target.value)}
                      className="input-dark rounded-lg text-sm"
                    />
                  </div>

                  {/* Kategori Hiyerarşisi */}
                  <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-4 space-y-2">
                    <span className="font-display font-semibold text-xs tracking-wider uppercase text-slate-600 block">
                      Kategori Hiyerarşisi
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="font-display font-semibold text-[10px] tracking-wider uppercase text-slate-500 block mb-1">
                          Ana
                        </label>
                        <select
                          value={editKategori}
                          onChange={e => {
                            setEditKategori(e.target.value)
                            setEditAltKategori('')
                            setEditUrunTipi('')
                          }}
                          className="input-dark appearance-none cursor-pointer text-xs rounded-lg"
                        >
                          {KATEGORILER.map(k => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-display font-semibold text-[10px] tracking-wider uppercase text-slate-500 block mb-1">
                          Alt
                        </label>
                        <select
                          value={editAltKategori}
                          onChange={e => {
                            setEditAltKategori(e.target.value)
                            setEditUrunTipi('')
                          }}
                          className="input-dark appearance-none cursor-pointer text-xs rounded-lg"
                        >
                          <option value="">—</option>
                          {(
                            KATEGORI_HIYERARSI.find(k => k.label === editKategori)?.altKategoriler || []
                          ).map(a => (
                            <option key={a.label} value={a.label}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-display font-semibold text-[10px] tracking-wider uppercase text-slate-500 block mb-1">
                          Tip
                        </label>
                        <select
                          value={editUrunTipi}
                          onChange={e => setEditUrunTipi(e.target.value)}
                          className="input-dark appearance-none cursor-pointer text-xs rounded-lg"
                        >
                          <option value="">—</option>
                          {(
                            KATEGORI_HIYERARSI.find(k => k.label === editKategori)?.altKategoriler.find(
                              a => a.label === editAltKategori
                            )?.detaylar || []
                          ).map(d => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Açıklama */}
                  <div>
                    <label className="font-display font-semibold text-xs tracking-wider uppercase text-slate-700 block mb-1.5">
                      Açıklama *
                    </label>
                    <textarea
                      value={editAciklama}
                      onChange={e => setEditAciklama(e.target.value)}
                      rows={4}
                      className="input-dark resize-none rounded-lg text-xs"
                    />
                  </div>

                  {/* ── FİYATLANDIRMA BÖLÜMÜ (SESCİM B2C PERAKENDE) ── */}
                  {editProduct.kaynak === 'sescim' ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-display font-bold text-xs uppercase tracking-wider text-slate-800">
                          Fiyatlandırma
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                          Sescim Perakende
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-slate-600 block mb-1">
                            Para Birimi
                          </label>
                          <select
                            value={editParaBirimi}
                            onChange={e => setEditParaBirimi(e.target.value)}
                            className="input-dark text-xs cursor-pointer rounded-lg"
                          >
                            {PARA_BIRIMLERI.map(p => (
                              <option key={p.value} value={p.value}>
                                {p.symbol} {p.value}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-slate-700 block mb-1">
                            Satış Fiyatı ({editParaBirimi}) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editFiyat}
                            onChange={e => {
                              setEditFiyat(e.target.value)
                              setEditSescimFiyat(e.target.value)
                            }}
                            className="input-dark text-sm font-mono font-bold rounded-lg"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-slate-700 block mb-1">
                          İndirimli Fiyat ({editParaBirimi}){' '}
                          <span className="text-slate-400 font-normal lowercase">(Opsiyonel)</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editSescimIndirimli}
                          onChange={e => setEditSescimIndirimli(e.target.value)}
                          placeholder="İndirim yoksa boş bırakın"
                          className="input-dark text-xs font-mono rounded-lg"
                        />
                        {editFiyat &&
                          editSescimIndirimli &&
                          parseFloat(editSescimIndirimli) < parseFloat(editFiyat) && (
                            <div className="mt-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 p-1.5 rounded flex items-center gap-1">
                              <span>
                                ✓ %
                                {Math.round(
                                  ((parseFloat(editFiyat) - parseFloat(editSescimIndirimli)) /
                                    parseFloat(editFiyat)) *
                                    100
                                )}{' '}
                                İndirim Uygulandı
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-display font-bold text-xs uppercase tracking-wider text-slate-800">
                          Sescim.com Özel Fiyatlandırması
                        </span>
                        <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                          Akdağ Kataloğu Ürünü
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200 flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Akdağ Liste Fiyatı:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {editFiyat || '0'} {editParaBirimi}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-slate-700 block mb-1">
                            Sescim Satış Fiyatı ({editParaBirimi})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editSescimFiyat}
                            onChange={e => setEditSescimFiyat(e.target.value)}
                            placeholder={editFiyat ? `Varsayılan: ${editFiyat}` : '0.00'}
                            className="input-dark text-xs border-brand-red/30 focus:border-brand-red font-mono rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-slate-700 block mb-1">
                            Sescim İndirimli Fiyatı ({editParaBirimi})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editSescimIndirimli}
                            onChange={e => setEditSescimIndirimli(e.target.value)}
                            placeholder="İndirim Yoksa Boş"
                            className="input-dark text-xs font-mono rounded-lg"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        * Sescim fiyatı boş bırakılırsa Akdağ liste fiyatı ({editFiyat || '0'}{' '}
                        {editParaBirimi}) geçerli olur.
                      </p>
                    </div>
                  )}

                  {/* Distribütör Fiyat Koruması */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="editFiyatSorunuzCheckbox"
                      checked={editFiyatSorunuz}
                      onChange={e => setEditFiyatSorunuz(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <label
                      htmlFor="editFiyatSorunuzCheckbox"
                      className="text-xs text-slate-800 cursor-pointer select-none"
                    >
                      <strong className="font-display font-bold uppercase tracking-wider block text-amber-900">
                        Distribütör Satış Kuralı: Fiyat Gizli (&quot;Fiyat Teklifi İçin Bize Ulaşın&quot;)
                      </strong>
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        Aktif edildiğinde ürün fiyatı sitede gizlenir; sepete ekleme yerine WhatsApp ve doğrudan
                        teklif isteme butonları gösterilir.
                      </span>
                    </label>
                  </div>

                  {/* Sescim Özel Stok Kotası */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                    <div>
                      <strong className="font-display font-bold uppercase tracking-wider block text-blue-900 text-xs">
                        Sescim.com Özel Stok Ayırma (Kota Yönetimi)
                      </strong>
                      <span className="text-[11px] text-blue-800 block mt-0.5">
                        Ana depodaki stok: <strong>{editStokAdedi} adet</strong> ({editStok}). Sescim için özel
                        bir stok kotası ayırmak isterseniz aşağıya girin. Boş bırakırsanız Akdağ stoğu aynen
                        geçerli olur.
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-blue-900 block mb-1">
                          Sescim Özel Stok Kotası
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder={`Boş ise Akdağ (${editStokAdedi})`}
                          value={editSescimStok}
                          onChange={e => setEditSescimStok(e.target.value)}
                          className="input-dark bg-white border-blue-300 focus:border-blue-600 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-blue-900 block mb-1">
                          Sescim Stok Durumu
                        </label>
                        <select
                          value={editSescimStokDurumu}
                          onChange={e => setEditSescimStokDurumu(e.target.value)}
                          className="input-dark bg-white border-blue-300 focus:border-blue-600 appearance-none cursor-pointer text-xs rounded-lg"
                        >
                          <option value="">Varsayılan (Akdağ ile aynı)</option>
                          <option value="stokta">Stokta</option>
                          <option value="siparise_gore">Siparişe Göre</option>
                          <option value="tukendi">Tükendi</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Stok Durumu */}
                  <div
                    className={
                      editProduct?.kaynak !== 'sescim'
                        ? 'opacity-70 bg-slate-50 p-2.5 rounded-xl border border-slate-200'
                        : ''
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-display font-semibold text-xs tracking-widest uppercase text-slate-900/60 block">
                        {editProduct?.kaynak === 'sescim' ? 'Stok Durumu' : 'Akdağ Stok Durumu (Referans)'}
                      </label>
                      {editProduct?.kaynak !== 'sescim' && (
                        <span className="text-[9px] text-slate-400 italic">Akdağ ana sisteminden okunur</span>
                      )}
                    </div>
                    <select
                      value={editStok}
                      onChange={e => setEditStok(e.target.value)}
                      disabled={editProduct?.kaynak !== 'sescim'}
                      className="input-dark appearance-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 rounded-lg text-xs"
                    >
                      <option value="stokta">Stokta</option>
                      <option value="tukendi">Tükendi</option>
                      <option value="siparise_gore">Siparişe Göre</option>
                    </select>
                  </div>

                  <div className={`grid grid-cols-2 gap-3 ${editProduct?.kaynak !== 'sescim' ? 'opacity-70' : ''}`}>
                    <div className="relative">
                      <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-slate-900/40 block mb-1">
                        {editProduct?.kaynak === 'sescim' ? 'Stok Adedi' : 'Akdağ Stok Adedi (Referans)'}
                      </label>
                      <input
                        type="number"
                        value={editStokAdedi}
                        onChange={e => setEditStokAdedi(e.target.value)}
                        disabled={editProduct?.kaynak !== 'sescim'}
                        className="input-dark disabled:bg-slate-100 disabled:text-slate-500 rounded-lg"
                      />
                    </div>
                    <div className="relative">
                      <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-slate-900/40 block mb-1">
                        Kritik Stok
                      </label>
                      <input
                        type="number"
                        value={editKritikStok}
                        onChange={e => setEditKritikStok(e.target.value)}
                        disabled={editProduct?.kaynak !== 'sescim'}
                        className="input-dark disabled:bg-slate-100 disabled:text-slate-500 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Model Kodu & Marka */}
                  <div>
                    <label className="font-display font-semibold text-xs tracking-widest uppercase text-slate-900/40 block mb-1.5">
                      Model Kodu / Stok Kodu
                    </label>
                    <input
                      type="text"
                      value={editModelKodu}
                      onChange={e => setEditModelKodu(e.target.value)}
                      className="input-dark rounded-lg text-xs"
                      placeholder="Örn: M7CL-48"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-slate-900/40 block mb-1">
                        Marka
                      </label>
                      <input
                        type="text"
                        value={editMarka}
                        onChange={e => {
                          setEditMarka(e.target.value)
                          fetchMarkaSuggestions(e.target.value)
                        }}
                        onFocus={() => setShowMarkaSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowMarkaSuggestions(false), 200)}
                        className="input-dark rounded-lg text-xs"
                      />
                      {showMarkaSuggestions && existingMarkalar.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg max-h-32 overflow-y-auto shadow-lg">
                          {existingMarkalar
                            .filter(m => m.toLowerCase().includes(editMarka.toLowerCase()))
                            .map(m => (
                              <button
                                key={m}
                                onClick={() => setEditMarka(m)}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-100"
                              >
                                {m}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <label className="font-display font-semibold text-[10px] tracking-widest uppercase text-slate-900/40 block mb-1">
                        Kullanım Alanı
                      </label>
                      <input
                        type="text"
                        value={editKullanim}
                        onChange={e => {
                          setEditKullanim(e.target.value)
                          fetchAlanSuggestions(e.target.value)
                        }}
                        onFocus={() => setShowAlanSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowAlanSuggestions(false), 200)}
                        className="input-dark rounded-lg text-xs"
                      />
                      {showAlanSuggestions && existingAlanlar.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg max-h-32 overflow-y-auto shadow-lg">
                          {existingAlanlar
                            .filter(a => a.toLowerCase().includes(editKullanim.toLowerCase()))
                            .map(a => (
                              <button
                                key={a}
                                onClick={() => setEditKullanim(a)}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-100"
                              >
                                {a}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fotoğraflar */}
                  <div className="space-y-3">
                    <label className="font-display font-semibold text-xs tracking-widest uppercase text-slate-900/40 block">
                      Fotoğraflar (En fazla 10)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {editFotograflar.map((url, i) => (
                        <div key={i} className="aspect-square relative group bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                          <SafeProductImage src={url} alt="" fill className="object-cover" placeholderIconSize={20} />
                          <button
                            type="button"
                            onClick={() => removeExistingPhoto(url)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {newPhotos.map((p, i) => (
                        <div key={i} className="aspect-square relative group bg-slate-50 border border-slate-300 rounded-lg overflow-hidden">
                          <Image
                            src={p.preview}
                            alt=""
                            fill
                            className={`object-cover ${p.compressing ? 'opacity-30' : ''}`}
                          />
                          {p.compressing ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeNewPhoto(p.preview)}
                              className="absolute top-1 right-1 w-5 h-5 bg-brand-red text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                      {editFotograflar.length + newPhotos.length < 10 && (
                        <label className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 border border-dashed border-slate-300 hover:border-brand-red cursor-pointer transition-colors">
                          <Upload size={16} className="text-slate-400" />
                          <span className="font-display font-bold text-[9px] uppercase text-slate-400">EKLE</span>
                          <input type="file" multiple accept="image/*" className="hidden" onChange={handleNewFiles} />
                        </label>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0 bg-white">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !editAd || !editAciklama || newPhotos.some(n => n.compressing)}
                className={`btn-primary flex-1 justify-center text-sm rounded-xl py-3 disabled:opacity-40 ${
                  saveSuccess ? '!bg-emerald-600' : ''
                }`}
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : saveSuccess ? (
                  <Check size={16} />
                ) : null}
                <span>{saving ? 'Kaydediliyor...' : saveSuccess ? 'Başarıyla Kaydedildi!' : 'Değişiklikleri Kaydet'}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditProduct(null)}
                className="btn-outline text-sm px-5 rounded-xl py-3"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
