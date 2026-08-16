'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { MessageSquare, Check, Trash2, X, Star } from 'lucide-react'

interface Yorum {
  id: string
  urun_id: string
  user_id: string
  puan: number
  baslik: string | null
  yorum: string
  onaylandi: boolean
  created_at: string
}

export default function AdminYorumYonetimi() {
  const [yorumlar, setYorumlar] = useState<Yorum[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useRef(createClient()).current

  useEffect(() => { loadYorumlar() }, [])

  const loadYorumlar = async () => {
    setLoading(true)
    const { data } = await supabase.from('urun_yorumlari').select('*').order('created_at', { ascending: false })
    setYorumlar(data || [])
    setLoading(false)
  }

  const toggleOnay = async (id: string, currentStatus: boolean) => {
    await supabase.from('urun_yorumlari').update({ onaylandi: !currentStatus }).eq('id', id)
    loadYorumlar()
  }

  const deleteYorum = async (id: string) => {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return
    await supabase.from('urun_yorumlari').delete().eq('id', id)
    loadYorumlar()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">İçerik</span>
          </div>
          <h2 className="font-display font-black text-2xl uppercase text-white">Yorum Yönetimi</h2>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {yorumlar.map(yorum => (
            <div key={yorum.id} className={`bg-[#141414] border p-4 flex gap-4 ${
              yorum.onaylandi ? 'border-white/5' : 'border-brand-red/30'
            }`}>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <MessageSquare size={16} className={yorum.onaylandi ? 'text-white/40' : 'text-brand-red'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex text-brand-red">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} fill={i < yorum.puan ? 'currentColor' : 'none'} className={i >= yorum.puan ? 'text-white/20' : ''} />
                    ))}
                  </div>
                  <span className={`font-display font-bold text-[10px] tracking-widest uppercase px-2 py-0.5 ${
                    yorum.onaylandi ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {yorum.onaylandi ? 'Onaylı' : 'Onay Bekliyor'}
                  </span>
                  <span className="text-[10px] text-white/30 font-body">{new Date(yorum.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
                {yorum.baslik && <h4 className="font-bold text-sm text-white font-display mb-1">{yorum.baslik}</h4>}
                <p className="text-sm text-white/70 font-body mb-2">{yorum.yorum}</p>
                <div className="text-[10px] text-white/40 font-body">Ürün ID: {yorum.urun_id}</div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => toggleOnay(yorum.id, yorum.onaylandi)}
                  className={`flex items-center justify-center h-8 px-3 font-display text-[10px] tracking-widest uppercase border transition-all ${
                    yorum.onaylandi
                      ? 'border-white/10 text-white/40 hover:border-red-500/30 hover:text-red-400'
                      : 'border-green-500/20 text-green-400 hover:bg-green-500/10'
                  }`}>
                  {yorum.onaylandi ? (
                    <><X size={12} className="mr-1" /> Gizle</>
                  ) : (
                    <><Check size={12} className="mr-1" /> Onayla</>
                  )}
                </button>
                <button onClick={() => deleteYorum(yorum.id)}
                  className="flex items-center justify-center h-8 px-3 border border-white/10 text-white/30 hover:border-red-500/30 hover:text-red-400 transition-all font-display text-[10px] tracking-widest uppercase">
                  <Trash2 size={12} className="mr-1" /> Sil
                </button>
              </div>
            </div>
          ))}
          {yorumlar.length === 0 && (
            <div className="py-12 text-center text-white/20 font-body">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
              Henüz ürün yorumu bulunmuyor.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
