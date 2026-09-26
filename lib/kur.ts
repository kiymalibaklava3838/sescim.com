// Kur yardımcıları — tüm uygulamada tek merkezden kullanılır
import { getSiteUrl } from './site-url'

export interface KurData {
  USD: number
  EUR: number
  guncelleme: string | null
  fallback?: boolean
}

// Güvenli ve güncel varsayılan kurlar
export const DEFAULT_KUR: KurData = {
  USD: 48.89,
  EUR: 55.60,
  guncelleme: null,
  fallback: true,
}

let cachedKur: { data: KurData; timestamp: number } | null = null

/**
 * Döviz kurlarını harici kaynaktan çeker ve 5 dakika boyunca bellek önbelleğinde tutar.
 * Sunucu bileşenleri, API rotaları ve feed oluşturucular bu ortak fonksiyonu kullanır.
 */
export async function getKur(): Promise<KurData> {
  const now = Date.now()
  if (cachedKur && (now - cachedKur.timestamp < 300_000)) {
    return cachedKur.data
  }

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 300 },
    })
    if (res.ok) {
      const data = await res.json()
      const usdTry = Number(data.rates?.TRY) || DEFAULT_KUR.USD
      const eurRate = Number(data.rates?.EUR) || 0.88
      const eurTry = usdTry / eurRate

      const result: KurData = {
        USD: parseFloat(usdTry.toFixed(2)),
        EUR: parseFloat(eurTry.toFixed(2)),
        guncelleme: new Date().toISOString(),
      }
      cachedKur = { data: result, timestamp: now }
      return result
    }
  } catch (e) {
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
