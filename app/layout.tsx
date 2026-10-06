import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import MobileBottomNav from '@/components/MobileBottomNav'
import RouteProgressBar from '@/components/RouteProgressBar'
import dynamic from 'next/dynamic'
import { getSiteUrl } from '@/lib/site-url'

const CartDrawer = dynamic(() => import('@/components/CartDrawer'), { ssr: false })
const CartToast = dynamic(() => import('@/components/CartToast'), { ssr: false })
const QuickViewModal = dynamic(() => import('@/components/QuickViewModal'), { ssr: false })
const KvkkBanner = dynamic(() => import('@/components/KvkkBanner'), { ssr: false })
const WhatsAppButton = dynamic(() => import('@/components/WhatsAppButton'), { ssr: false })

const barlow = Barlow({ 
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-body',
  display: 'swap',
  preload: true,
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
  preload: true,
})

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
  '@id': `${siteUrl}/#website`,
  name: 'Sescim',
  alternateName: [
    'Sescim Müzik Market',
    'Sescim - Yeni Nesil Müzik Market',
    'sescim.com',
    'Akdağ Elektronik Sescim'
  ],
  url: siteUrl,
  description: 'Türkiye\'nin profesyonel ses, ışık ve stüdyo ekipmanları online satış mağazası.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteUrl}/arama?q={search_term_string}`
    },
    'query-input': 'required name=search_term_string'
  },
  inLanguage: 'tr-TR'
}

const siteNavigationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: [
    {
      '@type': 'SiteNavigationElement',
      position: 1,
      name: 'Tüm Ürünler & Keşfet',
      description: 'Profesyonel ses, ışık ve görüntü ekipmanları kataloğu',
      url: `${siteUrl}/urunler`
    },
    {
      '@type': 'SiteNavigationElement',
      position: 2,
      name: 'Ses Sistemleri',
      description: 'Hoparlörler, mikserler, amfiler ve profesyonel mikrofon sistemleri',
      url: `${siteUrl}/urunler/ses-sistemleri`
    },
    {
      '@type': 'SiteNavigationElement',
      position: 3,
      name: 'Işık Sistemleri',
      description: 'Robot ışıklar, sahne spotları, LED par ve efekt makineleri',
      url: `${siteUrl}/urunler/isik-sistemleri`
    },
    {
      '@type': 'SiteNavigationElement',
      position: 4,
      name: 'DJ Ekipmanları',
      description: 'DJ kontrol üniteleri, DJ mikserleri ve performans ekipmanları',
      url: `${siteUrl}/urunler/dj-ekipmanlari`
    },
    {
      '@type': 'SiteNavigationElement',
      position: 5,
      name: 'Stüdyo Ekipmanları',
      description: 'Stüdyo referans monitörleri, ses kartları ve kondenser mikrofonlar',
      url: `${siteUrl}/urunler/studyo-ekipmanlari`
    },
    {
      '@type': 'SiteNavigationElement',
      position: 6,
      name: 'Günün Fırsatları',
      description: 'Özel indirimli ses ve ışık ekipmanı fırsatları ve flaş indirimler',
      url: `${siteUrl}/firsatlar`
    },
    {
      '@type': 'SiteNavigationElement',
      position: 7,
      name: 'Kampanyalar & Kuponlar',
      description: 'Güncel indirim kuponları ve avantajlı ses paketi kampanyaları',
      url: `${siteUrl}/kampanyalar`
    },
    {
      '@type': 'SiteNavigationElement',
      position: 8,
      name: 'İletişim & Mağaza Bilgileri',
      description: 'Müşteri hizmetleri telefonu (0850 305 38 70), Kayseri mağaza adresi ve canlı destek',
      url: `${siteUrl}/iletisim`
    }
  ]
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: 'Sescim',
  legalName: 'Mustafa Akdağ - Akdağ Elektronik',
  taxID: '0200327808',
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  image: `${siteUrl}/logo.png`,
  email: 'info@sescim.com',
  telephone: '+90-850-305-38-70',
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
    telephone: '+90-850-305-38-70',
    email: 'info@sescim.com',
    contactType: 'customer service',
    areaServed: 'TR',
    availableLanguage: 'Turkish'
  },
  sameAs: [
    'https://www.instagram.com/sescimofficial',
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
  telephone: '+90-850-305-38-70',
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteNavigationJsonLd) }}
        />
        <Navbar />
        <CartDrawer />
        <CartToast />
        <QuickViewModal />
        <main className="flex-1 pb-16 lg:pb-0 w-full min-w-0">{children}</main>
        <Footer />
        <WhatsAppButton />
        <MobileBottomNav />
        <KvkkBanner />
        {/* Google Analytics - Yalnızca geçerli bir GA ID tanımlıysa yüklenir */}
        {hasValidGa && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  )
}
