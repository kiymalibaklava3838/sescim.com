'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Users, Search, RefreshCw, Mail, Phone, Calendar, Shield } from 'lucide-react'

interface Uye {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  user_metadata: { full_name?: string; phone?: string }
  siparis_sayisi?: number
}

export default function AdminUyeYonetim() {
  const [uyeler, setUyeler] = useState<Uye[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const supabase = useRef(createClient()).current

  useEffect(() => { loadUyeler() }, [])

  const loadUyeler = async () => {
    setLoading(true)
    try {
      // Fetch users via admin API (requires service role in production)
      const res = await fetch('/api/admin/uyeler')
      if (res.ok) {
        const data = await res.json()
        setUyeler(data.users || [])
      } else {
        // Fallback: show from siparisler unique users
        const { data: siparisler } = await supabase
          .from('siparisler')
          .select('user_id, email, ad_soyad, telefon, created_at')
          .not('user_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(200)
        
        // Deduplicate by user_id
        const seen = new Set<string>()
        const uniqueUsers: Uye[] = []
        for (const s of (siparisler || [])) {
          if (s.user_id && !seen.has(s.user_id)) {
            seen.add(s.user_id)
            uniqueUsers.push({
              id: s.user_id,
              email: s.email || '',
              created_at: s.created_at,
              last_sign_in_at: null,
              user_metadata: { full_name: s.ad_soyad, phone: s.telefon },
            })
          }
        }
        setUyeler(uniqueUsers)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const filtered = uyeler.filter(u => {
    if (!searchQ) return true
    const q = searchQ.toLowerCase()
    return (
      u.email.toLowerCase().includes(q) ||
      (u.user_metadata?.full_name || '').toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-brand-red rounded-full animate-spin" />
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
          <p className="font-body text-slate-900/30 text-sm mt-1">Kayıtlı üye listesi</p>
        </div>
        <button onClick={loadUyeler}
          className="flex items-center gap-2 border border-slate-300 text-slate-900/50 hover:border-brand-red/30 hover:text-slate-900 px-4 py-2 font-display text-xs tracking-widest uppercase transition-all">
          <RefreshCw size={14} /> Yenile
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Üye', value: uyeler.length, icon: Users },
          { label: 'Bu Ay', value: uyeler.filter(u => new Date(u.created_at) > new Date(Date.now() - 30 * 86400000)).length, icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border border-slate-200 p-5">
            <Icon size={18} className="text-brand-red mb-3" />
            <div className="font-display font-black text-3xl text-slate-900">{value}</div>
            <div className="font-body text-slate-900/40 text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900/30" />
        <input
          type="text"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="Üye ara (ad, e-posta)..."
          className="w-full bg-white border border-slate-300 text-slate-900 pl-11 pr-4 py-3 text-sm font-body focus:outline-none focus:border-brand-red/50 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              {['Ad Soyad', 'E-posta', 'Telefon', 'Kayıt Tarihi', 'Son Giriş'].map(h => (
                <th key={h} className="text-left py-3 px-4 font-display font-semibold text-[10px] tracking-widest uppercase text-slate-900/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((uye) => (
              <tr key={uye.id} className="border-b border-slate-200 hover:bg-slate-100 transition-colors">
                <td className="py-4 px-4">
                  <div className="font-display font-semibold text-sm text-slate-900">
                    {uye.user_metadata?.full_name || '—'}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2 font-body text-sm text-slate-900/60">
                    <Mail size={12} className="text-slate-900/30" />
                    {uye.email}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="font-body text-sm text-slate-900/40">
                    {uye.user_metadata?.phone || '—'}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="font-body text-xs text-slate-900/30">
                    {new Date(uye.created_at).toLocaleDateString('tr-TR')}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="font-body text-xs text-slate-900/30">
                    {uye.last_sign_in_at ? new Date(uye.last_sign_in_at).toLocaleDateString('tr-TR') : '—'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-900/20 font-body">
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            Üye bulunamadı
          </div>
        )}
      </div>
    </div>
  )
}
