/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { FileText, Plus, Trash2, Download, Printer, Calculator, User, Hash, Calendar, Percent, Save, Link as LinkIcon, Loader2, Check, Search, Palette, Tag, Sparkles } from 'lucide-react'
import { getCart } from '@/lib/cart'
import { getKurClient } from '@/lib/kur-client'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import { dovizToTL } from '@/lib/kur'

interface CartItem {
  id: string
  ad: string
  fiyat: number
  bayi_fiyati?: number | null
  adet: number
  fotograf: string
  kategori: string
  marka?: string
  model_kodu?: string
  para_birimi?: string
}

interface ProposalSettings {
  logo_url?: string
  firma_adi?: string
  adres?: string
  telefon?: string
  email?: string
  web_sitesi?: string
  varsayilan_kar_orani?: number
  teklif_notu?: string
}

const getProductPriceInTl = (p: any, kurData: any) => {
  const basePrice = p.bayi_fiyati || p.fiyat || 0
  const paraBirimi = p.bayi_fiyati ? (p.bayi_para_birimi || p.para_birimi || 'TRY') : (p.para_birimi || 'TRY')
  return dovizToTL(basePrice, paraBirimi, kurData)
}

const THEME_COLORS: Record<string, string> = {
  black: '#000000',
  red: '#c00000',
  blue: '#1e3a8a',
  green: '#064e3b',
  amber: '#78350f'
}

