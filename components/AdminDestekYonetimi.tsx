'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { LifeBuoy, Package, Send, Loader2, Check } from 'lucide-react'

interface DestekTalebi {
  id: string
  user_id: string
  konu: string
  mesaj: string
  kargo_kodu: string | null
  durum: 'beklemede' | 'yanitlandi' | 'kapandi'
  yanit: string | null
  created_at: string
}

export default function AdminDestekYonetimi() {
  const [talepler, setTalepler] = useState<DestekTalebi[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useRef(createClient()).current

  // Form states for currently replying ticket
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [yanitText, setYanitText] = useState('')
  const [kargoKodu, setKargoKodu] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadTalepler() }, [])

  const loadTalepler = async () => {
    setLoading(true)
    const { data } = await supabase.from('destek_talepleri').select('*').order('created_at', { ascending: false })
    setTalepler(data || [])
    setLoading(false)
  }

  const handleReplyClick = (talep: DestekTalebi) => {
    setReplyingId(talep.id)
    setYanitText(talep.yanit || '')
    setKargoKodu(talep.kargo_kodu || '')
  }

  const handleSaveReply = async (id: string) => {
    setSaving(true)
    await supabase.from('destek_talepleri').update({
      yanit: yanitText,
      kargo_kodu: kargoKodu || null,
      durum: 'yanitlandi'
    }).eq('id', id)
    setReplyingId(null)
    setSaving(false)
    loadTalepler()
  }

  const handleClose = async (id: string) => {
    if (!confirm('Talebi kapatmak istediğinize emin misiniz?')) return
    await supabase.from('destek_talepleri').update({ durum: 'kapandi' }).eq('id', id)
    loadTalepler()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Müşteri İlişkileri</span>
          </div>
          <h2 className="font-display font-black text-2xl uppercase text-slate-900">Destek Talepleri</h2>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-slate-200 border-t-brand-red rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {talepler.map(talep => (
            <div key={talep.id} className="bg-white border border-slate-200 p-6 space-y-4 shadow-sm transition-opacity">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <LifeBuoy size={16} className="text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-lg uppercase tracking-wide">{talep.konu}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`font-display font-bold text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-sm ${
                        talep.durum === 'beklemede' ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' :
                        talep.durum === 'yanitlandi' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                        'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {talep.durum}
                      </span>
                      <span className="text-[10px] text-slate-400 font-body">{new Date(talep.created_at).toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                </div>
                {talep.durum !== 'kapandi' && replyingId !== talep.id && (
                  <div className="flex gap-2">
                    <button onClick={() => handleReplyClick(talep)} className="px-4 py-2 border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 font-display text-xs uppercase tracking-widest transition-all rounded-sm">
                      Yanıtla
                    </button>
                    <button onClick={() => handleClose(talep.id)} className="px-4 py-2 border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 font-display text-xs uppercase tracking-widest transition-all rounded-sm">
                      Kapat
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-sm text-sm text-slate-700 font-body">
                {talep.mesaj}
              </div>

              {replyingId === talep.id ? (
                <div className="bg-white border border-brand-red/30 p-4 space-y-4 shadow-sm">
                  <div>
                    <label className="font-display text-[10px] tracking-widest uppercase text-slate-500 block mb-2">Müşteriye Yanıtınız</label>
                    <textarea rows={4} value={yanitText} onChange={e => setYanitText(e.target.value)}
                      className="input-base resize-none"
                      placeholder="Yanıtınızı buraya yazın..." />
                  </div>
                  <div>
                    <label className="font-display text-[10px] tracking-widest uppercase text-slate-500 block mb-2">Kargo Kodu (Varsa)</label>
                    <div className="relative">
                      <Package size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={kargoKodu} onChange={e => setKargoKodu(e.target.value)}
                        className="input-base pl-10"
                        placeholder="Örn: YK123456789" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleSaveReply(talep.id)} disabled={saving}
                      className="flex items-center justify-center gap-2 bg-brand-red text-white px-6 py-2.5 font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all disabled:opacity-50 rounded-sm">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Gönder
                    </button>
                    <button onClick={() => setReplyingId(null)}
                      className="px-6 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-display text-xs uppercase tracking-wider transition-all rounded-sm">
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                talep.yanit && (
                  <div className="bg-brand-red/5 border border-brand-red/10 p-4 rounded-sm space-y-3">
                    <div className="flex items-center gap-2 text-brand-red mb-1">
                      <Send size={14} />
                      <span className="font-display font-bold text-xs tracking-widest uppercase">Yanıtınız</span>
                    </div>
                    <div className="text-sm text-slate-800 font-body">{talep.yanit}</div>
                    {talep.kargo_kodu && (
                      <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 w-fit rounded-sm shadow-sm">
                        <Package size={14} className="text-slate-400" />
                        <span className="text-xs text-slate-500 font-body">Kargo Kodu:</span>
                        <span className="text-xs font-display font-bold tracking-wider text-slate-900">{talep.kargo_kodu}</span>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          ))}
          {talepler.length === 0 && (
            <div className="py-12 text-center text-slate-400 font-body bg-slate-50 border border-slate-200 shadow-sm">
              <LifeBuoy size={32} className="mx-auto mb-3 opacity-30" />
              Henüz destek talebi bulunmuyor.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
