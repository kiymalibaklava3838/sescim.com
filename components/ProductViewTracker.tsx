'use client'

import { useEffect } from 'react'
import { ViewedProduct } from './RecentlyViewed'
import { saveRecentlyViewed } from '@/lib/personalized-discover'

export default function ProductViewTracker({ product }: { product: ViewedProduct }) {
  useEffect(() => {
    saveRecentlyViewed({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: product.price,
      currency: product.currency,
      category: product.category,
      timestamp: Date.now()
    })
  }, [product])

  return null
}
