import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ürün Karşılaştırma | Sescim',
  description: 'Seçtiğiniz profesyonel ses, ışık ve müzik ekipmanlarını teknik özelliklerine ve fiyatlarına göre yan yana karşılaştırın.',
  alternates: {
    canonical: '/karsilastir',
  },
}

export default function KarsilastirLayout({ children }: { children: React.ReactNode }) {
  return children
}
