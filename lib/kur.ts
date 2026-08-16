// Kur yardımcıları — tüm uygulamada kullanılır

export interface KurData {
  USD: number
  EUR: number
  guncelleme: string | null
  fallback?: boolean
}

export async function getKur(): Promise<KurData> {
  try {
    const res = await fetch('/api/kur', { next: { revalidate: 300 } })
    return await res.json()
  } catch {
    return { USD: 32.50, EUR: 35.20, guncelleme: null, fallback: true }
  }
}

// Döviz fiyatını TL'ye çevir — küsüratsız yuvarlama (her zaman yukarı)
export function dovizToTL(fiyat: number, paraBirimi: string, kur: KurData): number {
  if (paraBirimi === 'TRY') return Math.ceil(fiyat)
  if (paraBirimi === 'USD') return Math.ceil(fiyat * kur.USD)
  if (paraBirimi === 'EUR') return Math.ceil(fiyat * kur.EUR)
  return Math.ceil(fiyat)
}

// Fiyat formatla (döviz + TL karşılığı)
export function formatFiyat(fiyat: number, paraBirimi: string): string {
  if (paraBirimi === 'USD') return `$${fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (paraBirimi === 'EUR') return `€${fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `${fiyat.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺`
}

export const PARA_BIRIMLERI = [
  { value: 'USD', label: '$ Dolar (USD)', symbol: '$' },
  { value: 'EUR', label: '€ Euro (EUR)',  symbol: '€' },
  { value: 'TRY', label: '₺ Türk Lirası (TRY)', symbol: '₺' },
]
