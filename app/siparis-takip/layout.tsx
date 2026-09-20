import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sipariş ve Kargo Takibi | Sescim',
  description: 'Siparişinizin güncel kargo hareketlerini ve durumunu anlık takip edin.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function SiparisTakipLayout({ children }: { children: React.ReactNode }) {
  return children
}
