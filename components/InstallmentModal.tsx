'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CreditCard, X, ShieldCheck, Check } from 'lucide-react'
import { calculateInstallments } from '@/lib/installment-engine'

interface Props {
  isOpen: boolean
  onClose: () => void
  fiyat: number
  urunAdi: string
}

export default function InstallmentModal({ isOpen, onClose, fiyat, urunAdi }: Props) {
  const [mounted, setMounted] = useState(false)
  const bankalar = useMemo(() => calculateInstallments(fiyat), [fiyat])
  const [selectedBanka, setSelectedBanka] = useState<string>('world')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Body scroll lock & ESC tuşuyla kapatma
  useEffect(() => {
    if (!isOpen) return

    const origOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = origOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const activeBanka = useMemo(
    () => bankalar.find((b) => b.bankaKodu === selectedBanka) || bankalar[0],
    [bankalar, selectedBanka]
  )

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="taksit-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90dvh] my-auto overflow-hidden border border-slate-200 flex flex-col relative z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0">
              <CreditCard size={18} />
            </div>
            <div className="min-w-0">
              <h3 id="taksit-modal-title" className="font-display font-black text-sm sm:text-base text-slate-900 uppercase tracking-tight truncate">
                Taksit Seçenekleri
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-body truncate" title={urunAdi}>
                {urunAdi}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors shrink-0"
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Fiyat Özeti */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shrink-0">
          <span className="font-display font-bold text-xs uppercase tracking-widest text-slate-300">
            Peşin Fiyat
          </span>
          <span className="font-display font-black text-lg sm:text-xl text-white">
            {Math.round(fiyat).toLocaleString('tr-TR')} ₺
          </span>
        </div>

        {/* Banka Sekmeleri (Scrollable on mobile) */}
        <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50 custom-scrollbar px-3 sm:px-4 pt-2 gap-1.5 shrink-0">
          {bankalar.map((b) => {
            const isSelected = b.bankaKodu === activeBanka?.bankaKodu
            return (
              <button
                key={b.bankaKodu}
                type="button"
                onClick={() => setSelectedBanka(b.bankaKodu)}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-xl font-display font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-white text-brand-red border-brand-red shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: b.renk }}
                />
                {b.kartAilesi}
              </button>
            )
          })}
        </div>

        {/* Taksit Tablosu */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          {activeBanka && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-display font-bold text-xs text-slate-700 uppercase tracking-wide">
                  {activeBanka.bankaAdi}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  PayTR Güvenli Altyapısıyla
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-display font-bold uppercase tracking-wider text-[10px] sm:text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4">Taksit</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">Aylık Ödeme</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">Toplam Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-body">
                    {activeBanka.taksitler.map((t) => (
                      <tr
                        key={t.taksitSayisi}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          t.taksitSayisi === 1 ? 'bg-emerald-50/40 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-display font-bold text-slate-800 flex items-center gap-1.5">
                          {t.taksitSayisi === 1 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <Check size={14} /> Tek Çekim (Peşin)
                            </span>
                          ) : (
                            <span>{t.taksitSayisi} Taksit</span>
                          )}
                        </td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          {t.aylikTutar.toLocaleString('tr-TR')} ₺
                        </td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-mono text-slate-700 text-xs sm:text-sm">
                          {t.toplamTutar.toLocaleString('tr-TR')} ₺
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Taksitli işlemlerde vade farkı kart çıkaran bankanın PayTR altyapısı üzerindeki komisyon oranlarına göre hesaplanmaktadır. Kampanyalı kartlarda taksit erteleme ve puan kazanımları bankanızca sağlanır.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 btn-outline text-xs font-display font-bold uppercase tracking-wider rounded-lg cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
