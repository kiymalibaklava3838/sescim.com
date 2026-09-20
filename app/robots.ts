import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl()
  return {
    rules: [
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