export default function BayiTeklifOlusturucu({ bayiId }: { bayiId: string }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [settings, setSettings] = useState<ProposalSettings | null>(null)
  const [margins, setMargins] = useState<Record<string, number>>({})
  const [globalMargin, setGlobalMargin] = useState(20)
  const [customerName, setCustomerName] = useState('')
  const [proposalNo, setProposalNo] = useState(`TEK-${Math.floor(1000 + Math.random() * 9000)}`)
  const [isSaving, setIsSaving] = useState(false)
  const [savedLink, setSavedLink] = useState<string | null>(null)
  const [kur, setKur] = useState<{ USD: number; EUR: number }>({ USD: 32.5, EUR: 35.2 })
  
  // Ürün Arama Durumları
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearchingProduct, setIsSearchingProduct] = useState(false)

  // Manuel Kalem Ekleme Durumları
  const [customAd, setCustomAd] = useState('')
  const [customKategori, setCustomKategori] = useState('')
  const [customFiyat, setCustomFiyat] = useState('')
  const [customAdet, setCustomAdet] = useState(1)

  // Renk Teması & İskonto Durumları
  const [themeColor, setThemeColor] = useState('black')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [isKdvExcluded, setIsKdvExcluded] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      // Kurları getir
      try {
        const kurData = await getKurClient()
        if (kurData) {
          setKur({ USD: kurData.USD, EUR: kurData.EUR })
        }
      } catch (err) {
        console.error('Kurlar çekilirken hata oluştu:', err)
      }

      // Sepeti getir
      const cart = getCart()

      // Ürünlerin marka, model_kodu, para_birimi gibi detaylarını Supabase'den çek
      const itemIds = cart.map(i => i.id)
      if (itemIds.length > 0) {
        const { data: dbProducts } = await supabase
          .from('urunler')
          .select('id, marka, model_kodu, fotograflar, para_birimi')
          .in('id', itemIds)

        if (dbProducts) {
          const enrichedCart = cart.map(item => {
            const match = dbProducts.find((p: any) => p.id === item.id)
            return {
              ...item,
              marka: match?.marka || 'Akdağ',
              model_kodu: match?.model_kodu || '',
              fotograf: match?.fotograflar?.[0] || item.fotograf,
              para_birimi: match?.para_birimi || 'TRY'
            }
          })
          setItems(enrichedCart)
        } else {
          setItems(cart)
        }
      } else {
        setItems([])
      }

      // Ayarları getir
      const { data } = await supabase
        .from('bayi_teklif_ayarlari')
        .select('logo_url, firma_adi, adres, telefon, email, web_sitesi, varsayilan_kar_orani, teklif_notu')
        .eq('bayi_id', bayiId)
        .maybeSingle()

      if (data) {
        setSettings(data)
        setGlobalMargin(Number(data.varsayilan_kar_orani) || 20)
      }
    }
    loadData()
  }, [bayiId])

  // Arama Gecikmesi (Debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Ürün Arama İşlemi
  useEffect(() => {
    if (debouncedSearchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const runSearch = async () => {
      setIsSearchingProduct(true)
      try {
        const { data } = await supabase
          .from('urunler')
          .select(LIGHT_PRODUCT_FIELDS)
          .ilike('ad', `%${debouncedSearchQuery}%`)
          .limit(5)
        setSearchResults(data || [])
      } catch (err) {
        console.error('Ürün arama hatası:', err)
      } finally {
        setIsSearchingProduct(false)
      }
    }
    runSearch()
  }, [debouncedSearchQuery])

  const calculateItemPrice = (item: CartItem) => {
    // Manuel veya TL bazlı eklenen ürünlerde kur dönüşümü ve kâr zaten hesaplanmış veya doğrudan TL'dir
    if (item.model_kodu === 'MANUEL') {
      return item.fiyat
    }
    const basePrice = item.bayi_fiyati || item.fiyat
    const margin = margins[item.id] !== undefined ? margins[item.id] : globalMargin
    return basePrice * (1 + margin / 100)
  }

  const rawSubtotal = items.reduce((sum, item) => sum + calculateItemPrice(item) * item.adet, 0)
  const discountAmount = rawSubtotal * (discountPercent / 100)
  const subtotal = rawSubtotal - discountAmount
  const tax = isKdvExcluded ? 0 : subtotal * 0.20
  const total = subtotal + tax

  const handleSaveProposal = async () => {
    if (items.length === 0) {
      alert('Lütfen teklife en az bir ürün veya hizmet kalemi ekleyiniz.')
      return
    }
    if (!customerName) {
      alert('Lütfen müşteri adını giriniz.')
      return
    }

    setIsSaving(true)
    
    // Tema rengi, iskonto oranı ve teklif notunu içeren JSONB metadata
    const metadataString = JSON.stringify({
      teklif_notu: settings?.teklif_notu || '',
      iskonto_orani: discountPercent,
      tema_rengi: themeColor
    })

    try {
      const { data, error } = await supabase
        .from('teklifler')
        .insert({
          bayi_id: bayiId,
          teklif_no: proposalNo,
          musteri_adi: customerName,
          ara_toplam: subtotal,
          kdv: tax,
          genel_toplam: total,
          kur_usd: kur.USD,
          kur_eur: kur.EUR,
          ozel_not: metadataString,
          urunler: items.map(i => {
            const unitPrice = calculateItemPrice(i)
            return {
              ad: i.ad,
              marka: i.marka || 'Akdağ',
              kod: i.model_kodu || '',
              gorsel: i.fotograf || '',
              miktar: i.adet,
              fiyat_doviz: unitPrice,
              para_birimi: 'TRY', // Bayi teklifleri daima TL tabanlıdır
              tutar_tl: unitPrice * i.adet
            }
          })
        })
        .select('id')
        .single()

      if (error) throw error

      const link = `${window.location.origin}/teklif/${data.id}`
      setSavedLink(link)
    } catch (err: any) {
      alert(`Kaydetme hatası: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const copyLink = () => {
    if (savedLink) {
      navigator.clipboard.writeText(savedLink)
      alert('Teklif linki kopyalandı!')
    }
  }

  const handleAddProductFromSearch = (p: any) => {
    const priceInTl = getProductPriceInTl(p, kur)
    
    const existingIndex = items.findIndex(item => item.id === p.id)
    if (existingIndex > -1) {
      const updated = [...items]
      updated[existingIndex].adet += 1
      setItems(updated)
    } else {
      setItems([
        ...items,
        {
          id: p.id,
          ad: p.ad,
          fiyat: priceInTl,
          bayi_fiyati: priceInTl, // Direkt TL fiyatı atıyoruz
          adet: 1,
          fotograf: p.fotograflar?.[0] || '',
          kategori: p.kategori || '',
          marka: p.marka || 'Akdağ',
          model_kodu: p.model_kodu || '',
          para_birimi: 'TRY'
        }
      ])
    }
    
    setSearchQuery('')
    setSearchResults([])
  }

  const handleAddCustomItem = () => {
    if (!customAd) {
      alert('Lütfen açıklama / hizmet adı yazınız.')
      return
    }
    const unitPrice = Number(customFiyat)
    if (isNaN(unitPrice) || unitPrice <= 0) {
      alert('Lütfen geçerli bir birim fiyatı yazınız.')
      return
    }

    const customItem: CartItem = {
      id: `custom-${Date.now()}`,
      ad: customAd,
      fiyat: unitPrice,
      bayi_fiyati: unitPrice,
      adet: customAdet,
      fotograf: '',
      kategori: customKategori || 'Hizmet / Kurulum',
      marka: 'Özel Kalem',
      model_kodu: 'MANUEL',
      para_birimi: 'TRY'
    }

    setItems([...items, customItem])
    
    // Reset form
    setCustomAd('')
    setCustomKategori('')
    setCustomFiyat('')
    setCustomAdet(1)
  }

  const themeHex = THEME_COLORS[themeColor] || '#000000'

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* Kontroller (Sol Panel) */}
      <div className="xl:col-span-4 space-y-6 no-print">
        <div className="bg-[#141414] border border-white/5 p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Calculator size={18} className="text-brand-red" />
            <h3 className="font-display font-bold text-white uppercase tracking-widest text-sm">Teklif Kontrolleri</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 font-display font-bold text-[10px] uppercase tracking-widest text-white/30 mb-2">
                <User size={12} /> Müşteri Adı / Ünvanı
              </label>
              <input 
                type="text" 
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="input-dark text-sm" 
                placeholder="Örn: Ahmet Yılmaz / ABC Ltd. Şti." 
              />
            </div>

            <div>
              <label className="flex items-center gap-2 font-display font-bold text-[10px] uppercase tracking-widest text-white/30 mb-2">
                <Percent size={12} /> Genel Kâr Marjı (%)
              </label>
              <input 
                type="number" 
                value={globalMargin}
                onChange={e => setGlobalMargin(Number(e.target.value))}
                className="input-dark text-sm" 
              />
              <p className="text-[10px] text-white/20 mt-1 italic">Katalog ürünleri için geçerlidir. Özel girilmeyen ürünlerde bu oran kullanılır.</p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
             <button onClick={() => window.print()} className="btn-primary w-full justify-center py-3 text-sm font-bold uppercase tracking-wider gap-2">
                <Printer size={18} /> Teklifi Yazdır / PDF Olarak Kaydet
             </button>
          </div>
        </div>

        {/* Kurumsal Renk Teması & İskonto Ayarları */}
        <div className="bg-[#141414] border border-white/5 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Palette size={18} className="text-brand-red" />
            <h3 className="font-display font-bold text-white uppercase tracking-widest text-sm">Tasarım & İskonto</h3>
          </div>

          {/* Tema Seçimi */}
          <div>
            <label className="font-display font-bold text-[10px] uppercase tracking-widest text-white/30 mb-3 block">
              Kurumsal Renk Teması
            </label>
            <div className="flex gap-3">
              {Object.keys(THEME_COLORS).map(color => (
                <button
                  key={color}
                  onClick={() => setThemeColor(color)}
                  className={`w-7 h-7 rounded-full transition-all border-2 ${themeColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: THEME_COLORS[color] }}
                  title={color.toUpperCase()}
                />
              ))}
            </div>
          </div>

          {/* Ekstra İskonto */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex justify-between items-center mb-2">
              <label className="flex items-center gap-1.5 font-display font-bold text-[10px] uppercase tracking-widest text-white/30">
                <Tag size={11} /> Ekstra İskonto / İndirim (%)
              </label>
              <span className="text-xs font-bold text-brand-red">% {discountPercent}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="50" 
              step="1"
              value={discountPercent} 
              onChange={e => setDiscountPercent(Number(e.target.value))}
              className="w-full accent-brand-red bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* KDV Muafiyet / KDV Hariç */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isKdvExcluded}
                onChange={e => setIsKdvExcluded(e.target.checked)}
                className="w-4 h-4 accent-brand-red cursor-pointer bg-white/5 border border-white/10 rounded"
              />
              <span className="font-display font-bold text-[10px] uppercase tracking-widest text-white/80">KDV Hariç Teklif Oluştur</span>
            </label>
            <span className="text-[9px] text-white/30 uppercase font-sans">
              {isKdvExcluded ? 'KDV %0' : 'KDV %20'}
            </span>
          </div>
        </div>

        {/* Hızlı Ürün Arama & Doğrudan Ekleme */}
        <div className="bg-[#141414] border border-white/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Plus size={18} className="text-brand-red" />
            <h3 className="font-display font-bold text-white uppercase tracking-widest text-sm">Ürün Ara & Ekle</h3>
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-black/60 border border-white/10 p-3 pl-10 text-white text-sm outline-none focus:border-brand-red"
              placeholder="Ürün adı, marka veya kod ara..."
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            
            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearchingProduct && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#181818] border border-white/10 p-4 text-xs text-white/40 text-center z-50">
                Sonuç bulunamadı.
              </div>
            )}

            {isSearchingProduct && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 size={14} className="animate-spin text-brand-red" />
              </div>
            )}
            
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#181818] border border-white/10 shadow-2xl max-h-[300px] overflow-y-auto z-50 divide-y divide-white/5 custom-scrollbar">
                {searchResults.map((p: any) => {
                  const priceInTl = getProductPriceInTl(p, kur)
                  return (
                    <div key={p.id} className="p-3 hover:bg-white/5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {p.fotograflar?.[0] ? (
                            <img src={p.fotograflar[0]} className="w-full h-full object-contain" alt="" />
                          ) : (
                            <span className="text-[8px] text-white/20">—</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white uppercase truncate">{p.ad}</div>
                          <div className="text-[9px] text-white/30 truncate">
                            {p.marka || 'Akdağ'} {p.model_kodu && `| ${p.model_kodu}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-brand-red">{priceInTl} ₺</span>
                        <button 
                          onClick={() => handleAddProductFromSearch(p)}
                          className="bg-brand-red hover:bg-white text-white hover:text-black p-1.5 transition-all"
                          title="Teklife Ekle"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Manuel Hizmet / Kalem Ekleme Paneli */}
        <div className="bg-[#141414] border border-white/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-brand-red" />
            <h3 className="font-display font-bold text-white uppercase tracking-widest text-sm">Manuel Kalem / Hizmet</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-display font-bold text-[9px] uppercase tracking-widest text-white/30 mb-1 block">Açıklama / Hizmet Adı</label>
              <input 
                type="text" 
                value={customAd}
                onChange={e => setCustomAd(e.target.value)}
                className="input-dark text-xs py-2" 
                placeholder="Örn: İşçilik, Montaj, Kablolama" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-display font-bold text-[9px] uppercase tracking-widest text-white/30 mb-1 block">Birim Fiyat (TL)</label>
                <input 
                  type="text" 
                  value={customFiyat}
                  onChange={e => setCustomFiyat(e.target.value)}
                  className="input-dark text-xs py-2 text-right" 
                  placeholder="0.00" 
                />
              </div>
              <div>
                <label className="font-display font-bold text-[9px] uppercase tracking-widest text-white/30 mb-1 block">Miktar (Adet)</label>
                <input 
                  type="number" 
                  value={customAdet}
                  onChange={e => setCustomAdet(Number(e.target.value))}
                  className="input-dark text-xs py-2 text-center" 
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="font-display font-bold text-[9px] uppercase tracking-widest text-white/30 mb-1 block">Kategori / Not (Opsiyonel)</label>
              <input 
                type="text" 
                value={customKategori}
                onChange={e => setCustomKategori(e.target.value)}
                className="input-dark text-xs py-2" 
                placeholder="Örn: Kablolama, Altyapı Hizmeti" 
              />
            </div>

            <button 
              onClick={handleAddCustomItem}
              className="btn-primary w-full py-2 justify-center text-xs mt-2"
            >
              <Plus size={14} /> Teklife Kalem Ekle
            </button>
          </div>
        </div>

        {/* Teklifteki Ürünler ve Kâr Ayarları */}
        <div className="bg-[#141414] border border-white/5 p-6">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
            <h4 className="font-display font-bold text-[10px] uppercase tracking-[0.2em] text-white/30">Ürün Listesi & Kâr</h4>
            {items.length > 0 && (
              <button 
                onClick={() => setItems([])}
                className="text-[9px] text-brand-red hover:underline font-bold uppercase tracking-wider flex items-center gap-1"
              >
                <Trash2 size={10} /> Temizle
              </button>
            )}
          </div>
          
          {items.length === 0 ? (
            <div className="text-center py-6 text-xs text-white/20">
              Henüz teklife ürün eklenmedi. Arama çubuğundan veya manuel panelden ekleyebilirsiniz.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {items.map(item => (
                <div key={item.id} className="bg-black/40 p-3 border border-white/5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-[10px] text-white uppercase truncate">{item.ad}</div>
                      <div className="text-[9px] text-white/30">
                        {item.model_kodu === 'MANUEL' ? `${item.fiyat} ₺ (TL Sabit)` : `${item.bayi_fiyati || item.fiyat} ₺ (Alış)`}
                      </div>
                    </div>
                    <button 
                      onClick={() => setItems(items.filter(i => i.id !== item.id))}
                      className="text-white/20 hover:text-brand-red p-0.5 transition-colors"
                      title="Ürünü Tekliften Çıkar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                    {/* Miktar Ayarı */}
                    <div className="flex items-center gap-1 bg-black/60 border border-white/10 px-1">
                      <button 
                        onClick={() => {
                          const updated = [...items]
                          const idx = updated.findIndex(i => i.id === item.id)
                          if (updated[idx].adet > 1) {
                            updated[idx].adet -= 1
                            setItems(updated)
                          }
                        }}
                        className="text-white/40 hover:text-white px-1 text-xs"
                      >
                        -
                      </button>
                      <span className="text-[10px] font-bold text-white min-w-[20px] text-center">{item.adet}</span>
                      <button 
                        onClick={() => {
                          const updated = [...items]
                          const idx = updated.findIndex(i => i.id === item.id)
                          updated[idx].adet += 1
                          setItems(updated)
                        }}
                        className="text-white/40 hover:text-white px-1 text-xs"
                      >
                        +
                      </button>
                    </div>
                    
                    {/* Kâr Girişi */}
                    {item.model_kodu !== 'MANUEL' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-white/30">% Kâr:</span>
                        <input 
                          type="number" 
                          placeholder={`%${globalMargin}`}
                          value={margins[item.id] || ''}
                          onChange={e => setMargins({ ...margins, [item.id]: Number(e.target.value) })}
                          className="bg-black/60 border border-white/10 text-right text-xs text-brand-red font-bold w-12 px-1 py-0.5 focus:border-brand-red outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Önizleme (Sağ Panel) */}
      <div id="print-area" className="xl:col-span-8 bg-white text-black p-8 sm:p-16 shadow-2xl min-h-[1123px] proposal-preview">
        {/* Teklif Başlığı */}
        <div className="flex flex-col md:flex-row justify-between gap-10 mb-12 pb-10 border-b-2" style={{ borderBottomColor: themeHex }}>
          <div className="max-w-[250px]">
            {settings?.logo_url ? (
              <div className="relative w-48 h-20 mb-4">
                <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain object-left" />
              </div>
            ) : (
              <div className="text-2xl font-black uppercase tracking-tighter mb-2">{settings?.firma_adi || 'FİRMA ADI'}</div>
            )}
            <div className="text-xs text-gray-500 space-y-1 font-sans">
              <p>{settings?.adres}</p>
              <p>{settings?.telefon}</p>
              <p>{settings?.email}</p>
              <p className="font-bold text-gray-700">{settings?.web_sitesi}</p>
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <h2 className="font-display font-black text-4xl uppercase tracking-tighter text-gray-900 mb-4">TEKLİF FORMU</h2>
            <table className="border-collapse font-sans text-right proposal-meta-table" style={{ minWidth: '190px', border: 'none' }}>
              <tbody>
                <tr style={{ border: 'none' }}>
                  <td className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-left py-0.5 pr-6 align-middle" style={{ border: 'none', padding: '2px 24px 2px 0' }}>Teklif No:</td>
                  <td className="font-black font-mono text-xs text-right py-0.5 align-middle" style={{ border: 'none', padding: '2px 0' }}>{proposalNo}</td>
                </tr>
                <tr style={{ border: 'none' }}>
                  <td className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-left py-0.5 pr-6 align-middle" style={{ border: 'none', padding: '2px 24px 2px 0' }}>Tarih:</td>
                  <td className="font-bold text-xs text-right py-0.5 align-middle" style={{ border: 'none', padding: '2px 0' }}>{new Date().toLocaleDateString('tr-TR')}</td>
                </tr>
                <tr style={{ border: 'none' }}>
                  <td className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-left py-0.5 pr-6 align-middle" style={{ border: 'none', padding: '2px 24px 2px 0' }}>Geçerlilik:</td>
                  <td className="font-bold text-xs text-right py-0.5 align-middle" style={{ border: 'none', padding: '2px 0' }}>7 Gün</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Müşteri Bilgisi */}
        <div className="mb-12">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-3">SAYIN / TO:</div>
          <div className="text-xl font-bold uppercase border-l-4 pl-4 py-1" style={{ borderLeftColor: themeHex }}>
            {customerName || '......................................................'}
          </div>
        </div>

        {/* Ürün Tablosu */}
        <table className="w-full mb-12">
          <thead>
            <tr className="border-b-2 text-left" style={{ borderBottomColor: themeHex }}>
              <th className="py-4 text-[10px] font-black uppercase tracking-widest w-16">Görsel</th>
              <th className="py-4 text-[10px] font-black uppercase tracking-widest">Açıklama</th>
              <th className="py-4 text-[10px] font-black uppercase tracking-widest text-center w-20">Adet</th>
              <th className="py-4 text-[10px] font-black uppercase tracking-widest text-right w-32">Birim Fiyat</th>
              <th className="py-4 text-[10px] font-black uppercase tracking-widest text-right w-32">Toplam</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-sans">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-gray-400 font-sans italic">
                  Lütfen sol paneldeki arama kutusunu kullanarak veya sepetinize ürün ekleyerek teklifinizi hazırlamaya başlayın.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const unitPrice = calculateItemPrice(item)
                return (
                  <tr key={idx} className="border-b border-gray-100/50">
                    <td className="py-4 pr-3 align-middle">
                      <div className="w-12 h-12 rounded border border-gray-200/50 overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                        {item.fotograf ? (
                          <img src={item.fotograf} alt={item.ad} className="w-full h-full object-contain p-1" />
                        ) : (
                          <FileText size={16} className="text-gray-300" />
                        )}
                      </div>
                    </td>
                    <td className="py-4 align-middle">
                      <div className="font-bold text-sm uppercase">{item.ad}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-display font-semibold tracking-wider font-sans">
                        {item.model_kodu === 'MANUEL' ? item.kategori : `${item.marka || 'Akdağ'} | ${item.kategori}`}
                      </div>
                    </td>
                    <td className="py-4 text-center font-bold text-sm align-middle">{item.adet}</td>
                    <td className="py-4 text-right font-bold text-sm align-middle">{unitPrice.toLocaleString('tr-TR')} ₺</td>
                    <td className="py-4 text-right font-black text-sm align-middle">{(unitPrice * item.adet).toLocaleString('tr-TR')} ₺</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Toplamlar */}
        <div className="flex justify-end mb-12">
          <div className="w-full max-w-[320px] space-y-3 font-sans">
            <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
              <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Ara Toplam</span>
              <span className="font-bold">{rawSubtotal.toLocaleString('tr-TR')} ₺</span>
            </div>
            
            {discountPercent > 0 && (
              <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 text-red-600 font-bold">
                <span className="uppercase tracking-widest text-[10px]">İskonto (%{discountPercent})</span>
                <span>-{discountAmount.toLocaleString('tr-TR')} ₺</span>
              </div>
            )}

            {discountPercent > 0 && (
              <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">İskonto Sonrası Tutar</span>
                <span className="font-bold">{subtotal.toLocaleString('tr-TR')} ₺</span>
              </div>
            )}

            {!isKdvExcluded && (
              <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">KDV (%20)</span>
                <span className="font-bold">{tax.toLocaleString('tr-TR')} ₺</span>
              </div>
            )}
            <div className="flex justify-between items-center text-white p-4 font-display font-black" style={{ backgroundColor: themeHex }}>
              <span className="uppercase tracking-[0.2em] text-[10px]">
                {isKdvExcluded ? 'GENEL TOPLAM (KDV HARİÇ)' : 'GENEL TOPLAM'}
              </span>
              <span className="text-xl">{total.toLocaleString('tr-TR')} ₺</span>
            </div>
          </div>
        </div>

        {/* Notlar & İmza */}
        <div className="grid grid-cols-2 gap-10 pt-10 border-t border-gray-100">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">NOTLAR:</div>
            <p className="text-xs text-gray-600 leading-relaxed font-sans italic whitespace-pre-line">
              {settings?.teklif_notu 
                ? (isKdvExcluded 
                    ? settings.teklif_notu.replace(/KDV dahil(dir)?(?!\s+değildir)/i, 'KDV dahil değildir')
                    : settings.teklif_notu)
                : `Teklifimiz 7 gün süreyle geçerlidir. Fiyatlarımıza KDV ${isKdvExcluded ? 'dahil değildir.' : 'dahildir.'}`}
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-10">KAŞE / İMZA:</div>
            <div className="w-32 h-px bg-gray-200 mb-2" />
            <div className="text-[10px] font-bold uppercase tracking-widest">{settings?.firma_adi}</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          /* Koyu tema arka planlarının yazdırılmasını engelle */
          html, body, main, section, article {
            background: transparent !important;
            background-color: transparent !important;
          }
          /* Sadece dış kapsayıcı div'lerin arka planını transparan yap */
          body > div, body > div > div, body > div > main, .min-h-screen {
            background: transparent !important;
            background-color: transparent !important;
          }
          /* Herşeyi gizle */
          body * {
            visibility: hidden;
          }
          /* Sadece print-area'yı ve çocuklarını göster */
          #print-area, #print-area * {
            visibility: visible !important;
          }
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            background: white !important;
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print, nav, footer, header {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @page {
            size: A4;
            margin: 1cm 1.2cm;
          }
          table { page-break-inside: auto; }
          #print-area > table { width: 100% !important; }
          .proposal-meta-table {
            width: auto !important;
            margin-left: auto !important;
          }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}
