import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sescim.com'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/feed/'],
        disallow: [
          '/admin',
          '/bayi',
          '/checkout',
          '/sepet',
          '/uye',
          '/hesabim',
          '/api/',
          '/*?*fiyat_',
          '/*?*siralama=',
          '/*?*stok=',
        ],
      },
      {
        userAgent: [
          'SemrushBot',
          'AhrefsBot',
          'MJ12bot',
          'DotBot',
          'PetalBot',
          'Bytespider',
          'Amazonbot',
          'ClaudeBot',
          'CCBot',
          'GPTBot',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
