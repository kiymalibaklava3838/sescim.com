'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Search, Plus, Trash2, ShoppingCart, Loader2, Package, Check } from 'lucide-react'
import Image from 'next/image'
import { addManyToCart } from '@/lib/cart'

interface Product {
  id: string
  ad: string
  kategori: string
  fotograflar: string[]
  fiyat: number
  bayi_fiyati: number
  para_birimi: string
  bayi_para_birimi: string
}

interface OrderItem {
  product: Product
  quantity: number
}

export default function HizliSiparisPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<OrderItem[]>([])
  const [addingToCart, setAddingToCart] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/bayi')
      return
    }
  }

  const searchProducts = async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('urunler')
      .select('id, ad, kategori, fotograflar, fiyat, bayi_fiyati, para_birimi, bayi_para_birimi')
      .ilike('ad', `%${q}%`)
      .limit(5)
    setResults(data || [])
    setLoading(false)
  }

  const handleAddItem = (p: Product) => {
    if (items.some(x => x.product.id === p.id)) return
    setItems(prev => [...prev, { product: p, quantity: 1 }])
    setQuery('')
    setResults([])
  }

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => 
      item.product.id === id 
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ))
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(x => x.product.id !== id))
  }

  const handleBulkAdd = async () => {
    setAddingToCart(true)
    const formattedItems = items.map(item => ({
      id: item.product.id,
      ad: item.product.ad,
      kategori: item.product.kategori,
      fotograf: item.product.fotograflar?.[0] || '',
      fiyat: item.product.fiyat,
      bayi_fiyati: item.product.bayi_fiyati,
      para_birimi: item.product.para_birimi,
      bayi_para_birimi: item.product.bayi_para_birimi,
      adet: item.quantity
    }))
    
    addManyToCart(formattedItems)
    setItems([])
    setAddingToCart(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="min-h-screen pt-12 pb-24 bg-[#0A0A0A]">
      <div className="max-w-4xl mx-auto px-6">
        
        <div className="mb-10">
          <h1 className="font-display font-black text-3xl uppercase text-white tracking-widest red-line">Hızlı Sipariş</h1>
          <p className="font-body text-white/30 text-sm mt-2">Ürünleri arayın ve toplu halde sepetinize ekleyin.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Arama Alanı */}
          <div className="lg:col-span-2 space-y-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center text-brand-red">
                <Search size={20} />
              </div>
              <input 
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); searchProducts(e.target.value) }}
                placeholder="Ürün adı veya kodu yazın..."
                className="w-full bg-[#141414] border border-white/10 p-5 pl-12 text-white font-body focus:border-brand-red outline-none transition-all placeholder:text-white/10"
              />
              
              {/* Sonuçlar Dropdown */}
              {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-[#1A1A1A] border border-white/10 shadow-2xl mt-1 overflow-hidden">
                  {results.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => handleAddItem(p)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                    >
                      <div className="w-12 h-12 bg-black border border-white/5 flex-shrink-0 relative overflow-hidden">
                        {p.fotograflar?.[0] && <Image src={p.fotograflar[0]} alt={p.ad} fill className="object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold text-sm text-white uppercase truncate">{p.ad}</div>
                        <div className="font-body text-white/20 text-xs">{p.kategori}</div>
                      </div>
                      <Plus size={16} className="text-brand-red" />
                    </button>
                  ))}
                </div>
              )}
              {loading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 size={16} className="animate-spin text-white/20" /></div>}
            </div>

            {/* Seçili Liste */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-xs uppercase tracking-widest text-white/40 mb-4">Eklenecek Ürünler ({items.length})</h3>
              {items.length === 0 ? (
                <div className="border border-dashed border-white/5 p-12 text-center">
                  <Package size={32} className="text-white/5 mx-auto mb-3" />
                  <p className="font-body text-white/10 text-sm">Henüz ürün seçilmedi.</p>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.product.id} className="bg-[#141414] border border-white/5 p-4 flex items-center gap-4 group">
                    <div className="w-10 h-10 bg-black flex-shrink-0 relative overflow-hidden">
                       {item.product.fotograflar?.[0] && <Image src={item.product.fotograflar[0]} alt={item.product.ad} fill className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-sm text-white uppercase truncate">{item.product.ad}</div>
                      <div className="font-body text-white/40 text-[10px] uppercase tracking-wider">{item.product.kategori}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-white/10">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-2 hover:bg-white/5 text-white/30 hover:text-white transition-colors">-</button>
                        <span className="w-8 text-center text-xs font-display font-bold text-white">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-2 hover:bg-white/5 text-white/30 hover:text-white transition-colors">+</button>
                      </div>
                      <button onClick={() => removeItem(item.product.id)} className="p-2 text-white/10 hover:text-brand-red transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Özet ve Onay */}
          <div className="space-y-6">
            <div className="bg-[#141414] border border-white/5 p-6 sticky top-24">
              <h3 className="font-display font-bold text-sm uppercase tracking-widest text-white mb-6">Sipariş Özeti</h3>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40 font-body">Toplam Ürün</span>
                  <span className="text-white font-display font-bold">{items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40 font-body">Toplam Adet</span>
                  <span className="text-white font-display font-bold">{items.reduce((a, b) => a + b.quantity, 0)}</span>
                </div>
              </div>
              
              <button 
                onClick={handleBulkAdd}
                disabled={items.length === 0 || addingToCart}
                className={`btn-primary w-full justify-center gap-3 py-4 text-sm disabled:opacity-20 ${success ? '!bg-green-600' : ''}`}
              >
                {addingToCart ? <Loader2 size={18} className="animate-spin" /> : success ? <Check size={18} /> : <ShoppingCart size={18} />}
                {addingToCart ? 'Ekleniyor...' : success ? 'Sepete Eklendi!' : 'Hepsini Sepete Ekle'}
              </button>
              
              {success && (
                <button 
                  onClick={() => router.push('/sepet')}
                  className="w-full text-center mt-4 text-xs font-display font-bold uppercase tracking-widest text-brand-red hover:text-white transition-colors"
                >
                  Sepete Git →
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
