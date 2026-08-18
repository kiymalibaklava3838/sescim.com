'use client'

import { useState, useEffect } from 'react'
import { Truck, MapPin, CheckCircle, Package, Loader2, Info } from 'lucide-react'

interface KargoHareket {
  tarih: string
  islem: string
  konum: string
}

interface KargoData {
  takip_no: string
  firma: string
  durum: string
  hareketler: KargoHareket[]
  tahmini_teslimat?: string
}

export default function KargoTakip({ firma, takipNo }: { firma: string, takipNo: string }) {
  const [data, setData] = useState<KargoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchKargo = async () => {
      try {
        const res = await fetch('/api/cargo/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firma, takipNo })
        })
        const result = await res.json()
        if (result.success) {
          setData(result.data)
        } else {
          setError(result.error || 'Kargo bilgisi bulunamadı.')
        }
      } catch (err) {
        setError('Kargo sorgulanırken bir hata oluştu.')
      } finally {
        setLoading(false)
      }
    }
    fetchKargo()
  }, [firma, takipNo])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl mt-4">
        <Loader2 size={24} className="text-brand-red animate-spin mb-2" />
        <span className="text-xs font-display font-bold text-slate-500 uppercase tracking-widest">Kargo Durumu Sorgulanıyor...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mt-4 text-red-600 text-sm">
        <Info size={18} className="flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-bold mb-1">Kargo sorgulanamadı.</div>
          <p className="text-red-500 text-xs">Takip No: {takipNo} ({firma})</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl mt-4 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-red/10 rounded-lg flex items-center justify-center text-brand-red">
            <Truck size={20} />
          </div>
          <div>
            <div className="text-xs font-display font-bold uppercase text-slate-500 tracking-wider mb-0.5">{data.firma}</div>
            <div className="text-sm font-bold text-slate-900 tracking-wide">{data.takip_no}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-display font-bold uppercase text-brand-red tracking-wider mb-0.5">Durum</div>
          <div className="text-sm font-bold text-slate-900 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">{data.durum}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <h4 className="font-display font-bold text-xs uppercase tracking-widest text-slate-800 mb-6">Kargo Hareketleri</h4>
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
          {data.hareketler.map((h, i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-brand-red text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                {i === data.hareketler.length - 1 ? <CheckCircle size={16} /> : <MapPin size={16} />}
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 text-sm">{h.islem}</span>
                  <span className="text-[10px] text-slate-400 font-display uppercase tracking-widest">{new Date(h.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}</span>
                </div>
                <div className="text-xs text-slate-500 font-body flex items-center gap-1">
                  <MapPin size={12} className="text-slate-400" /> {h.konum}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
