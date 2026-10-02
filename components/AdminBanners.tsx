'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Link as LinkIcon, 
  Check, AlertTriangle, Eye, EyeOff, ZoomIn, Crop, ArrowRight, 
  ArrowUpDown, ExternalLink, Sparkles 
} from 'lucide-react'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '@/lib/cropImage'
import { createAkdagBrowserClient } from '@/lib/supabase-akdag'
import { 
  StoreBanner, 
  parseBannerContent, 
  packBannerSubtitle,
  DEFAULT_HERO_SLIDES 
} from '@/lib/banner-service'

interface Product {
  id: string
  ad: string
  slug: string
  marka?: string | null
}

export default function AdminBanners({ supabase }: { supabase: any }) {
  const [banners, setBanners] = useState<StoreBanner[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  // Form State
  const [showForm, setShowForm] = useState(false)
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [description, setDescription] = useState('')
  const [buttonText, setButtonText] = useState('Hemen Keşfet')
  const [showOverlay, setShowOverlay] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const [sortOrder, setSortOrder] = useState(1)
  const [isActive, setIsActive] = useState(true)
  const [imageUrl, setImageUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  
  // Link selection type
  const [linkType, setLinkType] = useState<'none' | 'product' | 'custom'>('none')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  
  // Image & Crop
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function triggerRevalidate() {
    try {
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/' })
      })
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/urunler' })
      })
    } catch (e) {
      console.warn('Revalidation warning:', e)
    }
  }

  async function seedDefaultBanners() {
    if (!confirm('Varsayılan 3 adet profesyonel vitrin bannerı veritabanına eklensin mi?')) return
    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'seed' })
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'Varsayılan bannerlar yüklenemedi')

      await triggerRevalidate()
      await loadData()
      alert('Varsayılan bannerlar başarıyla veritabanına yüklendi ve vitrinde anında yayına alındı!')
    } catch (e: any) {
      alert('Yükleme hatası: ' + (e.message || e))
    } finally {
      setUploading(false)
    }
  }

  async function loadData() {
    setLoading(true)
    
    // 1. Load store banners
    const { data: bData } = await supabase
      .from('store_banners')
      .select('id, title, subtitle, image_url, link_url, is_active, sort_order, created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      
    if (bData) setBanners(bData)
      
    // 2. Load products hybrid (Sescim + Akdağ)
    try {
      const akdagDb = createAkdagBrowserClient()
      const [sescimRes, akdagRes] = await Promise.all([
        supabase.from('urunler').select('id, ad, slug, marka').order('ad', { ascending: true }),
        akdagDb.from('urunler').select('id, ad, slug, marka').order('ad', { ascending: true })
      ])

      const combined: Product[] = [
        ...(sescimRes.data || []),
        ...(akdagRes.data || [])
      ]

      // Deduplicate by id
      const uniqueMap = new Map<string, Product>()
      combined.forEach(p => {
        if (!uniqueMap.has(p.id)) {
          uniqueMap.set(p.id, p)
        }
      })

      const uniqueList = Array.from(uniqueMap.values()).sort((a, b) => 
        (a.ad || '').localeCompare(b.ad || '', 'tr')
      )
      setProducts(uniqueList)
    } catch (err) {
      console.error('Error loading products for banner dropdown:', err)
    }
      
    setLoading(false)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    const objectUrl = URL.createObjectURL(file)
    setImagePreview(objectUrl)
    setShowCropModal(true)
    e.target.value = '' // reset input
  }

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropSave = async () => {
    try {
      if (!imagePreview || !croppedAreaPixels) return
      const croppedFile = await getCroppedImg(imagePreview, croppedAreaPixels)
      setImageFile(croppedFile)
      setImagePreview(URL.createObjectURL(croppedFile))
      setShowCropModal(false)
    } catch (e) {
      console.error(e)
      alert("Görsel kırpılırken bir hata oluştu.")
    }
  }

  const handleEdit = (banner: StoreBanner) => {
    const parsed = parseBannerContent(banner)
    setEditingBannerId(banner.id)
    setTitle(parsed.title || '')
    setSubtitle(parsed.subtitle || '')
    setDescription(parsed.description || '')
    setButtonText(parsed.ctaText || 'Hemen Keşfet')
    setShowOverlay(parsed.showOverlay ?? false)
    setShowButton(parsed.showButton ?? false)
    setSortOrder(banner.sort_order ?? 1)
    setIsActive(banner.is_active)
    setImageUrl(banner.image_url)
    setImagePreview(banner.image_url)
    setImageFile(null)

    // Determine link type
    if (!banner.link_url) {
      setLinkType('none')
      setLinkUrl('')
      setSelectedProductId('')
      setProductSearchTerm('')
    } else if (banner.link_url.startsWith('/urun/')) {
      const slugOrId = banner.link_url.replace('/urun/', '')
      const matched = products.find(p => p.slug === slugOrId || p.id === slugOrId)
      if (matched) {
        setLinkType('product')
        setSelectedProductId(matched.id)
        setProductSearchTerm(matched.ad)
        setLinkUrl('')
      } else {
        setLinkType('custom')
        setLinkUrl(banner.link_url)
        setSelectedProductId('')
        setProductSearchTerm('')
      }
    } else {
      setLinkType('custom')
      setLinkUrl(banner.link_url)
      setSelectedProductId('')
      setProductSearchTerm('')
    }

    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingBannerId(null)
    setTitle('')
    setSubtitle('')
    setDescription('')
    setButtonText('Hemen Keşfet')
    setShowOverlay(false)
    setShowButton(false)
    setSortOrder(banners.length + 1)
    setIsActive(true)
    setImageUrl('')
    setImagePreview(null)
    setImageFile(null)
    setLinkType('none')
    setLinkUrl('')
    setSelectedProductId('')
    setProductSearchTerm('')
    setShowProductDropdown(false)
  }

  const handleSaveBanner = async () => {
    if (!imageFile && !imageUrl && !imagePreview) {
      alert('Lütfen bir kampanya görseli seçin!')
      return
    }

    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      // 1. Resolve link URL
      let finalLinkUrl = ''
      if (linkType === 'product' && selectedProductId) {
        const prod = products.find(p => p.id === selectedProductId)
        if (prod) {
          finalLinkUrl = `/urun/${prod.slug || prod.id}`
        }
      } else if (linkType === 'custom') {
        finalLinkUrl = linkUrl.trim()
      }

      // 2. Pack subtitle with JSON { subtitle, description, button_text, show_overlay, show_button }
      const packedSubtitle = packBannerSubtitle(subtitle, description, buttonText, {
        showOverlay,
        showButton
      })

      let res: Response
      if (imageFile) {
        // FormData ile dosya yükleme (Sunucu tarafı Service Role ile yükler, RLS hatası vermez)
        const formData = new FormData()
        if (editingBannerId) formData.append('id', editingBannerId)
        formData.append('file', imageFile)
        formData.append('image_url', imageUrl || '')
        formData.append('title', title.trim() || '')
        formData.append('subtitle', packedSubtitle)
        formData.append('link_url', finalLinkUrl)
        formData.append('sort_order', String(Number(sortOrder) || 0))
        formData.append('is_active', String(isActive))
        formData.append('show_overlay', String(showOverlay))
        formData.append('show_button', String(showButton))

        res = await fetch('/api/admin/banners', {
          method: editingBannerId ? 'PUT' : 'POST',
          headers,
          body: formData
        })
      } else {
        // JSON ile kaydetme
        headers['Content-Type'] = 'application/json'
        const payload: any = {
          title: title.trim() || null,
          subtitle: packedSubtitle,
          image_url: imageUrl,
          link_url: finalLinkUrl || null,
          sort_order: Number(sortOrder) || 0,
          is_active: isActive,
          show_overlay: showOverlay,
          show_button: showButton
        }
        if (editingBannerId) payload.id = editingBannerId

        res = await fetch('/api/admin/banners', {
          method: editingBannerId ? 'PUT' : 'POST',
          headers,
          body: JSON.stringify(payload)
        })
      }

      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Banner kaydedilemedi')
      }

      alert(editingBannerId ? 'Banner başarıyla güncellendi!' : 'Yeni banner başarıyla eklendi!')
      setShowForm(false)
      resetForm()
      await loadData()
      
    } catch (err: any) {
      console.error(err)
      alert('Banner kaydedilirken hata oluştu: ' + (err.message || err))
    } finally {
      setUploading(false)
    }
  }

  const toggleActive = async (banner: StoreBanner) => {
    const nextState = !banner.is_active
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch('/api/admin/banners', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: banner.id, is_active: nextState })
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'Durum güncellenemedi')

      setBanners(banners.map(b => b.id === banner.id ? { ...b, is_active: nextState } : b))
    } catch (err: any) {
      alert('Durum güncellenirken hata oluştu: ' + err.message)
    }
  }

  const deleteBanner = async (id: string) => {
    if (!confirm('Bu bannerı silmek istediğinize emin misiniz?')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {}
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch(`/api/admin/banners?id=${id}`, {
        method: 'DELETE',
        headers
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'Banner silinemedi')

      setBanners(banners.filter(b => b.id !== id))
    } catch (err: any) {
      alert('Banner silinirken hata oluştu: ' + err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse" />
            <h2 className="text-xl font-display font-black text-slate-900 uppercase tracking-wider">
              Anasayfa Kayan Banner Vitrini
            </h2>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Anasayfadaki büyük kayan hero banner vitrinini, ürün/link yönlendirmelerini ve açıklamalarını buradan yönetebilirsiniz.
          </p>
        </div>
        
        {!showForm && (
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            {banners.length === 0 && (
              <button 
                onClick={seedDefaultBanners}
                disabled={uploading}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 font-display font-bold text-xs tracking-widest uppercase transition-all shadow-sm rounded-sm"
              >
                <Sparkles size={15} className="text-amber-400" />
                Varsayılan Şablonları Yükle
              </button>
            )}
            <button 
              onClick={() => { resetForm(); setSortOrder(banners.length + 1); setShowForm(true); }}
              className="flex items-center gap-2 bg-brand-red text-white px-5 py-2.5 font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all shadow-sm rounded-sm"
            >
              <Plus size={16} />
              Yeni Banner Ekle
            </button>
          </div>
        )}
      </div>

      {/* NEW / EDIT BANNER FORM */}
      {showForm && (
        <div className="bg-white border-2 border-slate-900/10 p-6 sm:p-8 shadow-md animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-brand-red/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-brand-red text-white text-[11px] font-display font-bold uppercase tracking-widest rounded-sm">
                {editingBannerId ? 'Düzenleme Modu' : 'Yeni Kayıt'}
              </span>
              <h3 className="text-slate-900 font-display font-bold uppercase tracking-wider text-base">
                {editingBannerId ? 'Banner Bilgilerini Güncelle' : 'Yeni Hero Banner Oluştur'}
              </h3>
            </div>

            <button 
              onClick={() => { setShowForm(false); resetForm(); }}
              className="text-slate-400 hover:text-slate-700 p-1 transition-colors"
              title="Kapat"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="grid lg:grid-cols-12 gap-8 relative z-10">
            {/* Left Column: Image Upload & Crop (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="block text-xs font-display font-bold text-slate-700 tracking-widest uppercase mb-2">
                  Banner Fotoğrafı *
                </label>

                {/* Boyut & Format Bilgilendirmesi */}
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 p-3 mb-3 rounded-sm">
                  <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-bold">Geniş yatay (landscape) fotoğraf seçin.</span><br />
                    Önerilen boyut: <span className="font-mono font-bold">1920 × 720 px</span> veya <span className="font-mono font-bold">16:6 oran</span>.<br />
                    <span className="text-amber-700/80">Fotoğrafı seçtikten sonra açılan kırpma penceresinden vitrine tam oturacak şekilde ayarlayabilirsiniz.</span>
                  </div>
                </div>
                
                <div className="border-2 border-dashed border-slate-300 hover:border-brand-red transition-colors bg-slate-50 rounded-sm p-4 text-center cursor-pointer relative group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  
                  {imagePreview ? (
                    <div className="relative aspect-[16/7] w-full overflow-hidden border border-slate-200 rounded-sm bg-slate-900">
                      <img 
                        src={imagePreview} 
                        alt="Banner Önizleme" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        <span className="text-white text-xs font-bold uppercase tracking-wider bg-brand-red px-3 py-1.5 rounded-sm">
                          Resmi Değiştir / Kırp
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
                      <ImageIcon size={40} className="mb-3 text-slate-300 group-hover:text-brand-red transition-colors" />
                      <span className="text-sm font-semibold text-slate-700">Görsel seçmek için tıklayın veya sürükleyin</span>
                      <span className="text-xs mt-1 text-slate-400">PNG, JPG, WEBP — Geniş yatay format</span>
                    </div>
                  )}
                </div>

                {imagePreview && (
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Görsel seçildi.</span>
                    <button 
                      type="button"
                      onClick={() => setShowCropModal(true)}
                      className="text-brand-red hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <Crop size={12} /> Yeniden Kırp
                    </button>
                  </div>
                )}
              </div>

              {/* Sıralama ve Aktiflik */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-display font-bold text-slate-600 tracking-widest uppercase mb-1 flex items-center gap-1">
                    <ArrowUpDown size={12} /> Slayt Sırası
                  </label>
                  <input 
                    type="number" 
                    min={1}
                    value={sortOrder}
                    onChange={e => setSortOrder(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-brand-red font-bold"
                    placeholder="1"
                  />
                  <span className="text-[11px] text-slate-400">1 en başta gösterilir</span>
                </div>

                <div>
                  <label className="block text-xs font-display font-bold text-slate-600 tracking-widest uppercase mb-1">
                    Yayın Durumu
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-full px-3 py-2 border rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                      isActive 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100' 
                        : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {isActive ? <><Eye size={14} /> Aktif (Yayında)</> : <><EyeOff size={14} /> Pasif (Gizli)</>}
                  </button>
                  <span className="text-[11px] text-slate-400">Anasayfada görünsün mü?</span>
                </div>
              </div>

              {/* Görsel Karartma / Filtre Efekti Kontrolü */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-display font-bold text-slate-900 tracking-wide uppercase">
                      Karanlık Karartma Efekti (Overlay)
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Görselin soluna ve altına karanlık gradyan gölge atar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOverlay(!showOverlay)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border transition-colors flex items-center gap-1.5 flex-shrink-0 ${
                      showOverlay
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {showOverlay ? 'Açık (Gölge Var)' : 'Kapalı (Net Görsel)'}
                  </button>
                </div>
                <div className="text-[11px] text-amber-800 bg-amber-50 p-2 border border-amber-200 rounded leading-relaxed">
                  💡 <span className="font-semibold">Grafik Afiş İpucu:</span> Kendi üzerinde yazısı veya logosu olan hazır afişlerde <span className="font-bold underline">Kapalı</span> tutun; görsel %100 orijinal ve canlı kalır.
                </div>
              </div>
            </div>
            
            {/* Right Column: Texts & Actions (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Alt Başlık / Rozet */}
              <div>
                <label className="block text-xs font-display font-bold text-slate-700 tracking-widest uppercase mb-1">
                  Rozet / Alt Başlık (Opsiyonel)
                </label>
                <input 
                  type="text" 
                  value={subtitle}
                  onChange={e => setSubtitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-brand-red"
                  placeholder="Örn: Yeni Sezon, Özel Fırsat, DJ Ekipmanları... (Yoksa boş bırakın)"
                />
                <span className="text-[11px] text-slate-400">Başlığın hemen üzerinde kırmızı küçük etiket olarak görünür.</span>
              </div>

              {/* Ana Başlık */}
              <div>
                <label className="block text-xs font-display font-bold text-slate-700 tracking-widest uppercase mb-1">
                  Ana Başlık (Opsiyonel)
                </label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-brand-red font-bold text-slate-900"
                  placeholder="Örn: Profesyonel Stüdyo ve Sahne Ekipmanları (Yoksa boş bırakın)"
                />
                <span className="text-[11px] text-slate-400">Slayt üzerinde büyük fontla çıkan başlık. Grafik afişlerde boş bırakabilirsiniz.</span>
              </div>

              {/* Açıklama Metni */}
              <div>
                <label className="block text-xs font-display font-bold text-slate-700 tracking-widest uppercase mb-1">
                  Açıklama Metni (Opsiyonel)
                </label>
                <textarea 
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-brand-red resize-none"
                  placeholder="Örn: En iyi ses performansı için dünya markalarından monitör ve mikserler... (Yoksa boş bırakın)"
                />
                <span className="text-[11px] text-slate-400">Başlığın altında slayt hakkında bilgi veren 1-2 cümlelik açıklama.</span>
              </div>

              {/* Tıklama Yönlendirmesi (Link) & Buton Ayarları */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-display font-bold text-slate-700 tracking-widest uppercase mb-1">
                  Tıklama Yönlendirmesi (Link)
                </label>
                
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => { setLinkType('none'); setShowButton(false); }}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-sm transition-colors ${
                      linkType === 'none' 
                        ? 'bg-slate-800 border-slate-800 text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Linksiz
                  </button>
                  <button 
                    type="button"
                    onClick={() => setLinkType('product')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-sm transition-colors ${
                      linkType === 'product' 
                        ? 'bg-brand-red border-brand-red text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Ürün Seç
                  </button>
                  <button 
                    type="button"
                    onClick={() => setLinkType('custom')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-sm transition-colors ${
                      linkType === 'custom' 
                        ? 'bg-brand-red border-brand-red text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Özel Link / URL
                  </button>
                </div>
                
                {/* Ürün Seçim Alanı */}
                {linkType === 'product' && (
                  <div className="relative">
                    <input
                      type="text"
                      value={productSearchTerm}
                      onChange={e => {
                        setProductSearchTerm(e.target.value)
                        setShowProductDropdown(true)
                        setSelectedProductId('')
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      onBlur={() => setTimeout(() => setShowProductDropdown(false), 250)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-brand-red"
                      placeholder="Ürün adı yazarak arayın..."
                    />
                    {selectedProductId && (
                      <div className="absolute right-3 top-2.5 text-emerald-600 flex items-center gap-1 text-xs font-bold">
                        <Check size={16} /> Seçildi
                      </div>
                    )}
                    {showProductDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 max-h-60 overflow-y-auto shadow-xl rounded-sm">
                        {products
                          .filter(p => (p.ad || '').toLowerCase().includes(productSearchTerm.toLowerCase()) || 
                                       (p.marka || '').toLowerCase().includes(productSearchTerm.toLowerCase()))
                          .slice(0, 30)
                          .map(p => (
                            <div
                              key={p.id}
                              onMouseDown={() => {
                                setSelectedProductId(p.id)
                                setProductSearchTerm(p.ad)
                                setShowProductDropdown(false)
                              }}
                              className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 transition-colors border-b border-slate-100 last:border-0 flex items-center justify-between"
                            >
                              <span className="font-medium truncate mr-2">{p.ad}</span>
                              {p.marka && (
                                <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-semibold flex-shrink-0">
                                  {p.marka}
                                </span>
                              )}
                            </div>
                          ))}
                        {products.filter(p => (p.ad || '').toLowerCase().includes(productSearchTerm.toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-sm text-slate-500 text-center">Eşleşen ürün bulunamadı.</div>
                        )}
                      </div>
                    )}
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Tıklandığında seçilen ürünün detay sayfasına (/urun/...) yönlendirir.
                    </span>
                  </div>
                )}
                
                {/* Özel Link Girişi */}
                {linkType === 'custom' && (
                  <div>
                    <input 
                      type="text" 
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-brand-red font-mono"
                      placeholder="Örn: /urunler/studyo-ekipmanlari veya /iletisim"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Site içi sayfa (örn: /urunler/studyo-ekipmanlari) veya dış link yazabilirsiniz.
                    </span>
                  </div>
                )}

                {/* Aksiyon Butonu Ayarı (Link seçildiyse) */}
                {linkType !== 'none' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm space-y-2.5 mt-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <label className="block text-xs font-display font-bold text-slate-800 tracking-wide uppercase">
                          Aksiyon Butonu (Hemen Keşfet vb.)
                        </label>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {showButton 
                            ? 'Afişin sol altında buton gösterilir.' 
                            : 'Butonsuz: Banner üzerinde buton çıkmaz, ziyaretçi afişin herhangi bir yerine tıkladığında hedefe gider.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowButton(!showButton)}
                        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border transition-colors flex items-center gap-1.5 flex-shrink-0 ${
                          showButton
                            ? 'bg-brand-red border-brand-red text-white shadow-sm'
                            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {showButton ? 'Buton Göster' : 'Butonsuz (Tüm Banner Tıklanabilir)'}
                      </button>
                    </div>

                    {showButton && (
                      <div className="pt-2 border-t border-slate-200">
                        <label className="block text-xs font-display font-bold text-slate-700 tracking-widest uppercase mb-1">
                          Buton Üzerindeki Yazı (CTA)
                        </label>
                        <input 
                          type="text" 
                          value={buttonText}
                          onChange={e => setButtonText(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-brand-red font-medium"
                          placeholder="Örn: Hemen Keşfet, Ürünleri İncele, Fırsatları Yakala"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
            </div>
          </div>

          {/* 1:1 CANLI ANASAYFA HERO ÖNİZLEMESİ */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="font-display font-bold text-xs uppercase tracking-widest text-slate-800">
                  1:1 Canlı Anasayfa Vitrin Önizlemesi
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Anasayfada ziyaretçilere tam olarak bu şekilde görünecektir
              </span>
            </div>

            <div className="relative w-full h-[260px] sm:h-[320px] md:h-[380px] overflow-hidden bg-slate-950 rounded-lg shadow-xl select-none border border-slate-800">
              {/* Background Image */}
              <div className="absolute inset-0">
                <img
                  src={imagePreview || imageUrl || 'https://images.unsplash.com/photo-1598488035114-1e7584102c7b?auto=format&fit=crop&q=80&w=2000'}
                  alt="Canlı Önizleme"
                  className="w-full h-full object-cover object-center"
                />
                {/* HeroSlider ile birebir aynı gradient katmanları (şartlı) */}
                {showOverlay && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 md:via-slate-950/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
                  </>
                )}
              </div>

              {/* Slide Content */}
              {(title || subtitle || description || (showButton && linkType !== 'none')) && (
                <div className="relative z-20 h-full flex items-center px-6 sm:px-12">
                  <div className="max-w-2xl text-left">
                    {/* Rozet */}
                    {subtitle && (
                      <div className="mb-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-red/20 border border-brand-red/40 text-brand-red font-display text-[11px] font-bold uppercase tracking-widest backdrop-blur-md">
                          {subtitle}
                        </span>
                      </div>
                    )}

                    {/* Ana Başlık */}
                    {title && (
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-white mb-3 leading-[1.12] tracking-tight uppercase drop-shadow-md">
                        {title}
                      </h2>
                    )}

                    {/* Açıklama */}
                    {description && (
                      <p className="text-slate-200 text-xs sm:text-sm mb-5 max-w-xl line-clamp-3 font-normal leading-relaxed drop-shadow">
                        {description}
                      </p>
                    )}

                    {/* Buton */}
                    {showButton && linkType !== 'none' && buttonText && (
                      <div>
                        <span className="inline-flex items-center gap-2.5 bg-brand-red text-white font-display font-bold text-xs sm:text-sm tracking-widest uppercase px-6 py-3.5 rounded-md shadow-xl shadow-brand-red/30">
                          <span>{buttonText}</span>
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tüm banner tıklanabilir bilgi rozeti */}
              {!showButton && linkType !== 'none' && (
                <div className="absolute bottom-3 right-4 z-20 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded text-white/90 text-[11px] font-medium flex items-center gap-1.5 border border-white/10">
                  <LinkIcon size={12} className="text-brand-red" />
                  <span>Tüm banner tıklanabilir: {linkType === 'product' ? (products.find(p => p.id === selectedProductId)?.ad || 'Ürün Sayfası') : (linkUrl || 'Özel Link')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="pt-6 mt-6 flex gap-3 border-t border-slate-100">
            <button 
              onClick={handleSaveBanner}
              disabled={uploading}
              className="flex items-center gap-2 bg-brand-red text-white px-6 py-3.5 font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all flex-1 justify-center rounded-sm shadow-sm disabled:opacity-50"
            >
              {uploading ? (
                'Kaydediliyor...'
              ) : (
                <>
                  <Save size={16} /> 
                  {editingBannerId ? 'Değişiklikleri Güncelle ve Canlıya Al' : 'Kaydet ve Vitrinde Yayınla'}
                </>
              )}
            </button>
            <button 
              onClick={() => { setShowForm(false); resetForm(); }}
              disabled={uploading}
              className="px-6 py-3.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-display text-xs uppercase tracking-wider transition-all rounded-sm"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* BANNER LIST */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-700">
            Kayıtlı Bannerlar ({banners.length})
          </h3>
          <span className="text-xs text-slate-400">
            Sıralamaya göre anasayfada kayacaktır.
          </span>
        </div>

        {loading && (
          <div className="bg-white border border-slate-200 p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-brand-red rounded-full animate-spin mx-auto mb-3" />
            Bannerlar yükleniyor...
          </div>
        )}
        
        {!loading && banners.length === 0 && !showForm && (
          <div className="border-2 border-dashed border-slate-300 py-16 px-6 flex flex-col items-center justify-center text-slate-400 bg-white rounded-sm text-center">
            <ImageIcon size={48} className="mb-4 text-slate-300" />
            <h4 className="font-display font-bold uppercase tracking-wider text-base text-slate-700 mb-1">
              Henüz Özel Banner Eklenmemiş
            </h4>
            <p className="text-sm text-slate-500 max-w-md mb-6">
              Şu anda anasayfada varsayılan 3 stüdyo ve DJ slaytı gösterilmektedir. Özel banner eklediğiniz veya şablonları yüklediğiniz anda vitrinde kendi kampanyalarınız yayınlanacaktır.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button 
                onClick={seedDefaultBanners}
                disabled={uploading}
                className="px-5 py-2.5 bg-slate-800 text-white hover:bg-slate-900 text-xs font-display font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center gap-2"
              >
                <Sparkles size={14} className="text-amber-400" />
                Varsayılan Şablonları Yükle
              </button>
              <button 
                onClick={() => { resetForm(); setSortOrder(1); setShowForm(true); }} 
                className="px-5 py-2.5 bg-brand-red text-white hover:bg-red-700 text-xs font-display font-bold uppercase tracking-wider rounded-sm transition-colors"
              >
                İlk Bannerı Ekle
              </button>
            </div>
          </div>
        )}

        {/* Existing Banners Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => {
            const parsed = parseBannerContent(banner)
            return (
              <div 
                key={banner.id} 
                className={`bg-white border shadow-sm overflow-hidden flex flex-col transition-all duration-300 rounded-sm ${
                  !banner.is_active 
                    ? 'border-slate-200 opacity-60 bg-slate-50/50' 
                    : 'border-slate-200 hover:border-brand-red/40 hover:shadow-md'
                }`}
              >
                {/* Banner Thumbnail & Badges */}
                <div className="relative aspect-[16/7] w-full bg-slate-900 border-b border-slate-100 overflow-hidden group">
                  <img 
                    src={banner.image_url} 
                    alt={parsed.title || 'Banner Görseli'} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  
                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5 max-w-[90%]">
                    <span className="bg-slate-950/80 backdrop-blur-sm text-white px-2 py-0.5 text-[10px] font-display font-bold uppercase tracking-widest rounded">
                      Sıra: {banner.sort_order ?? 0}
                    </span>
                    {banner.is_active ? (
                      <span className="bg-emerald-600/90 backdrop-blur-sm text-white px-2 py-0.5 text-[10px] font-display font-bold uppercase tracking-widest rounded flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Yayında
                      </span>
                    ) : (
                      <span className="bg-slate-700/90 backdrop-blur-sm text-slate-200 px-2 py-0.5 text-[10px] font-display font-bold uppercase tracking-widest rounded">
                        Yayında Değil
                      </span>
                    )}
                    {parsed.showOverlay ? (
                      <span className="bg-indigo-600/90 backdrop-blur-sm text-white px-1.5 py-0.5 text-[9px] font-display font-bold uppercase tracking-wider rounded">
                        Gölge Var
                      </span>
                    ) : (
                      <span className="bg-amber-600/90 backdrop-blur-sm text-white px-1.5 py-0.5 text-[9px] font-display font-bold uppercase tracking-wider rounded">
                        Net Görsel
                      </span>
                    )}
                    {parsed.showButton ? (
                      <span className="bg-rose-600/90 backdrop-blur-sm text-white px-1.5 py-0.5 text-[9px] font-display font-bold uppercase tracking-wider rounded">
                        Butonlu
                      </span>
                    ) : parsed.ctaLink ? (
                      <span className="bg-teal-600/90 backdrop-blur-sm text-white px-1.5 py-0.5 text-[9px] font-display font-bold uppercase tracking-wider rounded">
                        Tüm Afiş Link
                      </span>
                    ) : null}
                  </div>
                </div>
                
                {/* Content & Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {parsed.subtitle && (
                      <span className="text-[11px] font-display font-bold text-brand-red uppercase tracking-wider block mb-1">
                        {parsed.subtitle}
                      </span>
                    )}
                    
                    <h4 className="font-display font-bold text-slate-900 text-base leading-snug mb-1 line-clamp-1">
                      {parsed.title || <span className="text-slate-400 italic">Başlıksız Banner</span>}
                    </h4>
                    
                    {parsed.description ? (
                      <p className="text-slate-500 text-xs line-clamp-2 mb-3">
                        {parsed.description}
                      </p>
                    ) : (
                      <p className="text-slate-400 text-xs italic mb-3">
                        Açıklama eklenmemiş
                      </p>
                    )}
                  </div>
                  
                  {/* Footer Link & Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="truncate text-xs">
                      {parsed.ctaLink ? (
                        <a 
                          href={parsed.ctaLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 text-slate-700 hover:text-brand-red font-medium transition-colors truncate max-w-[170px]"
                          title={parsed.ctaLink}
                        >
                          <LinkIcon size={12} className="text-brand-red flex-shrink-0" />
                          <span className="font-bold text-slate-900">
                            {parsed.showButton && parsed.ctaText ? `${parsed.ctaText}:` : 'Hedef:'}
                          </span>
                          <span className="truncate text-slate-500">{parsed.ctaLink}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Buton/Link Yok</span>
                      )}
                    </div>
                    
                    {/* Actions: Edit, Toggle, Delete */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button 
                        onClick={() => handleEdit(banner)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600 transition-colors rounded-sm"
                        title="Düzenle"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button 
                        onClick={() => toggleActive(banner)}
                        className={`w-8 h-8 flex items-center justify-center border transition-colors rounded-sm ${
                          banner.is_active 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' 
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                        title={banner.is_active ? 'Yayından Kaldır' : 'Yayına Al'}
                      >
                        {banner.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      
                      <button 
                        onClick={() => deleteBanner(banner.id)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors rounded-sm"
                        title="Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* CROP MODAL */}
      {showCropModal && imagePreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-4xl flex flex-col shadow-2xl relative overflow-hidden h-[85vh] md:h-[620px] rounded-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900">
                <Crop size={18} className="text-brand-red" />
                <h3 className="font-display font-bold uppercase tracking-widest text-sm">
                  Banner Görselini Kırp ve Hizala
                </h3>
              </div>
              <button 
                onClick={() => { setShowCropModal(false); if (!editingBannerId) { setImagePreview(null); setImageFile(null); } }}
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Cropper Area (16:6 aspect ratio for wide hero banner) */}
            <div className="relative flex-1 bg-slate-950 overflow-hidden">
              <Cropper
                image={imagePreview}
                crop={crop}
                zoom={zoom}
                aspect={16 / 6}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            {/* Controls */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-3 w-full sm:w-1/2">
                <ZoomIn size={16} className="text-slate-500" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.05}
                  aria-label="Yakınlaştır"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-brand-red h-1.5 bg-slate-200 rounded-full appearance-none outline-none cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-500 w-10">{zoom.toFixed(1)}x</span>
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => { setShowCropModal(false); if (!editingBannerId && !imageUrl) { setImagePreview(null); setImageFile(null); } }}
                  className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-display text-xs uppercase tracking-wider rounded-sm transition-colors w-1/2 sm:w-auto"
                >
                  İptal
                </button>
                <button 
                  onClick={handleCropSave}
                  className="flex items-center justify-center gap-2 bg-brand-red text-white px-6 py-2 font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all rounded-sm shadow-sm w-1/2 sm:w-auto"
                >
                  <Check size={16} /> Kırpmayı Onayla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
