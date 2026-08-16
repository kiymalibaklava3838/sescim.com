'use client'

import { useEffect, useState } from 'react'
import { ProductCard } from '@/components/ProductGrid'
import { getKurClient } from '@/lib/kur-client'
import { createClient } from '@/lib/supabase'
import type { KurData } from '@/lib/kur'

export default function FeaturedCarousel({ products }: { products: any[] }) {
  const [kur, setKur] = useState<KurData>({ USD: 32.5, EUR: 35.2, guncelleme: null })
  const [isBayiAuth, setIsBayiAuth] = useState(false)
  const [showPrice, setShowPrice] = useState(false)

  useEffect(() => {
    // Kur bilgisini al
    getKurClient().then(setKur)

    // Kullanıcı yetkisini kontrol et (Bayi mi?)
    const supabase = createClient()
    supabase.auth.getSession().then((res: any) => {
      const session = res.data?.session
      if (session?.user) {
        supabase.from('bayiler').select('onaylandi').eq('user_id', session.user.id).maybeSingle()
          .then(({ data }: any) => {
            const isBayi = !!data?.onaylandi
            setIsBayiAuth(isBayi)
            setShowPrice(isBayi)
          })
      }
    })
  }, [])

  return (
    <div className="flex overflow-x-auto gap-4 pb-8 snap-x snap-mandatory custom-scrollbar hide-scrollbar-mobile -mx-6 px-6 md:mx-0 md:px-0">
      {products.map((product) => (
        <div key={product.id} className="flex-shrink-0 w-[280px] md:w-[300px] snap-center">
          <ProductCard 
            product={product} 
            isBayi={isBayiAuth} 
            kur={kur} 
            showPrice={showPrice} 
          />
        </div>
      ))}
    </div>
  )
}
