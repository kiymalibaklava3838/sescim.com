'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Check,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  RefreshCw,
  Radio,
} from 'lucide-react'
import { getCarrierTrackingUrl } from '@/lib/shipping'

interface Props {
  durum: string
  kargoTakipNo?: string
  kargoFirmasi?: string
  createdAt: string
  teslimTarihi?: string
  defaultOpenMovements?: boolean
  onStatusSync?: (newStatus: string) => void
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

function formatDateTimeTR(rawDate?: string): string {
  if (!rawDate) return ''
  const d = new Date(rawDate)
  if (isNaN(d.getTime())) return rawDate
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function OrderTimeline({
  durum,
  kargoTakipNo,
  kargoFirmasi = 'HepsiJet',
  createdAt,
  defaultOpenMovements = false,
  onStatusSync,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [showMovements, setShowMovements] = useState(defaultOpenMovements)
  const [loadingMovements, setLoadingMovements] = useState(false)
  const [movementsData, setMovementsData] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const effectiveDurum = movementsData?.guncel_siparis_durumu || durum
  const currentStep = STATUS_PROGRESS[effectiveDurum] ?? 1
  const isCancelled = effectiveDurum === 'iptal'

  const fetchMovements = useCallback(async () => {
    if (!kargoTakipNo) return
    setLoadingMovements(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/cargo/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firma: kargoFirmasi, takipNo: kargoTakipNo }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setMovementsData(json.data)
        if (
          json.data.guncel_siparis_durumu &&
          json.data.guncel_siparis_durumu !== durum &&
          onStatusSync
        ) {
          onStatusSync(json.data.guncel_siparis_durumu)
        }
      } else {
        setErrorMsg(json.error || 'Kargo hareket bilgisi alınamadı.')
      }
    } catch (e) {
      console.error('Failed to load tracking data:', e)
      setErrorMsg('Kargo sorgulanırken bağlantı hatası oluştu.')
    } finally {
      setLoadingMovements(false)
    }
  }, [kargoFirmasi, kargoTakipNo, durum, onStatusSync])

  useEffect(() => {
    if (defaultOpenMovements && kargoTakipNo && !movementsData) {
      setShowMovements(true)
      fetchMovements()
    }
  }, [defaultOpenMovements, kargoTakipNo, movementsData, fetchMovements])

  const copyTracking = (codeToCopy?: string) => {
    const val = codeToCopy || kargoTakipNo
    if (!val) return
    navigator.clipboard.writeText(val)
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
      await fetchMovements()
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

  const displayCarrier = movementsData?.firma || kargoFirmasi
  const carrierTrackingCode = movementsData?.tasiyici_takip_no || null
  const trackingUrl =
    movementsData?.resmi_takip_url || getCarrierTrackingUrl(displayCarrier, carrierTrackingCode || kargoTakipNo)

  const badgeStyleByCode: Record<string, string> = {
    teslim_edildi: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dagitimda: 'bg-blue-100 text-blue-800 border-blue-200',
    yolda: 'bg-amber-100 text-amber-800 border-amber-200',
    hazirlaniyor: 'bg-slate-100 text-slate-700 border-slate-200',
    sorun: 'bg-red-100 text-red-800 border-red-200',
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="font-display font-bold text-xs uppercase tracking-widest text-slate-500">
          SİPARİŞ VE TESLİMAT SÜRECİ
        </div>
        <div className="text-xs text-slate-500">
          Sipariş Tarihi:{' '}
          <strong className="text-slate-800 font-medium">
            {new Date(createdAt).toLocaleDateString('tr-TR')}
          </strong>
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

      {/* Kargo Bilgisi Alanı (Kargo barkodu atandığında görünür) */}
      {kargoTakipNo && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
          <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-red text-white rounded-lg shadow-xs">
                <Truck size={18} />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">
                  {displayCarrier} Kargo Barkodu:
                </div>
                <div className="font-mono font-bold text-sm text-slate-900">
                  {kargoTakipNo}
                </div>
                {carrierTrackingCode && carrierTrackingCode !== kargoTakipNo && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Taşıyıcı Takip No:{' '}
                    <span className="font-mono font-bold text-slate-700">{carrierTrackingCode}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => copyTracking(carrierTrackingCode || kargoTakipNo)}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Copy size={13} />
                {copied ? 'Kopyalandı!' : 'Kopyala'}
              </button>

              <button
                type="button"
                onClick={toggleMovements}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-white border border-slate-200 hover:border-brand-red/40 hover:text-brand-red text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <span>Canlı Hareketler</span>
                {showMovements ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-brand-red hover:bg-red-700 text-white text-xs font-display font-bold uppercase tracking-wider rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>Kargom Nerede</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          {/* Canlı Kargo Hareketleri Paneli */}
          {showMovements && (
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              {loadingMovements ? (
                <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
                  <Loader2 size={16} className="animate-spin text-brand-red" />
                  <span>Basit Kargo üzerinden canlı durum sorgulanıyor...</span>
                </div>
              ) : movementsData ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between text-xs pb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-500">Güncel Durum:</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                          badgeStyleByCode[movementsData.durum_kodu] || badgeStyleByCode.yolda
                        }`}
                      >
                        {movementsData.durum}
                      </span>
                      {movementsData.canli_api_mi && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Radio size={10} className="animate-pulse" /> Canlı Veri
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {movementsData.tahmini_teslimat && (
                        <div className="text-slate-500">
                          Tahmini Teslimat:{' '}
                          <strong className="text-slate-800">{movementsData.tahmini_teslimat}</strong>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={fetchMovements}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-brand-red transition-colors cursor-pointer"
                        title="Kargo Durumunu Yenile"
                      >
                        <RefreshCw size={12} />
                        <span>Yenile</span>
                      </button>
                    </div>
                  </div>

                  {/* Hareketler Listesi */}
                  <div className="space-y-3 pt-1">
                    {movementsData.hareketler &&
                      movementsData.hareketler.map((m: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-red mt-1 shrink-0 ring-4 ring-brand-red/10" />
                          <div className="flex-1">
                            <div className="font-semibold text-slate-800">{m.islem}</div>
                            <div className="text-slate-500 flex items-center flex-wrap gap-1.5 mt-0.5 text-[11px]">
                              <MapPin size={11} className="text-slate-400" />
                              <span>{m.konum}</span>
                              {m.tarih && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium text-slate-400">
                                    {formatDateTimeTR(m.tarih)}
                                  </span>
                                </>
                              )}
                            </div>
                            {m.detay && (
                              <div className="text-[11px] text-slate-500 mt-0.5 italic">
                                {m.detay}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center py-4 space-y-2">
                  <div>
                    {errorMsg ||
                      'Kargo hareket bilgisi alınamadı. "Kargom Nerede" butonundan kargo firmasının resmi sayfasından sorgulayabilirsiniz.'}
                  </div>
                  <button
                    type="button"
                    onClick={fetchMovements}
                    className="inline-flex items-center gap-1 text-brand-red font-bold hover:underline cursor-pointer"
                  >
                    <RefreshCw size={12} /> Tekrar Dene
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
