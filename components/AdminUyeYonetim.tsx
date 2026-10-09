'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Users, Search, RefreshCw, Mail, Phone, Calendar, ShoppingBag, CheckCircle, Clock } from 'lucide-react'

interface Uye {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  ad_soyad: string
  telefon: string
  user_metadata?: { full_name?: string; phone?: string }
  siparis_sayisi?: number
  toplam_harcama?: number
  email_confirmed?: boolean
}

interface AdminUyeYonetimProps {
  supabaseClient?: any
}

export default function AdminUyeYonetim({ supabaseClient }: AdminUyeYonetimProps) {
  const [uyeler, setUyeler] = useState<Uye[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const internalSupabase = useRef(createClient()).current
  const supabase = supabaseClient || internalSupabase

  const loadUyeler = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      let session = (await supabase.auth.getSession()).data.session
      if (!session?.access_token) {
        const refreshRes = await supabase.auth.refreshSession()
        session = refreshRes.data.session
      }

      const res = await fetch(`/api/admin/uyeler?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'Cache-Control': 'no-cache',
        }
      })

      if (res.ok) {
        const data = await res.json()
        setUyeler(data.users || [])
      } else {
        const errData = await res.json().catch(() => ({}))
        setErrorMsg(errData.error || 'Üyeler yüklenirken hata oluştu.')
      }
    } catch (e: any) {
      console.error('Üye yükleme hatası:', e)
      setErrorMsg('Bağlantı hatası oluştu.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadUyeler()
  }, [loadUyeler])

  const filtered = uyeler.filter(u => {
    if (!searchQ) return true
    const q = searchQ.toLowerCase()
    const name = (u.ad_soyad || u.user_metadata?.full_name || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    const phone = (u.telefon || u.user_metadata?.phone || '').toLowerCase()
    return name.includes(q) || email.includes(q) || phone.includes(q)
  })

  const thisMonthCount = uyeler.filter(u => {
    const diffDays = (Date.now() - new Date(u.created_at).getTime()) / 86400000
    return diffDays <= 30
  }).length

  const withOrdersCount = uyeler.filter(u => (u.siparis_sayisi || 0) > 0).length

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-brand-red rounded-full animate-spin" />
        <span className="font-display text-xs tracking-widest uppercase text-slate-400">Üyeler yükleniyor...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] bg-slate-50 uppercase text-brand-red">Kullanıcı Yönetimi</span>
          </div>
          <h2 className="font-display font-black text-2xl uppercase text-slate-900">Üye Yönetimi</h2>
          <p className="font-body text-slate-900/40 text-sm mt-1">Aktif kayıtlı kullanıcılar ve hesap detayları</p>
        </div>
        <button 
          onClick={loadUyeler}
          className="flex items-center gap-2 border border-slate-300 text-slate-900/60 hover:border-brand-red/40 hover:text-slate-900 px-4 py-2 font-display text-xs tracking-widest uppercase transition-all bg-white shadow-xs">
          <RefreshCw size={14} /> Yenile
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={loadUyeler} className="underline font-bold text-xs">Tekrar Dene</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-5 shadow-xs">
          <Users size={18} className="text-brand-red mb-3" />
          <div className="font-display font-black text-3xl text-slate-900">{uyeler.length}</div>
          <div className="font-body text-slate-900/40 text-sm mt-1">Toplam Aktif Üye</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 shadow-xs">
          <Calendar size={18} className="text-brand-red mb-3" />
          <div className="font-display font-black text-3xl text-slate-900">{thisMonthCount}</div>
          <div className="font-body text-slate-900/40 text-sm mt-1">Son 30 Gün</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 shadow-xs">
          <ShoppingBag size={18} className="text-emerald-600 mb-3" />
          <div className="font-display font-black text-3xl text-slate-900">{withOrdersCount}</div>
          <div className="font-body text-slate-900/40 text-sm mt-1">Sipariş Veren Üyeler</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 shadow-xs">
          <CheckCircle size={18} className="text-blue-600 mb-3" />
          <div className="font-display font-black text-3xl text-slate-900">
            {uyeler.filter(u => u.email_confirmed).length}
          </div>
          <div className="font-body text-slate-900/40 text-sm mt-1">Doğrulanmış Hesap</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900/30" />
        <input
          type="text"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="Üye ara (Ad, Soyad, E-posta, Telefon)..."
          className="w-full bg-white border border-slate-300 text-slate-900 pl-11 pr-4 py-3 text-sm font-body focus:outline-none focus:border-brand-red/50 transition-colors shadow-xs"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border border-slate-200 shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {['Üye', 'E-posta', 'Telefon', 'Siparişler', 'Kayıt Tarihi', 'Son Giriş'].map(h => (
                <th key={h} className="text-left py-3 px-4 font-display font-semibold text-[10px] tracking-widest uppercase text-slate-900/40">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((uye) => {
              const displayName = uye.ad_soyad || uye.user_metadata?.full_name || 'İsimsiz Üye'
              const displayPhone = uye.telefon || uye.user_metadata?.phone || '—'
              const orderCount = uye.siparis_sayisi || 0

              return (
                <tr key={uye.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-display font-bold text-sm text-slate-900">
                      {displayName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      ID: {uye.id.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 font-body text-sm text-slate-800">
                      <Mail size={13} className="text-slate-400" />
                      <span>{uye.email}</span>
                      {uye.email_confirmed && (
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.2 rounded font-semibold" title="Doğrulanmış">
                          ✓
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5 font-body text-sm text-slate-600">
                      <Phone size={12} className="text-slate-400" />
                      <span>{displayPhone}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {orderCount > 0 ? (
                      <div className="flex flex-col">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded w-max">
                          <ShoppingBag size={11} /> {orderCount} Sipariş
                        </span>
                        {uye.toplam_harcama ? (
                          <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {uye.toplam_harcama.toLocaleString('tr-TR')} ₺
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-body">Sipariş yok</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-body text-xs text-slate-600 flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      {new Date(uye.created_at).toLocaleDateString('tr-TR')}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-body text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      {uye.last_sign_in_at ? new Date(uye.last_sign_in_at).toLocaleDateString('tr-TR') : '—'}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-14 text-center text-slate-400 font-body">
            <Users size={36} className="mx-auto mb-3 opacity-30 text-slate-400" />
            <p className="font-display text-sm tracking-wider uppercase text-slate-500">Üye Bulunamadı</p>
            <p className="text-xs text-slate-400 mt-1">Arama kriterlerine uygun kullanıcı kaydı mevcut değil.</p>
          </div>
        )}
      </div>
    </div>
  )
}
