import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl()
  return {
    rules: [
      {
        userAgent: ['Googlebot', 'Google-StoreBot', 'Googlebot-Image', 'Bingbot', 'GPTBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot'],
        allow: ['/', '/api/feed/'],
        disallow: [
          '/admin',
          '/admin/',
          '/bayi',
          '/checkout',
          '/sepet',
          '/uye',
          '/hesabim',
          '/siparis-takip',
          '/siparis/',
          '/api/admin/',
        ],
      },
      {
        userAgent: '*',
        allow: ['/', '/api/feed/'],
        disallow: [
          '/admin',
          '/admin/',
          '/bayi',
          '/checkout',
          '/sepet',
          '/uye',
          '/hesabim',
          '/siparis-takip',
          '/siparis/',
          '/api/',
          '/arama',
          '/*?*min=',
          '/*?*max=',
          '/*?*sirala=',
          '/*?*stok=',
          '/*?*sayfa=',
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
          'CCBot',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
