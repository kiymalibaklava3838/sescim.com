// Kur yardımcıları — tüm uygulamada kullanılır
import { getSiteUrl } from './site-url'

export interface KurData {
  USD: number
  EUR: number
  guncelleme: string | null
  fallback?: boolean
}

// Güvenli ve güncel varsayılan kurlar
export const DEFAULT_KUR: KurData = {
  USD: 38.00,
  EUR: 41.00,
  guncelleme: null,
  fallback: true,
}

let cachedKur: { data: KurData; timestamp: number } | null = null

export async function getKur(): Promise<KurData> {
  // 5 dakikalık sunucu içi bellek önbelleği
  const now = Date.now()
  if (cachedKur && (now - cachedKur.timestamp < 300_000)) {
    return cachedKur.data
  }

  try {
    const baseUrl = typeof window === 'undefined' ? getSiteUrl() : ''
    const res = await fetch(`${baseUrl}/api/kur`, { 
      next: { revalidate: 300 },
      headers: { 'Accept': 'application/json' }
    })
    if (res.ok) {
      const data: KurData = await res.json()
      cachedKur = { data, timestamp: now }
      return data
    }
  } catch (e) {
    // Hata durumunda cache veya varsayılan dön
    if (cachedKur) return cachedKur.data
  }

  return DEFAULT_KUR
}

// Döviz fiyatını TL'ye çevir — küsüratsız yuvarlama (her zaman yukarı)
export function dovizToTL(fiyat: number, paraBirimi: string, kur: KurData): number {
  if (!fiyat || isNaN(fiyat)) return 0
  const activeKur = kur || DEFAULT_KUR
  if (paraBirimi === 'TRY') return Math.ceil(fiyat)
  if (paraBirimi === 'USD') return Math.ceil(fiyat * activeKur.USD)
  if (paraBirimi === 'EUR') return Math.ceil(fiyat * activeKur.EUR)
  return Math.ceil(fiyat)
}

// Fiyat formatla (döviz + TL karşılığı)
export function formatFiyat(fiyat: number, paraBirimi: string): string {
  if (!fiyat || isNaN(fiyat)) return '0 ₺'
  if (paraBirimi === 'USD') return `$${fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (paraBirimi === 'EUR') return `€${fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `${fiyat.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺`
}

export const PARA_BIRIMLERI = [
  { value: 'USD', label: '$ Dolar (USD)', symbol: '$' },
  { value: 'EUR', label: '€ Euro (EUR)',  symbol: '€' },
  { value: 'TRY', label: '₺ Türk Lirası (TRY)', symbol: '₺' },
]
