'use client'

import { useState, useEffect } from 'react'
import { RotateCcw, CheckCircle, XCircle, Clock, Search, RefreshCw, AlertCircle, Package, ArrowRight, ExternalLink } from 'lucide-react'

interface IadeTalebi {
  id: string
  siparis_no: string
  ad_soyad: string
  email: string
  telefon: string
  talep_tipi: 'iade' | 'degisim'
  iade_kodu: string
  kargo_iade_kodu: string
  sebep: string
  aciklama: string
  iban?: string
  durum: 'inceleniyor' | 'onaylandi' | 'reddedildi' | 'tamamlandi'
  created_at: string
}

export default function AdminIadeYonetimi() {
  const [talepler, setTalepler] = useState<IadeTalebi[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDurum, setFilterDurum] = useState('tumu')
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadTalepler = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/iade')
      if (res.ok) {
        const data = await res.json()
        setTalepler(data || [])
      }
    } catch (e) {
      console.error('İade talepleri yüklenemedi:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTalepler()
  }, [])

  const handleUpdateStatus = async (id: string, durum: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch('/api/iade', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, durum }),
      })
      if (res.ok) {
        setTalepler((prev) =>
          prev.map((t) => (t.id === id ? { ...t, durum: durum as any } : t))
        )
      }
    } catch (e) {
      alert('Durum güncellenirken hata oluştu')
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = talepler.filter((t) => {
    const matchDurum = filterDurum === 'tumu' || t.durum === filterDurum
    const matchSearch =
      !searchTerm ||
      t.siparis_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ad_soyad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.iade_kodu?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchDurum && matchSearch
  })

  return (
    <div className="space-y-6">
      {/* Üst Başlık & İstatistikler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-red/10 text-brand-red rounded">
              <RotateCcw size={22} />
            </div>
            <div>
              <h2 className="font-display font-black text-xl uppercase tracking-wider text-slate-800">
                İADE &amp; DEĞİŞİM YÖNETİMİ
              </h2>
              <p className="text-xs text-slate-500 font-body mt-0.5">
                Müşterilerin oluşturduğu iade ve değişim başvuruları, kargo kodları ve durum kontrolü
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadTalepler}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-brand-red text-slate-700 hover:text-brand-red text-xs font-display font-bold uppercase tracking-wider transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {/* Filtre ve Arama */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {['tumu', 'inceleniyor', 'onaylandi', 'tamamlandi', 'reddedildi'].map((durum) => (
            <button
              key={durum}
              onClick={() => setFilterDurum(durum)}
              className={`px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wider transition-all ${
                filterDurum === durum
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {durum === 'tumu' ? 'Tümü' : durum}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Sipariş No, İsim veya Kod Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 rounded focus:border-brand-red outline-none transition-all"
          />
        </div>
      </div>

      {/* Tablo / Liste */}
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
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
                  <th className="py-3 px-4">Kargo Kodu</th>
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
                          {new Date(t.created_at).toLocaleDateString('tr-TR')}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono text-brand-red font-semibold">
                        <a href={`/siparis/${t.siparis_no}/fatura`} target="_blank" className="hover:underline inline-flex items-center gap-1">
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
                          {t.talep_tipi}
                        </span>
                        <div className="font-medium text-slate-700">{t.sebep}</div>
                        {t.aciklama && (
                          <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            &quot;{t.aciklama}&quot;
                          </div>
                        )}
                        {t.iban && (
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            IBAN: {t.iban}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded text-[11px] font-bold">
                          {t.kargo_iade_kodu || '452918231'}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Yurtiçi Kargo</span>
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
                          {t.durum}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.durum === 'inceleniyor' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(t.id, 'onaylandi')}
                                disabled={isUpdating}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-display font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                              >
                                Onayla
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(t.id, 'reddedildi')}
                                disabled={isUpdating}
                                className="px-2.5 py-1 bg-slate-200 hover:bg-rose-600 hover:text-white text-slate-600 rounded text-[10px] font-display font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                              >
                                Reddet
                              </button>
                            </>
                          )}
                          {t.durum === 'onaylandi' && (
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'tamamlandi')}
                              disabled={isUpdating}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-display font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                            >
                              İadeyi Tamamla ✓
                            </button>
                          )}
                          {t.durum === 'tamamlandi' && (
                            <span className="text-[11px] text-emerald-600 font-semibold">Kapandı</span>
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
    </div>
  )
}
