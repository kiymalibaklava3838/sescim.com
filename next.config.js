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
    unoptimized: true,
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
