/** @type {import('next').NextConfig} */
// Sescim.com Production Build
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  images: {
    // unoptimized: false → Next.js Image Optimizer aktif, WebP/AVIF otomatik üretilir.
    // SafeProductImage bileşeni 3 aşamalı fallback ile yükleme hatalarını yönetir:
    //   Aşama 1: Next.js optimize (WebP/AVIF, lazy-load, LCP iyileştirmesi)
    //   Aşama 2: Supabase CDN doğrudan (optimizer hata verirse)
    //   Aşama 3: Paket ikonu (CDN de erişilemezse)
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 gün — optimize görseller uzun süre önbellekte kalır
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ktoifumardevbznyzljb.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'csekzzsaeehakpdmzfam.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/uye/panel',
        destination: '/hesabim',
        permanent: true,
      },
      {
        source: '/uye/panel/:path*',
        destination: '/hesabim',
        permanent: true,
      },
      {
        source: '/kategoriler/:slug*',
        destination: '/urunler/:slug*',
        permanent: true,
      },
      {
        source: '/kategori/:slug*',
        destination: '/urunler/:slug*',
        permanent: true,
      },
      {
        source: '/product-page/:slug*',
        destination: '/urun/:slug*',
        permanent: true,
      },
      {
        source: '/product/:slug*',
        destination: '/urun/:slug*',
        permanent: true,
      },
      {
        source: '/products/:slug*',
        destination: '/urun/:slug*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
