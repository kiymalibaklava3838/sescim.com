import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alışveriş Sepetim | Sescim',
  description: 'Sepetinizdeki profesyonel ses, ışık ve müzik ekipmanlarını güvenle sipariş verin.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function SepetLayout({ children }: { children: React.ReactNode }) {
  return children
}
