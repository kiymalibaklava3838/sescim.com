'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Package } from 'lucide-react'
import { formatFiyat } from '@/lib/kur'

export interface ViewedProduct {
  id: string
  slug: string
  name: string
  image: string | null
  price: number | null
  currency: string
  timestamp: number
}

export default function RecentlyViewed() {
  const [products, setProducts] = useState<ViewedProduct[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sescim_recently_viewed')
      if (stored) {
        const parsed: ViewedProduct[] = JSON.parse(stored)
        // Son eklenenler en başta olacak şekilde tarihe göre sırala
        parsed.sort((a, b) => b.timestamp - a.timestamp)
        setProducts(parsed)
      }
    } catch (e) {
      console.error('Failed to parse recently viewed products', e)
    }
  }, [])

  if (products.length === 0) return null

  return (
    <div className="mt-16 pt-12 border-t border-slate-200">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-px bg-slate-800" />
        <span className="font-display font-black text-sm tracking-[0.2em] uppercase text-slate-800">
          Son İnceledikleriniz
        </span>
      </div>
      <div className="flex overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4 snap-x custom-scrollbar">
        {products.map((product) => (
          <div key={product.id} className="min-w-[160px] md:min-w-[200px] flex-shrink-0 snap-start h-full">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden group hover:shadow-lg transition-all flex flex-col h-full">
              <Link href={`/urun/${product.slug}`} className="block relative aspect-square bg-white p-4">
                {product.image ? (
                  <Image 
                    src={product.image} 
                    alt={product.name} 
                    fill 
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                    <Package size={32} />
                  </div>
                )}
              </Link>
              
              <div className="p-3 flex flex-col flex-1 border-t border-slate-100">
                <Link href={`/urun/${product.slug}`} className="flex-1">
                  <h3 className="text-xs font-medium text-slate-700 line-clamp-2 group-hover:text-brand-red transition-colors">
                    {product.name}
                  </h3>
                </Link>
                
                <div className="mt-2 flex flex-col min-h-[24px] justify-end">
                  <span className="text-sm font-bold text-slate-900">
                    {product.price ? formatFiyat(product.price, product.currency || 'TRY') : 'Fiyat Yok'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
