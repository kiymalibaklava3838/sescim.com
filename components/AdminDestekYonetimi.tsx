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
          <h2 className="font-display font-black text-2xl uppercase text-white">Destek Talepleri</h2>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {talepler.map(talep => (
            <div key={talep.id} className="bg-[#141414] border border-white/5 p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <LifeBuoy size={16} className="text-white/40" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-lg uppercase tracking-wide">{talep.konu}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`font-display font-bold text-[10px] tracking-widest uppercase px-2 py-0.5 ${
                        talep.durum === 'beklemede' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        talep.durum === 'yanitlandi' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-white/5 text-white/30 border border-white/10'
                      }`}>
                        {talep.durum}
                      </span>
                      <span className="text-[10px] text-white/30 font-body">{new Date(talep.created_at).toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                </div>
                {talep.durum !== 'kapandi' && replyingId !== talep.id && (
                  <div className="flex gap-2">
                    <button onClick={() => handleReplyClick(talep)} className="px-4 py-2 border border-white/10 text-white hover:border-white/30 font-display text-xs uppercase tracking-widest transition-all">
                      Yanıtla
                    </button>
                    <button onClick={() => handleClose(talep.id)} className="px-4 py-2 border border-white/10 text-white/30 hover:border-white/30 hover:text-white font-display text-xs uppercase tracking-widest transition-all">
                      Kapat
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-sm text-sm text-white/70 font-body">
                {talep.mesaj}
              </div>

              {replyingId === talep.id ? (
                <div className="bg-[#0A0A0A] border border-brand-red/30 p-4 space-y-4">
                  <div>
                    <label className="font-display text-[10px] tracking-widest uppercase text-white/40 block mb-2">Müşteriye Yanıtınız</label>
                    <textarea rows={4} value={yanitText} onChange={e => setYanitText(e.target.value)}
                      className="w-full bg-[#141414] border border-white/10 text-white px-4 py-3 text-sm font-body focus:outline-none focus:border-brand-red/50 resize-none"
                      placeholder="Yanıtınızı buraya yazın..." />
                  </div>
                  <div>
                    <label className="font-display text-[10px] tracking-widest uppercase text-white/40 block mb-2">Kargo Kodu (Varsa)</label>
                    <div className="relative">
                      <Package size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                      <input type="text" value={kargoKodu} onChange={e => setKargoKodu(e.target.value)}
                        className="w-full bg-[#141414] border border-white/10 text-white pl-10 pr-4 py-3 text-sm font-body focus:outline-none focus:border-brand-red/50"
                        placeholder="Örn: YK123456789" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleSaveReply(talep.id)} disabled={saving}
                      className="flex items-center gap-2 bg-brand-red text-white px-6 py-2 font-display font-bold text-xs tracking-widest uppercase hover:bg-red-700 transition-all disabled:opacity-50">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Gönder
                    </button>
                    <button onClick={() => setReplyingId(null)}
                      className="px-6 py-2 border border-white/10 text-white/50 hover:text-white font-display text-xs uppercase tracking-wider transition-all">
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                talep.yanit && (
                  <div className="bg-brand-red/5 border border-brand-red/20 p-4 rounded-sm space-y-3">
                    <div className="flex items-center gap-2 text-brand-red mb-1">
                      <Send size={14} />
                      <span className="font-display font-bold text-xs tracking-widest uppercase">Yanıtınız</span>
                    </div>
                    <div className="text-sm text-white/90 font-body">{talep.yanit}</div>
                    {talep.kargo_kodu && (
                      <div className="flex items-center gap-2 bg-black/20 border border-white/5 px-3 py-2 w-fit">
                        <Package size={14} className="text-white/40" />
                        <span className="text-xs text-white/60 font-body">Kargo Kodu:</span>
                        <span className="text-xs font-display font-bold tracking-wider text-white">{talep.kargo_kodu}</span>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          ))}
          {talepler.length === 0 && (
            <div className="py-12 text-center text-white/20 font-body">
              <LifeBuoy size={32} className="mx-auto mb-3 opacity-30" />
              Henüz destek talebi bulunmuyor.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
