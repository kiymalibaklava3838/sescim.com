import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sescim.com'
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/feed/'],
      disallow: ['/admin', '/bayi', '/checkout', '/sepet', '/uye', '/hesabim', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
