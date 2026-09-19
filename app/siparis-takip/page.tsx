'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Search, Package, Truck, Clock, CheckCircle, XCircle, 
  FileText, ShieldCheck, Phone, AlertCircle, Loader2, ArrowLeft,
  Calendar, MapPin, CreditCard, ChevronRight, ExternalLink
} from 'lucide-react'
import OrderTimeline from '@/components/OrderTimeline'
import KargoTakip from '@/components/KargoTakip'

interface Kalem {
  urun_id: string | null
  ad: string
  adet: number
  fiyat: number
  fotograf: string | null
}

interface SiparisDetay {
  id: string
  siparis_no: string
  ad_soyad: string
  email: string
  toplam_tutar: number
  indirim_tutari: number
  kargo_ucreti: number
  durum: string
  odeme_durumu: string
  odeme_tipi: string
  kargo_takip_no?: string
  kargo_firmasi?: string
  teslimat_adresi?: string
  created_at: string
  urunler: Kalem[]
}

const DURUM_MAP: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  beklemede:      { label: 'Sipariş Alındı',   color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: Clock },
  odeme_bekliyor: { label: 'Ödeme Bekleniyor', color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: Clock },
  onaylandi:      { label: 'Onaylandı',        color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    icon: CheckCircle },
  hazirlaniyor:   { label: 'Hazırlanıyor',     color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200',  icon: Package },
  kargolandi:     { label: 'Kargolandı',       color: 'text-brand-red',   bg: 'bg-brand-red/10', border: 'border-brand-red/20', icon: Truck },
  teslim_edildi:  { label: 'Teslim Edildi',    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  iptal:          { label: 'İptal Edildi',     color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200',    icon: XCircle },
  tamamlandi:     { label: 'Tamamlandı',       color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
}

function SiparisTakipContent() {
  const searchParams = useSearchParams()
  const initialNo = searchParams.get('no') || searchParams.get('siparis_no') || ''
  const initialEmail = searchParams.get('email') || ''

  const [siparisNo, setSiparisNo] = useState(initialNo)
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<SiparisDetay | null>(null)
  const [showCargoDetails, setShowCargoDetails] = useState(false)

  const handleSearch = async (targetNo?: string, targetEmail?: string) => {
    const sNo = (targetNo !== undefined ? targetNo : siparisNo).trim()
    const sEmail = (targetEmail !== undefined ? targetEmail : email).trim()

    setError('')
    if (!sNo || !sEmail) {
      setError('Lütfen Sipariş Numarası ve E-posta adresinizi giriniz.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/siparis-takip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siparis_no: sNo, email: sEmail }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Sipariş bulunamadı. Lütfen bilgilerinizi kontrol ediniz.')
        setOrder(null)
      } else {
        setOrder(data.siparis)
      }
    } catch {
      setError('Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.')
    } finally {
      setLoading(false)
    }
  }

  // URL'den parametrelerle geldiyse otomatik ara
  useEffect(() => {
    if (initialNo && initialEmail) {
      handleSearch(initialNo, initialEmail)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 pt-4 sm:pt-8 pb-32 sm:pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 py-8 sm:py-12 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 font-body text-slate-500 hover:text-brand-red text-sm mb-4 transition-colors">
            <ArrowLeft size={14} /> Ana Sayfaya Dön
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Müşteri Hizmetleri</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-5xl uppercase text-slate-900 tracking-tight">
            Sipariş Takibi
          </h1>
          <p className="font-body text-slate-500 text-sm sm:text-base mt-2 max-w-xl">
            Siparişinizin durumunu, kargo hareketlerini ve detaylarını öğrenmek için sipariş numaranızı ve e-posta adresinizi giriniz.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* Sorgulama Kartı */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm mb-8">
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Sipariş Numarası *
                </label>
                <div className="relative">
                  <Package size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Örn: SCM-1710892 veya 1710892"
                    value={siparisNo}
                    onChange={(e) => setSiparisNo(e.target.value)}
                    className="input-base pl-10 text-sm uppercase tracking-wider font-mono"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Sipariş onay e-postanızdaki SCM ile başlayan numara.</p>
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Siparişte Kullanılan E-posta *
                </label>
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-base pl-10 text-sm"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Siparişi verirken girdiğiniz e-posta adresi.</p>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-rose-600 text-xs sm:text-sm font-medium flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-xs sm:text-sm py-3 px-6 rounded-xl shadow-md gap-2 w-full sm:w-auto justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sorgulanıyor...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Siparişi Sorgula</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sipariş Sonuç Alanı */}
        {order && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            
            {/* Durum Özeti Kartı */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-black text-2xl text-slate-900 tracking-wider">
                      #{order.siparis_no}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-body">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      {new Date(order.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-slate-700">{order.ad_soyad}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {(() => {
                    const durum = DURUM_MAP[order.durum] || DURUM_MAP.beklemede
                    const DurumIcon = durum.icon
                    return (
                      <div className={`flex items-center gap-2 font-display font-bold text-xs uppercase px-4 py-2 rounded-xl border ${durum.bg} ${durum.border} ${durum.color}`}>
                        <DurumIcon size={16} />
                        <span>{durum.label}</span>
                      </div>
                    )
                  })()}

                  <Link
                    href={`/siparis/${order.siparis_no}/fatura`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-display font-bold text-slate-700 hover:text-brand-red hover:border-slate-300 transition-colors"
                  >
                    <FileText size={14} />
                    <span>Sipariş Fişi</span>
                  </Link>
                </div>
              </div>

              {/* Canlı Sipariş Zaman Çizelgesi */}
              <div className="py-6">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500 mb-4">
                  Sipariş İlerleme Durumu
                </h3>
                <OrderTimeline
                  durum={order.durum}
                  kargoTakipNo={order.kargo_takip_no}
                  kargoFirmasi={order.kargo_firmasi}
                  createdAt={order.created_at}
                />
              </div>

              {/* Kargo Bilgisi ve Canlı Takip Butonu */}
              {order.kargo_takip_no && (
                <div className="mt-4 pt-6 border-t border-slate-100">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0">
                        <Truck size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-display font-bold text-slate-400 tracking-wider">
                          Kargo Gönderisi ({order.kargo_firmasi || 'Anlaşmalı Kargo'})
                        </div>
                        <div className="font-mono font-bold text-slate-800 text-sm sm:text-base">
                          Takip No: {order.kargo_takip_no}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCargoDetails(!showCargoDetails)}
                      className="btn-outline text-xs py-2 px-4 rounded-lg self-start sm:self-auto font-display font-bold uppercase tracking-wider"
                    >
                      {showCargoDetails ? 'Kargo Hareketlerini Gizle' : 'Kargo Hareketlerini Gör'}
                    </button>
                  </div>

                  {showCargoDetails && (
                    <div className="mt-4 animate-in fade-in duration-200">
                      <KargoTakip firma={order.kargo_firmasi || 'Yurtiçi Kargo'} takipNo={order.kargo_takip_no} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sipariş Detayları & Ürünler */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ürün Listesi */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-800 mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                  <span>Sipariş Kalemleri</span>
                  <span className="text-xs text-slate-400 normal-case font-body font-normal">
                    {order.urunler.reduce((acc, u) => acc + u.adet, 0)} Adet Ürün
                  </span>
                </h3>

                <div className="divide-y divide-slate-100">
                  {order.urunler.map((item, idx) => (
                    <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-14 h-14 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                          {item.fotograf ? (
                            <Image src={item.fotograf} alt={item.ad} fill className="object-contain p-1" />
                          ) : (
                            <Package size={20} className="text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-display font-bold text-xs sm:text-sm text-slate-800 truncate">
                            {item.ad}
                          </h4>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {item.adet} adet × {Number(item.fiyat).toLocaleString('tr-TR')} ₺
                          </div>
                        </div>
                      </div>

                      <div className="font-display font-black text-sm sm:text-base text-slate-900 shrink-0">
                        {(item.adet * item.fiyat).toLocaleString('tr-TR')} ₺
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sipariş Özeti & Teslimat Bilgisi */}
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-800 mb-4 pb-3 border-b border-slate-100">
                    Ödeme & Fiyat Özeti
                  </h3>

                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ödeme Yöntemi:</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <CreditCard size={13} className="text-brand-red" />
                        Kredi / Banka Kartı (PayTR)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ödeme Durumu:</span>
                      <span className="font-bold text-emerald-600 uppercase text-[11px]">
                        {order.odeme_durumu === 'odendi' ? 'Ödendi' : 'İşlemde'}
                      </span>
                    </div>
                    {order.kargo_ucreti > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Kargo Ücreti:</span>
                        <span className="font-medium text-slate-800">{order.kargo_ucreti.toLocaleString('tr-TR')} ₺</span>
                      </div>
                    )}
                    {order.indirim_tutari > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Kupon İndirimi:</span>
                        <span className="font-bold">-{order.indirim_tutari.toLocaleString('tr-TR')} ₺</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="font-display font-bold text-xs uppercase tracking-wider text-slate-900">Toplam:</span>
                      <span className="font-display font-black text-lg text-brand-red font-mono">
                        {Number(order.toplam_tutar).toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  </div>
                </div>

                {order.teslimat_adresi && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-1.5">
                      <MapPin size={14} className="text-brand-red" />
                      Teslimat Adresi
                    </h3>
                    <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed font-body">
                      {order.teslimat_adresi}
                    </p>
                  </div>
                )}

                {/* Destek İletişim Kutusu */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm">
                  <div className="text-xs font-display font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Yardıma mı İhtiyacınız Var?
                  </div>
                  <p className="text-xs text-slate-300 mb-4 leading-relaxed font-body">
                    Siparişiniz veya teslimat sürecinizle ilgili sorularınız için müşteri temsilcimizle görüşebilirsiniz.
                  </p>
                  <a
                    href="tel:+903522316915"
                    className="w-full py-2.5 px-4 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Phone size={14} />
                    +90 352 231 69 15
                  </a>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}

export default function SiparisTakipPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-brand-red rounded-full animate-spin" />
      </div>
    }>
      <SiparisTakipContent />
    </Suspense>
  )
}
