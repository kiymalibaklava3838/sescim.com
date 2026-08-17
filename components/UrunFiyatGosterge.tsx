'use client'

import { useEffect, useState } from 'react'
import { dovizToTL, formatFiyat, type KurData } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'
import { Clock } from 'lucide-react'

interface Props {
  fiyat?: number
  indirimliFiyat?: number
  paraBirimi: string
  fiyatGuncelleme?: string
  urunAdi?: string
}

export default function UrunFiyatGosterge({
  fiyat, indirimliFiyat, paraBirimi, fiyatGuncelleme, urunAdi = ''
}: Props) {
  const [kur, setKur] = useState<KurData>({ USD: 32.5, EUR: 35.2, guncelleme: null })

  useEffect(() => {
    getKurClient().then(setKur).catch(() => {})
  }, [])

  if (!fiyat) return null

  const fiyatTL = dovizToTL(fiyat, paraBirimi, kur)
  const indirimliFiyatTL = indirimliFiyat ? dovizToTL(indirimliFiyat, paraBirimi, kur) : null
  const indirimliFiyatGoster = indirimliFiyatTL && indirimliFiyatTL < fiyatTL

  const indirimYuzde = indirimliFiyatGoster && indirimliFiyatTL
    ? Math.round((1 - indirimliFiyatTL / fiyatTL) * 100)
    : 0

  return (
    <div className="mb-6 space-y-2">
      {indirimliFiyatGoster && indirimliFiyatTL ? (
        <>
          {/* Üstü çizili normal fiyat */}
          <div className="flex items-center gap-2">
            <span className="font-body text-slate-400 text-lg line-through">
              {formatFiyat(fiyatTL, 'TRY')}
            </span>
            <span className="font-display font-black text-xs bg-brand-red/10 text-brand-red px-2 py-0.5">
              %{indirimYuzde} İNDİRİM
            </span>
          </div>
          {/* İndirimli fiyat */}
          <div className="font-display font-black text-4xl text-brand-red">
            {formatFiyat(indirimliFiyatTL, 'TRY')}
          </div>
        </>
      ) : (
        <>
          <div className="font-display font-black text-4xl text-brand-red">
            {formatFiyat(fiyatTL, 'TRY')}
          </div>
        </>
      )}

      {/* KDV Bilgisi */}
      <div className="font-body text-slate-500 text-xs mt-1 mb-2">
        * Fiyatlandırmalara KDV dahildir
      </div>



      {/* Fiyat güncelleme tarihi */}
      {fiyatGuncelleme && (
        <div className="font-body text-slate-400 text-xs">
          Fiyat güncelleme: {new Date(fiyatGuncelleme).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      )}
    </div>
  )
}
