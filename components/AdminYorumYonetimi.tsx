'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { 
  MessageSquare, Check, Trash2, X, Star, Reply, ShieldCheck, 
  Save, Edit2, CornerDownRight 
} from 'lucide-react'
import { parseReviewContent, packReviewContent, ReviewReply } from './ProductReviews'

interface Yorum {
  id: string
  urun_id: string
  user_id: string
  ad_soyad?: string | null
  puan: number
  baslik: string | null
  yorum: string
  onaylandi: boolean
  created_at: string
}

export default function AdminYorumYonetimi() {
  const [yorumlar, setYorumlar] = useState<Yorum[]>([])
  const [loading, setLoading] = useState(true)
  
  // Reply modal state
  const [replyModalYorum, setReplyModalYorum] = useState<Yorum | null>(null)
  const [replyText, setReplyText] = useState('')
  const [savingReply, setSavingReply] = useState(false)

  const supabase = useRef(createClient()).current

  useEffect(() => { 
    loadYorumlar() 
  }, [])

  const loadYorumlar = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('urun_yorumlari')
      .select('*')
      .order('created_at', { ascending: false })
    setYorumlar(data || [])
    setLoading(false)
  }

  const triggerRevalidate = async () => {
    try {
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/urunler' })
      })
    } catch (e) {
      console.warn('Revalidation warning:', e)
    }
  }

  const toggleOnay = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('urun_yorumlari')
      .update({ onaylandi: !currentStatus })
      .eq('id', id)
    await triggerRevalidate()
    loadYorumlar()
  }

  const deleteYorum = async (id: string) => {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return
    await supabase.from('urun_yorumlari').delete().eq('id', id)
    await triggerRevalidate()
    loadYorumlar()
  }

  // Open store reply editor
  const handleOpenReplyModal = (yorum: Yorum) => {
    const { replies } = parseReviewContent(yorum.yorum)
    const storeReply = replies.find(r => r.role === 'store')
    setReplyModalYorum(yorum)
    setReplyText(storeReply ? storeReply.text : '')
  }

  // Save or delete store reply
  const handleSaveStoreReply = async () => {
    if (!replyModalYorum) return

    setSavingReply(true)
    try {
      const { cleanYorum, photos, replies } = parseReviewContent(replyModalYorum.yorum)
      
      // Filter out existing store replies
      const otherReplies = replies.filter(r => r.role !== 'store')

      let updatedReplies: ReviewReply[] = [...otherReplies]

      if (replyText.trim()) {
        const newStoreReply: ReviewReply = {
          id: `store-reply-${Date.now()}`,
          author: 'Sescim Uzman Ekibi',
          role: 'store',
          text: replyText.trim(),
          date: new Date().toISOString()
        }
        updatedReplies.push(newStoreReply)
      }

      const packed = packReviewContent(cleanYorum, photos, updatedReplies)

      const { error } = await supabase
        .from('urun_yorumlari')
        .update({ yorum: packed })
        .eq('id', replyModalYorum.id)

      if (error) throw error

      await triggerRevalidate()
      await loadYorumlar()
      setReplyModalYorum(null)
      setReplyText('')
    } catch (err: any) {
      console.error('Yanıt kaydedilemedi:', err)
      alert('Hata: ' + (err.message || err))
    } finally {
      setSavingReply(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">İçerik & İletişim</span>
          </div>
          <h2 className="font-display font-black text-2xl uppercase text-slate-900">
            Yorum ve Yanıt Yönetimi
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Müşteri değerlendirmelerini onaylayabilir, gizleyebilir veya yetkili mağaza yanıtı ekleyebilirsiniz.
          </p>
        </div>
      </div>

      {/* Yorum Listesi */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-brand-red rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {yorumlar.map(yorum => {
            const { cleanYorum, photos, replies } = parseReviewContent(yorum.yorum)
            const storeReply = replies.find(r => r.role === 'store')

            return (
              <div 
                key={yorum.id} 
                className={`bg-white border p-5 flex flex-col md:flex-row gap-4 shadow-sm transition-all rounded-sm ${
                  yorum.onaylandi ? 'border-slate-200' : 'border-brand-red/30 bg-red-50/10'
                }`}
              >
                {/* İkon */}
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <MessageSquare size={16} className={yorum.onaylandi ? 'text-slate-400' : 'text-brand-red'} />
                </div>

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2.5 mb-1.5">
                    {/* Yıldızlar */}
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          size={12} 
                          fill={i < yorum.puan ? 'currentColor' : 'none'} 
                          className={i >= yorum.puan ? 'text-slate-200' : ''} 
                        />
                      ))}
                    </div>

                    {/* Müşteri Adı */}
                    <span className="font-bold text-xs text-slate-900 font-display">
                      {yorum.ad_soyad || 'Müşteri'}
                    </span>

                    {/* Durum Rozeti */}
                    <span className={`font-display font-bold text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-sm ${
                      yorum.onaylandi 
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-600 border border-red-500/20'
                    }`}>
                      {yorum.onaylandi ? 'Yayında (Onaylı)' : 'Onay Bekliyor'}
                    </span>

                    {/* Tarih */}
                    <span className="text-[10px] text-slate-400 font-body ml-auto">
                      {new Date(yorum.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>

                  {yorum.baslik && (
                    <h4 className="font-bold text-sm text-slate-900 font-display mb-1">
                      {yorum.baslik}
                    </h4>
                  )}

                  {/* Yorum Metni */}
                  <p className="text-xs sm:text-sm text-slate-700 font-body mb-3 leading-relaxed whitespace-pre-line">
                    {cleanYorum}
                  </p>

                  {/* Fotoğraflar */}
                  {photos.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {photos.map((p, idx) => (
                        <a 
                          key={idx} 
                          href={p} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="block relative w-12 h-12 rounded border border-slate-200 overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img src={p} alt="Yorum fotoğrafı" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Varsa Mağaza Yanıtı veya Kullanıcı Yanıtları */}
                  {replies.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      {replies.map((reply, rIdx) => {
                        const isStore = reply.role === 'store'
                        return (
                          <div 
                            key={reply.id || rIdx}
                            className={`p-3 rounded-md text-xs ${
                              isStore 
                                ? 'bg-amber-50/60 border border-amber-500/20 text-slate-800' 
                                : 'bg-slate-50 border border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold flex items-center gap-1 text-[11px] text-brand-red">
                                {isStore && <ShieldCheck size={13} className="text-brand-red" />}
                                {reply.author}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(reply.date).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                            <p className="whitespace-pre-line text-slate-600">
                              {reply.text}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 font-mono mt-2">
                    Ürün ID: {yorum.urun_id}
                  </div>
                </div>

                {/* Butonlar */}
                <div className="flex md:flex-col gap-2 shrink-0 justify-end md:justify-start">
                  <button 
                    onClick={() => handleOpenReplyModal(yorum)}
                    className="flex items-center justify-center h-8 px-3 font-display text-[10px] tracking-widest uppercase border border-slate-200 hover:border-brand-red/40 hover:text-brand-red transition-all rounded-sm bg-white"
                  >
                    <Reply size={12} className="mr-1.5" />
                    {storeReply ? 'Yanıtı Düzenle' : 'Yanıt Yaz'}
                  </button>

                  <button 
                    onClick={() => toggleOnay(yorum.id, yorum.onaylandi)}
                    className={`flex items-center justify-center h-8 px-3 font-display text-[10px] tracking-widest uppercase border transition-all rounded-sm ${
                      yorum.onaylandi
                        ? 'border-slate-200 text-slate-500 hover:border-red-500/30 hover:text-red-600'
                        : 'border-emerald-500/30 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {yorum.onaylandi ? (
                      <><X size={12} className="mr-1" /> Gizle</>
                    ) : (
                      <><Check size={12} className="mr-1" /> Onayla</>
                    )}
                  </button>

                  <button 
                    onClick={() => deleteYorum(yorum.id)}
                    className="flex items-center justify-center h-8 px-3 border border-slate-200 text-slate-400 hover:border-red-500/30 hover:text-red-600 transition-all font-display text-[10px] tracking-widest uppercase rounded-sm"
                  >
                    <Trash2 size={12} className="mr-1" /> Sil
                  </button>
                </div>
              </div>
            )
          })}

          {yorumlar.length === 0 && (
            <div className="py-16 text-center text-slate-400 font-body bg-slate-50 border border-slate-200 rounded-sm">
              <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
              Henüz onay bekleyen veya kayıtlı ürün yorumu bulunmuyor.
            </div>
          )}
        </div>
      )}

      {/* MAĞAZA YANITI YAZ / DÜZENLE MODAL */}
      {replyModalYorum && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-brand-red" />
                <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-900">
                  Yetkili Mağaza Yanıtı
                </h3>
              </div>
              <button 
                onClick={() => setReplyModalYorum(null)} 
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 bg-slate-50 p-3 rounded border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-700 mb-1">
                {replyModalYorum.ad_soyad || 'Müşteri'} Yorumu:
              </div>
              <p className="text-xs text-slate-600 italic line-clamp-3">
                &ldquo;{parseReviewContent(replyModalYorum.yorum).cleanYorum}&rdquo;
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mağaza / Uzman Yanıtınız
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Örn: Merhaba, değerlendirmeniz ve güzel sözleriniz için teşekkür ederiz. Ürününüzü iyi günlerde kullanmanızı dileriz..."
                  className="w-full p-3 border border-slate-300 rounded text-xs focus:outline-none focus:border-brand-red resize-none"
                />
                <span className="text-[10px] text-slate-400">
                  Bu yanıt doğrudan yorumun altında &ldquo;Sescim Mağaza Yanıtı&rdquo; etiketiyle yayınlanır. Boş bırakırsanız mevcut mağaza yanıtı kaldırılır.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReplyModalYorum(null)}
                  className="px-4 py-2 text-xs border border-slate-200 text-slate-600 rounded hover:bg-slate-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="button"
                  disabled={savingReply}
                  onClick={handleSaveStoreReply}
                  className="btn-primary py-2 px-5 text-xs font-bold rounded flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>{savingReply ? 'Kaydediliyor...' : 'Yanıtı Kaydet ve Yayınla'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
