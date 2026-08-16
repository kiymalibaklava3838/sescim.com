import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sepet | Akdağ Elektronik',
  description: 'Sepetinizi tamamlayın, havale veya kredi kartı ile ödeme yapın.',
}

export default function SepetLayout({ children }: { children: React.ReactNode }) {
  return children
}
