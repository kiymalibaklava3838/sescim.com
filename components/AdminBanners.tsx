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
          <h2 className="text-xl font-display font-bold text-white uppercase tracking-widest">Kampanya & Banner Yönetimi</h2>
          <p className="text-white/50 text-sm mt-1">Ürünler sayfasının üst kısmında çıkacak görselleri buradan yönetebilirsiniz.</p>
        </div>
        
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus size={18} />
            Yeni Kampanya Ekle
          </button>
        )}
      </div>

      {/* NEW BANNER FORM */}
      {showForm && (
        <div className="bg-[#1A1A1A] border border-brand-red/30 p-6 shadow-xl animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 border-t border-r border-brand-red/10 pointer-events-none" />
          
          <h3 className="text-brand-red font-display font-bold uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Yeni Banner Oluştur</h3>
          
          <div className="grid md:grid-cols-2 gap-8 relative z-10">
            {/* Left: Image Upload */}
            <div>
              <label className="block text-xs font-display font-bold text-white/50 tracking-widest uppercase mb-2">
                Kampanya Görseli
              </label>

              {/* Boyut Uyarısı */}
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 p-3 mb-3 rounded-sm">
                <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-400/90 leading-relaxed">
                  <span className="font-bold">Yatay (landscape) fotoğraf kullanın.</span><br />
                  Önerilen boyut: <span className="font-mono font-bold">1920 × 720 px</span> veya <span className="font-mono font-bold">1280 × 480 px</span><br />
                  <span className="text-amber-400/60">Dikey fotoğraflar (örn. 1080×1920) kırpılır ve düzgün görünmez.</span>
                </div>
              </div>
              
              <div className="border-2 border-dashed border-white/10 hover:border-brand-red/50 transition-colors bg-[#0F0F0F] rounded-sm p-4 text-center cursor-pointer relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                
                {imagePreview ? (
                  <div className="relative aspect-video w-full overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-sm font-semibold">Resmi Değiştir</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-white/30 group-hover:text-white/70">
                    <ImageIcon size={32} className="mb-3" />
                    <span className="text-sm">Görsel seçmek için tıklayın veya sürükleyin</span>
                    <span className="text-xs mt-1 text-white/20">PNG, JPG, WEBP — Yatay format</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right: Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-display font-bold text-white/50 tracking-widest uppercase mb-1">Başlık (Opsiyonel)</label>
                <input 
                  type="text" 
                  value={newBanner.title}
                  onChange={e => setNewBanner({...newBanner, title: e.target.value})}
                  className="w-full bg-[#0F0F0F] border border-white/10 text-white px-4 py-2 focus:border-brand-red outline-none"
                  placeholder="Örn: Yaza Özel İndirim"
                />
              </div>
              
              <div>
                <label className="block text-xs font-display font-bold text-white/50 tracking-widest uppercase mb-1">Alt Başlık (Opsiyonel)</label>
                <input 
                  type="text" 
                  value={newBanner.subtitle}
                  onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})}
                  className="w-full bg-[#0F0F0F] border border-white/10 text-white px-4 py-2 focus:border-brand-red outline-none"
                  placeholder="Örn: Akustek ürünlerinde %20 indirim"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold text-white/50 tracking-widest uppercase mb-2">Tıklama Yönlendirmesi (Link)</label>
                <div className="flex gap-2 mb-3">
                  <button 
                    onClick={() => setLinkType('none')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border ${linkType === 'none' ? 'bg-white/10 border-white/30 text-white' : 'bg-[#0F0F0F] border-white/5 text-white/40'}`}
                  >Yok</button>
                  <button 
                    onClick={() => setLinkType('product')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border ${linkType === 'product' ? 'bg-brand-red/20 border-brand-red/50 text-brand-red' : 'bg-[#0F0F0F] border-white/5 text-white/40'}`}
                  >Ürün Seç</button>
                  <button 
                    onClick={() => setLinkType('custom')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border ${linkType === 'custom' ? 'bg-brand-red/20 border-brand-red/50 text-brand-red' : 'bg-[#0F0F0F] border-white/5 text-white/40'}`}
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
                      className="w-full bg-[#0F0F0F] border border-white/10 text-white px-4 py-2 focus:border-brand-red outline-none"
                      placeholder="Ürün arayın..."
                    />
                    {selectedProductId && (
                      <div className="absolute right-3 top-2.5 text-brand-red">
                        <Check size={16} />
                      </div>
                    )}
                    {showProductDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-[#1A1A1A] border border-white/10 max-h-60 overflow-y-auto shadow-2xl">
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
                              className="px-4 py-2 hover:bg-brand-red/20 hover:text-white cursor-pointer text-sm text-white/70 transition-colors border-b border-white/5 last:border-0"
                            >
                              {p.ad}
                            </div>
                          ))}
                        {products.filter(p => p.ad.toLowerCase().includes(productSearchTerm.toLowerCase())).length === 0 && (
                          <div className="px-4 py-2 text-sm text-white/40">Ürün bulunamadı.</div>
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
                    className="w-full bg-[#0F0F0F] border border-white/10 text-white px-4 py-2 focus:border-brand-red outline-none"
                    placeholder="Örn: https://akustek.com veya /iletisim"
                  />
                )}
              </div>
              
              <div className="pt-4 flex gap-3 border-t border-white/5">
                <button 
                  onClick={handleSaveBanner}
                  disabled={uploading}
                  className="btn-primary flex-1 justify-center"
                >
                  {uploading ? 'Yükleniyor...' : <><Save size={16} /> Kaydet ve Yayınla</>}
                </button>
                <button 
                  onClick={() => { setShowForm(false); resetForm(); }}
                  disabled={uploading}
                  className="px-4 border border-white/10 hover:bg-white/5 text-white transition-colors"
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
        {loading && <div className="text-white/40 py-8 col-span-full text-center">Yükleniyor...</div>}
        
        {!loading && banners.length === 0 && !showForm && (
          <div className="col-span-full border border-dashed border-white/10 py-16 flex flex-col items-center justify-center text-white/40 bg-[#111]">
            <ImageIcon size={48} className="mb-4 opacity-20" />
            <p className="font-display uppercase tracking-widest text-sm mb-4">Henüz hiç banner eklenmemiş</p>
            <button onClick={() => setShowForm(true)} className="btn-outline text-xs">İlk Kampanyayı Ekle</button>
          </div>
        )}

        {banners.map(banner => (
          <div key={banner.id} className={`bg-[#141414] border silver-border overflow-hidden transition-all duration-300 ${!banner.is_active ? 'opacity-50 grayscale' : 'border-white/10 hover:border-brand-red/30'}`}>
            <div className="relative aspect-video w-full border-b border-white/5">
              <img src={banner.image_url} alt={banner.title || 'Banner'} className="w-full h-full object-cover" />
              
              {!banner.is_active && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <span className="bg-black/80 px-3 py-1 font-display font-bold text-xs uppercase tracking-widest text-white border border-white/10">Yayında Değil</span>
                </div>
              )}
            </div>
            
            <div className="p-4 relative">
              <div className="font-display font-bold text-white text-sm mb-1 truncate">{banner.title || 'Başlıksız Banner'}</div>
              <div className="text-white/40 text-xs mb-3 truncate">{banner.subtitle || 'Alt başlık yok'}</div>
              
              {banner.link_url ? (
                <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-red hover:text-white transition-colors">
                  <LinkIcon size={12} /> Linke Git
                </a>
              ) : (
                <div className="text-xs text-white/20">Link Yok</div>
              )}
              
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button 
                  onClick={() => toggleActive(banner)}
                  className="w-8 h-8 flex items-center justify-center bg-[#1A1A1A] border border-white/10 hover:border-white/30 text-white transition-colors"
                  title={banner.is_active ? 'Yayından Kaldır' : 'Yayına Al'}
                >
                  {banner.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button 
                  onClick={() => deleteBanner(banner.id)}
                  className="w-8 h-8 flex items-center justify-center bg-[#1A1A1A] border border-white/10 hover:border-brand-red hover:text-brand-red transition-colors"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 animate-fade-in">
          <div className="bg-[#141414] border border-white/10 w-full max-w-4xl flex flex-col shadow-2xl relative overflow-hidden h-[80vh] md:h-[600px]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0F0F0F]">
              <div className="flex items-center gap-2 text-white">
                <Crop size={18} className="text-brand-red" />
                <h3 className="font-display font-bold uppercase tracking-widest text-sm">Görseli Kırp ve Düzenle</h3>
              </div>
              <button 
                onClick={() => { setShowCropModal(false); setImagePreview(null); setImageFile(null); }}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Cropper Area */}
            <div className="relative flex-1 bg-black overflow-hidden">
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
            <div className="p-4 bg-[#0F0F0F] border-t border-white/10 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-3 w-full sm:w-1/2">
                <ZoomIn size={16} className="text-white/40" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-brand-red h-1 bg-white/10 rounded-full appearance-none outline-none"
                />
              </div>
              
              <button 
                onClick={handleCropSave}
                className="btn-primary w-full sm:w-auto"
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
