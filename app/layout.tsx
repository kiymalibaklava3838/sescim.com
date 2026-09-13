import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import MobileBottomNav from '@/components/MobileBottomNav'
import CartDrawer from '@/components/CartDrawer'
import GlobalLoader from '@/components/GlobalLoader'
import RouteProgressBar from '@/components/RouteProgressBar'
import CartToast from '@/components/CartToast'
import QuickViewModal from '@/components/QuickViewModal'
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

const KvkkBanner = dynamic(() => import('@/components/KvkkBanner'), { ssr: false })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0f172a',
}

export const metadata: Metadata = {
  title: {
    template: '%s | Sescim',
    default: 'Sescim - Yeni Nesil Müzik Market | Profesyonel Ses, Işık & Görüntü',
  },
  description: 'Profesyonel ses sistemleri, sahne ışıkları, stüdyo ve DJ ekipmanları, kulaklık ve hoparlör çeşitleri. Akdağ Elektronik güvencesiyle Sescim.',
  keywords: 'ses sistemi, ışık sistemi, görüntü sistemi, kulaklık, dj ekipmanı, stüdyo ekipmanı, hoparlör, mikrofon, sahne ekipmanı, sescim, müzik market',
  metadataBase: new URL(getSiteUrl()),
  alternates: { canonical: '/' },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    title: 'Sescim - Yeni Nesil Müzik Market',
    description: 'Türkiye\'nin en büyük ses, ışık ve görüntü ekipmanları e-ticaret platformu.',
    url: getSiteUrl(),
    siteName: 'Sescim',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'Sescim - Yeni Nesil Müzik Market' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sescim - Yeni Nesil Müzik Market',
    description: 'Türkiye\'nin en büyük ses, ışık ve görüntü ekipmanları e-ticaret platformu.',
    images: ['/logo.png'],
  },
}

const siteUrl = getSiteUrl()

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Sescim',
  alternateName: 'Sescim - Yeni Nesil Müzik Market',
  url: siteUrl,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteUrl}/arama?q={search_term_string}`
    },
    'query-input': 'required name=search_term_string'
  }
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Sescim',
  legalName: 'Akdağ Elektronik ve Ses Sistemleri',
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  email: 'info@sescim.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Cumhuriyet Mah. Sur Cad. No:17/A',
    addressLocality: 'Melikgazi',
    addressRegion: 'Kayseri',
    postalCode: '38040',
    addressCountry: 'TR'
  },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+90-352-231-69-15',
    email: 'info@sescim.com',
    contactType: 'customer service',
    areaServed: 'TR',
    availableLanguage: 'Turkish'
  },
  sameAs: [
    'https://www.instagram.com/sescim',
    'https://youtube.com/@sescim',
    'https://twitter.com/sescim',
  ],
}

const storeJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['MusicStore', 'ElectronicsStore'],
  name: 'Sescim - Yeni Nesil Müzik Market',
  image: `${siteUrl}/logo.png`,
  '@id': `${siteUrl}/#store`,
  url: siteUrl,
  telephone: '+90-352-231-69-15',
  email: 'info@sescim.com',
  priceRange: '₺₺₺',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Cumhuriyet Mah. Sur Cad. No:17/A',
    addressLocality: 'Melikgazi',
    addressRegion: 'Kayseri',
    postalCode: '38040',
    addressCountry: 'TR'
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 38.7205,
    longitude: 35.4826
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '19:00'
    }
  ]
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const hasValidPixel = !!metaPixelId && metaPixelId.trim() !== '' && metaPixelId !== 'YOUR_PIXEL_ID'

  const gaId = process.env.NEXT_PUBLIC_GA_ID
  const hasValidGa = !!gaId && gaId.trim() !== '' && gaId !== 'G-XXXXXXXXXX'

  return (
    <html lang="tr" className={`${barlow.variable} ${barlowCondensed.variable}`} suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 antialiased font-body">
        {/* Meta Pixel Code - Yalnızca geçerli bir Pixel ID tanımlıysa yüklenir */}
        {hasValidPixel && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
        <RouteProgressBar />
        <GlobalLoader />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <Navbar />
        <CartDrawer />
        <CartToast />
        <QuickViewModal />
        <main className="flex-1 pb-16 lg:pb-0 w-full min-w-0 overflow-x-clip">{children}</main>
        <Footer />
        <MobileBottomNav />
        <KvkkBanner />
        {/* Google Analytics - Yalnızca geçerli bir GA ID tanımlıysa yüklenir */}
        {hasValidGa && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  )
}
