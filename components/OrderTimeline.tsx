'use client'

import { useState } from 'react'
import { Check, Clock, Package, Truck, CheckCircle2, XCircle, Copy, ExternalLink, ChevronDown, ChevronUp, Loader2, MapPin } from 'lucide-react'
import { getCarrierTrackingUrl } from '@/lib/shipping'

interface Props {
  durum: string
  kargoTakipNo?: string
  kargoFirmasi?: string
  createdAt: string
  teslimTarihi?: string
}

const STEPS = [
  { key: 'beklemede', label: 'Sipariş Alındı', icon: Clock },
  { key: 'onaylandi', label: 'Onaylandı', icon: CheckCircle2 },
  { key: 'hazirlaniyor', label: 'Hazırlanıyor', icon: Package },
  { key: 'kargolandi', label: 'Kargoya Verildi', icon: Truck },
  { key: 'teslim_edildi', label: 'Teslim Edildi', icon: Check },
]

const STATUS_PROGRESS: Record<string, number> = {
  beklemede: 1,
  onaylandi: 2,
  hazirlaniyor: 3,
  kargolandi: 4,
  teslim_edildi: 5,
  tamamlandi: 5,
  iptal: -1,
}

export default function OrderTimeline({
  durum,
  kargoTakipNo,
  kargoFirmasi = 'HepsiJet',
  createdAt,
  teslimTarihi,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [showMovements, setShowMovements] = useState(false)
  const [loadingMovements, setLoadingMovements] = useState(false)
  const [movementsData, setMovementsData] = useState<any>(null)

  const currentStep = STATUS_PROGRESS[durum] ?? 1
  const isCancelled = durum === 'iptal'

  const copyTracking = () => {
    if (!kargoTakipNo) return
    navigator.clipboard.writeText(kargoTakipNo)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleMovements = async () => {
    if (showMovements) {
      setShowMovements(false)
      return
    }

    setShowMovements(true)
    if (!movementsData && kargoTakipNo) {
      setLoadingMovements(true)
      try {
        const res = await fetch('/api/cargo/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firma: kargoFirmasi, takipNo: kargoTakipNo }),
        })
        const json = await res.json()
        if (json.success) {
          setMovementsData(json.data)
        }
      } catch (e) {
        console.error('Failed to load tracking data:', e)
      } finally {
        setLoadingMovements(false)
      }
    }
  }

  if (isCancelled) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-3 text-rose-800">
        <XCircle size={24} className="text-rose-600 shrink-0" />
        <div>
          <div className="font-display font-black text-sm uppercase tracking-wider">
            Sipariş İptal Edildi
          </div>
          <p className="text-xs text-rose-600 mt-0.5">
            Bu sipariş iptal edilmiş olup varsa ödeme iadeniz bankanıza iletilmiştir.
          </p>
        </div>
      </div>
    )
  }

  const trackingUrl = getCarrierTrackingUrl(kargoFirmasi, kargoTakipNo)

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="font-display font-bold text-xs uppercase tracking-widest text-slate-500">
          SİPARİŞ VE TESLİMAT SÜRECİ
        </div>
        <div className="text-xs text-slate-500">
          Sipariş Tarihi: <strong className="text-slate-800 font-medium">{new Date(createdAt).toLocaleDateString('tr-TR')}</strong>
        </div>
      </div>

      {/* 5 Adımlı Zaman Çizelgesi */}
      <div className="relative">
        {/* Çizgi */}
        <div className="absolute top-4 left-4 right-4 h-1 bg-slate-200 -translate-y-1/2 z-0 hidden sm:block">
          <div
            className="h-full bg-brand-red transition-all duration-500 ease-out"
            style={{ width: `${Math.max(0, ((currentStep - 1) / (STEPS.length - 1)) * 100)}%` }}
          />
        </div>

        {/* Adımlar */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
          {STEPS.map((step, idx) => {
            const stepNum = idx + 1
            const isCompleted = stepNum < currentStep
            const isCurrent = stepNum === currentStep
            const Icon = step.icon

            return (
              <div key={step.key} className="flex sm:flex-col items-center gap-3 sm:gap-2 text-left sm:text-center">
                {/* İkon Dairesi */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    isCompleted
                      ? 'bg-brand-red text-white shadow-xs'
                      : isCurrent
                      ? 'bg-brand-red text-white ring-4 ring-brand-red/20 animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  <Icon size={16} />
                </div>

                {/* Başlık */}
                <div>
                  <div
                    className={`font-display font-bold text-xs uppercase tracking-wider ${
                      isCurrent
                        ? 'text-brand-red'
                        : isCompleted
                        ? 'text-slate-900'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Güncel Aşama
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Kargo Bilgisi Alanı (Kargoya verildiğinde görünür) */}
      {kargoTakipNo && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
          <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-red text-white rounded-lg shadow-xs">
                <Truck size={18} />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">
                  {kargoFirmasi} Takip Numarası:
                </div>
                <div className="font-mono font-bold text-sm text-slate-900">
                  {kargoTakipNo}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={copyTracking}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Copy size={13} />
                {copied ? 'Kopyalandı!' : 'Kopyala'}
              </button>

              <button
                onClick={toggleMovements}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-white border border-slate-200 hover:border-brand-red/40 hover:text-brand-red text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Canlı Hareketler</span>
                {showMovements ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-brand-red hover:bg-red-700 text-white text-xs font-display font-bold uppercase tracking-wider rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Kargom Nerede</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Canlı Kargo Hareketleri Paneli */}
          {showMovements && (
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              {loadingMovements ? (
                <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
                  <Loader2 size={16} className="animate-spin text-brand-red" />
                  <span>Kargo hareketleri sorgulanıyor...</span>
                </div>
              ) : movementsData ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between text-xs pb-2 border-b border-slate-100 gap-2">
                    <div>
                      <span className="text-slate-500">Durum: </span>
                      <strong className="text-emerald-700 font-bold uppercase">{movementsData.durum}</strong>
                    </div>
                    {movementsData.tahmini_teslimat && (
                      <div className="text-slate-500">
                        Tahmini Teslimat: <strong className="text-slate-800">{movementsData.tahmini_teslimat}</strong>
                      </div>
                    )}
                  </div>

                  {/* Hareketler Listesi */}
                  <div className="space-y-2.5 pt-1">
                    {movementsData.hareketler && movementsData.hareketler.map((m: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 text-xs">
                        <div className="w-2 h-2 rounded-full bg-brand-red mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">{m.islem}</div>
                          <div className="text-slate-500 flex items-center gap-1.5 mt-0.5 text-[11px]">
                            <MapPin size={11} className="text-slate-400" />
                            <span>{m.konum}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-400">{m.tarih}</span>
                          </div>
                          {m.detay && <div className="text-[11px] text-slate-500 mt-0.5 italic">{m.detay}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center py-4">
                  Kargo hareket bilgisi bulunamadı. Lütfen "Kargom Nerede" butonundan kargo şirketinin sayfasından sorgulayınız.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
