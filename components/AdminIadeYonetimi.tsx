'use client'

import { useState, useEffect, useRef } from 'react'
import {
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  Truck,
  X,
  Send,
  AlertCircle,
  CreditCard,
  ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface IadeTalebi {
  id: string
  siparis_id: string
  siparis_no: string
  ad_soyad: string
  email: string
  telefon: string
  talep_tipi: 'iade' | 'degisim' | 'iptal'
  iade_kodu: string
  kargo_iade_kodu: string
  kargo_firmasi: string
  sebep: string
  aciklama: string
  iban?: string | null
  admin_notu?: string
  durum: 'inceleniyor' | 'onaylandi' | 'reddedildi' | 'tamamlandi'
  created_at: string
  odeme_tipi?: string
  odeme_durumu?: string
  toplam_tutar?: number
  siparis_durumu?: string
  paytr_iade_ref?: string
  iade_edilen_tutar?: number
}

export default function AdminIadeYonetimi() {
  const [talepler, setTalepler] = useState<IadeTalebi[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [filterDurum, setFilterDurum] = useState('tumu')
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Onaylama / Kargo Kodu Girme Modalı
  const [actionModal, setActionModal] = useState<{
    talep: IadeTalebi
    targetDurum: 'onaylandi' | 'reddedildi' | 'tamamlandi'
  } | null>(null)
  const [modalKargoKodu, setModalKargoKodu] = useState('')
  const [modalKargoFirmasi, setModalKargoFirmasi] = useState('Basit Kargo')
  const [modalAdminNotu, setModalAdminNotu] = useState('')
  const [modalCancelOrder, setModalCancelOrder] = useState(false)

  // PayTR Kart Para İadesi Modalı
  const [refundModal, setRefundModal] = useState<IadeTalebi | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundCancelOrder, setRefundCancelOrder] = useState(true)
  const [refundNote, setRefundNote] = useState('')
  const [refunding, setRefunding] = useState(false)

  const supabase = useRef(createClient()).current

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadTalepler = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/iade', { headers })
      const data = await res.json()
      if (res.ok && Array.isArray(data)) {
        setTalepler(data)
      } else {
        setErrorMsg(data?.error || 'İade talepleri yüklenemedi.')
      }
    } catch (e) {
      console.error('İade talepleri yüklenemedi:', e)
      setErrorMsg('Bağlantı hatası oluştu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTalepler()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openActionModal = (
    talep: IadeTalebi,
    targetDurum: 'onaylandi' | 'reddedildi' | 'tamamlandi'
  ) => {
    setActionModal({ talep, targetDurum })
    setModalKargoKodu(talep.kargo_iade_kodu || '')
    setModalKargoFirmasi(talep.kargo_firmasi || 'Basit Kargo')
    setModalAdminNotu(talep.admin_notu || '')
    setModalCancelOrder(talep.talep_tipi === 'iptal' && targetDurum !== 'reddedildi')
  }

  const openRefundModal = (talep: IadeTalebi) => {
    setRefundModal(talep)
    setRefundAmount(talep.toplam_tutar ? Number(talep.toplam_tutar).toFixed(2) : '')
    setRefundCancelOrder(true)
    setRefundNote('')
  }

  const submitStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!actionModal) return
    const { talep, targetDurum } = actionModal
    setUpdatingId(talep.id)

    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/iade', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          id: talep.id,
          durum: targetDurum,
          kargo_iade_kodu: modalKargoKodu.trim(),
          kargo_firmasi: modalKargoFirmasi.trim() || 'Basit Kargo',
          admin_notu: modalAdminNotu.trim(),
          cancel_order: modalCancelOrder,
        }),
      })
      const json = await res.json()
      if (res.ok && json.data) {
        setActionModal(null)
        setSuccessMsg(`${talep.iade_kodu} talebi güncellendi ve müşteriye e-posta gönderildi.`)
        setTimeout(() => setSuccessMsg(''), 5000)
        loadTalepler()
      } else {
        alert(json.error || 'Durum güncellenemedi.')
      }
    } catch (err) {
      alert('Durum güncellenirken hata oluştu.')
    } finally {
      setUpdatingId(null)
    }
  }

  const submitPaytrRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!refundModal) return
    const parsedAmt = parseFloat(refundAmount.replace(',', '.'))
    if (!Number.isFinite(parsedAmt) || parsedAmt <= 0) {
      alert('Lütfen geçerli bir iade tutarı girin.')
      return
    }
    if (
      !confirm(
        `#${refundModal.siparis_no} siparişi için PayTR üzerinden müşterinin kredi kartına ${parsedAmt.toFixed(2)} TL para iadesi yapılacaktır. Onaylıyor musunuz?`
      )
    ) {
      return
    }

    setRefunding(true)
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/admin/paytr-iade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          siparis_id: refundModal.siparis_id,
          siparis_no: refundModal.siparis_no,
          return_amount: parsedAmt,
          iade_talep_id: refundModal.id,
          cancel_order: refundCancelOrder,
          admin_notu: refundNote.trim(),
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setRefundModal(null)
        setSuccessMsg(json.message || 'PayTR para iadesi başarıyla tamamlandı!')
        setTimeout(() => setSuccessMsg(''), 7000)
        loadTalepler()
      } else {
        alert(json.error || 'PayTR para iadesi gerçekleştirilemedi.')
      }
    } catch (err: any) {
      alert('PayTR iade bağlantı hatası: ' + (err.message || err))
    } finally {
      setRefunding(false)
    }
  }

  const filtered = talepler.filter((t) => {
    const matchDurum = filterDurum === 'tumu' || t.durum === filterDurum
    const q = searchTerm.toLowerCase()
    const matchSearch =
      !searchTerm ||
      t.siparis_no?.toLowerCase().includes(q) ||
      t.ad_soyad?.toLowerCase().includes(q) ||
      t.iade_kodu?.toLowerCase().includes(q) ||
      t.kargo_iade_kodu?.toLowerCase().includes(q)
    return matchDurum && matchSearch
  })

  const durumLabel: Record<string, string> = {
    tumu: 'Tümü',
    inceleniyor: 'İnceleniyor',
    onaylandi: 'Onaylandı',
    tamamlandi: 'Tamamlandı',
    reddedildi: 'Reddedildi',
  }

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 shadow-sm rounded-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-red/10 text-brand-red rounded-lg">
              <RotateCcw size={22} />
            </div>
            <div>
              <h2 className="font-display font-black text-xl uppercase tracking-wider text-slate-800">
                İPTAL, İADE &amp; DEĞİŞİM YÖNETİMİ
              </h2>
              <p className="text-xs text-slate-500 font-body mt-0.5">
                Müşteri iptal/iade/değişim başvuruları, Basit Kargo gönderim kodu atama ve PayTR kart para iadesi
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadTalepler}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-brand-red text-slate-700 hover:text-brand-red text-xs font-display font-bold uppercase tracking-wider transition-all rounded-lg cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          <CheckCircle size={16} className="text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filtre ve Arama */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white border border-slate-200 p-4 shadow-sm rounded-xl">
        <div className="flex flex-wrap gap-2">
          {(['tumu', 'inceleniyor', 'onaylandi', 'tamamlandi', 'reddedildi'] as const).map((durum) => {
            const count =
              durum === 'tumu'
                ? talepler.length
                : talepler.filter((t) => t.durum === durum).length
            return (
              <button
                key={durum}
                onClick={() => setFilterDurum(durum)}
                className={`px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wider transition-all rounded-lg cursor-pointer ${
                  filterDurum === durum
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {durumLabel[durum]} ({count})
              </button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Sipariş No, İsim veya Kod Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 rounded-lg focus:border-brand-red outline-none transition-all"
          />
        </div>
      </div>

      {/* Tablo / Liste */}
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw size={28} className="animate-spin mx-auto mb-2 text-brand-red" />
            <p className="text-xs font-medium">Talepler yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <RotateCcw size={36} className="mx-auto mb-3 opacity-40 text-slate-400" />
            <p className="font-display font-bold text-sm uppercase tracking-wider text-slate-600">
              Kayıtlı İptal / İade / Değişim Talebi Bulunamadı
            </p>
            <p className="text-xs text-slate-400 mt-1">Filtre kriterlerinize uygun talep bulunmuyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-display font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Talep Kodu &amp; Tarih</th>
                  <th className="py-3 px-4">Sipariş &amp; Ödeme</th>
                  <th className="py-3 px-4">Müşteri</th>
                  <th className="py-3 px-4">Tip &amp; Sebep</th>
                  <th className="py-3 px-4">Kargo / İade Durumu</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => {
                  const isUpdating = updatingId === t.id
                  const canPaytrRefund =
                    t.odeme_tipi === 'kart' &&
                    (t.odeme_durumu === 'odendi' || t.odeme_durumu === 'kismi_iade') &&
                    t.durum !== 'reddedildi'

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-slate-900">
                        <div>{t.iade_kodu}</div>
                        <div className="text-[10px] text-slate-400 font-normal font-sans">
                          {new Date(t.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <a
                          href={`/siparis/${t.siparis_no}/fatura`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-brand-red font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          #{t.siparis_no} <ExternalLink size={11} />
                        </a>
                        {t.toplam_tutar !== undefined && t.toplam_tutar > 0 && (
                          <div className="font-bold text-slate-800 mt-0.5">
                            {Number(t.toplam_tutar).toLocaleString('tr-TR')} ₺
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
                          <span>{t.odeme_tipi === 'kart' ? '💳 Kart (PayTR)' : '🏦 Havale/EFT'}</span>
                          {t.odeme_durumu === 'iade_edildi' && (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase">
                              İade Edildi
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">{t.ad_soyad}</div>
                        <div className="text-[11px] text-slate-500">{t.telefon}</div>
                        <div className="text-[10px] text-slate-400">{t.email}</div>
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded font-display mb-1 ${
                            t.talep_tipi === 'iptal'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : t.talep_tipi === 'iade'
                              ? 'bg-red-50 text-brand-red border border-red-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {t.talep_tipi === 'iptal'
                            ? 'Sipariş İptal'
                            : t.talep_tipi === 'degisim'
                            ? 'Değişim'
                            : 'İade'}
                        </span>
                        <div className="font-medium text-slate-700">{t.sebep}</div>
                        {t.aciklama && (
                          <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            &quot;{t.aciklama}&quot;
                          </div>
                        )}
                        {t.iban && (
                          <div className="text-[10px] text-slate-600 font-mono mt-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 inline-block">
                            IBAN: {t.iban}
                          </div>
                        )}
                        {t.admin_notu && (
                          <div className="text-[10px] text-blue-700 mt-1 italic">
                            Not: {t.admin_notu}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {t.paytr_iade_ref ? (
                          <div>
                            <span className="font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded text-[10px] font-bold inline-block">
                              PayTR Ref: {t.paytr_iade_ref}
                            </span>
                            {t.iade_edilen_tutar && (
                              <span className="block text-[10px] text-emerald-700 font-bold mt-0.5">
                                {Number(t.iade_edilen_tutar).toLocaleString('tr-TR')} ₺ İade
                              </span>
                            )}
                          </div>
                        ) : t.talep_tipi === 'iptal' ? (
                          <span className="text-[11px] text-amber-700 font-medium">
                            Kargolanmadı (Kargo gerekmez)
                          </span>
                        ) : t.kargo_iade_kodu ? (
                          <div>
                            <span className="font-mono bg-blue-50 text-blue-800 border border-blue-200 px-2 py-1 rounded text-[11px] font-bold inline-block">
                              {t.kargo_iade_kodu}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {t.kargo_firmasi || 'Basit Kargo'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Onayda kod atanacak
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                            t.durum === 'onaylandi'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : t.durum === 'tamamlandi'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : t.durum === 'reddedildi'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {t.durum === 'tamamlandi' && <CheckCircle size={12} />}
                          {t.durum === 'inceleniyor' && <Clock size={12} />}
                          {t.durum === 'reddedildi' && <XCircle size={12} />}
                          {durumLabel[t.durum] || t.durum}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {canPaytrRefund && (
                            <button
                              onClick={() => openRefundModal(t)}
                              disabled={isUpdating || refunding}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <CreditCard size={12} />
                              PayTR Kart İadesi Yap
                            </button>
                          )}

                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {t.durum === 'inceleniyor' && (
                              <>
                                <button
                                  onClick={() => openActionModal(t, 'onaylandi')}
                                  disabled={isUpdating}
                                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  {t.talep_tipi === 'iptal' ? 'Onayla' : 'Onayla & Kod Ata'}
                                </button>
                                <button
                                  onClick={() => openActionModal(t, 'reddedildi')}
                                  disabled={isUpdating}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  Reddet
                                </button>
                              </>
                            )}
                            {t.durum === 'onaylandi' && (
                              <>
                                {t.talep_tipi !== 'iptal' && (
                                  <button
                                    onClick={() => openActionModal(t, 'onaylandi')}
                                    disabled={isUpdating}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                  >
                                    Kodu Düzenle
                                  </button>
                                )}
                                <button
                                  onClick={() => openActionModal(t, 'tamamlandi')}
                                  disabled={isUpdating}
                                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  Tamamlandı
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAYTR KART PARA İADESİ MODALI */}
      {refundModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setRefundModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="font-display font-black text-base uppercase text-slate-900">
                    PayTR Kart Para İadesi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sipariş #{refundModal.siparis_no} • {refundModal.ad_soyad}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefundModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitPaytrRefund} className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  PayTR resmi İade API&apos;si üzerinden müşterinin ödeme yaptığı kredi kartına doğrudan iade emri gönderilir.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  İade Edilecek Tutar (TL) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={refundModal.toplam_tutar || undefined}
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
                {refundModal.toplam_tutar && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sipariş Toplamı: <strong>{Number(refundModal.toplam_tutar).toLocaleString('tr-TR')} ₺</strong> (Kısmi iade için tutarı düşürebilirsiniz)
                  </p>
                )}
              </div>

              <label className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={refundCancelOrder}
                  onChange={(e) => setRefundCancelOrder(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-600"
                />
                <span className="text-xs text-slate-700">
                  <strong className="block text-slate-900">Siparişi İptal Et &amp; Stok/Kuponu İade Et</strong>
                  Tam iadede sipariş otomatik &ldquo;İptal Edildi&rdquo; durumuna çekilir, ürün stokları ve müşteri kupon hakkı geri eklenir.
                </span>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Müşteriye İletilecek Not (İsteğe Bağlı)
                </label>
                <textarea
                  rows={2}
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder="Örn: İptal talebiniz üzerine tutar kartınıza iade edilmiştir."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRefundModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={refunding}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-display font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <CreditCard size={14} />
                  {refunding ? 'PayTR İadesi Yapılıyor...' : 'PayTR İadesini Onayla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DURUM & BASİT KARGO KODU ATAMA MODALI */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActionModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-black text-base uppercase text-slate-900">
                  {actionModal.targetDurum === 'onaylandi'
                    ? actionModal.talep.talep_tipi === 'iptal'
                      ? 'İptal Talebini Onayla'
                      : 'Talebi Onayla & Kargo Kodu Ata'
                    : actionModal.targetDurum === 'tamamlandi'
                    ? 'Talebi Tamamlandı Olarak İşaretle'
                    : 'Talebi Reddet'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {actionModal.talep.iade_kodu} • Sipariş #{actionModal.talep.siparis_no}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitStatusUpdate} className="space-y-4">
              {actionModal.targetDurum === 'onaylandi' && actionModal.talep.talep_tipi !== 'iptal' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Anlaşmalı Kargo Firması
                    </label>
                    <input
                      type="text"
                      value={modalKargoFirmasi}
                      onChange={(e) => setModalKargoFirmasi(e.target.value)}
                      placeholder="Örn: Basit Kargo / HepsiJet / Yurtiçi"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Truck size={14} className="text-brand-red" />
                      Basit Kargo İade Gönderim Kodu
                    </label>
                    <input
                      type="text"
                      value={modalKargoKodu}
                      onChange={(e) => setModalKargoKodu(e.target.value)}
                      placeholder="Basit Kargo panelinden oluşturduğunuz iade kodu"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-brand-red"
                    />
                  </div>
                </>
              )}

              {actionModal.targetDurum !== 'reddedildi' && (
                <label className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalCancelOrder}
                    onChange={(e) => setModalCancelOrder(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-brand-red"
                  />
                  <span className="text-xs text-slate-700">
                    <strong className="block text-slate-900">Siparişi İptal Edildi Yap (Stok &amp; Kuponu İade Et)</strong>
                    İşaretlenirse sipariş durumu &ldquo;İptal Edildi&rdquo; olur ve ürün stokları otomatik geri eklenir.
                  </span>
                </label>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Müşteriye İletilecek Not {actionModal.targetDurum === 'reddedildi' ? '*' : '(İsteğe Bağlı)'}
                </label>
                <textarea
                  rows={3}
                  required={actionModal.targetDurum === 'reddedildi'}
                  value={modalAdminNotu}
                  onChange={(e) => setModalAdminNotu(e.target.value)}
                  placeholder={
                    actionModal.targetDurum === 'reddedildi'
                      ? 'Red gerekçesini açıklayın...'
                      : 'Müşteriye iletmek istediğiniz bilgi notu...'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={updatingId === actionModal.talep.id}
                  className={`px-4 py-2 rounded-lg text-xs font-display font-bold uppercase tracking-wider text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    actionModal.targetDurum === 'reddedildi'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : actionModal.targetDurum === 'tamamlandi'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Send size={13} />
                  {updatingId === actionModal.talep.id ? 'Kaydediliyor...' : 'Kaydet ve Bildir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
