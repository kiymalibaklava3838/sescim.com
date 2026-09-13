/**
 * Sitenin resmi URL'sini döner.
 * E-posta, SMS, OAuth veya harici entegrasyonlarda daima https://sescim.com standardını korur.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!url || url.includes('localhost') || url.includes('127.0.0.1')) {
    return 'https://sescim.com'
  }
  return url.replace(/\/+$/, '')
}

