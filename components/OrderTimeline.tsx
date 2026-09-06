'use client'

import { useState } from 'react'
import { Check, Clock, Package, Truck, CheckCircle2, XCircle, Copy, ExternalLink } from 'lucide-react'

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

const getCarrierUrl = (firma?: string, no?: string) => {
  if (!no) return '#'
  const f = firma?.toLowerCase() || ''
  if (f.includes('hepsijet')) return `https://www.hepsijet.com/gonderi-takibi/${no}`
  if (f.includes('yurtiçi') || f.includes('yurtici')) return `https://yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${no}`
  if (f.includes('aras')) return `https://www.araskargo.com.tr/kargo-takip?KargoTakipNo=${no}`
  if (f.includes('mng')) return `https://kargotakip.mngkargo.com.tr/?takipNo=${no}`
  if (f.includes('ptt')) return `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${no}`
  return `https://yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${no}`
}

export default function OrderTimeline({
  durum,
  kargoTakipNo,
  kargoFirmasi = 'Yurtiçi Kargo',
  createdAt,
  teslimTarihi,
}: Props) {
  const [copied, setCopied] = useState(false)
  const currentStep = STATUS_PROGRESS[durum] ?? 1
  const isCancelled = durum === 'iptal'

  const copyTracking = () => {
    if (!kargoTakipNo) return
    navigator.clipboard.writeText(kargoTakipNo)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isCancelled) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg flex items-center gap-3 text-rose-800">
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

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="font-display font-bold text-xs uppercase tracking-widest text-slate-500">
          SİPARİŞ VE TESLİMAT SÜRECİ
        </div>
        <div className="text-xs text-slate-500">
          Sipariş Tarihi: <strong className="text-slate-800">{new Date(createdAt).toLocaleDateString('tr-TR')}</strong>
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
            const isPending = stepNum > currentStep
            const Icon = step.icon

            return (
              <div key={step.key} className="flex sm:flex-col items-center gap-3 sm:gap-2 text-left sm:text-center">
                {/* İkon Dairesi */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    isCompleted
                      ? 'bg-brand-red text-white'
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
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-red text-white rounded-md">
              <Truck size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">
                {kargoFirmasi} Takip No:
              </div>
              <div className="font-mono font-bold text-sm text-slate-900">
                {kargoTakipNo}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={copyTracking}
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded inline-flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Copy size={13} />
              {copied ? 'Kopyalandı!' : 'Kopyala'}
            </button>

            <a
              href={getCarrierUrl(kargoFirmasi, kargoTakipNo)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-brand-red hover:bg-red-700 text-white text-xs font-display font-bold uppercase tracking-wider rounded inline-flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Kargom Nerede</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
