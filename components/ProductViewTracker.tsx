'use client'

import { useEffect } from 'react'
import { ViewedProduct } from './RecentlyViewed'

export default function ProductViewTracker({ product }: { product: ViewedProduct }) {
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sescim_recently_viewed')
      let viewed: ViewedProduct[] = stored ? JSON.parse(stored) : []
      
      // Aynı ürün zaten varsa çıkar (en başa tekrar eklemek için)
      viewed = viewed.filter((p) => p.id !== product.id)
      
      // En başa ekle
      viewed.unshift(product)
      
      // Maksimum 12 ürün tut
      if (viewed.length > 12) {
        viewed = viewed.slice(0, 12)
      }
      
      localStorage.setItem('sescim_recently_viewed', JSON.stringify(viewed))
    } catch (e) {
      console.error('Failed to save recently viewed product', e)
    }
  }, [product])

  return null
}
