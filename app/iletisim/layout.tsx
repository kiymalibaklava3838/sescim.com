import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'İletişim & Mağaza Bilgileri | Sescim',
  description: 'Sescim müşteri hizmetleri, mağaza adresi, telefon ve destek formu. Akdağ Elektronik güvencesiyle 7/24 iletişim.',
  alternates: {
    canonical: '/iletisim',
  },
}

export default function IletisimLayout({ children }: { children: React.ReactNode }) {
  return children
}
