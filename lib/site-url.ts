export function getSiteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL || 'https://sescim.com'
  return url.replace(/\/+$/, '')
}
