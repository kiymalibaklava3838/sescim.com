import { createAkdagServerClient } from '@/lib/supabase-akdag'
import Image from 'next/image'
import Link from 'next/link'
import { Package, ArrowRight, Star } from 'lucide-react'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import { StaggerContainer, StaggerItem, AnimatedButton } from './MotionComponents'

const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(price)
}

interface Props {
  title?: string
  sortBy?: 'created_at' | 'fiyat' | 'bayi_fiyati'
  ascending?: boolean
}

export default async function FeaturedProducts({ title = "Öne Çıkan Ürünler", sortBy = "created_at", ascending = false }: Props = {}) {
  const supabase = await createAkdagServerClient()
  
  // Sadece is_featured = true olan ürünleri getir
  const { data } = await supabase
    .from('urunler')
    .select(LIGHT_PRODUCT_FIELDS)
    .eq('is_featured', true)
    .order(sortBy, { ascending })
    .limit(10)

  const featuredProducts = data as any[] | null

  if (!featuredProducts || featuredProducts.length === 0) return null

  return (
    <div className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="font-bold text-3xl text-slate-800">
              {title}
            </h2>
            <div className="h-1 w-16 bg-brand-red mt-3 rounded-full" />
          </div>
          
          <Link href="/urunler" className="text-brand-red font-semibold hover:text-red-700 transition-colors flex items-center gap-1 group">
            Tümünü Gör <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {featuredProducts.map((product) => (
            <StaggerItem key={product.id} className="flex flex-col h-full">
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden group hover:shadow-lg transition-all flex flex-col h-full">
              <Link href={`/urun/${product.slug}`} className="block relative aspect-square bg-white p-4">
                {product.fotograflar && product.fotograflar.length > 0 ? (
                  <Image 
                    src={product.fotograflar[0]} 
                    alt={product.ad} 
                    fill 
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                    <Package size={48} />
                  </div>
                )}
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                  <span className="bg-brand-red text-white px-2 py-1 text-xs font-bold rounded-sm shadow-sm">
                    YENİ
                  </span>
                </div>
              </Link>
              
              <div className="p-4 flex flex-col flex-1 border-t border-slate-100">
                <Link href={`/urun/${product.slug}`} className="flex-1">
                  <h3 className="text-sm font-medium text-slate-700 line-clamp-2 group-hover:text-brand-red transition-colors">
                    {product.ad}
                  </h3>
                </Link>
                
                {/* Social Proof Placeholder */}
                <div className="flex items-center gap-1 mt-2">
                  <div className="flex text-yellow-400">
                    <Star size={14} fill="currentColor" className="text-yellow-400" />
                    <Star size={14} fill="currentColor" className="text-yellow-400" />
                    <Star size={14} fill="currentColor" className="text-yellow-400" />
                    <Star size={14} fill="currentColor" className="text-yellow-400" />
                    <Star size={14} fill="currentColor" className="text-yellow-400" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">(24)</span>
                </div>
                
                <div className="mt-4 flex flex-col justify-end">
                  {product.bayi_fiyati ? (
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-xs line-through">
                        {formatPrice(product.fiyat, product.para_birimi)}
                      </span>
                      <span className="text-lg font-bold text-brand-red mt-1">
                        {formatPrice(product.bayi_fiyati, product.para_birimi)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col min-h-[44px] justify-end">
                      <span className="text-lg font-bold text-brand-red">
                        {formatPrice(product.fiyat, product.para_birimi)}
                      </span>
                    </div>
                  )}
                  
                  <AnimatedButton className="bg-brand-red text-white w-full py-2 rounded-md font-semibold text-sm mt-3 hover:bg-red-700 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:translate-y-2 lg:group-hover:translate-y-0 duration-300">
                    Sepete Ekle
                  </AnimatedButton>
                </div>
              </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </div>
  )
}
