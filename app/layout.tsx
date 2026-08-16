import type { Metadata } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import MobileBottomNav from '@/components/MobileBottomNav'
import CartDrawer from '@/components/CartDrawer'
import dynamic from 'next/dynamic'
import { getSiteUrl } from '@/lib/site-url'

const barlow = Barlow({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-body',
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
})

const WhatsAppButton = dynamic(() => import('@/components/WhatsAppButton'), { ssr: false })
const KvkkBanner = dynamic(() => import('@/components/KvkkBanner'), { ssr: false })

export const metadata: Metadata = {
  title: {
    template: '%s | sescim.com',
    default: 'sescim.com | Ses, Işık & Görüntü — Türkiye\'nin En Büyük Seçkisi',
  },
  description: 'Profesyonel ses sistemleri, sahne ışıkları, görüntü ekipmanları, kulaklık ve DJ ekipmanları. Türkiye\'nin lider ses-ışık-görüntü e-ticaret platformu.',
  keywords: 'ses sistemi, ışık sistemi, görüntü sistemi, kulaklık, dj ekipmanı, stüdyo ekipmanı, hoparlör, mikrofon, sahne ekipmanı, sescim',
  metadataBase: new URL(getSiteUrl()),
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: { icon: '/logo.png', apple: '/logo.png' },
  openGraph: {
    title: 'sescim.com | Ses, Işık & Görüntü',
    description: 'Türkiye\'nin en büyük ses, ışık ve görüntü ekipmanları e-ticaret platformu.',
    url: getSiteUrl(),
    siteName: 'sescim.com',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'sescim.com',
    description: 'Ses, Işık & Görüntü Ekipmanları',
    images: ['/og-image.jpg'],
  },
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'sescim.com',
  url: getSiteUrl(),
  logo: `${getSiteUrl()}/logo.png`,
  sameAs: ['https://www.instagram.com/sescim'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${barlow.variable} ${barlowCondensed.variable}`} suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 antialiased font-body">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <Navbar />
        <CartDrawer />
        <main>{children}</main>
        <Footer />
        <MobileBottomNav />
        <WhatsAppButton />
        <KvkkBanner />
      </body>
    </html>
  )
}
