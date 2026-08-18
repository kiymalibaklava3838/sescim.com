'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit, Save, X, Image as ImageIcon, Link as LinkIcon, Check, AlertTriangle, Eye, EyeOff, ZoomIn, Crop } from 'lucide-react'
import Image from 'next/image'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '@/lib/cropImage'

interface StoreBanner {
  id: string
  title: string | null
  subtitle: string | null
  image_url: string
  link_url: string | null
  is_active: boolean
  sort_order: number
}

interface Product {
  id: string
  ad: string
  slug: string
}

export default function AdminBanners({ supabase }: { supabase: any }) {
  const [banners, setBanners] = useState<StoreBanner[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  // New Banner Form State
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newBanner, setNewBanner] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    sort_order: 0
  })
  
  // Link selection type
  const [linkType, setLinkType] = useState<'none' | 'product' | 'custom'>('none')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  // Cropper State
  const [showCropModal, setShowCropModal] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    
    // Load banners
    const { data: bData } = await supabase
      .from('store_banners')
      .select('id, title, subtitle, image_url, link_url, is_active, sort_order, created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      
    if (bData) setBanners(bData)
      
    // Load products for the dropdown
    const { data: pData } = await supabase
      .from('urunler')
      .select('id, ad, slug')
      .order('ad', { ascending: true })
      
    if (pData) setProducts(pData)
      
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

  const handleSaveBanner = async () => {
    if (!imageFile && !newBanner.image_url) {
      alert('Lütfen bir kampanya görseli seçin!')
      return
    }

    setUploading(true)
    try {
      let finalImageUrl = newBanner.image_url

      // 1. Upload Image if new
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `banner-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('kampanya-gorselleri')
          .upload(filePath, imageFile)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('kampanya-gorselleri')
          .getPublicUrl(filePath)
          
        finalImageUrl = data.publicUrl
      }

      // 2. Resolve link URL
      let finalLinkUrl = newBanner.link_url
      if (linkType === 'product' && selectedProductId) {
        const prod = products.find(p => p.id === selectedProductId)
        if (prod) {
          finalLinkUrl = `/urun/${prod.slug || prod.id}`
        }
      } else if (linkType === 'none') {
        finalLinkUrl = ''
      }

      // 3. Save to DB
      const { error } = await supabase
        .from('store_banners')
        .insert({
          title: newBanner.title || null,
          subtitle: newBanner.subtitle || null,
          image_url: finalImageUrl,
          link_url: finalLinkUrl || null,
          sort_order: newBanner.sort_order
        })

      if (error) throw error

      alert('Kampanya banner başarıyla eklendi!')
      setShowForm(false)
      resetForm()
      loadData()
      
    } catch (err: any) {
      console.error(err)
      alert('Banner kaydedilirken hata oluştu: ' + err.message)
    } finally {
      setUploading(false)
    }
  }
  
  const resetForm = () => {
    setNewBanner({ title: '', subtitle: '', image_url: '', link_url: '', sort_order: 0 })
    setImageFile(null)
    setImagePreview(null)
    setLinkType('none')
    setSelectedProductId('')
    setProductSearchTerm('')
    setShowProductDropdown(false)
  }

  const toggleActive = async (banner: StoreBanner) => {
    const { error } = await supabase
      .from('store_banners')
      .update({ is_active: !banner.is_active })
      .eq('id', banner.id)
      
    if (!error) {
      setBanners(banners.map(b => b.id === banner.id ? { ...b, is_active: !banner.is_active } : b))
    }
  }

  const deleteBanner = async (id: string) => {
    if (!confirm('Bu bannerı silmek istediğinize emin misiniz?')) return
    
    // Yalnızca veritabanından siliyoruz, dosyayı silmek de eklenebilir.
    const { error } = await supabase
      .from('store_banners')
      .delete()
      .eq('id', id)
      
    if (!error) {
      setBanners(banners.filter(b => b.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900 uppercase tracking-widest">Kampanya & Banner Yönetimi</h2>
          <p className="text-slate-500 text-sm mt-1">Ürünler sayfasının üst kısmında çıkacak görselleri buradan yönetebilirsiniz.</p>
        </div>
        
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand-red text-white px-4 py-2 font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all shadow-sm"
          >
            <Plus size={18} />
            Yeni Kampanya Ekle
          </button>
        )}
      </div>

      {/* NEW BANNER FORM */}
      {showForm && (
        <div className="bg-white border border-slate-200 p-6 shadow-sm animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 border-t border-r border-brand-red/10 pointer-events-none" />
          
          <h3 className="text-brand-red font-display font-bold uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Yeni Banner Oluştur</h3>
          
          <div className="grid md:grid-cols-2 gap-8 relative z-10">
            {/* Left: Image Upload */}
            <div>
              <label className="block text-xs font-display font-bold text-slate-500 tracking-widest uppercase mb-2">
                Kampanya Görseli
              </label>

              {/* Boyut Uyarısı */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 p-3 mb-3 rounded-sm">
                <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-bold">Yatay (landscape) fotoğraf kullanın.</span><br />
                  Önerilen boyut: <span className="font-mono font-bold">1920 × 720 px</span> veya <span className="font-mono font-bold">1280 × 480 px</span><br />
                  <span className="text-amber-700/80">Dikey fotoğraflar (örn. 1080×1920) kırpılır ve düzgün görünmez.</span>
                </div>
              </div>
              
              <div className="border-2 border-dashed border-slate-300 hover:border-brand-red/50 transition-colors bg-slate-50 rounded-sm p-4 text-center cursor-pointer relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                
                {imagePreview ? (
                  <div className="relative aspect-video w-full overflow-hidden border border-slate-200">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                      <span className="text-slate-900 text-sm font-semibold">Resmi Değiştir</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
                    <ImageIcon size={32} className="mb-3" />
                    <span className="text-sm">Görsel seçmek için tıklayın veya sürükleyin</span>
                    <span className="text-xs mt-1 text-slate-400">PNG, JPG, WEBP — Yatay format</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right: Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-display font-bold text-slate-500 tracking-widest uppercase mb-1">Başlık (Opsiyonel)</label>
                <input 
                  type="text" 
                  value={newBanner.title}
                  onChange={e => setNewBanner({...newBanner, title: e.target.value})}
                  className="input-base"
                  placeholder="Örn: Yaza Özel İndirim"
                />
              </div>
              
              <div>
                <label className="block text-xs font-display font-bold text-slate-500 tracking-widest uppercase mb-1">Alt Başlık (Opsiyonel)</label>
                <input 
                  type="text" 
                  value={newBanner.subtitle}
                  onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})}
                  className="input-base"
                  placeholder="Örn: Akustek ürünlerinde %20 indirim"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold text-slate-500 tracking-widest uppercase mb-2">Tıklama Yönlendirmesi (Link)</label>
                <div className="flex gap-2 mb-3">
                  <button 
                    onClick={() => setLinkType('none')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-sm transition-colors ${linkType === 'none' ? 'bg-slate-800 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                  >Yok</button>
                  <button 
                    onClick={() => setLinkType('product')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-sm transition-colors ${linkType === 'product' ? 'bg-brand-red/10 border-brand-red text-brand-red' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                  >Ürün Seç</button>
                  <button 
                    onClick={() => setLinkType('custom')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-sm transition-colors ${linkType === 'custom' ? 'bg-brand-red/10 border-brand-red text-brand-red' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                  >Özel Link</button>
                </div>
                
                {linkType === 'product' && (
                  <div className="relative">
                    <input
                      type="text"
                      value={productSearchTerm}
                      onChange={e => {
                        setProductSearchTerm(e.target.value)
                        setShowProductDropdown(true)
                        setSelectedProductId('') // Typing clears the previous explicit selection
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                      className="input-base"
                      placeholder="Ürün arayın..."
                    />
                    {selectedProductId && (
                      <div className="absolute right-3 top-2.5 text-brand-red">
                        <Check size={16} />
                      </div>
                    )}
                    {showProductDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 max-h-60 overflow-y-auto shadow-xl">
                        {products
                          .filter(p => p.ad.toLowerCase().includes(productSearchTerm.toLowerCase()))
                          .map(p => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSelectedProductId(p.id)
                                setProductSearchTerm(p.ad)
                                setShowProductDropdown(false)
                              }}
                              className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 transition-colors border-b border-slate-100 last:border-0"
                            >
                              {p.ad}
                            </div>
                          ))}
                        {products.filter(p => p.ad.toLowerCase().includes(productSearchTerm.toLowerCase())).length === 0 && (
                          <div className="px-4 py-2 text-sm text-slate-500">Ürün bulunamadı.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {linkType === 'custom' && (
                  <input 
                    type="text" 
                    value={newBanner.link_url}
                    onChange={e => setNewBanner({...newBanner, link_url: e.target.value})}
                    className="input-base"
                    placeholder="Örn: https://akustek.com veya /iletisim"
                  />
                )}
              </div>
              
              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button 
                  onClick={handleSaveBanner}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-brand-red text-white px-6 py-2.5 font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all flex-1 justify-center rounded-sm"
                >
                  {uploading ? 'Yükleniyor...' : <><Save size={16} /> Kaydet ve Yayınla</>}
                </button>
                <button 
                  onClick={() => { setShowForm(false); resetForm(); }}
                  disabled={uploading}
                  className="px-6 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-display text-xs uppercase tracking-wider transition-all rounded-sm"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXISTING BANNERS */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && <div className="text-slate-500 py-8 col-span-full text-center">Yükleniyor...</div>}
        
        {!loading && banners.length === 0 && !showForm && (
          <div className="col-span-full border border-dashed border-slate-300 py-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
            <ImageIcon size={48} className="mb-4 opacity-30" />
            <p className="font-display uppercase tracking-widest text-sm mb-4">Henüz hiç banner eklenmemiş</p>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold uppercase tracking-wider">İlk Kampanyayı Ekle</button>
          </div>
        )}

        {banners.map(banner => (
          <div key={banner.id} className={`bg-white border shadow-sm overflow-hidden transition-all duration-300 ${!banner.is_active ? 'opacity-60 grayscale' : 'border-slate-200 hover:border-brand-red/30 hover:shadow-md'}`}>
            <div className="relative aspect-video w-full border-b border-slate-100">
              <img src={banner.image_url} alt={banner.title || 'Banner'} className="w-full h-full object-cover" />
              
              {!banner.is_active && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm">
                  <span className="bg-white px-3 py-1 font-display font-bold text-xs uppercase tracking-widest text-slate-900 border border-slate-200 shadow-sm rounded-sm">Yayında Değil</span>
                </div>
              )}
            </div>
            
            <div className="p-4 relative">
              <div className="font-display font-bold text-slate-900 text-sm mb-1 truncate">{banner.title || 'Başlıksız Banner'}</div>
              <div className="text-slate-500 text-xs mb-3 truncate">{banner.subtitle || 'Alt başlık yok'}</div>
              
              {banner.link_url ? (
                <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-red hover:text-red-700 transition-colors font-medium">
                  <LinkIcon size={12} /> Linke Git
                </a>
              ) : (
                <div className="text-xs text-slate-400">Link Yok</div>
              )}
              
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button 
                  onClick={() => toggleActive(banner)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600 transition-colors rounded-sm"
                  title={banner.is_active ? 'Yayından Kaldır' : 'Yayına Al'}
                >
                  {banner.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button 
                  onClick={() => deleteBanner(banner.id)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors rounded-sm"
                  title="Sil"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* CROP MODAL */}
      {showCropModal && imagePreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-4xl flex flex-col shadow-2xl relative overflow-hidden h-[80vh] md:h-[600px] rounded-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900">
                <Crop size={18} className="text-brand-red" />
                <h3 className="font-display font-bold uppercase tracking-widest text-sm">Görseli Kırp ve Düzenle</h3>
              </div>
              <button 
                onClick={() => { setShowCropModal(false); setImagePreview(null); setImageFile(null); }}
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Cropper Area */}
            <div className="relative flex-1 bg-slate-100 overflow-hidden">
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
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-brand-red h-1 bg-slate-200 rounded-full appearance-none outline-none"
                />
              </div>
              
              <button 
                onClick={handleCropSave}
                className="flex items-center justify-center gap-2 bg-brand-red text-white px-6 py-2.5 font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all w-full sm:w-auto rounded-sm"
              >
                <Check size={16} /> Kırpmayı Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
