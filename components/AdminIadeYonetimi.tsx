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
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface IadeTalebi {
  id: string
  siparis_id: string
  siparis_no: string
  ad_soyad: string
  email: string
  telefon: string
  talep_tipi: 'iade' | 'degisim'
  iade_kodu: string
  kargo_iade_kodu: string
  kargo_firmasi: string
  sebep: string
  aciklama: string
  iban?: string | null
  admin_notu?: string
  durum: 'inceleniyor' | 'onaylandi' | 'reddedildi' | 'tamamlandi'
  created_at: string
}

export default function AdminIadeYonetimi() {
  const [talepler, setTalepler] = useState<IadeTalebi[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
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
        }),
      })
      const json = await res.json()
      if (res.ok && json.data) {
        setTalepler((prev) => prev.map((t) => (t.id === talep.id ? json.data : t)))
        setActionModal(null)
      } else {
        alert(json.error || 'Durum güncellenemedi.')
      }
    } catch (err) {
      alert('Durum güncellenirken hata oluştu.')
    } finally {
      setUpdatingId(null)
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
                İADE &amp; DEĞİŞİM YÖNETİMİ
              </h2>
              <p className="text-xs text-slate-500 font-body mt-0.5">
                Müşteri iade/değişim başvuruları, Basit Kargo gönderim kodu atama ve durum takibi
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
              Kayıtlı İade / Değişim Talebi Bulunamadı
            </p>
            <p className="text-xs text-slate-400 mt-1">Filtre kriterlerinize uygun talep bulunmuyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-display font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Talep Kodu &amp; Tarih</th>
                  <th className="py-3 px-4">Sipariş No</th>
                  <th className="py-3 px-4">Müşteri</th>
                  <th className="py-3 px-4">Tip &amp; Sebep</th>
                  <th className="py-3 px-4">Basit Kargo İade Kodu</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => {
                  const isUpdating = updatingId === t.id

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

                      <td className="py-4 px-4 font-mono text-brand-red font-semibold">
                        <a
                          href={`/siparis/${t.siparis_no}/fatura`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline inline-flex items-center gap-1"
                        >
                          #{t.siparis_no} <ExternalLink size={11} />
                        </a>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">{t.ad_soyad}</div>
                        <div className="text-[11px] text-slate-500">{t.telefon}</div>
                        <div className="text-[10px] text-slate-400">{t.email}</div>
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded font-display mb-1 ${
                            t.talep_tipi === 'iade'
                              ? 'bg-red-50 text-brand-red border border-red-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {t.talep_tipi === 'degisim' ? 'Değişim' : 'İade'}
                        </span>
                        <div className="font-medium text-slate-700">{t.sebep}</div>
                        {t.aciklama && (
                          <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            &quot;{t.aciklama}&quot;
                          </div>
                        )}
                        {t.iban && (
                          <div className="text-[10px] text-slate-500 font-mono mt-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 inline-block">
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
                        {t.kargo_iade_kodu ? (
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
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {t.durum === 'inceleniyor' && (
                            <>
                              <button
                                onClick={() => openActionModal(t, 'onaylandi')}
                                disabled={isUpdating}
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Onayla &amp; Kod Ata
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
                              <button
                                onClick={() => openActionModal(t, 'onaylandi')}
                                disabled={isUpdating}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                Kodu Düzenle
                              </button>
                              <button
                                onClick={() => openActionModal(t, 'tamamlandi')}
                                disabled={isUpdating}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Tamamlandı
                              </button>
                            </>
                          )}
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
                    ? 'Talebi Onayla & Kargo Kodu Ata'
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
              {actionModal.targetDurum === 'onaylandi' && (
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
                    <p className="text-[11px] text-slate-400 mt-1">
                      Bu kod hem müşterinin Hesabım ekranında görünecek hem de e-posta ile iletilecektir.
                    </p>
                  </div>
                </>
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
