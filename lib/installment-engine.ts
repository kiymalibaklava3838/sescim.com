/**
 * PayTR / Türk Bankaları Taksit Hesaplama Motoru
 * World, Bonus, Maximum, Axess, CardFinans, Paraf, Sağlam Kart
 */

export interface TaksitPlani {
  taksitSayisi: number
  aylikTutar: number
  toplamTutar: number
  komisyonOrani: number
  vadeFarksiz: boolean
}

export interface BankaTaksitleri {
  bankaKodu: string
  bankaAdi: string
  kartAilesi: string
  renk: string
  taksitler: TaksitPlani[]
}

// Ortalama standart e-ticaret vade farkı oranları matrisi
const DEFAULT_RATES: Record<number, number> = {
  1: 0,
  2: 0.038,
  3: 0.054,
  6: 0.098,
  9: 0.145,
  12: 0.189,
}

export const BANKA_KARTLARI: { kod: string; ad: string; kart: string; renk: string }[] = [
  { kod: 'world', ad: 'Yapı Kredi / Albaraka', kart: 'World', renk: '#6c2bd9' },
  { kod: 'bonus', ad: 'Garanti BBVA / TEB', kart: 'Bonus', renk: '#16a34a' },
  { kod: 'maximum', ad: 'Türkiye İş Bankası', kart: 'Maximum', renk: '#2563eb' },
  { kod: 'axess', ad: 'Akbank', kart: 'Axess', renk: '#ea580c' },
  { kod: 'cardfinans', ad: 'QNB Finansbank', kart: 'CardFinans', renk: '#0284c7' },
  { kod: 'paraf', ad: 'Halkbank', kart: 'Paraf', renk: '#059669' },
  { kod: 'saglam', ad: 'Kuveyt Türk', kart: 'Sağlam Kart', renk: '#d97706' },
]

export function calculateInstallments(tutar: number): BankaTaksitleri[] {
  if (!tutar || tutar <= 0) return []

  const taksitSecenekleri = [2, 3, 6, 9, 12]

  return BANKA_KARTLARI.map((banka) => {
    const taksitler: TaksitPlani[] = [
      {
        taksitSayisi: 1,
        aylikTutar: Math.round(tutar),
        toplamTutar: Math.round(tutar),
        komisyonOrani: 0,
        vadeFarksiz: true,
      },
      ...taksitSecenekleri.map((taksit) => {
        const rate = DEFAULT_RATES[taksit] || 0.1
        const toplam = Math.round(tutar * (1 + rate))
        const aylik = Math.round(toplam / taksit)

        return {
          taksitSayisi: taksit,
          aylikTutar: aylik,
          toplamTutar: toplam,
          komisyonOrani: rate,
          vadeFarksiz: rate === 0,
        }
      }),
    ]

    return {
      bankaKodu: banka.kod,
      bankaAdi: banka.ad,
      kartAilesi: banka.kart,
      renk: banka.renk,
      taksitler,
    }
  })
}
