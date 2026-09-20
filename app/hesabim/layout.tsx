import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hesabım | Sescim',
  description: 'Siparişleriniz, adres defteriniz ve üyelik bilgileriniz.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function HesabimLayout({ children }: { children: React.ReactNode }) {
  return children
}
