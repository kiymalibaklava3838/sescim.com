import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sescim.com'
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/bayi', '/checkout', '/sepet', '/uye'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
