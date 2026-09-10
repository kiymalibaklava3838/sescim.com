'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Sparkles, ArrowRight, Music, Headphones, Volume2 } from 'lucide-react'
import { createAkdagBrowserClient } from '@/lib/supabase-akdag'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import { getTopAffinityCategory, getRecentlyViewed } from '@/lib/personalized-discover'
import { formatFiyat, dovizToTL, type KurData, DEFAULT_KUR } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'

interface Product {
  id: string
  slug?: string
  ad: string
  kategori: string
  marka?: string
  fotograflar: string[]
  fiyat?: number
  indirimli_fiyat?: number
  para_birimi?: string
}

export default function PersonalizedRecommendationsSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [affinityCat, setAffinityCat] = useState<string | null>(null)
  const [kur, setKur] = useState<KurData>(DEFAULT_KUR)
  const supabase = useRef(createAkdagBrowserClient()).current

  useEffect(() => {
    getKurClient().then(setKur).catch(() => {})
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadRecommendations() {
      const topCategory = getTopAffinityCategory()
      const recent = getRecentlyViewed()
      const recentIds = recent.map(r => r.id)

      if (isMounted) {
        setAffinityCat(topCategory)
      }

      try {
        let fetchedProducts: Product[] = []

        // 1. Durum: Kullanıcının belirgin bir kategori ilgisi varsa
        if (topCategory) {
          const { data } = await supabase
            .from('urunler')
            .select(LIGHT_PRODUCT_FIELDS)
            .ilike('kategori', `%${topCategory}%`)
            .limit(10)

          if (data && data.length > 0) {
            // Son incelediği ürünlerin aynısını göstermek yerine alternatifleri öne çıkar
            fetchedProducts = (data as any[]).filter(p => !recentIds.includes(p.id)).slice(0, 5)
            if (fetchedProducts.length < 5) {
              fetchedProducts = data.slice(0, 5) as any[]
            }
          }
        }

        // 2. Durum: Yeterli ürün yoksa veya yeni ziyaretçiyse profesyonel stüdyo/ses ürünlerini öner
        if (fetchedProducts.length < 5) {
          const { data: defaultData } = await supabase
            .from('urunler')
            .select(LIGHT_PRODUCT_FIELDS)
            .order('fiyat', { ascending: false })
            .limit(10)

          if (defaultData) {
            const existingIds = new Set(fetchedProducts.map(p => p.id))
            for (const item of (defaultData as any[])) {
              if (!existingIds.has(item.id)) {
                fetchedProducts.push(item)
                existingIds.add(item.id)
                if (fetchedProducts.length >= 5) break
              }
            }
          }
        }

        if (isMounted) {
          setProducts(fetchedProducts)
          setLoading(false)
        }
      } catch (err) {
        console.error('Recommendations load error:', err)
        if (isMounted) setLoading(false)
      }
    }

    loadRecommendations()

    // Kullanıcı sitede gezindikçe önerileri canlı güncelle
    const handleUpdate = () => {
      loadRecommendations()
    }

    window.addEventListener('sescim-personalization-updated', handleUpdate)
    return () => {
      isMounted = false
      window.removeEventListener('sescim-personalization-updated', handleUpdate)
    }
  }, [supabase])

  if (loading) {
    return (
      <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-8 w-64 bg-slate-100 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-[3/4] bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) return null

  return (
    <section className="py-12 md:py-16 bg-slate-50/70 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Başlık Alanı */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-display font-bold text-[11px] uppercase tracking-wider mb-2">
              <Sparkles size={12} className="text-amber-500 fill-amber-500" />
              <span>Akıllı Öneri</span>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-slate-900 uppercase">
              İlginizi Çekebilecek Ürünler
            </h2>
            
            <p className="text-xs md:text-sm text-slate-500 font-body mt-1">
              {affinityCat 
                ? `İncelediğiniz ${affinityCat} kategorisine göre sizin için seçilen ekipmanlar`
                : 'Stüdyo ve sahne profesyonellerinin en çok tercih ettiği seçkin ekipmanlar'
              }
            </p>
          </div>

          <Link 
            href={affinityCat ? `/urunler/${affinityCat.toLowerCase().replace(/ /g, '-')}` : '/urunler'}
            className="inline-flex items-center gap-2 text-xs md:text-sm font-display font-bold text-brand-red hover:text-red-700 transition-colors group shrink-0"
          >
            <span>Daha Fazlasını Keşfet</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Ürün Listesi */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {products.map((product) => {
            const pb = product.para_birimi || 'TRY'
            const rawFiyat = product.fiyat ?? 0
            const fiyatTL = dovizToTL(rawFiyat, pb, kur)
            const formatliFiyat = formatFiyat(fiyatTL, 'TRY')

            return (
              <div 
                key={product.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden group hover:shadow-lg hover:border-brand-red/30 transition-all flex flex-col h-full"
              >
                {/* Görsel */}
                <Link 
                  href={`/urun/${product.slug || product.id}`}
                  className="block relative aspect-square bg-slate-50 p-4 overflow-hidden"
                >
                  {product.fotograflar && product.fotograflar.length > 0 ? (
                    <Image
                      src={product.fotograflar[0]}
                      alt={product.ad}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                      className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Volume2 size={28} />
                    </div>
                  )}
                </Link>

                {/* Bilgiler */}
                <div className="p-3.5 flex flex-col flex-1 justify-between bg-white">
                  <div>
                    {product.marka && (
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate mb-1">
                        {product.marka}
                      </span>
                    )}
                    <Link
                      href={`/urun/${product.slug || product.id}`}
                      className="font-display font-bold text-xs sm:text-sm text-slate-800 group-hover:text-brand-red transition-colors line-clamp-2 leading-snug"
                      title={product.ad}
                    >
                      {product.ad}
                    </Link>
                  </div>

                  {/* Fiyat Alanı - Kesinlikle TL */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col">
                    <span className="font-display font-black text-brand-red text-sm sm:text-base leading-none">
                      {fiyatTL > 0 ? formatliFiyat : 'Fiyat Sorun'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
